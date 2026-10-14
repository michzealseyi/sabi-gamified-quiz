# Sabi: learn, play, level up

A gamified quiz web app where young people answer short quizzes, earn XP, level up, unlock badges, keep daily streaks and compete on a weekly leaderboard.

**Live demo:** https://sabi-gamified-quiz.vercel.app
**Demo login:** demo@sabi-quiz.dev / SabiDemo2026!

## Features

- Email sign-up and login with Supabase Auth
- Four quizzes with 20 questions in total
- XP and levels: 10 XP per correct answer, +20 for a perfect score
- Anti-farming: replays only earn XP when you beat your previous best
- Eight badges, unlocked automatically from rules stored in the database
- Daily streaks, counted in Lagos time
- Weekly and all-time leaderboards
- Reward animations: XP count-up, confetti, badge reveal (reduced motion respected)
- Responsive on mobile, tablet and desktop; keyboard and screen-reader friendly

## Tech stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Row Level Security), Vercel

## How it works

- **Scoring happens on the server.** The browser only sends the player's chosen answers. The `submit_quiz` Postgres function grades them, awards XP, updates the streak and checks badges in one transaction.
- **Answers are never sent to the browser.** Correct answers live in a separate `question_keys` table with Row Level Security and no read policy.
- **Every XP change is logged** in an `xp_events` table. The weekly leaderboard is calculated from this log.
- **Badges are data, not code.** Each badge row has a rule type and a threshold, so a new badge is one database row.
- **Players can't edit their own XP.** No table has insert or update policies; all changes go through `submit_quiz`.

## Run it locally

1. Set up Supabase (steps 1–3 in `DEPLOY_GUIDE.md`).
2. Copy `.env.example` to `.env.local` and add your Supabase URL and key.
3. Run `npm install`, then `npm run dev`, and open http://localhost:3000

## Project structure

```
app/                 pages: landing, login, dashboard, quiz, leaderboard
components/          nav, progress bar, leaderboard table, XP counter, confetti
lib/                 Supabase clients, level maths, types
supabase/schema.sql  tables, security policies, game engine, seed data
middleware.ts        session refresh and page protection
```
