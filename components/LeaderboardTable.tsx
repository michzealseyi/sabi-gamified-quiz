import type { LeaderRow } from "@/lib/types";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardTable({ rows, compact = false }: { rows: LeaderRow[]; compact?: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="p-5 text-center text-ink/70">
        No scores yet. Finish a quiz to put your name on the board.
      </p>
    );
  }

  return (
    <ol className="divide-y-2 divide-ink/10">
      {rows.map((r) => (
        <li
          key={`${r.rank_pos}-${r.player_name}-${r.is_me}`}
          className={`flex items-center gap-3 px-4 ${compact ? "py-2.5" : "py-3.5"} ${
            r.is_me ? "bg-gold/30" : ""
          }`}
        >
          <span className="w-8 text-center font-display text-lg font-bold">
            {MEDALS[r.rank_pos] ?? r.rank_pos}
          </span>
          <span className="flex-1 truncate font-bold">
            {r.player_name}
            {r.is_me && <span className="ml-2 text-sm font-normal">(you)</span>}
          </span>
          {!compact && <span className="text-sm text-ink/70">Lv {r.player_level}</span>}
          <span className="font-display font-bold tabular-nums">{r.points} XP</span>
        </li>
      ))}
    </ol>
  );
}
