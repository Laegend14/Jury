"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { useCreateRoom } from "@/lib/hooks/UseOracleGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";

// A few prompt suggestions the host can tap to prefill
const PROMPT_SUGGESTIONS = [
  "Describe an alien visiting Earth for the first time.",
  "Write a product review for an invention that doesn't exist yet.",
  "Explain quantum physics to a curious five-year-old.",
  "Pitch a startup idea that solves a ridiculous problem.",
  "Describe the perfect day on a planet that isn't Earth.",
];

export function CreateRoomModal() {
  const { isConnected, address, isLoading } = useWallet();
  const { createRoom, isCreating, isSuccess } = useCreateRoom();

  const [isOpen, setIsOpen]     = useState(false);
  const [prompt, setPrompt]     = useState("");
  const [promptError, setPromptError] = useState("");

  // Auto-close when wallet disconnects (unless tx is in flight)
  useEffect(() => {
    if (!isConnected && isOpen && !isCreating) {
      setIsOpen(false);
    }
  }, [isConnected, isOpen, isCreating]);

  // Reset + close on success
  useEffect(() => {
    if (isSuccess) {
      resetForm();
      setIsOpen(false);
    }
  }, [isSuccess]);

  const validateForm = (): boolean => {
    if (!prompt.trim()) {
      setPromptError("A prompt is required to create a room.");
      return false;
    }
    if (prompt.trim().length < 10) {
      setPromptError("Prompt should be at least 10 characters.");
      return false;
    }
    setPromptError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      error("Please connect your wallet first");
      return;
    }
    if (!validateForm()) return;
    createRoom(prompt.trim());
  };

  const resetForm = () => {
    setPrompt("");
    setPromptError("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isCreating) resetForm();
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" disabled={!isConnected || !address || isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Create Room
        </Button>
      </DialogTrigger>

      <DialogContent className="brand-card border-2 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create a Game Room</DialogTitle>
          <DialogDescription>
            Write a creative prompt. Players will compete to give the best answer — judged by AI consensus.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Prompt textarea */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              The Prompt
            </Label>

            <textarea
              id="prompt"
              className={`game-textarea w-full p-3 text-sm min-h-[120px] ${promptError ? "border-destructive" : ""}`}
              placeholder="e.g. Describe an alien visiting Earth for the first time…"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setPromptError("");
              }}
              maxLength={500}
            />

            <div className="flex items-center justify-between">
              <p className={`text-xs ${promptError ? "text-destructive" : "text-muted-foreground"}`}>
                {promptError || "Be creative — this is what players will respond to."}
              </p>
              <span className="text-xs text-muted-foreground">{prompt.length} / 500</span>
            </div>
          </div>

          {/* Quick-pick suggestions */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Or pick a suggestion
            </Label>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setPrompt(suggestion);
                    setPromptError("");
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground hover:border-accent/50 hover:text-accent transition-all"
                >
                  {suggestion.slice(0, 40)}…
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={isCreating || !prompt.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Room"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}