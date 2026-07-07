"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  ALL_TRACES_QUESTION,
  fetchResearchQuestions,
  resolveSource,
  type ResearchQuestion,
} from "@/lib/research-questions"
import { fetchFilterOptions, type FilterOptions } from "@/lib/filter-options"
import { DROPDOWN_FILTER_COLUMNS, applyFilters, emptyFilters, type FilterState } from "@/lib/filters"
import { QUICK_FILTERS } from "@/lib/quick-filters"
import type { SemanticMatch, Trace, TraceWithSimilarity } from "@/lib/types"
import { QuestionSidebar } from "@/components/question-sidebar"
import { TraceList } from "@/components/trace-list"
import { TraceDetail } from "@/components/trace-detail"
import { AlertTriangle } from "lucide-react"

const PAGE_SIZE = 50

const EMPTY_FILTER_OPTIONS: FilterOptions = DROPDOWN_FILTER_COLUMNS.reduce(
  (acc, col) => ({ ...acc, [col]: [] }),
  {} as FilterOptions,
)

export function TraceExplorer() {
  // createClient() throws synchronously if the Supabase URL/anon key env
  // vars are missing or blank - caught here so a misconfigured .env.local
  // shows the app's own error state instead of crashing the whole page.
  const { supabase, configError } = useMemo(() => {
    try {
      return { supabase: createClient(), configError: null as string | null }
    } catch (err) {
      return {
        supabase: null,
        configError: err instanceof Error ? err.message : "Failed to create Supabase client",
      }
    }
  }, [])

  const [questions, setQuestions] = useState<ResearchQuestion[]>([ALL_TRACES_QUESTION])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(EMPTY_FILTER_OPTIONS)

  const [selectedQuestion, setSelectedQuestion] = useState<ResearchQuestion>(ALL_TRACES_QUESTION)
  const [filters, setFilters] = useState<FilterState>(emptyFilters())
  const [page, setPage] = useState(1)

  const [traces, setTraces] = useState<Trace[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [semanticResult, setSemanticResult] = useState<{ query: string; matches: SemanticMatch[] } | null>(null)

  // Load saved research questions + filter dropdown option values once.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const { questions: loaded } = await fetchResearchQuestions(supabase)
      if (!cancelled) setQuestions(loaded)
      const { options } = await fetchFilterOptions(supabase)
      if (!cancelled) setFilterOptions(options)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // Re-query Supabase whenever the selected question, filters, or page change.
  useEffect(() => {
    if (!supabase) return
    if (semanticResult) return
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)

      const source = resolveSource(selectedQuestion.view_name)
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase.from(source).select("*", { count: "exact" })
      query = applyFilters(query, filters)
      const { data, error: queryError, count } = await query
        .order("date_time", { ascending: false })
        .range(from, to)

      if (cancelled) return

      if (queryError) {
        setError(queryError.message)
        setTraces([])
        setRowCount(0)
      } else {
        setTraces((data ?? []) as Trace[])
        setRowCount(count ?? 0)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [supabase, selectedQuestion, filters, page, semanticResult])

  const displayedTraces: TraceWithSimilarity[] = semanticResult
    ? semanticResult.matches.map((m) => ({ ...m.trace, similarity: m.similarity }))
    : traces

  const selected = useMemo(
    () => displayedTraces.find((t) => t.run_id === selectedId) ?? null,
    [displayedTraces, selectedId],
  )

  function handleSelectQuestion(q: ResearchQuestion) {
    setSelectedQuestion(q)
    setPage(1)
    setSelectedId(null)
    setSemanticResult(null)
  }

  const handleSetFilters: Dispatch<SetStateAction<FilterState>> = (updater) => {
    setFilters(updater)
    setPage(1)
    setSelectedId(null)
  }

  function handleResetFilters() {
    setFilters(emptyFilters())
    setPage(1)
    setSelectedId(null)
  }

  function handleResetAll() {
    setSelectedQuestion(ALL_TRACES_QUESTION)
    setFilters(emptyFilters())
    setPage(1)
    setSelectedId(null)
    setSemanticResult(null)
  }

  function handleQuickFilter(id: string) {
    const chip = QUICK_FILTERS.find((c) => c.id === id)
    if (!chip) return

    setSemanticResult(null)
    setPage(1)
    setSelectedId(null)

    if (chip.kind === "view") {
      const q = questions.find((item) => item.view_name === chip.viewName)
      if (q) {
        setSelectedQuestion(q)
        setFilters(emptyFilters())
      } else {
        console.warn(`Quick filter "${chip.label}" expected saved question with view_name "${chip.viewName}", none loaded.`)
      }
    } else {
      setSelectedQuestion(ALL_TRACES_QUESTION)
      setFilters(chip.apply(emptyFilters()))
    }
  }

  function handleSemanticResult(query: string, matches: SemanticMatch[]) {
    setSemanticResult({ query, matches })
    setSelectedId(null)
  }

  function handleSemanticClear() {
    setSemanticResult(null)
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    setSelectedId(null)
  }

  if (configError) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
          <AlertTriangle className="size-6" />
          <p className="font-medium">Supabase is not configured</p>
          <p className="text-destructive/80">{configError}</p>
          <p className="text-destructive/80">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:block">
        <QuestionSidebar
          questions={questions}
          selectedQuestion={selectedQuestion}
          onSelectQuestion={handleSelectQuestion}
          filters={filters}
          setFilters={handleSetFilters}
          filterOptions={filterOptions}
          onQuickFilter={handleQuickFilter}
          onResetFilters={handleResetFilters}
          onResetAll={handleResetAll}
          semanticActive={!!semanticResult}
          onSemanticResult={handleSemanticResult}
          onSemanticClear={handleSemanticClear}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <TraceList
          traces={displayedTraces}
          loading={loading && !semanticResult}
          error={error}
          selectedId={selectedId}
          onSelect={(t) => setSelectedId(t.run_id)}
          totalCount={semanticResult ? displayedTraces.length : rowCount}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          semanticActive={!!semanticResult}
          semanticQuery={semanticResult?.query ?? null}
        />
        <div className="hidden flex-1 lg:flex">
          <TraceDetail trace={selected} />
        </div>
      </div>

      {/* Mobile detail overlay */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1 border-b border-border px-4 py-3 text-sm text-primary"
          >
            ← Back to list
          </button>
          <div className="min-h-0 flex-1">
            <TraceDetail trace={selected} />
          </div>
        </div>
      )}
    </main>
  )
}
