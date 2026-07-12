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


  STEPS
  RACE EXPLORER — COMPLETE WINDOWS 11 SETUP STEPS
================================================

1. WHAT THIS PROJECT IS
-----------------------

Trace Explorer is a Next.js / React / TypeScript application.

It is NOT a Python application.

The project reads data already stored in Supabase and displays:
- agent traces
- filters
- saved research-question views
- trace details
- CSV export
- optional semantic-search results

2. REQUIRED STACK
-----------------

Required:
- Windows 11
- Node.js 20 or newer
- Node.js 22 LTS recommended
- pnpm
- Internet connection
- A working Supabase project
- Supabase URL
- Supabase anon/public key

Optional:
- OpenAI API key, only for semantic search
- Visual Studio Code
- Git

3. NOT NEEDED FOR THIS EXPLORER FOLDER
--------------------------------------

Not needed:
- requirements.txt
- pip install
- Python virtual environment
- Python evaluator scripts
- raw CSV input files
- automatic Supabase upload script
- Python embedding-generation scripts

Important:
- Node.js IS required.
- pnpm IS required.
- package.json is the Node.js equivalent of requirements.txt.
- pnpm-lock.yaml records the installed dependency versions.
- The Next.js semantic API route inside app/api/semantic-search belongs in this project.
- The separate Python project that creates embeddings belongs elsewhere.

4. IMPORTANT ENVIRONMENT FILE RULE
----------------------------------

The real local environment file must be named exactly:

.env.local

Do not use .env for the final local setup.

Keep .env.example in GitHub only as documentation.

The .env.local file must be in the same folder as package.json.

Do not commit .env.local to GitHub.

5. REQUIRED ENVIRONMENT VARIABLES
---------------------------------

Create .env.local with:

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
SUPABASE_SERVER_KEY=

Notes:
- Use the exact variable names.
- Do not add spaces around =.
- Do not add quotation marks.
- NEXT_PUBLIC_SUPABASE_URL must be the Supabase Project URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY must be the anon/public key.
- OPENAI_API_KEY is required only for semantic search.
- SUPABASE_SERVER_KEY is optional and can remain empty.
- Restart pnpm dev after changing .env.local.
- Never place real keys in .env.example.
- Never commit .env.local.

6. OPEN THE PROJECT ROOT
------------------------

Open Command Prompt or PowerShell.

Go to the folder containing package.json.

Example:

cd "C:\Users\marce\Documents\000 Logs and traces\Explorer_ok\Explorer--main\Explorer--main"

Confirm:

dir package.json

Do not run pnpm commands inside app, components, or lib.
Run them from the project root.

7. CHECK NODE.JS
----------------

Run:

node --version
npm --version

If both commands return version numbers, Node.js is installed.

Your current installation:

Node.js: v24.18.0
npm: 11.16.0

This is sufficient to run the project.

8. INSTALL NODE.JS IF MISSING
-----------------------------

Run:

winget install OpenJS.NodeJS.LTS

Then close and reopen the terminal.

Verify:

node --version
npm --version

9. CHECK PNPM
-------------

Run:

pnpm --version

Your current pnpm version:

pnpm: 11.10.0

If pnpm is not available, run:

corepack enable
corepack prepare pnpm@latest --activate
pnpm --version

No Python virtual environment is needed.

10. CREATE .env.local
---------------------

From the project root:

copy .env.example .env.local

Open it:

notepad .env.local

Replace the placeholder values with the real values.

Example structure:

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
SUPABASE_SERVER_KEY=

Save and close Notepad.

Confirm the filename:

dir /a

You must see:

.env.local

It must not be:

.env
.env.local.txt
.env.txt

11. INSTALL PROJECT DEPENDENCIES
--------------------------------

Run:

pnpm install

This reads:
- package.json
- pnpm-lock.yaml

It creates:
- node_modules
- local dependency files

Do not copy node_modules from another computer.
Always rebuild it with pnpm install.

A pnpm warning about pnpm.overrides is not fatal for running the app.

12. START THE DEVELOPMENT SERVER
--------------------------------

Run:

pnpm dev

Expected terminal output includes:

Environments: .env.local
Ready
Local: http://localhost:3000

Open:

http://localhost:3000

Keep the terminal open while using the app.

Stop the server with:

Ctrl+C

13. HARD REFRESH THE BROWSER
----------------------------

In Chrome on Windows:

Ctrl+Shift+R

or:

Ctrl+F5

Do not use Ctrl+K.

14. CLEAR THE NEXT.JS CACHE
---------------------------

Only do this if the app appears to use old configuration.

Stop the server:

Ctrl+C

Delete the cache:

rmdir /s /q .next

Restart:

pnpm dev

If Windows says:

The system cannot find the file specified.

that means the .next cache is already absent.

15. VERIFY SUPABASE CONFIGURATION
---------------------------------

If the app shows:

Supabase is not configured

check that .env.local contains exactly:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

Then:

1. Stop the server with Ctrl+C.
2. Save .env.local.
3. Delete .next if necessary.
4. Run pnpm dev again.
5. Hard refresh the browser.

This error is about missing environment variables.
It is not caused by RLS.
It is not caused by the absence of a service-role key.

16. FUNCTIONAL TEST
-------------------

Confirm:

- The app opens at localhost:3000.
- All traces load from trace2_agent_traces.
- The research-question dropdown loads.
- Selecting a saved question returns rows.
- Filters work.
- Row details open.
- CSV export works.

Semantic search requires:
- OPENAI_API_KEY
- trace2_embeddings in Supabase
- match_trace2_traces RPC
- app/api/semantic-search/route.ts

17. TYPE AND BUILD CHECK
------------------------

Run:

pnpm exec tsc --noEmit

Then:

pnpm build

If successful, test production mode:

pnpm start

Open:

http://localhost:3000

Stop with:

Ctrl+C

18. COMMON ERRORS
-----------------

ERROR: node is not recognized
- Install Node.js.
- Close and reopen the terminal.

ERROR: pnpm is not recognized
- Run:
  corepack enable
  corepack prepare pnpm@latest --activate

ERROR: package.json not found
- You are in the wrong folder.
- Move to the project root.

ERROR: Supabase is not configured
- Check .env.local.
- Check exact variable names.
- Restart pnpm dev.

ERROR: Port 3000 is already in use
- Stop the other server, or run:

pnpm dev -- --port 3001

Then open:

http://localhost:3001

ERROR: Module not found
- Run pnpm install.
- Confirm all app, components, components/ui, and lib files exist.

19. MINIMUM REQUIRED PROJECT FILES
---------------------------------

The project should contain:

app/
  page.tsx
  layout.tsx
  globals.css
  api/
    semantic-search/
      route.ts

components/
  trace-explorer.tsx
  question-sidebar.tsx
  semantic-search-box.tsx
  trace-list.tsx
  trace-detail.tsx
  badges.tsx
  ui/

lib/
  supabase/
    client.ts
    server.ts
  research-questions.ts
  filters.ts
  filter-options.ts
  quick-filters.ts
  types.ts
  utils.ts

public/

.env.example
.gitignore
components.json
next.config.mjs
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.mjs
README.md
tsconfig.json

Local only:

.env.local
node_modules/
.next/

20. COMPLETE CONSOLE SEQUENCE
-----------------------------

cd "C:\Users\marce\Documents\000 Logs and traces\Explorer_ok\Explorer--main\Explorer--main"

node --version
npm --version
pnpm --version

copy .env.example .env.local
notepad .env.local

pnpm install
pnpm exec tsc --noEmit
pnpm dev

Open:

http://localhost:3000

For a production check:

Ctrl+C
pnpm build
pnpm start

21. FINAL STATUS
----------------

The Explorer project does not use requirements.txt.

Its dependency system is:

package.json
pnpm-lock.yaml
pnpm install

The correct local secrets file is:

.env.local

The standard command to run the application is:

pnpm dev
