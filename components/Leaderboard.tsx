"use client";

import { Trophy, Medal, Award, Loader2, AlertCircle } from "lucide-react";
import { useGlobalLeaderboard, useOracleGameContract } from "@/lib/hooks/UseOracleGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { AddressDisplay } from "./AddressDisplay";

export function Leaderboard() {
  const contract = useOracleGameContract();
  const { data: leaderboard, isLoading, isError } = useGlobalLeaderboard();
  const { address } = useWallet();

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Global XP
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  // ─── No contract configured ───
  if (!contract) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Global XP
        </h2>
        <div className="text-center py-8 space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 opacity-60" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Setup Required</p>
            <p className="text-xs text-muted-foreground">Contract address not configured</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Fetch error ───
  if (isError || !leaderboard) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Global XP
        </h2>
        <div className="text-center py-8">
          <p className="text-sm text-destructive">Failed to load leaderboard</p>
        </div>
      </div>
    );
  }

  // ─── Empty state ───
  if (leaderboard.length === 0) {
    return (
      <div className="brand-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          Global XP
        </h2>
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">No players yet — be the first!</p>
        </div>
      </div>
    );
  }

  // ─── Populated leaderboard ───
  return (
    <div className="brand-card p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-accent" />
        Global XP
      </h2>

      <div className="space-y-2">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = address?.toLowerCase() === entry.player?.toLowerCase();
          const rank = index + 1;

          // Podium class for top 3
          const podiumClass =
            rank === 1 ? "game-podium-1st" :
            rank === 2 ? "game-podium-2nd" :
            rank === 3 ? "game-podium-3rd" : "";

          return (
            <div
              key={entry.player}
              className={`
                animate-stagger-in
                flex items-center gap-3 p-3 rounded-lg transition-all
                ${podiumClass}
                ${isCurrentUser
                  ? "border border-accent/50 bg-accent/10"
                  : rank > 3 ? "hover:bg-white/5" : ""
                }
              `}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Rank Icon / Number */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {rank === 1 && <Trophy className="w-5 h-5" style={{ color: "var(--game-gold)" }} />}
                {rank === 2 && <Medal  className="w-5 h-5" style={{ color: "var(--game-silver)" }} />}
                {rank === 3 && <Award  className="w-5 h-5" style={{ color: "var(--game-bronze)" }} />}
                {rank > 3 && (
                  <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                )}
              </div>

              {/* Address */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <AddressDisplay
                    address={entry.player}
                    maxLength={10}
                    className="text-sm"
                    showCopy={true}
                  />
                  {isCurrentUser && (
                    <span className="text-xs bg-accent/30 text-accent px-2 py-0.5 rounded-full font-semibold">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* XP Score */}
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-accent">{entry.xp}</span>
                  <span className="text-xs text-muted-foreground">XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Truncation notice */}
      {leaderboard.length > 10 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-center text-muted-foreground">
            Showing top {Math.min(10, leaderboard.length)} players
          </p>
        </div>
      )}
    </div>
  );
}