import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizPlayer from "./QuizPlayer";
import type { Question, Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, title, description, emoji")
    .eq("slug", params.slug)
    .single();
  if (!quiz) notFound();

  // Only the questions and options are sent to the browser, never the answers.
  const { data: questions } = await supabase
    .from("questions")
    .select("id, position, prompt, options")
    .eq("quiz_id", quiz.id)
    .order("position");

  return <QuizPlayer quiz={quiz as Quiz} questions={(questions ?? []) as Question[]} />;
}
