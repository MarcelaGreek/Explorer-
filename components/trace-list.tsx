"use client"

import type { Trace, TraceWithSimilarity } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge, outcomeLabel, safetyTone } from "@/components/badges"
import { AlertTriangle, Download, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

type Props = {
  traces: TraceWithSimilarity[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (t: Trace) => void
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  semanticActive: boolean
  semanticQuery: string | null
}

const COLUMNS: { key: keyof TraceWithSimilarity; label: string }[] = [
  { key: "run_id", label: "Run ID" },
  { key: "date_time", label: "Date" },
  { key: "model", label: "Model" },
  { key: "system_prompt_version", label: "Prompt v" },
  { key: "user_input", label: "User input" },
  { key: "final_response", label: "Final response" },
  { key: "risk_domain", label: "Risk domain" },
  { key: "intent_category", label: "Intent category" },
  { key: "final_response_label", label: "Response label" },
  { key: "safety_outcome", label: "Safety outcome" },
  { key: "agent_got_tricked", label: "Tricked" },
  { key: "tool_performance", label: "Tool perf." },
  { key: "failure_type", label: "Failure type" },
  { key: "tag_1", label: "Tag 1" },
  { key: "tag_2", label: "Tag 2" },
]

function formatDate(v: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function cellValue(t: TraceWithSimilarity, key: keyof TraceWithSimilarity) {
  const value = t[key]
  if (key === "date_time") return formatDate(value as string | null)
  if (key === "safety_outcome") return <Badge tone={safetyTone(value as string | null)}>{outcomeLabel(value as string | null)}</Badge>
  if (key === "agent_got_tricked") return value ? <Badge tone="warning">Yes</Badge> : <span className="text-muted-foreground">—</span>
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>
  return String(value)
}

function toCsvValue(value: unknown): string {
  const str = value == null ? "" : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function downloadCsv(traces: TraceWithSimilarity[], semanticActive: boolean) {
  const keys = COLUMNS.map((c) => c.key as string).concat(semanticActive ? ["similarity"] : [])
  const header = keys.join(",")
  const rows = traces.map((t) => keys.map((k) => toCsvValue((t as Record<string, unknown>)[k])).join(","))
  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "traces.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function TraceList({
  traces,
  loading,
  error,
  selectedId,
  onSelect,
  totalCount,
  page,
  pageSize,
  onPageChange,
  semanticActive,
  semanticQuery,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {semanticActive ? (
            <span className="flex items-center gap-1.5">
              <Badge tone="primary">
                <Sparkles className="size-3" /> Semantic results
              </Badge>
              {semanticQuery && <span className="truncate">for "{semanticQuery}"</span>}
            </span>
          ) : (
            <span className="tabular-nums">{totalCount} traces</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(traces, semanticActive)}
          disabled={traces.length === 0}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-3.5" /> Download CSV
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading traces…
          </div>
        ) : error ? (
          <div className="m-4 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Could not load traces</p>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
        ) : traces.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            No traces match the current filters.
          </div>
        ) : (
          <table className="w-full min-w-max border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                {COLUMNS.map((c) => (
                  <th key={c.key as string} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                    {c.label}
                  </th>
                ))}
                {semanticActive && (
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">Similarity</th>
                )}
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => {
                const active = t.run_id === selectedId
                return (
                  <tr
                    key={t.run_id}
                    onClick={() => onSelect(t)}
                    className={cn(
                      "cursor-pointer border-b border-border transition-colors hover:bg-accent",
                      active && "bg-primary/10",
                      !active && t.safety_outcome === "fail" && "bg-destructive/5",
                    )}
                  >
                    {COLUMNS.map((c) => (
                      <td key={c.key as string} className="max-w-64 truncate px-3 py-2 text-foreground">
                        {cellValue(t, c.key)}
                      </td>
                    ))}
                    {semanticActive && (
                      <td className="px-3 py-2 tabular-nums text-foreground">
                        {typeof t.similarity === "number" ? t.similarity.toFixed(4) : "—"}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!semanticActive && !loading && !error && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-3.5" /> Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
