# Step-by-step: set up and deploy Sabi for free

You need a laptop with Node.js 18 or newer, a GitHub account and an email address. It takes about 1–2 hours.

## Step 1: Create the database (Supabase, free)

1. Go to **supabase.com** and sign up (use "Continue with GitHub").
2. Click **New project**. Name it `sabi`, create a strong database password (save it), and pick a region close to Nigeria, such as **West EU (Ireland)** or **London**. Click **Create**. It takes about 2 minutes.
3. In the left menu open **SQL Editor**, then **New query**.
4. Open `supabase/schema.sql` from this project, copy everything, paste it in, and click **Run**. You should see "Success. No rows returned".
5. Check it worked: open **Table Editor**. You should see `quizzes` with 4 rows and `badges` with 8 rows.

## Step 2: Turn off email confirmation

1. Go to **Authentication**, then **Sign In / Providers** (on some dashboards: **Providers**, then **Email**).
2. Turn **off** "Confirm email" and save.

This lets recruiters sign up and play straight away, without checking their email.

## Step 3: Get your API keys

1. Click **Connect** at the top of the dashboard, or go to **Project Settings**, then **API**.
2. Copy the **Project URL** and the **anon / publishable key**. Never use the `service_role` or secret key in this app.

## Step 4: Run it on your laptop

```bash
cd sabi
npm install
cp .env.example .env.local      # on Windows: copy .env.example .env.local
```

Open `.env.local`, paste in your URL and key, then run:

```bash
npm run dev
```

Open http://localhost:3000, create an account and play a quiz. Check that your XP, badges and the leaderboard update.

## Step 5: Put the code on GitHub

1. On github.com click **New repository**. Name it `sabi-gamified-quiz`, make it **Public**, and don't add a README (you already have one). Click **Create**.
2. In your project folder, run (replace YOUR-USERNAME):

```bash
git init
git add .
git commit -m "Sabi: gamified quiz app with XP, badges, streaks and leaderboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sabi-gamified-quiz.git
git push -u origin main
```

`.env.local` is listed in `.gitignore`, so your keys won't be uploaded.

## Step 6: Deploy on Vercel (free)

1. Go to **vercel.com** and sign up with GitHub.
2. Click **Add New**, then **Project**. Find `sabi-gamified-quiz` and click **Import**.
3. Open **Environment Variables** and add both:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon / publishable key
4. Click **Deploy**. After 1–2 minutes you get a link like `https://sabi-gamified-quiz.vercel.app`.

## Step 7: Tell Supabase your live address

In Supabase go to **Authentication**, then **URL Configuration**. Set **Site URL** to your Vercel link and save.

## Step 8: Make it recruiter-ready

1. On the live site, sign up a demo account (for example, display name "Demo Player") and play 2–3 quizzes so it has XP and badges.
2. Sign up 2–3 more test players with different names so the leaderboard looks alive.
3. Put the live link and demo login at the top of `README.md`, then commit and push. Vercel redeploys automatically.
4. Take 3–4 screenshots (dashboard, a question, the results screen with confetti, the leaderboard) for your portfolio.

## Good to know

- **Free Supabase projects pause after about a week with no activity.** Open the site, or click "Restore" in Supabase, the day before you share the link or have an interview.
- Every `git push` to `main` redeploys the site.
- To add a quiz, copy one of the quiz blocks at the bottom of `schema.sql`, edit it, and run the `do $$ ... $$;` block again in the SQL Editor. Quizzes that already exist are skipped.

## If something goes wrong

| Problem | Fix |
| --- | --- |
| "Invalid API key", or pages don't load data | Check both environment variables in Vercel (Settings, then Environment Variables), then redeploy |
| Sign-up says "check your email" | Email confirmation is still on: redo Step 2 |
| "relation does not exist" errors | `schema.sql` didn't run fully: run it again (it's safe to re-run) |
| Leaderboard is empty | Nobody has earned XP this week yet: play a quiz |
| Build fails on Vercel | Run `npm run build` on your laptop to see the exact error |
