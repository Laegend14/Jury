"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Send,
  Trophy,
  Medal,
  Award,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useSubmitAnswer, useFinalizeGame, useRoomLeaderboard } from "@/lib/hooks/UseOracleGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";
import type { GamePhase } from "@/lib/contracts/OracleGameTypes";

// ─── Constants ────────────────────────────────────────────
const ANSWER_TIME_SECONDS = 120; // 2 min window to write an answer

// ─── Timer display ────────────────────────────────────────
function Timer({ secondsLeft }: { secondsLeft: number }) {
  const isWarning  = secondsLeft <= 30;
  const isCritical = secondsLeft <= 10;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  // SVG ring progress
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / ANSWER_TIME_SECONDS;
  const offset = circumference * (1 - progress);

  const ringClass = isCritical
    ? "game-timer-ring-critical"
    : isWarning
    ? "game-timer-ring-warning"
    : "game-timer-ring-normal";

  return (
    <div className="flex items-center gap-3">
      {/* SVG ring */}
      <svg width="60" height="60" className="-rotate-90">
        {/* Track */}
        <circle
          cx="30" cy="30" r={radius}
          fill="none"
          stroke="oklch(0.25 0.08 265)"
          strokeWidth="4"
        />
        {/* Progress */}
        <circle
          cx="30" cy="30" r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`game-timer-ring ${ringClass}`}
        />
      </svg>

      {/* Numeric label */}
      <span
        className={`text-2xl font-bold tabular-nums ${
          isCritical ? "animate-timer-pulse" :
          isWarning  ? "text-yellow-400"       :
                       "text-foreground"
        }`}
      >
        {display}
      </span>
    </div>
  );
}

// ─── Phase badge (reused from RoomList but self-contained here) ──
function PhaseBadge({ phase }: { phase: GamePhase }) {
  const labels: Record<GamePhase, string> = {
    waiting:  "Waiting for Players",
    active:   "Writing Phase",
    judging:  "AI Jury Deliberating…",
    finished: "Results In",
  };
  const classes: Record<GamePhase, string> = {
    waiting:  "game-phase-waiting",
    active:   "game-phase-active",
    judging:  "game-phase-judging",
    finished: "game-phase-finished",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${classes[phase]}`}>
      {phase === "judging" && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
      {phase === "finished" && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
      {labels[phase]}
    </span>
  );
}

// ─── Room Leaderboard panel (shown in finished phase) ────
function RoomLeaderboardPanel({ roomId }: { roomId: number }) {
  const { data: leaderboard, isLoading } = useRoomLeaderboard(roomId);
  const { address } = useWallet();

  if (isLoading) {
    return (
      <div className="brand-card p-6 mt-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Results
        </h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="brand-card p-6 mt-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Results
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">No scores recorded.</p>
      </div>
    );
  }

  return (
    <div className="brand-card p-6 mt-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-accent" /> Results
      </h3>

      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const rank = i + 1;
          const isMe = address?.toLowerCase() === entry.player?.toLowerCase();
          const podiumClass =
            rank === 1 ? "game-podium-1st" :
            rank === 2 ? "game-podium-2nd" :
            rank === 3 ? "game-podium-3rd" : "";

          return (
            <div
              key={entry.player}
              className={`
                animate-stagger-in
                flex items-center gap-3 p-3 rounded-lg
                ${podiumClass}
                ${isMe ? "border border-accent/50 bg-accent/10" : ""}
              `}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Rank icon */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {rank === 1 && <Trophy className="w-5 h-5" style={{ color: "var(--game-gold)" }} />}
                {rank === 2 && <Medal  className="w-5 h-5" style={{ color: "var(--game-silver)" }} />}
                {rank === 3 && <Award  className="w-5 h-5" style={{ color: "var(--game-bronze)" }} />}
                {rank > 3   && <span className="text-sm font-bold text-muted-foreground">#{rank}</span>}
              </div>

              {/* Address + You badge */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <AddressDisplay address={entry.player} maxLength={10} className="text-sm" showCopy />
                {isMe && (
                  <span className="text-xs bg-accent/30 text-accent px-2 py-0.5 rounded-full font-semibold">
                    You
                  </span>
                )}
              </div>

              {/* Score */}
              <div className="flex-shrink-0 flex items-baseline gap-1">
                <span className="text-lg font-bold text-accent">{entry.score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main GameRoom component ──────────────────────────────
interface GameRoomProps {
  roomId: number;
  onLeaveRoom: () => void;
}

export function GameRoom({ roomId, onLeaveRoom }: GameRoomProps) {
  const { address } = useWallet();

  // Local phase simulation driven by the timer.
  // In a real multi-player setup you'd poll the contract or use a shared
  // signal; here the creator's client drives the flow via finalize.
  const [phase, setPhase]           = useState<GamePhase>("active");
  const [secondsLeft, setSecondsLeft] = useState(ANSWER_TIME_SECONDS);
  const [answer, setAnswer]         = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { submitAnswer, isSubmitting }   = useSubmitAnswer();
  const { finalizeGame, isFinalizing }   = useFinalizeGame();

  // ── Countdown timer (active phase only) ──
  useEffect(() => {
    if (phase !== "active") return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time's up → move to judging
          setPhase("judging");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // ── Auto-finalize when judging phase starts ──
  useEffect(() => {
    if (phase === "judging") {
      finalizeGame(roomId);
    }
  }, [phase, roomId, finalizeGame]);

  // ── Transition to finished after finalizing succeeds ──
  // Poll the room leaderboard; once it has data, flip to finished.
  const { data: leaderboard } = useRoomLeaderboard(roomId);
  useEffect(() => {
    if (phase === "judging" && leaderboard && leaderboard.length > 0) {
      setPhase("finished");
    }
  }, [phase, leaderboard]);

  // ── Submit handler ──
  const handleSubmit = useCallback(() => {
    if (!answer.trim() || hasSubmitted || isSubmitting) return;
    submitAnswer({ roomId, answer: answer.trim() });
    setHasSubmitted(true);
  }, [answer, hasSubmitted, isSubmitting, roomId, submitAnswer]);

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={onLeaveRoom}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Lobby
      </button>

      {/* Header card */}
      <div className="brand-card p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-purple-pink flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-white">#{roomId}</span>
            </div>
            <PhaseBadge phase={phase} />
          </div>

          {/* Timer — visible during active phase */}
          {phase === "active" && <Timer secondsLeft={secondsLeft} />}
        </div>

        {/* Prompt */}
        <div className="mt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
            The Prompt
          </p>
          <p className="text-lg text-foreground leading-relaxed">
            {/* Placeholder — swap with actual prompt from contract once fetched */}
            Write the most creative response you can. The AI jury will score your creativity from 0 to 100.
          </p>
        </div>
      </div>

      {/* ── ACTIVE PHASE: textarea + submit ── */}
      {phase === "active" && (
        <div className="brand-card p-6 animate-fade-in">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Your Answer
          </label>

          <textarea
            className="game-textarea w-full p-3 text-sm min-h-[140px]"
            placeholder="Start writing your answer here…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={hasSubmitted || isSubmitting}
            maxLength={2000}
          />

          {/* Character count + submit row */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {answer.length} / 2000
            </span>

            <button
              className="btn-submit flex items-center gap-2"
              onClick={handleSubmit}
              disabled={!answer.trim() || hasSubmitted || isSubmitting || !address}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : hasSubmitted ? (
                <><CheckCircle2 className="w-4 h-4" /> Submitted</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Answer</>
              )}
            </button>
          </div>

          {/* Wallet not connected warning */}
          {!address && (
            <p className="text-xs text-destructive mt-3">
              Connect your wallet to submit an answer.
            </p>
          )}
        </div>
      )}

      {/* ── JUDGING PHASE: spinner ── */}
      {phase === "judging" && (
        <div className="brand-card p-8 text-center animate-phase-flash">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                 style={{ background: "oklch(0.60 0.20 315 / 0.15)", border: "2px solid oklch(0.60 0.20 315 / 0.4)" }}>
              <Loader2 className="w-8 h-8 animate-jury-spin" style={{ color: "oklch(0.60 0.20 315)" }} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">AI Jury is Deliberating</p>
              <p className="text-sm text-muted-foreground mt-1">
                GenLayer's Optimistic Democracy consensus is scoring all submissions…
              </p>
            </div>
            {isFinalizing && (
              <p className="text-xs text-muted-foreground">Transaction pending on-chain…</p>
            )}
          </div>
        </div>
      )}

      {/* ── FINISHED PHASE: leaderboard ── */}
      {phase === "finished" && <RoomLeaderboardPanel roomId={roomId} />}
    </div>
  );
}