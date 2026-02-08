"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import OracleGame from "../contracts/OracleGame";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type {
  Room,
  RoomLeaderboardEntry,
  GlobalLeaderboardEntry,
} from "../contracts/OracleGameTypes";

// ─── Client-side prompt cache ───────────────────────────────────────────────
// The contract has no get_room_prompt view, so we cache prompts here.
// useCreateRoom writes into it on successful creation.
// useRoomPrompt reads from it. For rooms created by other users the
// prompt won't be available until they join — GameRoom shows a placeholder.
const promptCache = new Map<number, string>();

export function getCachedPrompt(roomId: number): string {
  return promptCache.get(roomId) || "";
}

export function setCachedPrompt(roomId: number, prompt: string): void {
  promptCache.set(roomId, prompt);
}

// ─── Contract instance hook ─────────────────────────────────────────────────
// Mirrors useFootballBetsContract exactly.
export function useOracleGameContract(): OracleGame | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank"),
        }
      );
      return null;
    }
    return new OracleGame(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);

  return contract;
}

// ─── Read: list of rooms (lobby) ────────────────────────────────────────────
// Fetches room count, then pulls prompt + leaderboard to derive phase/status.
// Returns a lightweight Room[] for the lobby RoomList.
export function useRooms() {
  const contract = useOracleGameContract();

  return useQuery<Room[], Error>({
    queryKey: ["oracleGame", "rooms"],
    queryFn: async () => {
      if (!contract) return [];

      const count = await contract.getRoomCount();
      const rooms: Room[] = [];

      for (let id = 1; id <= count; id++) {
        // Try to pull the leaderboard — if it has entries the game is finished
        let isFinished = false;
        let playerCount = 0;
        try {
          const lb = await contract.getRoomLeaderboard(id);
          if (lb.length > 0) {
            isFinished = true;
            playerCount = lb.length;
          }
        } catch {
          // Room exists but no leaderboard yet — still in progress
        }

        rooms.push({
          id,
          prompt: "", // filled in by RoomDetail fetch; kept empty here for perf
          phase: isFinished ? "finished" : "waiting",
          isFinished,
          playerCount,
        });
      }

      // If useCreateRoom stashed a prompt under the sentinel key (-1),
      // that means a room was JUST created. Assign its prompt to the
      // highest ID (the newest room) and clear the sentinel.
      const pendingPrompt = promptCache.get(-1);
      if (pendingPrompt && rooms.length > 0) {
        const newestId = Math.max(...rooms.map((r) => r.id));
        promptCache.set(newestId, pendingPrompt);
        promptCache.delete(-1);
        // Update the room object too so RoomList can show it immediately
        const newest = rooms.find((r) => r.id === newestId);
        if (newest) newest.prompt = pendingPrompt;
      }

      return rooms;
    },
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract,
  });
}

// ─── Read: prompt for a specific room (client-side cache) ──────────────────
// No contract view exists for this. Returns the cached prompt if the current
// user created the room, otherwise a placeholder. GameRoom uses this.
export function useRoomPrompt(roomId: number | null): string {
  // Pull from cache. Re-renders when rooms refetch thanks to the
  // sentinel logic in useRooms, but for extra safety we also read
  // directly so the value is always fresh.
  if (roomId === null) return "";
  const cached = promptCache.get(roomId);
  if (cached) return cached;
  return "The prompt will be revealed when the game starts. Stay ready!";
}

// ─── Read: per-room leaderboard (after finalize) ───────────────────────────
export function useRoomLeaderboard(roomId: number | null) {
  const contract = useOracleGameContract();

  return useQuery<RoomLeaderboardEntry[], Error>({
    queryKey: ["oracleGame", "roomLeaderboard", roomId],
    queryFn: async () => {
      if (!contract || roomId === null) return [];
      return contract.getRoomLeaderboard(roomId);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && roomId !== null,
  });
}

// ─── Read: global XP leaderboard (sidebar) ─────────────────────────────────
// Aggregates scores across all finished rooms into a single ranked list.
// In a production app this would be a dedicated contract view; here we
// derive it client-side from per-room leaderboards to match the current contract.
export function useGlobalLeaderboard() {
  const contract = useOracleGameContract();
  const { data: rooms } = useRooms();

  return useQuery<GlobalLeaderboardEntry[], Error>({
    queryKey: ["oracleGame", "globalLeaderboard", rooms],
    queryFn: async () => {
      if (!contract || !rooms) return [];

      const xpMap = new Map<string, number>();

      for (const room of rooms) {
        if (!room.isFinished) continue;
        try {
          const lb = await contract.getRoomLeaderboard(room.id);
          for (const entry of lb) {
            const addr = entry.player.toLowerCase();
            xpMap.set(addr, (xpMap.get(addr) || 0) + entry.score);
          }
        } catch {
          // skip rooms that error
        }
      }

      // Sort descending by XP, cap at top 10
      return Array.from(xpMap.entries())
        .map(([player, xp]) => ({ player, xp }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!contract && !!rooms && rooms.length > 0,
  });
}

// ─── Write: create a new room ───────────────────────────────────────────────
export function useCreateRoom() {
  const contract = useOracleGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!contract) {
        throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to create a room.");
      }
      setIsCreating(true);
      const receipt = await contract.createRoom(prompt);

      // Cache the prompt client-side immediately after successful tx.
      // The new room's ID will be current count (refetch will confirm),
      // but we optimistically cache it keyed by the prompt so GameRoom
      // can surface it without a contract read.
      // We store under a temp key; useRooms refetch will assign the real ID.
      promptCache.set(-1, prompt); // sentinel: "last created prompt"

      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oracleGame", "rooms"] });
      setIsCreating(false);
      success("Room created!", {
        description: "Your game room is live. Share the link or wait for players to join.",
      });
    },
    onError: (err: any) => {
      console.error("Error creating room:", err);
      setIsCreating(false);
      error("Failed to create room", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isCreating,
    createRoom: mutation.mutate,
    createRoomAsync: mutation.mutateAsync,
  };
}

// ─── Write: submit an answer ────────────────────────────────────────────────
export function useSubmitAnswer() {
  const contract = useOracleGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ roomId, answer }: { roomId: number; answer: string }) => {
      if (!contract) {
        throw new Error("Contract not configured.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to submit an answer.");
      }
      setIsSubmitting(true);
      return contract.submitAnswer(roomId, answer);
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["oracleGame", "roomLeaderboard", roomId] });
      setIsSubmitting(false);
      success("Answer submitted!", {
        description: "Your answer has been locked in. Good luck with the AI jury!",
      });
    },
    onError: (err: any) => {
      console.error("Error submitting answer:", err);
      setIsSubmitting(false);
      error("Failed to submit answer", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isSubmitting,
    submitAnswer: mutation.mutate,
    submitAnswerAsync: mutation.mutateAsync,
  };
}

// ─── Write: finalize game (trigger AI jury) ─────────────────────────────────
export function useFinalizeGame() {
  const contract = useOracleGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const mutation = useMutation({
    mutationFn: async (roomId: number) => {
      if (!contract) {
        throw new Error("Contract not configured.");
      }
      if (!address) {
        throw new Error("Wallet not connected. Please connect your wallet to finalize the game.");
      }
      setIsFinalizing(true);
      return contract.finalizeGame(roomId);
    },
    onSuccess: (_, roomId) => {
      // Invalidate everything — scores are now on-chain
      queryClient.invalidateQueries({ queryKey: ["oracleGame", "roomLeaderboard", roomId] });
      queryClient.invalidateQueries({ queryKey: ["oracleGame", "rooms"] });
      queryClient.invalidateQueries({ queryKey: ["oracleGame", "globalLeaderboard"] });
      setIsFinalizing(false);
      success("Game finalized!", {
        description: "The AI jury has reached consensus. Check the leaderboard for results!",
      });
    },
    onError: (err: any) => {
      console.error("Error finalizing game:", err);
      setIsFinalizing(false);
      error("Failed to finalize game", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isFinalizing,
    finalizeGame: mutation.mutate,
    finalizeGameAsync: mutation.mutateAsync,
  };
}