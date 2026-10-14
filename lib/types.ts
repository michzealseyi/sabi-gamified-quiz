export type Profile = {
  id: string;
  display_name: string;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type Quiz = {
  id: string;
  slug: string;
  title: string;
  description: string;
  emoji: string;
};

export type Question = {
  id: string;
  position: number;
  prompt: string;
  options: string[];
};

export type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

export type EarnedBadge = Pick<Badge, "slug" | "name" | "description" | "icon">;

export type SubmitResult = {
  score: number;
  total: number;
  xp_awarded: number;
  best_before: number;
  old_xp: number;
  new_xp: number;
  old_level: number;
  new_level: number;
  streak: number;
  new_badges: EarnedBadge[];
  results: { question_id: string; correct_index: number; chosen: number }[];
};

export type LeaderRow = {
  rank_pos: number;
  player_name: string;
  points: number;
  player_level: number;
  is_me: boolean;
};
