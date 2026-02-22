"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player } from "@/lib/types";

interface Props {
  room: Room;
  players: Player[];
  playerId: string;
}

export default function Lobby({ room, players, playerId }: Props) {
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    if (players.length < 1) return;
    setStarting(true);

    const deadline = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    await supabase
      .from("rooms")
      .update({
        status: "question_entry",
        question_deadline: deadline,
      })
      .eq("id", room.id);
  }

  return (
    <div className="fade-in space-y-6">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
          Room Code
        </h2>
        <p className="mt-1 font-mono text-5xl font-black tracking-widest text-red-600">
          {room.code}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Share this code with your friends
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-4">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
          Players ({players.length})
        </h3>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg bg-[#0a0a0a] px-4 py-3"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">
                {p.name}
                {p.id === playerId && (
                  <span className="ml-2 text-sm text-gray-500">(you)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {players.length < 1 && (
        <p className="text-center text-sm text-gray-500">
          Need at least 1 player to start
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={players.length < 1 || starting}
        className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
      >
        {starting ? "Starting..." : "Start Game"}
      </button>
    </div>
  );
}
