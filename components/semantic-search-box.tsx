"use client"

import { useState } from "react"
import type { SemanticMatch } from "@/lib/types"
import { Sparkles, X, Loader2 } from "lucide-react"

type Props = {
  active: boolean
  onResult: (query: string, matches: SemanticMatch[]) => void
  onClear: () => void
}

const MATCH_COUNT_OPTIONS = [4, 8, 12, 20]

export function SemanticSearchBox({ active, onResult, onClear }: Props) {
  const [query, setQuery] = useState("")
  const [matchCount, setMatchCount] = useState(4)
  const [minSimilarity, setMinSimilarity] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          matchCount,
          minSimilarity: minSimilarity === "" ? null : Number(minSimilarity),
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? "Semantic search failed")
        return
      }
      onResult(body.query, body.matches ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Semantic search failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setQuery("")
    setError(null)
    onClear()
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-2 border-b border-border p-3">
      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" /> Semantic search
      </label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="cinema screenplay fictional scene"
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex items-center gap-2">
        <select
          value={matchCount}
          onChange={(e) => setMatchCount(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none"
          title="Match count"
        >
          {MATCH_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
        <input
          value={minSimilarity}
          onChange={(e) => setMinSimilarity(e.target.value)}
          type="number"
          step="0.01"
          min={0}
          max={1}
          placeholder="min similarity"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Search
        </button>
        {active && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
