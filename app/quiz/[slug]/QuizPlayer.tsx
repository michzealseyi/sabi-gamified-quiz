"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import XpCounter from "@/components/XpCounter";
import Confetti from "@/components/Confetti";
import type { Question, Quiz, SubmitResult } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizPlayer({ quiz, questions }: { quiz: Quiz; questions: Question[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const question = questions[index];
  const chosen = answers[index];
  const isLast = index === questions.length - 1;

  function choose(option: number) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? option : a)));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const { data, error } = await createClient().rpc("submit_quiz", {
      p_quiz_id: quiz.id,
      p_answers: answers,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResult(data as SubmitResult);
    router.refresh(); // update the XP shown in the nav
  }

  function restart() {
    setAnswers(questions.map(() => null));
    setIndex(0);
    setResult(null);
  }

  if (questions.length === 0) {
    return <p className="card p-6">This quiz has no questions yet.</p>;
  }

  if (result) {
    return <Results quiz={quiz} questions={questions} result={result} onReplay={restart} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="text-3xl">{quiz.emoji}</span>
        <h1 className="text-2xl font-extrabold">{quiz.title}</h1>
        <span className="ml-auto font-display font-bold">
          {index + 1} of {questions.length}
        </span>
      </div>

      <ol className="mb-6 flex gap-2" aria-label="Quiz progress">
        {questions.map((q, i) => (
          <li
            key={q.id}
            className={`h-3 flex-1 rounded-full border-2 border-ink ${
              i < index || (i === index && chosen !== null) ? "bg-gold" : i === index ? "bg-white" : "bg-ink/10"
            }`}
          >
            <span className="sr-only">
              Question {i + 1}
              {answers[i] !== null ? ", answered" : ""}
            </span>
          </li>
        ))}
      </ol>

      <div key={question.id} className="card animate-rise p-6 sm:p-8">
        <h2 className="text-2xl font-bold leading-snug sm:text-3xl">{question.prompt}</h2>
        <div role="radiogroup" aria-label="Answer options" className="mt-6 grid gap-3">
          {question.options.map((opt, i) => {
            const selected = chosen === i;
            return (
              <button
                key={i}
                role="radio"
                aria-checked={selected}
                onClick={() => choose(i)}
                className={`flex items-center gap-4 rounded-xl border-2 border-ink px-4 py-3.5 text-left text-lg font-bold transition-transform ${
                  selected ? "-translate-y-0.5 bg-violet text-white shadow-chunky" : "bg-white hover:bg-gold/30"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 font-display ${
                    selected ? "border-white" : "border-ink"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 font-bold text-coral">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <button className="btn-plain" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          Back
        </button>
        {isLast ? (
          <button className="btn-gold text-lg" onClick={submit} disabled={chosen === null || submitting}>
            {submitting ? "Checking answers…" : "Finish quiz"}
          </button>
        ) : (
          <button className="btn-primary text-lg" onClick={() => setIndex(index + 1)} disabled={chosen === null}>
            Next question
          </button>
        )}
      </div>
    </div>
  );
}

function Results({
  quiz,
  questions,
  result,
  onReplay,
}: {
  quiz: Quiz;
  questions: Question[];
  result: SubmitResult;
  onReplay: () => void;
}) {
  const perfect = result.score === result.total;
  const levelledUp = result.new_level > result.old_level;
  const celebrate = perfect || levelledUp || result.new_badges.length > 0;
  const headline = perfect ? "Perfect score!" : result.score >= result.total / 2 ? "Nice one!" : "Good try!";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {celebrate && <Confetti />}

      <section className="card animate-pop p-6 text-center sm:p-8">
        <p className="font-bold">
          {quiz.emoji} {quiz.title}
        </p>
        <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{headline}</h1>
        <p className="mt-3 font-display text-6xl font-extrabold">
          {result.score}
          <span className="text-3xl text-ink/50">/{result.total}</span>
        </p>

        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-gold px-5 py-2 font-display text-2xl font-extrabold shadow-chunky">
          +<XpCounter to={result.xp_awarded} /> XP
        </div>

        {result.xp_awarded === 0 && (
          <p className="mt-3 text-ink/75">
            You earn XP on replays only when you beat your best. Your best here is worth {result.best_before} XP.
          </p>
        )}
        {levelledUp && (
          <p className="mt-4 text-xl font-extrabold text-violet">You reached level {result.new_level}!</p>
        )}
        <p className="mt-3 font-bold">
          <span aria-hidden>🔥</span> {result.streak}-day streak
        </p>
      </section>

      {result.new_badges.length > 0 && (
        <section className="card p-6">
          <h2 className="text-2xl font-extrabold">
            {result.new_badges.length === 1 ? "New badge unlocked" : "New badges unlocked"}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.new_badges.map((b, i) => (
              <li
                key={b.slug}
                className="animate-pop flex items-center gap-3 rounded-xl border-2 border-ink bg-gold/30 p-3"
                style={{ animationDelay: `${300 + i * 150}ms` }}
              >
                <span aria-hidden className="text-4xl">{b.icon}</span>
                <span>
                  <span className="block font-display font-bold">{b.name}</span>
                  <span className="block text-sm">{b.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-2xl font-extrabold">Your answers</h2>
        <ol className="mt-4 space-y-4">
          {result.results.map((r, i) => {
            const q = questions.find((x) => x.id === r.question_id);
            if (!q) return null;
            const right = r.chosen === r.correct_index;
            return (
              <li key={r.question_id} className="border-l-4 pl-4" style={{ borderColor: right ? "#13A36B" : "#E5484D" }}>
                <p className="font-bold">
                  {i + 1}. {q.prompt}
                </p>
                <p className={right ? "text-mint" : "text-coral"}>
                  {right ? "Correct" : "Your answer"}: {q.options[r.chosen]}
                </p>
                {!right && <p className="text-mint">Right answer: {q.options[r.correct_index]}</p>}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
        <button className="btn-plain" onClick={onReplay}>
          Play again
        </button>
        <Link href="/leaderboard" className="btn-plain">
          See leaderboard
        </Link>
      </div>
    </div>
  );
}
