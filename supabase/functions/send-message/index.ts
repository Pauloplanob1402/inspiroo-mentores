// ============================================================
// INSPIROO — Edge Function: send-message
// Salva a mensagem do usuário. Se o mentor daquele match é uma
// "ai_persona" (por enquanto, só a sua, categoria "mente") e a
// pessoa ainda não pediu pra falar com o mentor de verdade
// (human_requested = false), gera automaticamente a resposta
// com o Gemini, baseada nos temas mais relevantes do seu
// material (wisdom_chunks) — e salva como mensagem também.
//
// Pra pedir handoff pro mentor humano, o client manda
// { match_id, session_id, request_human: true } no lugar de
// content. Isso só seta human_requested = true, sem gerar
// resposta — a partir daí a IA para de responder nesse match.
//
// Deploy: supabase functions deploy send-message --no-verify-jwt
// Secret necessário: GEMINI_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ajuste aqui se quiser trocar o modelo de texto usado na resposta
const GEMINI_TEXT_MODEL = "gemini-2.0-flash";
const DAILY_LIMIT_PER_SESSION = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  try {
    const { match_id, session_id, content, request_human } = await req.json();
    if (!match_id || !session_id) {
      return jsonError("match_id e session_id são obrigatórios", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, session_id, mentor_id, human_requested")
      .eq("id", match_id)
      .maybeSingle();
    if (matchErr) throw matchErr;
    if (!match) return jsonError("match não encontrado", 404);
    if (match.session_id !== session_id) return jsonError("acesso negado", 403);

    // --- caminho 1: pedido de handoff pro mentor humano ---
    if (request_human) {
      const { error: updErr } = await supabase
        .from("matches")
        .update({ human_requested: true })
        .eq("id", match_id);
      if (updErr) throw updErr;

      return new Response(
        JSON.stringify({ ok: true, human_requested: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- caminho 2: mensagem normal ---
    if (!content || typeof content !== "string" || content.length > 1000) {
      return jsonError("conteúdo inválido ou longo demais", 400);
    }
    if (containsBlockedContent(content)) {
      return jsonError("não foi possível enviar essa mensagem", 422);
    }

    const { error: insertErr } = await supabase.from("messages").insert({
      match_id,
      sender: "user",
      content,
    });
    if (insertErr) throw insertErr;

    // se já pediu handoff, ou o mentor não é uma ai_persona, a
    // IA não responde — fica esperando o mentor humano de verdade
    if (match.human_requested) {
      return new Response(
        JSON.stringify({ ok: true, ai_reply: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: mentor, error: mentorErr } = await supabase
      .from("mentors")
      .select("id, name, bio, ai_persona")
      .eq("id", match.mentor_id)
      .maybeSingle();
    if (mentorErr) throw mentorErr;

    if (!mentor || !mentor.ai_persona) {
      return new Response(
        JSON.stringify({ ok: true, ai_reply: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // limite diário — protege a quota do Gemini
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("api_usage")
      .select("calls")
      .eq("session_id", session_id)
      .eq("day", today)
      .maybeSingle();

    if (usage && usage.calls >= DAILY_LIMIT_PER_SESSION) {
      return new Response(
        JSON.stringify({ ok: true, ai_reply: false, limited: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. embedding da pergunta do usuário
    const queryEmbedding = await getEmbeddingWithBackoff(content);

    // 2. busca os temas mais relevantes do material
    const { data: wisdom, error: wisdomErr } = await supabase.rpc(
      "find_nearest_wisdom",
      { query_embedding: queryEmbedding, match_limit: 4 }
    );
    if (wisdomErr) throw wisdomErr;

    // 3. pega o histórico recente da conversa (últimas 10 mensagens)
    const { data: history } = await supabase
      .from("messages")
      .select("sender, content")
      .eq("match_id", match_id)
      .order("created_at", { ascending: false })
      .limit(10);
    const recentHistory = (history ?? []).reverse();

    // 4. gera a resposta
    const replyText = await generateMentorReply(
      mentor.name,
      mentor.bio,
      wisdom ?? [],
      recentHistory,
      content
    );

    const { error: replyInsertErr } = await supabase.from("messages").insert({
      match_id,
      sender: "mentor",
      content: replyText,
      ai_generated: true,
    });
    if (replyInsertErr) throw replyInsertErr;

    await supabase.from("api_usage").upsert(
      { session_id, day: today, calls: (usage?.calls ?? 0) + 1 },
      { onConflict: "session_id,day" }
    );

    return new Response(
      JSON.stringify({ ok: true, ai_reply: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-message error:", err);
    return jsonError("erro interno", 500);
  }
});

async function generateMentorReply(
  mentorName: string,
  mentorBio: string,
  wisdom: { theme: string; synthesis: string }[],
  history: { sender: string; content: string }[],
  userMessage: string
): Promise<string> {
  const wisdomContext = wisdom
    .map((w) => `Tema "${w.theme}": ${w.synthesis}`)
    .join("\n");

  const historyText = history
    .map((m) => `${m.sender === "user" ? "Pessoa" : mentorName}: ${m.content}`)
    .join("\n");

  const systemPrompt = `Você está respondendo como ${mentorName}, mentor(a) de ${mentorBio ? "" : ""}desenvolvimento. Bio: ${mentorBio}

REGRAS DE CONVERSA:
- Nunca despeje tudo numa mensagem só. Responda como numa conversa de verdade: 1 a 3 frases curtas por vez, quase sempre terminando com uma pergunta que puxa a pessoa a contar mais (rapport genuíno, não interrogatório).
- Espelhe o que a pessoa disse antes de acrescentar algo novo — mostra que você prestou atenção (rótulo emocional: nomeie o que ela parece estar sentindo, sem se dar por conta disso "é uma técnica").
- Baseie o conteúdo nos temas abaixo, mas SEMPRE com suas próprias palavras — nunca copie frases inteiras, nunca cite autor e livro.
- Se algum tema tiver conteúdo de fé/religião, só mencione isso se a PESSOA tiver trazido esse assunto primeiro. Caso contrário, mantenha registro secular.
- Não invente fatos sobre a vida da pessoa.
- Nunca finja ser um humano respondendo em tempo real — isso já está avisado na tela, não precisa repetir.

CONVITE PRA TRIBO (use com moderação, no máximo uma vez a cada várias mensagens, só quando fizer sentido natural):
- Se a pessoa demonstrar que a conversa ajudou, ou mencionar que conhece alguém na mesma situação dela, é um bom momento — nunca force isso numa resposta que não pediu por isso.
- Quando for o momento, o convite é pessoal e específico à situação dela, nunca genérico tipo "convide seus amigos". Exemplo de tom: perguntar se ela conhece alguém que já passou por isso e topa ajudar quem vier depois — a pessoa vira quem leva alguém pra tribo, não quem "compartilha o app".
- Enquadre sempre como a pessoa ajudando alguém (ela no centro da história), nunca como fazer favor pro Inspiroo.

TEMAS RELEVANTES PRA ESSA CONVERSA:
${wisdomContext || "(nenhum tema específico — responda com bom senso e a bio acima)"}

HISTÓRICO RECENTE:
${historyText}

Responda à última mensagem da pessoa: "${userMessage}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error(`GEMINI_TEXT_FAILED_${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("GEMINI_TEXT_EMPTY");
  return text.trim();
}

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
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((r) => setTimeout(r, delay));
    return getEmbeddingWithBackoff(text, attempt + 1);
  }
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
