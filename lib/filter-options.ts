import type { SupabaseClient } from "@supabase/supabase-js"
import { DROPDOWN_FILTER_COLUMNS, type DropdownFilterColumn } from "@/lib/filters"
import { ALL_TRACES_SOURCE } from "@/lib/research-questions"

export type FilterOptions = Record<DropdownFilterColumn, string[]>

const SELECT_COLUMNS = DROPDOWN_FILTER_COLUMNS.join(",")

/**
 * Distinct values for each filter dropdown, sourced from the base trace
 * table so the dropdowns stay populated regardless of which saved question
 * view is currently active.
 */
export async function fetchFilterOptions(supabase: SupabaseClient): Promise<{
  options: FilterOptions
  error: string | null
}> {
  const { data, error } = await supabase.from(ALL_TRACES_SOURCE).select(SELECT_COLUMNS).limit(5000)

  const empty = DROPDOWN_FILTER_COLUMNS.reduce(
    (acc, col) => ({ ...acc, [col]: [] }),
    {} as FilterOptions,
  )

  if (error) return { options: empty, error: error.message }

  const rows = (data ?? []) as unknown as Record<DropdownFilterColumn, string | null>[]
  const sets = DROPDOWN_FILTER_COLUMNS.reduce(
    (acc, col) => ({ ...acc, [col]: new Set<string>() }),
    {} as Record<DropdownFilterColumn, Set<string>>,
  )

  for (const row of rows) {
    for (const col of DROPDOWN_FILTER_COLUMNS) {
      const value = row[col]
      if (value) sets[col].add(value)
    }
  }

  const options = DROPDOWN_FILTER_COLUMNS.reduce(
    (acc, col) => ({ ...acc, [col]: [...sets[col]].sort() }),
    {} as FilterOptions,
  )

  return { options, error: null }
}
