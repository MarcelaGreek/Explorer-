# Trace Explorer

A three-panel web app for exploring **AI-safety agent traces**: browse and filter
evaluated agent runs, answer saved research questions backed by SQL views, and run
**semantic search** over the traces. Built with Next.js (App Router), React, TypeScript,
Tailwind CSS, and the Supabase JS client, with an OpenAI-powered semantic search API route.

---

## What this app is (and is not)

This app is the **read-only exploration / UI layer** over data that already exists in
Supabase. It sits at the *end* of a larger pipeline.

**It assumes the following already happened upstream (NOT done by this app):**

1. **Raw traces were collected** — one row per agent run, with the original columns
   (`user_input`, `final_response`, `tool_called`, etc.).
2. **Categorization columns were added** by separate Python tooling — e.g. `risk_domain`,
   `intent_category`, `final_response_label`, `safety_outcome`, `failure_type`, boolean
   flags like `harmful_content` / `bias_issue` / `agent_got_tricked`, etc. This app
   **starts from the completed values** of those columns; it never creates or fills them.
3. **Embeddings were built and upserted** into Supabase (`trace2_embeddings`, one vector
   per trace row) by the separate `../trace2_semantic` Python project. This app
   **only reads** those embeddings; it never generates or upserts them.

**This app itself only reads.** It issues `SELECT` queries and one read-only RPC. It never
runs `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, or `TRUNCATE`, and never seeds demo data.

```
[ agent runs ] --> [ Python: add categorization columns ] --> trace2_agent_traces ─┐
                                                                                    ├─> THIS APP (read-only UI)
[ ../trace2_semantic Python: build embeddings ] --------------> trace2_embeddings ─┘
```

---

## What this app does

### a) Deterministic filters (pure SQL on the table/views)
Filter the trace table by exact-match dropdowns and flags, for example:
- `safety_outcome` (pass / fail / review)
- `final_response_label` (answered / refused / …)
- `intent_category` — i.e. the user's intent when prompting the agent
- `risk_domain`, `model`, `system_prompt_version`, `tool_*`, `failure_type`, `tag_1/2`
- tri-state boolean flags (Any / True / False): `harmful_content`, `bias_issue`,
  `agent_got_tricked`, `refusal_expected`, `is_kaitus`, …
- date range + keyword search over `user_input` / `final_response`

Filters are applied to whichever **source** is active (all traces, or a selected
research-question view) and are never sent when set to "Any"/empty.

### b) Saved research questions (backed by Supabase SQL views)
A researcher picks a question from a dropdown (loaded from the `research_questions` table).
Each question maps to a Postgres **view** that encapsulates the query logic and returns the
matching full trace rows. Example:

> *"From all rejected answers, which rows were correct refusals?"* → view `v_q04_correct_refusals`

The app shows `question_text` to the user and queries the view's `view_name` internally.
An **All traces** option queries the base table directly.

### c) Semantic search (embeddings + OpenAI)
A free-text box lets the researcher search by meaning, not keywords — e.g. typing
**"cinema"** returns rows about films/movies/screenplays even if they never use the word
"cinema". Flow:
1. Browser POSTs the query to `POST /api/semantic-search` (server-side route).
2. The route embeds the query with OpenAI `text-embedding-3-small`, converts the vector to a
   pgvector literal, and calls the Supabase RPC `match_trace2_traces`.
3. The RPC returns the top-N matching **full trace rows** (as JSON) plus a `similarity` score.
4. Results render in the same center table, with an extra **Similarity** column.

This is the **only** feature that uses `trace2_embeddings`. Filters (a) and views (b) are
plain SQL and do not touch embeddings.

### d) The UI
A three-panel layout:
- **Left** — research-question dropdown, all filters, tri-state flags, date range, keyword
  search, semantic search box, quick-filter chips, reset buttons.
- **Center** — results table (loading / error / empty states, row count, pagination,
  horizontal scroll, CSV export, `Similarity` column in semantic mode).
- **Right** — full detail for a selected row, grouped into *Identity / Raw Trace /
  Evaluation / Embedding Text*.

---

## Supabase objects this app expects to already exist

| Object | Type | Used for |
| --- | --- | --- |
| `trace2_agent_traces` | table | base data (all original + categorization columns) |
| `research_questions` | table | dropdown of saved questions (`question_id`, `question_text`, `view_name`) |
| `v_q01_…` … `v_q13_…` | views | one per research question; return full trace rows |
| `trace2_embeddings` | table | per-row vectors (1536-dim) for semantic search |
| `match_trace2_traces(...)` | function | RPC returning `{ similarity, trace }` for a query vector |

The SQL for the embeddings table + RPC lives in `../trace2_semantic/trace2_embeddings_setup.sql`.

---

## Environment variables

Create `.env.local` (git-ignored) from `.env.example` and fill in real values:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | e.g. `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Supabase anon/public key |
| `OPENAI_API_KEY` | **server only** | used only by the semantic search route; never exposed to the browser |
| `SUPABASE_SERVER_KEY` | server only, **optional** | falls back to the anon key if empty |

Security notes:
- `OPENAI_API_KEY` is read only in the server route (`app/api/semantic-search/route.ts`) and
  must never be prefixed with `NEXT_PUBLIC_`.
- The anon key ships in the browser bundle by design. Before putting **real** data behind this
  app, enable Row Level Security with read-only policies on the tables/views the anon role can
  reach.

---

## Setup & run

Requires Node.js (v20+; v22 LTS recommended) and pnpm. Run from a Linux/WSL shell:

```bash
# one-time, if pnpm is missing:
corepack enable
corepack prepare pnpm@latest --activate   # use pnpm@9 if you are on Node 20

pnpm install
pnpm dev
```

Open http://localhost:3000.

**Verify it works end-to-end:**
- All-traces mode loads rows from `trace2_agent_traces`.
- The question dropdown loads from `research_questions`; selecting one queries its view.
- Semantic search for
  `cinema screenplay script scene narrative character villain director movie story fictional`
  (match count 4) returns `trace2_005`, `trace2_006`, `trace2_029`, `trace2_030`.

---

## Project structure

```
app/
  page.tsx                     # thin shell -> <TraceExplorer />
  api/semantic-search/route.ts # server-only: OpenAI embed -> match_trace2_traces RPC
components/
  trace-explorer.tsx           # client orchestrator: state + all Supabase queries
  question-sidebar.tsx         # left panel: dropdown, filters, flags, dates, chips, search box
  semantic-search-box.tsx      # semantic search input + controls
  trace-list.tsx               # center table: pagination, CSV, similarity column
  trace-detail.tsx             # right panel: 4-section row detail
  badges.tsx                   # status/outcome badges
lib/
  supabase/{client,server}.ts  # Supabase clients
  research-questions.ts        # load research_questions; resolve source (view vs base table)
  filters.ts                   # filter state + query-building helpers
  filter-options.ts            # distinct dropdown values from the base table
  quick-filters.ts             # quick-filter chip definitions
  types.ts                     # Trace type + column list
```

---

## Known limitations / to verify later

- **Research-question view logic is not fully audited.** The `research_questions` rows and the
  `v_q01…v_q13` view definitions were written quickly as a first pass. The app faithfully runs
  whatever each view returns, but the *correctness of each view's SQL logic* (does it truly
  answer its question?) still needs review. Revisit and validate the views before relying on
  their results for conclusions.
- **RLS is not yet enabled** on the underlying tables (fine for testing with placeholder data;
  tighten before using real data — see Security notes).
