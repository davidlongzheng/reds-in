"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Room, Player, Question, Vote } from "@/lib/types";
import Lobby from "@/components/Lobby";
import QuestionEntry from "@/components/QuestionEntry";
import VotingScreen from "@/components/VotingScreen";
import ResultsScreen from "@/components/ResultsScreen";
import GameOver from "@/components/GameOver";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // Keep a ref to questions so the votes callback can access the latest list
  const questionsRef = useRef<Question[]>([]);
  questionsRef.current = questions;

  const roomIdRef = useRef<string | null>(null);

  const fetchRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select()
      .eq("code", code)
      .single();
    if (data) {
      setRoom(data as Room);
      roomIdRef.current = data.id;
    }
    return data as Room | null;
  }, [code]);

  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("players")
      .select()
      .eq("room_id", roomId)
      .order("created_at");
    if (data) setPlayers(data as Player[]);
  }, []);

  const fetchQuestions = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("questions")
      .select()
      .eq("room_id", roomId);
    if (data) setQuestions(data as Question[]);
  }, []);

  const fetchVotesForCurrentQuestions = useCallback(async () => {
    const qids = questionsRef.current.map((q) => q.id);
    if (qids.length === 0) {
      setVotes([]);
      return;
    }
    const { data } = await supabase
      .from("votes")
      .select()
      .in("question_id", qids);
    if (data) setVotes(data as Vote[]);
  }, []);

  // Initial load
  useEffect(() => {
    const pid = localStorage.getItem(`player_${code}`);

    (async () => {
      const r = await fetchRoom();
      if (!r) {
        router.push("/");
        return;
      }

      if (!pid) {
        // No player ID — show join form instead of redirecting
        setNeedsJoin(true);
        setLoading(false);
        return;
      }

      setPlayerId(pid);
      await fetchPlayers(r.id);
      await fetchQuestions(r.id);
      setLoading(false);
    })();
  }, [code, router, fetchRoom, fetchPlayers, fetchQuestions]);

  async function handleJoin() {
    if (!joinName.trim()) {
      setJoinError("Enter your name");
      return;
    }
    if (!room) return;
    if (room.status !== "lobby") {
      setJoinError("Game already in progress");
      return;
    }
    setJoining(true);
    setJoinError("");

    const { data: player, error } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: joinName.trim() })
      .select()
      .single();

    if (error || !player) {
      setJoinError("Failed to join room");
      setJoining(false);
      return;
    }

    localStorage.setItem(`player_${code}`, player.id);
    localStorage.setItem(`player_name_${code}`, joinName.trim());
    setPlayerId(player.id);
    setNeedsJoin(false);
    await fetchPlayers(room.id);
    await fetchQuestions(room.id);
  }

  // Fetch votes when questions change
  useEffect(() => {
    fetchVotesForCurrentQuestions();
  }, [questions, fetchVotesForCurrentQuestions]);

  // Realtime subscriptions — only depend on room.id (stable)
  useEffect(() => {
    if (!roomIdRef.current) return;
    const rid = roomIdRef.current;

    const channel = supabase
      .channel(`room-${rid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${rid}`,
        },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${rid}`,
        },
        () => fetchPlayers(rid)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `room_id=eq.${rid}`,
        },
        () => fetchQuestions(rid)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        () => fetchVotesForCurrentQuestions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    loading, // re-subscribe after initial load sets roomIdRef
    fetchPlayers,
    fetchQuestions,
    fetchVotesForCurrentQuestions,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (needsJoin) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">
              REDS <span className="text-red-600">IN</span>
            </h1>
            <p className="mt-2 text-gray-400">
              Join room <span className="font-mono font-bold text-red-600">{code}</span>
            </p>
          </div>
          <div className="fade-in space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={20}
              className="w-full rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-4 text-lg outline-none focus:border-red-600"
              autoFocus
            />
            {joinError && <p className="text-sm text-red-400">{joinError}</p>}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!room || !playerId) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  // Get the current question based on question_order and current_question_index
  const currentQuestionId =
    room.question_order &&
    room.current_question_index < room.question_order.length
      ? room.question_order[room.current_question_index]
      : null;
  const currentQuestion = currentQuestionId
    ? (questions.find((q) => q.id === currentQuestionId) ?? null)
    : null;
  const currentVotes = currentQuestion
    ? votes.filter((v) => v.question_id === currentQuestion.id)
    : [];

  return (
    <main className="flex min-h-dvh flex-col items-center p-4 pt-8">
      <div className="w-full max-w-md">
        {room.status === "lobby" && (
          <Lobby room={room} players={players} playerId={playerId} />
        )}
        {room.status === "question_entry" && (
          <QuestionEntry
            room={room}
            players={players}
            playerId={playerId}
            questions={questions}
          />
        )}
        {room.status === "voting" && currentQuestion && (
          <VotingScreen
            room={room}
            players={players}
            playerId={playerId}
            question={currentQuestion}
            votes={currentVotes}
          />
        )}
        {room.status === "results" && currentQuestion && (
          <ResultsScreen
            room={room}
            players={players}
            playerId={playerId}
            question={currentQuestion}
            votes={currentVotes}
          />
        )}
        {room.status === "game_over" && (
          <GameOver room={room} players={players} playerId={playerId} />
        )}
      </div>
    </main>
  );
}
