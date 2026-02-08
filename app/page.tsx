"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { RoomList } from "@/components/RoomList";
import { GameRoom } from "@/components/GameRoom";
import { Leaderboard } from "@/components/Leaderboard";

export default function HomePage() {
  // null = lobby view, number = inside a room
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Content - Padding to account for fixed navbar */}
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* ─── LOBBY VIEW (no active room) ─── */}
          {activeRoomId === null ? (
            <>
              {/* Hero */}
              <div className="text-center mb-8 animate-fade-in">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  Oracle Game
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  A multiplayer creativity battle powered by GenLayer's
                  <span className="text-accent"> Intelligent Contracts</span> and
                  <span className="text-accent"> Optimistic Democracy</span>.
                  <br />
                  Write. Compete. Let the AI jury decide.
                </p>
              </div>

              {/* Main Grid — Room List + Global Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Left — Room List (create / join) */}
                <div className="lg:col-span-8 animate-slide-up">
                  <RoomList onJoinRoom={setActiveRoomId} />
                </div>

                {/* Right — Global Leaderboard */}
                <div className="lg:col-span-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
                  <Leaderboard />
                </div>
              </div>

              {/* How It Works */}
              <div className="mt-8 brand-card p-6 md:p-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="text-accent font-bold text-lg">1. Join a Room</div>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet, then create or join an existing game room.
                      Wait for other players to join before the game starts.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-accent font-bold text-lg">2. Read the Prompt</div>
                    <p className="text-sm text-muted-foreground">
                      A creative prompt is revealed. You have a limited window to craft
                      the most compelling, creative response you can.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-accent font-bold text-lg">3. AI Jury Judges</div>
                    <p className="text-sm text-muted-foreground">
                      Once time is up, GenLayer's Optimistic Democracy consensus kicks in.
                      Multiple AI nodes score your answers — no single point of failure.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-accent font-bold text-lg">4. Earn XP</div>
                    <p className="text-sm text-muted-foreground">
                      Scores are committed on-chain. Top performers earn XP that
                      accumulates on the global leaderboard. Play again weekly!
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ─── IN-GAME VIEW (room active) ─── */
            <div className="animate-phase-flash">
              <GameRoom
                roomId={activeRoomId}
                onLeaveRoom={() => setActiveRoomId(null)}
              />
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-2">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Powered by GenLayer
            </a>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Studio
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Docs
            </a>
            <a
              href="https://github.com/genlayerlabs/genlayer-project-boilerplate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}