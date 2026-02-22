"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player, Question } from "@/lib/types";

interface Props {
  room: Room;
  players: Player[];
  playerId: string;
  questions: Question[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuestionEntry({
  room,
  players,
  playerId,
  questions,
}: Props) {
  const [text, setText] = useState("");
  const [number, setNumber] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const advancingRef = useRef(false);

  const hasSubmitted = questions.some((q) => q.player_id === playerId);
  const allSubmitted = players.every((p) =>
    questions.some((q) => q.player_id === p.id)
  );

  // Advance to voting phase — guarded against concurrent calls
  const advanceToVoting = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    // Re-fetch questions to get the latest state
    const { data: latestQuestions } = await supabase
      .from("questions")
      .select()
      .eq("room_id", room.id);

    const qs = latestQuestions ?? questions;
    if (qs.length === 0) {
      advancingRef.current = false;
      return;
    }

    const order = shuffleArray(qs.map((q) => q.id));

    // Only transition if still in question_entry (prevents duplicate transitions)
    await supabase
      .from("rooms")
      .update({
        status: "voting",
        question_order: order,
        current_question_index: 0,
      })
      .eq("id", room.id)
      .eq("status", "question_entry");
  }, [room.id, questions]);

  // Countdown timer
  useEffect(() => {
    if (!room.question_deadline) return;

    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(room.question_deadline!).getTime() - Date.now()) / 1000
        )
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        advanceToVoting();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [room.question_deadline, advanceToVoting]);

  // Auto-advance when all submitted — only the submitter's client triggers
  // (their handleSubmit calls advanceToVoting after insert)
  // This effect is a fallback for clients that see allSubmitted via realtime
  useEffect(() => {
    if (allSubmitted && questions.length > 0 && questions.length === players.length) {
      advanceToVoting();
    }
  }, [allSubmitted, questions.length, players.length, advanceToVoting]);

  async function handleSubmit() {
    if (!text.trim() || hasSubmitted) return;
    setSubmitting(true);

    await supabase.from("questions").insert({
      room_id: room.id,
      player_id: playerId,
      text: text.trim(),
      number,
    });

    setSubmitted(true);
    setSubmitting(false);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = room.question_deadline
    ? Math.max(0, timeLeft / 120)
    : 1;

  return (
    <div className="fade-in space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">Complete the prompt</h2>
        <p className="mt-1 text-sm text-gray-400">
          How many will be <span className="font-bold text-red-500">REDS IN</span>?
        </p>
      </div>

      {/* Timer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Time remaining</span>
          <span className="font-mono text-lg font-bold">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {hasSubmitted || submitted ? (
        <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-6 text-center">
          <p className="text-lg font-medium text-green-400">
            Question submitted!
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Waiting for other players...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 focus-within:border-red-600">
            <p className="text-lg font-bold text-red-500">Reds in if...</p>
            <textarea
              placeholder='e.g. "you would rather fight 100 duck-sized horses or 1 horse-sized duck"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              rows={2}
              className="mt-1 w-full resize-none bg-transparent text-lg outline-none"
              autoFocus
            />
          </div>

          <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-4">
            <label className="mb-3 block text-sm text-gray-400">
              How many will say{" "}
              <span className="font-bold text-red-500">RED</span>?
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setNumber(Math.max(0, number - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 text-2xl font-bold transition hover:bg-gray-700"
              >
                -
              </button>
              <span className="w-16 text-center font-mono text-4xl font-black text-red-500">
                {number}
              </span>
              <button
                onClick={() =>
                  setNumber(Math.min(players.length, number + 1))
                }
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 text-2xl font-bold transition hover:bg-gray-700"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">
              out of {players.length} players
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold transition hover:bg-red-700 active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Question"}
          </button>
        </div>
      )}

      {/* Submission status */}
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((p) => {
          const hasQ = questions.some((q) => q.player_id === p.id);
          return (
            <div
              key={p.id}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                hasQ
                  ? "bg-green-900/50 text-green-400"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {p.name} {hasQ ? "✓" : "..."}
            </div>
          );
        })}
      </div>
    </div>
  );
}
