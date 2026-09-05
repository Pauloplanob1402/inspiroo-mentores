// ============================================================
// INSPIROO — Edge Function: start-conversation
// Chamada quando o usuário clica "Conversar grátis" na Tela 2.
// Aqui — e só aqui — o contador de conversas grátis é decrementado.
// Se acabaram as grátis, devolve 402 e o client mostra o paywall.
//
// Deploy: supabase functions deploy start-conversation --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  try {
    const { moment_id, mentor_id, session_id } = await req.json();
    if (!moment_id || !mentor_id || !session_id) {
      return jsonError("moment_id, mentor_id e session_id são obrigatórios", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. se já existe uma sala aberta pra esse moment + mentor, reusa
    // (evita gastar uma segunda conversa grátis se o usuário voltar pra
    // mesma tela e clicar de novo)
    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .eq("moment_id", moment_id)
      .eq("mentor_id", mentor_id)
      .neq("status", "closed")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ match_id: existing.id, reused: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. checa e decrementa o contador de conversas grátis
    //    de forma atômica (o .gt() abaixo evita corrida entre cliques duplos)
    const { data: session } = await supabase
      .from("sessions")
      .select("free_conversations_left")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!session || session.free_conversations_left <= 0) {
      return jsonError("suas conversas grátis acabaram", 402);
    }

    const { error: decErr } = await supabase
      .from("sessions")
      .update({ free_conversations_left: session.free_conversations_left - 1 })
      .eq("session_id", session_id)
      .gt("free_conversations_left", 0); // trava contra corrida: só desconta se ainda > 0
    if (decErr) throw decErr;

    // 3. cria o match
    const { data: newMatch, error: matchErr } = await supabase
      .from("matches")
      .insert({ moment_id, mentor_id, session_id, status: "chatting" })
      .select("id")
      .single();
    if (matchErr) throw matchErr;

    // 4. primeira mensagem, automática, do mentor — só na criação
    // de um match novo (nunca num match reusado)
    const welcomeText =
      "oi! que bom que você chegou até aqui.\n\n" +
      "hoje a inspiroo ainda é quase tudo mato — poucos mentores, começo de tudo. " +
      "mas vai virar uma tribo enorme, e quando isso acontecer, você vai saber que foi um dos primeiros a pisar aqui.\n\n" +
      "me conta, o que te trouxe até esse momento?";

    await supabase.from("messages").insert({
      match_id: newMatch.id,
      sender: "mentor",
      content: welcomeText,
      ai_generated: true,
    });

    return new Response(
      JSON.stringify({
        match_id: newMatch.id,
        free_conversations_left: session.free_conversations_left - 1,
        reused: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("start-conversation error:", err);
    return jsonError("erro interno", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
