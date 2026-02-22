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
    if (!pid) {
      router.push("/");
      return;
    }
    setPlayerId(pid);

    (async () => {
      const r = await fetchRoom();
      if (!r) {
        router.push("/");
        return;
      }
      await fetchPlayers(r.id);
      await fetchQuestions(r.id);
      setLoading(false);
    })();
  }, [code, router, fetchRoom, fetchPlayers, fetchQuestions]);

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

  if (loading || !room || !playerId) {
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
