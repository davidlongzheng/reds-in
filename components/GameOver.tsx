"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player } from "@/lib/types";

interface Props {
  room: Room;
  players: Player[];
  playerId: string;
}

export default function GameOver({ room, players, playerId }: Props) {
  const [resetting, setResetting] = useState(false);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;

  async function handlePlayAgain() {
    setResetting(true);

    // Delete old questions and votes (cascade handles votes)
    await supabase.from("questions").delete().eq("room_id", room.id);

    // Reset player scores (batch update)
    await supabase.from("players").update({ score: 0 }).eq("room_id", room.id);

    // Reset room state
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        current_question_index: 0,
        question_order: null,
        question_deadline: null,
      })
      .eq("id", room.id);
  }

  return (
    <div className="fade-in space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-black">Game Over!</h2>
      </div>

      <div className="space-y-3">
        {sorted.map((p, i) => {
          const isWinner = p.score === topScore && topScore > 0;
          const isYou = p.id === playerId;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-5 py-4 ${
                isWinner
                  ? "border border-yellow-500/50 bg-yellow-900/20"
                  : "border border-gray-800 bg-[#1a1a1a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-center text-2xl font-black text-gray-600">
                  {i + 1}
                </span>
                <div>
                  <span className="font-bold">
                    {isWinner && "👑 "}
                    {p.name}
                  </span>
                  {isYou && (
                    <span className="ml-2 text-sm text-gray-500">(you)</span>
                  )}
                </div>
              </div>
              <span
                className={`text-2xl font-black ${
                  isWinner ? "text-yellow-400" : "text-gray-400"
                }`}
              >
                {p.score}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={handlePlayAgain}
        disabled={resetting}
        className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
      >
        {resetting ? "Resetting..." : "Play Again"}
      </button>
    </div>
  );
}
