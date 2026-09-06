// ============================================================
// INSPIROO — Edge Function: review-application
// Aprova ou rejeita uma candidatura. Ao aprovar: gera o
// embedding real do mentor, insere em `mentors` (já com
// access_token pro painel dele), e manda e-mail se o serviço
// de e-mail estiver configurado (RESEND_API_KEY) — se não
// estiver, só pula essa parte silenciosamente, não quebra nada.
//
// Deploy: supabase functions deploy review-application --no-verify-jwt
// Secrets: ADMIN_KEY, GEMINI_API_KEY, (opcional) RESEND_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_KEY = Deno.env.get("ADMIN_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // opcional
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://inspiroo-mentores.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  const providedKey = req.headers.get("x-admin-key");
  if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
    return jsonError("não autorizado", 401);
  }

  try {
    const { application_id, decision } = await req.json();
    if (!application_id || !["approve", "reject"].includes(decision)) {
      return jsonError("application_id e decision ('approve'/'reject') são obrigatórios", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: app, error: appErr } = await supabase
      .from("mentor_applications")
      .select("*")
      .eq("id", application_id)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) return jsonError("candidatura não encontrada", 404);

    if (decision === "reject") {
      await supabase
        .from("mentor_applications")
        .update({ status: "rejected" })
        .eq("id", application_id);

      await sendEmail(
        app.contact,
        "sobre sua candidatura no inspiroo.",
        `oi, ${app.name}! obrigado por se candidatar pra ser mentor na inspiroo. dessa vez não deu certo, mas fica à vontade pra se candidatar de novo mais pra frente.`
      );

      return jsonResponse({ ok: true, decision: "rejected" });
    }

    // approve
    const embeddingSource = `${app.bio} ${app.tags.join(" ")}`;
    const embedding = await getEmbeddingWithBackoff(embeddingSource);

    const { data: newMentor, error: mentorErr } = await supabase
      .from("mentors")
      .insert({
        name: app.name,
        bio: app.bio,
        category: app.category,
        tags: app.tags,
        photo_url: app.photo_url,
        embedding,
        verified: true,
        rating: 5.0,
        sessions_count: 0,
        weekly_slots: 10,
        ai_persona: true, // a IA responde por ele até ele mesmo assumir no painel
      })
      .select("id, access_token")
      .single();
    if (mentorErr) throw mentorErr;

    await supabase
      .from("mentor_applications")
      .update({ status: "approved" })
      .eq("id", application_id);

    const panelUrl = `${SITE_URL}/mentor/${newMentor.access_token}`;
    await sendEmail(
      app.contact,
      "você foi aprovado como mentor na inspiroo.!",
      `oi, ${app.name}! sua candidatura foi aprovada — você já está no ar como mentor na inspiroo.\n\n` +
        `enquanto você não acessa, nossa inteligência responde por você usando sua bio, só pra ninguém ficar sem resposta. quando quiser assumir de verdade, é só entrar no seu painel:\n\n${panelUrl}\n\n` +
        `guarda esse link — é o seu acesso pessoal, sem senha.`
    );

    return jsonResponse({ ok: true, decision: "approved", panel_url: panelUrl });
  } catch (err) {
    console.error("review-application error:", err);
    return jsonError("erro interno", 500);
  }
});

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return; // e-mail não configurado ainda — sem problema, só pula
  if (!to.includes("@")) return; // contato era whatsapp, não e-mail — sem como mandar email
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "inspiroo. <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });
  } catch (err) {
    console.error("falha ao enviar e-mail (não bloqueante):", err);
  }
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
