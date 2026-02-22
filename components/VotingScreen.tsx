"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player, Question, Vote } from "@/lib/types";

interface Props {
  room: Room;
  players: Player[];
  playerId: string;
  question: Question;
  votes: Vote[];
}

export default function VotingScreen({
  room,
  players,
  playerId,
  question,
  votes,
}: Props) {
  const [voting, setVoting] = useState(false);
  const advancingRef = useRef(false);

  const myVote = votes.find((v) => v.player_id === playerId);
  const hasVoted = !!myVote;
  const totalVotes = votes.length;

  // Auto-advance when all players have voted (with status guard)
  const advanceToResults = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    await supabase
      .from("rooms")
      .update({ status: "results" })
      .eq("id", room.id)
      .eq("status", "voting");
  }, [room.id]);

  useEffect(() => {
    if (totalVotes >= players.length && totalVotes > 0) {
      advanceToResults();
    }
  }, [totalVotes, players.length, advanceToResults]);

  async function handleVote(choice: "red" | "black") {
    if (hasVoted || voting) return;
    setVoting(true);

    await supabase.from("votes").insert({
      question_id: question.id,
      player_id: playerId,
      vote: choice,
    });

    setVoting(false);
  }

  const questionNumber =
    room.question_order
      ? room.question_order.indexOf(question.id) + 1
      : 0;
  const totalQuestions = room.question_order?.length ?? 0;

  return (
    <div className="fade-in space-y-8">
      <div className="text-center">
        <p className="text-sm text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
        <p className="text-center text-2xl font-bold leading-relaxed">
          {question.text}
        </p>
      </div>

      {hasVoted ? (
        <div className="space-y-4 text-center">
          <p className="text-lg text-gray-400">
            You voted{" "}
            <span
              className={
                myVote.vote === "red"
                  ? "font-bold text-red-500"
                  : "font-bold text-white"
              }
            >
              {myVote.vote.toUpperCase()}
            </span>
          </p>
          <p className="text-sm text-gray-500">
            {totalVotes} / {players.length} voted
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => {
              const voted = votes.some((v) => v.player_id === p.id);
              return (
                <div
                  key={p.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    voted
                      ? "bg-green-900/50 text-green-400"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {p.name} {voted ? "✓" : "..."}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => handleVote("red")}
            disabled={voting}
            className="pulse-glow w-full rounded-xl bg-red-600 px-6 py-6 text-2xl font-black uppercase tracking-wider transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
          >
            RED
          </button>
          <button
            onClick={() => handleVote("black")}
            disabled={voting}
            className="w-full rounded-xl border-2 border-gray-600 bg-black px-6 py-6 text-2xl font-black uppercase tracking-wider transition hover:border-gray-400 active:scale-95 disabled:opacity-50"
          >
            BLACK
          </button>
        </div>
      )}
    </div>
  );
}
