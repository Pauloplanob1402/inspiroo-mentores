// ============================================================
// INSPIROO — Edge Function: mentor-conversation
// Mensagens de uma conversa específica, vistas pelo mentor
// (autenticado por access_token).
//
// Deploy: supabase functions deploy mentor-conversation --no-verify-jwt
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
    const { access_token, match_id } = await req.json();
    if (!access_token || !match_id) {
      return jsonError("access_token e match_id são obrigatórios", 400);
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

    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("id, sender, content, ai_generated, created_at")
      .eq("match_id", match_id)
      .order("created_at", { ascending: true });
    if (msgErr) throw msgErr;

    return new Response(
      JSON.stringify({ messages: messages ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mentor-conversation error:", err);
    return jsonError("erro interno", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
