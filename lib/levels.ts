// Must match public.level_for_xp() in supabase/schema.sql.
// Level 1 = 0 XP, level 2 = 50, level 3 = 200, level 4 = 450, level 5 = 800 ...
export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 50)) + 1;
}

export function xpForLevel(level: number) {
  return 50 * (level - 1) ** 2;
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    next,
    toNext: next - xp,
    pct: Math.round(((xp - start) / (next - start)) * 100),
  };
}
