import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LeaderboardTable from "@/components/LeaderboardTable";
import type { LeaderRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = searchParams.period === "all" ? "all" : "week";
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { p_period: period, p_limit: 20 });

  const tab = (value: "week" | "all", label: string) => (
    <Link
      href={value === "week" ? "/leaderboard" : "/leaderboard?period=all"}
      aria-current={period === value ? "page" : undefined}
      className={`rounded-xl border-2 border-ink px-4 py-2 font-display font-bold ${
        period === value ? "bg-ink text-white" : "bg-white hover:bg-gold/40"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold">Leaderboard</h1>
        <p className="mt-1 text-ink/75">
          {period === "week"
            ? "XP earned since Monday. The board resets every week, so anyone can top it."
            : "Total XP since each player joined."}
        </p>
      </div>
      <div className="flex gap-3">
        {tab("week", "This week")}
        {tab("all", "All time")}
      </div>
      <div className="card overflow-hidden">
        {error ? (
          <p role="alert" className="p-5 font-bold text-coral">
            The leaderboard could not load. Refresh the page to try again.
          </p>
        ) : (
          <LeaderboardTable rows={(data ?? []) as LeaderRow[]} />
        )}
      </div>
    </div>
  );
}
