// ============================================================
// INSPIROO — Edge Function: match-mentors
// Recebe o que o usuário escreveu, gera o embedding via Gemini,
// acha os 3 mentores mais próximos e devolve pro cliente.
// Não consome conversa grátis — isso só acontece em start-conversation.
//
// Deploy: supabase functions deploy match-mentors --no-verify-jwt
// Secret necessário: GEMINI_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_LIMIT_PER_SESSION = 50;
const MAX_TEXT_LENGTH = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  try {
    const { text, session_id } = await req.json();

    if (!text || !session_id) return jsonError("texto e session_id são obrigatórios", 400);
    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      return jsonError("texto inválido ou longo demais", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. garante que a sessão existe (primeira visita = 3 conversas grátis)
    const { data: session } = await supabase
      .from("sessions")
      .select("session_id, free_conversations_left")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!session) {
      await supabase.from("sessions").insert({ session_id });
    }

    // 2. limite diário — protege a quota do Gemini
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("api_usage")
      .select("calls")
      .eq("session_id", session_id)
      .eq("day", today)
      .maybeSingle();

    if (usage && usage.calls >= DAILY_LIMIT_PER_SESSION) {
      return jsonError("limite diário atingido, tenta de novo amanhã", 429);
    }

    // 3. moderação básica antes de gastar chamada de embedding
    if (containsBlockedContent(text)) {
      return jsonError("não foi possível processar esse texto", 422);
    }

    // 4. gera o embedding (com retry/backoff)
    const embedding = await getEmbeddingWithBackoff(text);

    // 5. busca os 3 mentores mais próximos
    const { data: mentors, error: matchErr } = await supabase.rpc(
      "find_nearest_mentors",
      { query_embedding: embedding, match_limit: 3 }
    );
    if (matchErr) throw matchErr;

    // 6. salva o moment
    const { data: newMoment, error: insertErr } = await supabase
      .from("moments")
      .insert({ text, embedding, session_id })
      .select("id, created_at")
      .single();
    if (insertErr) throw insertErr;

    // 7. atualiza o contador de uso do Gemini
    await supabase.from("api_usage").upsert(
      { session_id, day: today, calls: (usage?.calls ?? 0) + 1 },
      { onConflict: "session_id,day" }
    );

    return new Response(
      JSON.stringify({
        moment_id: newMoment.id,
        free_conversations_left: session?.free_conversations_left ?? 3,
        mentors: mentors ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("match-mentors error:", err);
    if (err instanceof Error && err.message === "RATE_LIMIT") {
      return jsonError("muita gente escrevendo agora, tenta em instantes", 429);
    }
    return jsonError("erro interno", 500);
  }
});

async function getEmbeddingWithBackoff(text: string, attempt = 0): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );

  if (res.status === 429 && attempt < 4) {
    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s
    await new Promise((r) => setTimeout(r, delay));
    return getEmbeddingWithBackoff(text, attempt + 1);
  }
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`EMBEDDING_FAILED_${res.status}`);

  const data = await res.json();
  return data.embedding.values as number[];
}

function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  const blockedPatterns = [
    "whatsapp", "instagram.com", "@gmail", "@hotmail",
    "meu numero", "meu número", "me chama no", "insta:",
  ];
  return blockedPatterns.some((p) => lower.includes(p));
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
