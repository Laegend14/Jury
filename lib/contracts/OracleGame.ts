import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { RoomLeaderboardEntry } from "./OracleGameTypes";

interface TransactionReceipt {
  hash: string;
  status: string;
  [key: string]: any;
}

/**
 * OracleGame contract class for interacting with the GenLayer OracleGame contract.
 *
 * Mirrors the FootballBets pattern exactly:
 *   - constructor accepts (contractAddress, walletAddress?, studioUrl?)
 *   - reads use readContract
 *   - writes use writeContract + waitForTransactionReceipt
 */
class OracleGame {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: studionet,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    if (studioUrl) {
      config.endpoint = studioUrl;
    }

    this.client = createClient(config);
  }

  /**
   * Update the address used for write transactions
   */
  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      account: address as `0x${string}`,
    };

    this.client = createClient(config);
  }

  // ─── READS ──────────────────────────────────────────────────────────────

  /**
   * Get the total number of rooms created.
   * Maps to: get_room_count() -> int
   */
  async getRoomCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_room_count",
        args: [],
      });

      return Number(count) || 0;
    } catch (error) {
      console.error("Error fetching room count:", error);
      throw new Error("Failed to fetch room count from contract");
    }
  }

  /**
   * Get the leaderboard for a specific room after finalization.
   * Maps to: get_room_leaderboard(room_id) -> JSON string
   * Contract returns a JSON string — parsed here into typed array.
   */
  async getRoomLeaderboard(roomId: number): Promise<RoomLeaderboardEntry[]> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_room_leaderboard",
        args: [roomId],
      });

      // Contract returns a JSON string
      const parsed: { player: string; score: number }[] =
        typeof raw === "string" ? JSON.parse(raw) : raw;

      return parsed.map((e) => ({
        player: e.player,
        score: Number(e.score),
      }));
    } catch (error) {
      console.error("Error fetching room leaderboard:", error);
      // Return empty — room may not be finalized yet
      return [];
    }
  }

  // ─── WRITES ─────────────────────────────────────────────────────────────

  /**
   * Create a new game room with the given prompt.
   * Maps to: create_room(prompt: str)
   */
  async createRoom(prompt: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "create_room",
        args: [prompt],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error creating room:", error);
      throw new Error("Failed to create room");
    }
  }

  /**
   * Submit an answer to a room.
   * Maps to: submit_answer(room_id: int, answer: str)
   */
  async submitAnswer(roomId: number, answer: string): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "submit_answer",
        args: [roomId, answer],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 24,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw new Error("Failed to submit answer");
    }
  }

  /**
   * Finalize a game — triggers AI jury consensus via Optimistic Democracy.
   * Maps to: finalize_game(room_id: int)
   *
   * Note: retries are higher here (60 vs 24) because the consensus
   * mechanism (gl.eq_principle.strict_eq) takes longer to resolve
   * than standard writes.
   */
  async finalizeGame(roomId: number): Promise<TransactionReceipt> {
    try {
      const txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "finalize_game",
        args: [roomId],
        value: BigInt(0),
      });

      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED" as any,
        retries: 60,
        interval: 5000,
      });

      return receipt as TransactionReceipt;
    } catch (error) {
      console.error("Error finalizing game:", error);
      throw new Error("Failed to finalize game");
    }
  }
}

export default OracleGame;