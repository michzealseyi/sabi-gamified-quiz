import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { levelForXp } from "@/lib/levels";
import SignOutButton from "./SignOutButton";

export default async function Nav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let xp = 0;
  if (user) {
    const { data } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
    xp = data?.xp ?? 0;
  }

  return (
    <header className="border-b-2 border-ink bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
          sabi<span className="text-gold">.</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-bold">
          {user && <Link href="/dashboard" className="hover:text-violet">Dashboard</Link>}
          <Link href="/leaderboard" className="hover:text-violet">Leaderboard</Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span
                className="rounded-full border-2 border-ink bg-gold px-3 py-1 font-display text-sm font-bold shadow-chunky-sm"
                aria-label={`Level ${levelForXp(xp)}, ${xp} XP`}
              >
                Lv {levelForXp(xp)} · {xp} XP
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="btn-primary px-4 py-2 text-sm">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
