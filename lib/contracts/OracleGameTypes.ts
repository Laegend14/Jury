// ─── Game Phase ────────────────────────────────────────────
// Tracks where a room is in its lifecycle.
export type GamePhase =
  | "waiting"   // Room created, waiting for players / host to start
  | "active"    // Prompt is live, players are submitting answers
  | "judging"   // Timer ended, AI jury consensus is running
  | "finished"; // Scores committed on-chain, leaderboard available

// ─── Room (list view) ─────────────────────────────────────
// Lightweight shape returned when listing rooms in the lobby.
export interface Room {
  id: number;
  prompt: string;
  phase: GamePhase;
  isFinished: boolean;
  playerCount: number;
}

// ─── Room Detail (in-game view) ───────────────────────────
// Full room state used inside <GameRoom />.
export interface RoomDetail {
  id: number;
  prompt: string;
  phase: GamePhase;
  isFinished: boolean;
  hasSubmitted: boolean;   // whether the connected wallet already submitted
  myAnswer: string;        // the connected wallet's answer (empty if not submitted)
  playerCount: number;
}

// ─── Leaderboard Entry (global) ───────────────────────────
// One row on the global XP leaderboard sidebar.
export interface GlobalLeaderboardEntry {
  player: string;   // wallet address (hex)
  xp: number;       // cumulative XP from global_xp
}

// ─── Leaderboard Entry (per-room) ─────────────────────────
// One row returned by get_room_leaderboard after a game finishes.
export interface RoomLeaderboardEntry {
  player: string;   // wallet address (hex)
  score: number;    // 0–100 score awarded by the AI jury for that round
}