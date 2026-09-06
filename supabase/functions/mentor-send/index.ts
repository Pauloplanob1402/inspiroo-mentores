// ============================================================
// INSPIROO — Edge Function: mentor-send
// O mentor real manda uma mensagem de verdade. A partir daqui,
// human_requested vira true NAQUELA conversa — a IA para de
// responder só ali, as outras conversas dele continuam com IA
// normalmente até ele responder cada uma também.
//
// Deploy: supabase functions deploy mentor-send --no-verify-jwt
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
    const { access_token, match_id, content } = await req.json();
    if (!access_token || !match_id || !content) {
      return jsonError("access_token, match_id e content são obrigatórios", 400);
    }
    if (typeof content !== "string" || content.length > 1000) {
      return jsonError("mensagem inválida ou longa demais", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: mentor, error: mentorErr } = await supabase
      .from("mentors")
      .select("id")
      .eq("access_token", access_token)
      .maybeSingle();
    if (mentorErr) throw mentorErr;
    if (!mentor) return jsonError("acesso inválido", 404);

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, mentor_id")
      .eq("id", match_id)
      .maybeSingle();
    if (matchErr) throw matchErr;
    if (!match || match.mentor_id !== mentor.id) {
      return jsonError("essa conversa não é sua", 403);
    }

    const { error: insertErr } = await supabase.from("messages").insert({
      match_id,
      sender: "mentor",
      content,
      ai_generated: false,
    });
    if (insertErr) throw insertErr;

    await supabase
      .from("matches")
      .update({ human_requested: true })
      .eq("id", match_id);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mentor-send error:", err);
    return jsonError("erro interno", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
