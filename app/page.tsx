import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LeaderboardTable from "@/components/LeaderboardTable";
import type { LeaderRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "⚡", title: "Earn XP", text: "10 XP for every right answer, plus 20 more for a perfect score." },
  { icon: "🏅", title: "Unlock badges", text: "Eight badges to collect, from First steps to Mastermind." },
  { icon: "🔥", title: "Keep your streak", text: "Play every day to grow your streak and climb the weekly board." },
];

export default async function Home() {
  const supabase = createClient();
  const [{ data: { user } }, { data: board }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("get_leaderboard", { p_period: "week", p_limit: 5 }),
  ]);

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Wetin you sabi?
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed">
            Quick quizzes on Nigeria, Africa, science and tech. Answer right, earn XP, unlock
            badges and see your name on the weekly leaderboard.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={user ? "/dashboard" : "/login?mode=signup"} className="btn-primary text-lg">
              {user ? "Go to my dashboard" : "Start playing"}
            </Link>
            {!user && (
              <Link href="/login" className="btn-plain text-lg">
                I have an account
              </Link>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-ink bg-violet px-4 py-3 text-white">
            <h2 className="text-lg font-bold">This week&apos;s top players</h2>
            <span aria-hidden className="text-xl">🏆</span>
          </div>
          <LeaderboardTable rows={(board ?? []) as LeaderRow[]} compact />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5">
            <div aria-hidden className="text-3xl">{f.icon}</div>
            <h3 className="mt-2 text-xl font-bold">{f.title}</h3>
            <p className="mt-1 text-ink/80">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
