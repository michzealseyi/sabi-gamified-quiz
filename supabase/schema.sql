-- =====================================================================
-- Sabi: gamified quiz app — database schema
-- Run this whole file once in Supabase: SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null check (char_length(display_name) between 1 and 24),
  xp               int  not null default 0,
  current_streak   int  not null default 0,
  longest_streak   int  not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text not null,
  emoji       text not null,
  sort_order  int  not null default 0
);

create table if not exists public.questions (
  id       uuid primary key default gen_random_uuid(),
  quiz_id  uuid not null references public.quizzes(id) on delete cascade,
  position int  not null,
  prompt   text not null,
  options  text[] not null,
  unique (quiz_id, position)
);

-- Correct answers live in their own table that browsers can NEVER read.
create table if not exists public.question_keys (
  question_id   uuid primary key references public.questions(id) on delete cascade,
  correct_index int not null
);

create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  score       int  not null,
  total       int  not null,
  xp_awarded  int  not null,
  created_at  timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts(user_id, created_at desc);

-- Event log: every XP change is recorded, so totals can always be audited.
create table if not exists public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  source     text not null,
  ref_id     uuid,
  amount     int  not null,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_time_idx on public.xp_events(created_at, user_id);

-- Badges are data: add a row here to add a badge, no code change needed.
create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text not null,
  icon        text not null,
  rule_type   text not null check (rule_type in
                ('attempts','quizzes_completed','perfect_scores','streak_days','total_xp','level')),
  threshold   int  not null,
  sort_order  int  not null default 0
);

create table if not exists public.user_badges (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  badge_id  uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- Row Level Security ----------------------------------------

alter table public.profiles      enable row level security;
alter table public.quizzes       enable row level security;
alter table public.questions     enable row level security;
alter table public.question_keys enable row level security;  -- no policies = no access
alter table public.attempts      enable row level security;
alter table public.xp_events     enable row level security;
alter table public.badges        enable row level security;
alter table public.user_badges   enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "anyone reads quizzes" on public.quizzes;
create policy "anyone reads quizzes" on public.quizzes
  for select to anon, authenticated using (true);

drop policy if exists "anyone reads questions" on public.questions;
create policy "anyone reads questions" on public.questions
  for select to anon, authenticated using (true);

drop policy if exists "anyone reads badges" on public.badges;
create policy "anyone reads badges" on public.badges
  for select to anon, authenticated using (true);

drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts" on public.attempts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own xp" on public.xp_events;
create policy "read own xp" on public.xp_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own badges" on public.user_badges;
create policy "read own badges" on public.user_badges
  for select to authenticated using (auth.uid() = user_id);

-- There are no insert/update policies anywhere: players can only change
-- data through submit_quiz() below, which applies the rules on the server.

-- ---------- Helpers ---------------------------------------------------

-- Level 1 = 0 XP, level 2 = 50, level 3 = 200, level 4 = 450, level 5 = 800 ...
create or replace function public.level_for_xp(p_xp int)
returns int language sql immutable as $$
  select floor(sqrt(greatest(p_xp, 0) / 50.0))::int + 1;
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                  split_part(new.email, '@', 1), 'Player'), 24)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- The game engine -------------------------------------------
-- Grades answers, awards XP, updates the streak and unlocks badges,
-- all in one transaction on the server.

create or replace function public.submit_quiz(p_quiz_id uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user       uuid := auth.uid();
  v_today      date := (now() at time zone 'Africa/Lagos')::date;
  v_total      int;
  v_score      int;
  v_results    jsonb;
  v_raw_xp     int;
  v_best       int;
  v_xp         int;
  v_attempt    uuid;
  v_old_xp     int;
  v_new_xp     int;
  v_last       date;
  v_streak     int;
  v_longest    int;
  v_quizzes    int;
  v_perfects   int;
  v_attempts   int;
  v_value      int;
  v_new_badges jsonb := '[]'::jsonb;
  b            record;
begin
  if v_user is null then
    raise exception 'You need to be logged in to submit a quiz';
  end if;

  select count(*) into v_total from public.questions where quiz_id = p_quiz_id;
  if v_total = 0 then
    raise exception 'Quiz not found';
  end if;
  if p_answers is null or coalesce(array_length(p_answers, 1), 0) <> v_total then
    raise exception 'Answer every question before submitting';
  end if;

  -- Grade the answers
  select count(*) filter (where k.correct_index = p_answers[q.rn]),
         jsonb_agg(jsonb_build_object(
           'question_id',   q.id,
           'correct_index', k.correct_index,
           'chosen',        p_answers[q.rn]) order by q.rn)
    into v_score, v_results
    from (select id, (row_number() over (order by position))::int as rn
            from public.questions where quiz_id = p_quiz_id) q
    join public.question_keys k on k.question_id = q.id;

  -- XP: 10 per correct answer, +20 for a perfect score.
  -- Replays only earn the amount by which you beat your previous best,
  -- so nobody can farm XP by replaying the same quiz.
  v_raw_xp := v_score * 10 + case when v_score = v_total then 20 else 0 end;

  select coalesce(max(score * 10 + case when score = total then 20 else 0 end), 0)
    into v_best
    from public.attempts where user_id = v_user and quiz_id = p_quiz_id;

  v_xp := greatest(v_raw_xp - v_best, 0);

  insert into public.profiles (id, display_name) values (v_user, 'Player')
    on conflict (id) do nothing;

  insert into public.attempts (user_id, quiz_id, score, total, xp_awarded)
    values (v_user, p_quiz_id, v_score, v_total, v_xp)
    returning id into v_attempt;

  if v_xp > 0 then
    insert into public.xp_events (user_id, source, ref_id, amount)
      values (v_user, 'quiz', v_attempt, v_xp);
  end if;

  -- Streak (days counted in Lagos time)
  select xp, last_active_date, current_streak, longest_streak
    into v_old_xp, v_last, v_streak, v_longest
    from public.profiles where id = v_user for update;

  if v_last = v_today then
    v_streak := greatest(v_streak, 1);
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;
  v_longest := greatest(v_longest, v_streak);
  v_new_xp  := v_old_xp + v_xp;

  update public.profiles
     set xp = v_new_xp, last_active_date = v_today,
         current_streak = v_streak, longest_streak = v_longest
   where id = v_user;

  -- Badges: check every badge the player hasn't earned yet
  select count(distinct quiz_id),
         count(distinct quiz_id) filter (where score = total),
         count(*)
    into v_quizzes, v_perfects, v_attempts
    from public.attempts where user_id = v_user;

  for b in
    select * from public.badges
     where id not in (select badge_id from public.user_badges where user_id = v_user)
     order by sort_order
  loop
    v_value := case b.rule_type
      when 'attempts'          then v_attempts
      when 'quizzes_completed' then v_quizzes
      when 'perfect_scores'    then v_perfects
      when 'streak_days'       then v_streak
      when 'total_xp'          then v_new_xp
      when 'level'             then public.level_for_xp(v_new_xp)
      else 0
    end;
    if v_value >= b.threshold then
      insert into public.user_badges (user_id, badge_id) values (v_user, b.id);
      v_new_badges := v_new_badges || jsonb_build_array(jsonb_build_object(
        'slug', b.slug, 'name', b.name, 'description', b.description, 'icon', b.icon));
    end if;
  end loop;

  return jsonb_build_object(
    'score',       v_score,
    'total',       v_total,
    'xp_awarded',  v_xp,
    'best_before', v_best,
    'old_xp',      v_old_xp,
    'new_xp',      v_new_xp,
    'old_level',   public.level_for_xp(v_old_xp),
    'new_level',   public.level_for_xp(v_new_xp),
    'streak',      v_streak,
    'new_badges',  v_new_badges,
    'results',     v_results
  );
end;
$$;

-- ---------- Leaderboard -----------------------------------------------
-- Returns the top players plus the current player's own row.
-- Only display names are exposed, never emails or ids.

create or replace function public.get_leaderboard(p_period text default 'week', p_limit int default 20)
returns table (rank_pos bigint, player_name text, points bigint, player_level int, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select p.id, p.display_name, p.xp as total_xp,
           (case when p_period = 'week' then
              coalesce((select sum(e.amount) from public.xp_events e
                         where e.user_id = p.id
                           and e.created_at >= (date_trunc('week', now() at time zone 'Africa/Lagos')
                                                at time zone 'Africa/Lagos')), 0)
            else p.xp end)::bigint as pts
      from public.profiles p
  ),
  ranked as (
    select rank() over (order by t.pts desc) as pos, t.display_name, t.pts, t.total_xp,
           coalesce(t.id = auth.uid(), false) as me
      from totals t
     where t.pts > 0
  )
  select r.pos, r.display_name, r.pts, public.level_for_xp(r.total_xp), r.me
    from ranked r
   where r.pos <= least(greatest(p_limit, 1), 100) or r.me
   order by r.pos, r.display_name;
$$;

revoke execute on function public.submit_quiz(uuid, int[]) from public, anon;
grant  execute on function public.submit_quiz(uuid, int[]) to authenticated;
grant  execute on function public.get_leaderboard(text, int) to anon, authenticated;

-- ---------- Seed data: badges -----------------------------------------

insert into public.badges (slug, name, description, icon, rule_type, threshold, sort_order) values
  ('first-steps',   'First steps',   'Finish your first quiz',          '🎯', 'attempts',          1,   1),
  ('flawless',      'Flawless',      'Get a perfect score on a quiz',   '💯', 'perfect_scores',    1,   2),
  ('century',       'Century',       'Earn 100 XP',                     '⚡', 'total_xp',          100, 3),
  ('explorer',      'Explorer',      'Finish 3 different quizzes',      '🧭', 'quizzes_completed', 3,   4),
  ('rising-star',   'Rising star',   'Reach level 3',                   '⭐', 'level',             3,   5),
  ('on-fire',       'On fire',       'Play 3 days in a row',            '🔥', 'streak_days',       3,   6),
  ('completionist', 'Completionist', 'Finish every quiz',               '🏆', 'quizzes_completed', 4,   7),
  ('mastermind',    'Mastermind',    'Get perfect scores on 3 quizzes', '🧠', 'perfect_scores',    3,   8)
on conflict (slug) do nothing;

-- ---------- Seed data: quizzes ----------------------------------------
-- "answer" is the 0-based index of the correct option.

do $$
declare
  quiz   jsonb;
  q      jsonb;
  v_quiz uuid;
  v_q    uuid;
  i      int;
begin
  for quiz in select * from jsonb_array_elements($j$[
    {"slug":"naija-knowledge","title":"Naija knowledge","emoji":"🇳🇬","sort":1,
     "description":"How well do you know Nigeria?",
     "questions":[
       {"prompt":"In what year did Nigeria gain independence?","options":["1957","1960","1963","1970"],"answer":1},
       {"prompt":"What is the capital of Nigeria?","options":["Lagos","Ibadan","Abuja","Kano"],"answer":2},
       {"prompt":"What is the name of Nigeria's currency?","options":["Naira","Cedi","Shilling","Rand"],"answer":0},
       {"prompt":"How many states does Nigeria have?","options":["30","37","40","36"],"answer":3},
       {"prompt":"Which is the longest river in Nigeria?","options":["Benue","Niger","Ogun","Kaduna"],"answer":1}
     ]},
    {"slug":"science-sparks","title":"Science sparks","emoji":"🔬","sort":2,
     "description":"Planets, plants and the human body.",
     "questions":[
       {"prompt":"Which planet is known as the Red Planet?","options":["Venus","Jupiter","Mars","Mercury"],"answer":2},
       {"prompt":"Which gas do plants take in to make their food?","options":["Carbon dioxide","Oxygen","Nitrogen","Helium"],"answer":0},
       {"prompt":"What is H2O?","options":["Salt","Water","Oxygen","Hydrogen peroxide"],"answer":1},
       {"prompt":"What is the hardest natural substance?","options":["Gold","Iron","Quartz","Diamond"],"answer":3},
       {"prompt":"How many bones are in an adult human body?","options":["196","206","216","306"],"answer":1}
     ]},
    {"slug":"tech-and-code","title":"Tech and code","emoji":"💻","sort":3,
     "description":"The basics behind the apps you use every day.",
     "questions":[
       {"prompt":"What does HTML stand for?","options":["HyperText Markup Language","High Tech Modern Language","Home Tool Markup Language","Hyperlink Text Making Language"],"answer":0},
       {"prompt":"Which language runs directly inside web browsers?","options":["Python","C++","JavaScript","Java"],"answer":2},
       {"prompt":"What does CPU stand for?","options":["Computer Power Unit","Central Processing Unit","Core Program Utility","Central Print Unit"],"answer":1},
       {"prompt":"How many bits are in one byte?","options":["4","16","2","8"],"answer":3},
       {"prompt":"What does www stand for in a web address?","options":["World Wide Web","Web Within Web","Wide Web World","World Web Window"],"answer":0}
     ]},
    {"slug":"africa-explorer","title":"Africa explorer","emoji":"🌍","sort":4,
     "description":"Mountains, rivers and countries across the continent.",
     "questions":[
       {"prompt":"Which is the largest country in Africa by area?","options":["Nigeria","DR Congo","Algeria","Sudan"],"answer":2},
       {"prompt":"What is the highest mountain in Africa?","options":["Mount Kilimanjaro","Mount Kenya","Mount Cameroon","Atlas Mountains"],"answer":0},
       {"prompt":"Which is the longest river in Africa?","options":["Congo","Niger","Zambezi","Nile"],"answer":3},
       {"prompt":"What is the largest desert in Africa?","options":["Kalahari","Sahara","Namib","Danakil"],"answer":1},
       {"prompt":"Which African country has the largest population?","options":["Egypt","Ethiopia","Nigeria","DR Congo"],"answer":2}
     ]}
  ]$j$::jsonb)
  loop
    v_quiz := null;
    insert into public.quizzes (slug, title, description, emoji, sort_order)
      values (quiz->>'slug', quiz->>'title', quiz->>'description', quiz->>'emoji', (quiz->>'sort')::int)
      on conflict (slug) do nothing
      returning id into v_quiz;
    continue when v_quiz is null;  -- already seeded

    i := 0;
    for q in select * from jsonb_array_elements(quiz->'questions') loop
      i := i + 1;
      insert into public.questions (quiz_id, position, prompt, options)
        values (v_quiz, i, q->>'prompt', array(select jsonb_array_elements_text(q->'options')))
        returning id into v_q;
      insert into public.question_keys (question_id, correct_index)
        values (v_q, (q->>'answer')::int);
    end loop;
  end loop;
end
$$;
