"use client";

import { useState } from "react";
import { Plus, Users, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useRooms } from "@/lib/hooks/UseOracleGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { CreateRoomModal } from "./CreateRoomModal";
import type { Room } from "@/lib/contracts/OracleGameTypes";

interface RoomListProps {
  onJoinRoom: (roomId: number) => void;
}

// ─── Phase badge rendering ────────────────────────────────
function PhaseBadge({ phase }: { phase: string }) {
  const labelMap: Record<string, string> = {
    waiting:  "Waiting",
    active:   "Live",
    judging:  "Judging…",
    finished: "Finished",
  };
  const classMap: Record<string, string> = {
    waiting:  "game-phase-waiting",
    active:   "game-phase-active",
    judging:  "game-phase-judging",
    finished: "game-phase-finished",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classMap[phase] || classMap.waiting}`}>
      {phase === "judging" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {labelMap[phase] || phase}
    </span>
  );
}

// ─── Single room row ──────────────────────────────────────
function RoomRow({
  room,
  index,
  onJoin,
  isConnected,
}: {
  room: Room;
  index: number;
  onJoin: () => void;
  isConnected: boolean;
}) {
  return (
    <div
      className="animate-stagger-in brand-card brand-card-hover flex items-center gap-4 p-4 cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onJoin}
    >
      {/* Room ID badge */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg gradient-purple-pink flex items-center justify-center">
        <span className="text-lg font-bold text-white">#{room.id}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Prompt preview — truncated */}
        <p className="text-sm font-medium text-foreground truncate">
          {room.prompt || "(prompt hidden until you join)"}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1">
          <PhaseBadge phase={room.phase} />

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {room.playerCount || "—"} players
          </span>

          {room.phase === "finished" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Join CTA */}
      <div className="flex-shrink-0">
        <button
          className={`btn-primary text-sm px-4 py-1.5 ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isConnected) onJoin();
          }}
          disabled={!isConnected}
        >
          {room.phase === "finished" ? "View Results" : "Join"}
        </button>
      </div>
    </div>
  );
}

// ─── Main RoomList component ──────────────────────────────
export function RoomList({ onJoinRoom }: RoomListProps) {
  const { data: rooms, isLoading, isError } = useRooms();
  const { address } = useWallet();
  const isConnected = !!address;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="brand-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Game Rooms</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="brand-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Game Rooms</h2>
        </div>
        <div className="text-center py-10 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive opacity-70" />
          <p className="text-sm text-destructive">Failed to load rooms. Please try again.</p>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!rooms || rooms.length === 0) {
    return (
      <div className="brand-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Game Rooms</h2>
          <CreateRoomModal />
        </div>
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full gradient-purple-pink flex items-center justify-center opacity-60">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No rooms yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected
                ? "Create a room to kick things off!"
                : "Connect your wallet, then create or join a room."}
            </p>
          </div>
          {isConnected && <CreateRoomModal /> }
        </div>
      </div>
    );
  }

  // ── Populated ──
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          Game Rooms
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({rooms.length} {rooms.length === 1 ? "room" : "rooms"})
          </span>
        </h2>
        <CreateRoomModal />
      </div>

      {/* Room list */}
      <div className="space-y-3">
        {rooms.map((room, i) => (
          <RoomRow
            key={room.id}
            room={room}
            index={i}
            isConnected={isConnected}
            onJoin={() => onJoinRoom(room.id)}
          />
        ))}
      </div>

      {/* Wallet prompt */}
      {!isConnected && (
        <div className="mt-4 brand-card p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Connect your wallet to join or create game rooms.
          </p>
        </div>
      )}
    </div>
  );
}