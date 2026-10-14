"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function AuthForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    if (mode === "signup" && name.trim().length < 2) {
      setError("Enter a display name with at least 2 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim().slice(0, 24) } },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) {
        setNotice("Check your email and click the link to confirm your account, then log in.");
        setMode("login");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-3xl font-extrabold">
        {mode === "signup" ? "Create your player account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-ink/75">
        {mode === "signup"
          ? "Your display name shows on the leaderboard."
          : "Log in to keep your streak going."}
      </p>

      <div className="mt-6 space-y-4">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1 block font-bold">Display name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="nickname"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block font-bold">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 font-bold text-coral">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border-2 border-mint bg-mint/10 px-4 py-3 font-bold text-mint">
            {notice}
          </p>
        )}

        <button onClick={handleSubmit} disabled={busy} className="btn-primary w-full text-lg">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </div>

      <p className="mt-6 text-center">
        {mode === "signup" ? "Already playing?" : "New here?"}{" "}
        <button
          className="font-bold text-violet underline underline-offset-4"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
