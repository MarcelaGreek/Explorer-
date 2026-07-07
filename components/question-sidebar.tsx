"use client"

import type { Dispatch, SetStateAction } from "react"
import type { ResearchQuestion } from "@/lib/research-questions"
import {
  DROPDOWN_FILTER_COLUMNS,
  BOOLEAN_FILTER_COLUMNS,
  type FilterState,
  type TriState,
} from "@/lib/filters"
import type { FilterOptions } from "@/lib/filter-options"
import { QUICK_FILTERS } from "@/lib/quick-filters"
import { cn } from "@/lib/utils"
import { ShieldAlert, Search, X } from "lucide-react"
import { SemanticSearchBox } from "@/components/semantic-search-box"
import type { SemanticMatch } from "@/lib/types"

type Props = {
  questions: ResearchQuestion[]
  selectedQuestion: ResearchQuestion
  onSelectQuestion: (q: ResearchQuestion) => void
  filters: FilterState
  setFilters: Dispatch<SetStateAction<FilterState>>
  filterOptions: FilterOptions
  onQuickFilter: (id: string) => void
  onResetFilters: () => void
  onResetAll: () => void
  semanticActive: boolean
  onSemanticResult: (query: string, matches: SemanticMatch[]) => void
  onSemanticClear: () => void
}

const DROPDOWN_LABELS: Record<(typeof DROPDOWN_FILTER_COLUMNS)[number], string> = {
  risk_domain: "Risk domain",
  intent_category: "Intent category",
  model: "Model",
  system_prompt_version: "System prompt version",
  final_response_label: "Final response label",
  safety_outcome: "Safety outcome",
  expected_answered: "Expected answered",
  expected_tool: "Expected tool",
  tool_called: "Tool called",
  tool_performance: "Tool performance",
  failure_type: "Failure type",
  tag_1: "Tag 1",
  tag_2: "Tag 2",
}

const BOOLEAN_LABELS: Record<(typeof BOOLEAN_FILTER_COLUMNS)[number], string> = {
  is_problem_prompt: "Problem prompt",
  refusal_expected: "Refusal expected",
  agent_got_tricked: "Agent got tricked",
  harmful_content: "Harmful content",
  bias_issue: "Bias issue",
  instruction_ignored: "Instruction ignored",
  is_kaitus: "Kaitus",
}

const TRI_STATES: TriState[] = ["any", "true", "false"]

export function QuestionSidebar({
  questions,
  selectedQuestion,
  onSelectQuestion,
  filters,
  setFilters,
  filterOptions,
  onQuickFilter,
  onResetFilters,
  onResetAll,
  semanticActive,
  onSemanticResult,
  onSemanticClear,
}: Props) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ShieldAlert className="size-4" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-sidebar-foreground">Trace Explorer</h1>
          <p className="truncate text-xs text-muted-foreground">AI safety evaluations</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Saved research question */}
        <div className="flex flex-col gap-1.5 border-b border-border p-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Research question
          </label>
          <select
            value={selectedQuestion.question_id}
            onChange={(e) => {
              const q = questions.find((item) => item.question_id === e.target.value)
              if (q) onSelectQuestion(q)
            }}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none"
          >
            {questions.map((q) => (
              <option key={q.question_id} value={q.question_id}>
                {q.question_text}
              </option>
            ))}
          </select>
        </div>

        {/* Keyword search */}
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search user input & final response…"
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Semantic search */}
        <SemanticSearchBox active={semanticActive} onResult={onSemanticResult} onClear={onSemanticClear} />

        {/* Dropdown filters */}
        <div className="grid grid-cols-1 gap-2 border-b border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Filters</p>
          {DROPDOWN_FILTER_COLUMNS.map((col) => (
            <select
              key={col}
              value={filters.dropdown[col]}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dropdown: { ...f.dropdown, [col]: e.target.value } }))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
            >
              <option value="">{DROPDOWN_LABELS[col]}: Any</option>
              {filterOptions[col].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* Boolean tri-state filters */}
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flags</p>
          {BOOLEAN_FILTER_COLUMNS.map((col) => (
            <div key={col} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{BOOLEAN_LABELS[col]}</span>
              <div className="flex overflow-hidden rounded-md border border-border">
                {TRI_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, boolean: { ...f.boolean, [col]: state } }))}
                    className={cn(
                      "px-2 py-1 text-[0.65rem] capitalize transition-colors",
                      filters.boolean[col] === state
                        ? "bg-primary/20 text-primary"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date range</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] text-muted-foreground">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] text-muted-foreground">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
            />
          </div>
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick filters</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onQuickFilter(chip.id)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[0.7rem] text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset buttons */}
        <div className="flex gap-2 p-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
          >
            All traces
          </button>
        </div>
      </div>
    </aside>
  )
}
