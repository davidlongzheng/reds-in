"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError("");

    const code = generateCode();
    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({ code })
      .select()
      .single();

    if (roomErr || !room) {
      setError("Failed to create room");
      setLoading(false);
      return;
    }

    const { data: player, error: playerErr } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: name.trim() })
      .select()
      .single();

    if (playerErr || !player) {
      setError("Failed to join room");
      setLoading(false);
      return;
    }

    localStorage.setItem(`player_${code}`, player.id);
    localStorage.setItem(`player_name_${code}`, name.trim());
    router.push(`/room/${code}`);
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 5) {
      setError("Room code must be 5 letters");
      return;
    }
    setLoading(true);
    setError("");

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select()
      .eq("code", code)
      .single();

    if (roomErr || !room) {
      setError("Room not found");
      setLoading(false);
      return;
    }

    if (room.status !== "lobby") {
      setError("Game already in progress");
      setLoading(false);
      return;
    }

    const { data: player, error: playerErr } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: name.trim() })
      .select()
      .single();

    if (playerErr || !player) {
      setError("Failed to join room");
      setLoading(false);
      return;
    }

    localStorage.setItem(`player_${code}`, player.id);
    localStorage.setItem(`player_name_${code}`, name.trim());
    router.push(`/room/${code}`);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-black tracking-tight">
            REDS <span className="text-red-600">IN</span>
          </h1>
          <p className="mt-2 text-gray-400">A party game of prediction</p>
        </div>

        {mode === "home" && (
          <div className="fade-in space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-6 py-4 text-lg font-bold transition hover:border-gray-600 active:scale-95"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="fade-in space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-4 text-lg outline-none focus:border-red-600"
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
            <button
              onClick={() => {
                setMode("home");
                setError("");
              }}
              className="w-full py-2 text-gray-400 transition hover:text-white"
            >
              Back
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="fade-in space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-4 text-lg outline-none focus:border-red-600"
              autoFocus
            />
            <input
              type="text"
              placeholder="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={5}
              className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-4 text-center font-mono text-2xl tracking-widest outline-none focus:border-red-600"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Room"}
            </button>
            <button
              onClick={() => {
                setMode("home");
                setError("");
              }}
              className="w-full py-2 text-gray-400 transition hover:text-white"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
