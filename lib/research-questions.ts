import type { SupabaseClient } from "@supabase/supabase-js"

export type ResearchQuestion = {
  question_id: string
  question_text: string
  view_name: string
}

export const ALL_TRACES_SOURCE = "trace2_agent_traces"

export const ALL_TRACES_QUESTION: ResearchQuestion = {
  question_id: "all",
  question_text: "All traces",
  view_name: ALL_TRACES_SOURCE,
}

const ALL_TRACES_ALIASES = new Set(["", "all", "all_traces", "all traces"])

/**
 * Single choke point for turning a selected question's view_name into a query
 * source. Guarantees supabase.from("") never happens.
 */
export function resolveSource(viewName: string | null | undefined): string {
  const normalized = (viewName ?? "").trim().toLowerCase()
  if (ALL_TRACES_ALIASES.has(normalized)) return ALL_TRACES_SOURCE
  return viewName!.trim()
}

export async function fetchResearchQuestions(supabase: SupabaseClient): Promise<{
  questions: ResearchQuestion[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from("research_questions")
    .select("question_id, question_text, view_name")
    .order("question_id")

  if (error) {
    return { questions: [ALL_TRACES_QUESTION], error: error.message }
  }

  return { questions: [ALL_TRACES_QUESTION, ...((data ?? []) as ResearchQuestion[])], error: null }
}
