import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelProgress } from "@/lib/levels";
import ProgressBar from "@/components/ProgressBar";
import type { Badge, Profile, Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";

type AttemptRow = {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  xp_awarded: number;
  created_at: string;
};

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, quizzesRes, badgesRes, earnedRes, attemptsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("quizzes").select("id, slug, title, description, emoji").order("sort_order"),
    supabase.from("badges").select("id, slug, name, description, icon").order("sort_order"),
    supabase.from("user_badges").select("badge_id, earned_at"),
    supabase
      .from("attempts")
      .select("id, quiz_id, score, total, xp_awarded, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data as Profile | null;
  const quizzes = (quizzesRes.data ?? []) as Quiz[];
  const badges = (badgesRes.data ?? []) as Badge[];
  const earned = new Set((earnedRes.data ?? []).map((b) => b.badge_id as string));
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];

  const xp = profile?.xp ?? 0;
  const { level, pct, toNext, next } = levelProgress(xp);

  const best = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const prev = best.get(a.quiz_id);
    if (!prev || a.score > prev.score) best.set(a.quiz_id, { score: a.score, total: a.total });
  }
  const quizTitle = new Map(quizzes.map((q) => [q.id, `${q.emoji} ${q.title}`]));

  return (
    <div className="space-y-10">
      {/* Player card */}
      <section className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
        <div
          className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-[3px] border-ink bg-gold shadow-chunky"
          aria-label={`Level ${level}`}
        >
          <span className="text-sm font-bold">Level</span>
          <span className="font-display text-5xl font-extrabold leading-none">{level}</span>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Hi, {profile?.display_name ?? "player"}</h1>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm font-bold">
              <span>{xp} XP</span>
              <span>
                {toNext} XP to level {level + 1}
              </span>
            </div>
            <ProgressBar pct={pct} label={`${xp} of ${next} XP towards level ${level + 1}`} />
          </div>
          <p className="mt-4 font-bold">
            <span aria-hidden>🔥</span> {profile?.current_streak ?? 0}-day streak
            <span className="ml-3 font-normal text-ink/70">Best: {profile?.longest_streak ?? 0} days</span>
          </p>
        </div>
      </section>

      {/* Quizzes */}
      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Pick a quiz</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => {
            const b = best.get(q.id);
            const perfect = b && b.score === b.total;
            return (
              <Link
                key={q.id}
                href={`/quiz/${q.slug}`}
                className="card group flex items-start gap-4 p-5 transition-transform hover:-translate-y-1"
              >
                <span aria-hidden className="text-4xl">{q.emoji}</span>
                <span className="flex-1">
                  <span className="block font-display text-xl font-bold group-hover:text-violet">{q.title}</span>
                  <span className="block text-ink/75">{q.description}</span>
                  <span className="mt-2 block text-sm font-bold">
                    {b ? (
                      <span className={perfect ? "text-mint" : ""}>
                        Best score {b.score}/{b.total}
                        {perfect ? " · Perfect" : " · Beat it for more XP"}
                      </span>
                    ) : (
                      <span className="text-violet">New · up to 70 XP</span>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="mb-4 text-2xl font-extrabold">
          Badges <span className="text-lg font-bold text-ink/60">{earned.size} of {badges.length}</span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => {
            const has = earned.has(b.id);
            return (
              <li
                key={b.id}
                className={`rounded-2xl border-2 p-4 text-center ${
                  has ? "border-ink bg-white shadow-chunky-sm" : "border-dashed border-ink/30 bg-white/40"
                }`}
              >
                <div aria-hidden className={`text-4xl ${has ? "" : "opacity-30 grayscale"}`}>
                  {has ? b.icon : "🔒"}
                </div>
                <div className={`mt-2 font-display font-bold ${has ? "" : "text-ink/60"}`}>{b.name}</div>
                <div className="text-sm text-ink/70">{b.description}</div>
                <span className="sr-only">{has ? "Earned" : "Not earned yet"}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="mb-4 text-2xl font-extrabold">Recent activity</h2>
        {attempts.length === 0 ? (
          <p className="card p-5">Your finished quizzes will show here. Pick one above to start.</p>
        ) : (
          <ul className="card divide-y-2 divide-ink/10">
            {attempts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span className="flex-1 font-bold">{quizTitle.get(a.quiz_id)}</span>
                <span>
                  {a.score}/{a.total}
                </span>
                <span className={`font-display font-bold ${a.xp_awarded > 0 ? "text-violet" : "text-ink/50"}`}>
                  +{a.xp_awarded} XP
                </span>
                <time className="w-full text-sm text-ink/60 sm:w-auto" dateTime={a.created_at}>
                  {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
