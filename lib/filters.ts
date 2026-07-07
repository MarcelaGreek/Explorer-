export type TriState = "any" | "true" | "false"

export const DROPDOWN_FILTER_COLUMNS = [
  "risk_domain",
  "intent_category",
  "model",
  "system_prompt_version",
  "final_response_label",
  "safety_outcome",
  "expected_answered",
  "expected_tool",
  "tool_called",
  "tool_performance",
  "failure_type",
  "tag_1",
  "tag_2",
] as const

export type DropdownFilterColumn = (typeof DROPDOWN_FILTER_COLUMNS)[number]

export const BOOLEAN_FILTER_COLUMNS = [
  "is_problem_prompt",
  "refusal_expected",
  "agent_got_tricked",
  "harmful_content",
  "bias_issue",
  "instruction_ignored",
  "is_kaitus",
] as const

export type BooleanFilterColumn = (typeof BOOLEAN_FILTER_COLUMNS)[number]

export type FilterState = {
  dropdown: Record<DropdownFilterColumn, string>
  boolean: Record<BooleanFilterColumn, TriState>
  dateFrom: string
  dateTo: string
  search: string
}

export function emptyFilters(): FilterState {
  return {
    dropdown: DROPDOWN_FILTER_COLUMNS.reduce(
      (acc, col) => ({ ...acc, [col]: "" }),
      {} as Record<DropdownFilterColumn, string>,
    ),
    boolean: BOOLEAN_FILTER_COLUMNS.reduce(
      (acc, col) => ({ ...acc, [col]: "any" }),
      {} as Record<BooleanFilterColumn, TriState>,
    ),
    dateFrom: "",
    dateTo: "",
    search: "",
  }
}

export function hasActiveFilters(filters: FilterState): boolean {
  if (filters.dateFrom || filters.dateTo || filters.search.trim()) return true
  if (Object.values(filters.dropdown).some((v) => v)) return true
  if (Object.values(filters.boolean).some((v) => v !== "any")) return true
  return false
}

/**
 * Applies the filter state to a Supabase query builder. Never applies a
 * filter for "Any"/empty/null/undefined values per spec.
 */
export function applyFilters<T extends { eq: any; gte: any; lte: any; or: any }>(
  query: T,
  filters: FilterState,
): T {
  let q = query

  for (const col of DROPDOWN_FILTER_COLUMNS) {
    const value = filters.dropdown[col]
    if (value) q = q.eq(col, value)
  }

  for (const col of BOOLEAN_FILTER_COLUMNS) {
    const value = filters.boolean[col]
    if (value === "true") q = q.eq(col, true)
    else if (value === "false") q = q.eq(col, false)
  }

  if (filters.dateFrom) q = q.gte("date_time", filters.dateFrom)
  if (filters.dateTo) q = q.lte("date_time", filters.dateTo)

  const term = filters.search.trim()
  if (term) {
    q = q.or(`user_input.ilike.%${term}%,final_response.ilike.%${term}%`)
  }

  return q
}
