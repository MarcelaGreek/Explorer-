import { NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

// Created lazily inside the handler (not at module scope) so this route can
// be built/loaded without live keys present; only a real request needs them.
function getClients() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVER_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return { openai, supabase }
}

function vectorToPgvectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = String(body.query || "").trim()
    const matchCount = Number(body.matchCount || 4)
    const minSimilarity =
      body.minSimilarity === null || body.minSimilarity === undefined || body.minSimilarity === ""
        ? null
        : Number(body.minSimilarity)

    if (!query) {
      return NextResponse.json({ error: "Missing semantic search query" }, { status: 400 })
    }

    const { openai, supabase } = getClients()

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    })

    const queryVectorText = vectorToPgvectorLiteral(embeddingResponse.data[0].embedding)

    const { data, error } = await supabase.rpc("match_trace2_traces", {
      p_query_embedding_vector_text: queryVectorText,
      p_match_count: matchCount,
      p_min_similarity: minSimilarity,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      query,
      matches: data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
