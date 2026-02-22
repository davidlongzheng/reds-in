"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player, Question, Vote } from "@/lib/types";

interface Props {
  room: Room;
  players: Player[];
  playerId: string;
  question: Question;
  votes: Vote[];
}

export default function ResultsScreen({
  room,
  players,
  playerId,
  question,
  votes,
}: Props) {
  const [advancing, setAdvancing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const scoredRef = useRef(false);

  const redCount = votes.filter((v) => v.vote === "red").length;
  const blackCount = votes.filter((v) => v.vote === "black").length;
  const asker = players.find((p) => p.id === question.player_id);
  const scored = redCount === question.number;
  const isAsker = playerId === question.player_id;

  // Only the asker's client awards the point (prevents N-client duplication)
  useEffect(() => {
    if (scored && isAsker && !scoredRef.current) {
      scoredRef.current = true;
      setShowConfetti(true);
      (async () => {
        if (!asker) return;
        await supabase
          .from("players")
          .update({ score: asker.score + 1 })
          .eq("id", asker.id);
      })();
    } else if (scored) {
      setShowConfetti(true);
    }
  }, [scored, isAsker, asker?.id, asker?.score]);

  async function handleNext() {
    setAdvancing(true);

    const nextIndex = room.current_question_index + 1;
    const totalQuestions = room.question_order?.length ?? 0;

    if (nextIndex >= totalQuestions) {
      await supabase
        .from("rooms")
        .update({ status: "game_over" })
        .eq("id", room.id);
    } else {
      await supabase
        .from("rooms")
        .update({
          status: "voting",
          current_question_index: nextIndex,
        })
        .eq("id", room.id);
    }
  }

  const questionNumber = room.question_order
    ? room.question_order.indexOf(question.id) + 1
    : 0;
  const totalQuestions = room.question_order?.length ?? 0;

  return (
    <div className="fade-in space-y-6">
      {/* Confetti */}
      {showConfetti &&
        Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ["#dc2626", "#f59e0b", "#10b981", "#3b82f6"][
                i % 4
              ],
              animationDelay: `${Math.random() * 1}s`,
              borderRadius: Math.random() > 0.5 ? "50%" : "0",
            }}
          />
        ))}

      <div className="text-center">
        <p className="text-sm text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-4">
        <p className="text-center text-sm font-bold text-red-500">Reds in if...</p>
        <p className="mt-1 text-center text-lg font-bold">{question.text}</p>
      </div>

      {/* Vote counts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-red-600/20 p-6 text-center">
          <p className="text-4xl font-black text-red-500">{redCount}</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-wider text-red-400">
            Red
          </p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-black/50 p-6 text-center">
          <p className="text-4xl font-black">{blackCount}</p>
          <p className="mt-1 text-sm font-bold uppercase tracking-wider text-gray-400">
            Black
          </p>
        </div>
      </div>

      {/* Asker reveal */}
      <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-4 text-center">
        <p className="text-sm text-gray-400">Asked by</p>
        <p className="mt-1 text-xl font-bold">{asker?.name ?? "Unknown"}</p>
        <p className="mt-2 text-gray-400">
          Predicted{" "}
          <span className="font-bold text-red-500">{question.number}</span>{" "}
          red {question.number === 1 ? "vote" : "votes"}
        </p>
      </div>

      {/* Scoring */}
      <div
        className={`rounded-xl p-4 text-center ${
          scored
            ? "border border-green-600/50 bg-green-900/20"
            : "border border-gray-800 bg-[#1a1a1a]"
        }`}
      >
        {scored ? (
          <p className="text-2xl font-black text-green-400">
            +1 Point! Nailed it!
          </p>
        ) : (
          <p className="text-lg text-gray-500">
            No point — predicted {question.number}, got {redCount}
          </p>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={advancing}
        className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
      >
        {advancing
          ? "Loading..."
          : questionNumber >= totalQuestions
            ? "Final Scores"
            : "Next Question"}
      </button>
    </div>
  );
}
