// ============================================================
// INSPIROO — Edge Function: get-messages
// Busca as mensagens de um match + status de handoff (se já
// está em modo IA ou se a pessoa pediu pra falar com o mentor).
//
// Deploy: supabase functions deploy get-messages --no-verify-jwt
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
    const { match_id, session_id } = await req.json();
    if (!match_id || !session_id) {
      return jsonError("match_id e session_id são obrigatórios", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, session_id, human_requested, mentor_id")
      .eq("id", match_id)
      .maybeSingle();

    if (matchErr) throw matchErr;
    if (!match) return jsonError("match não encontrado", 404);
    if (match.session_id !== session_id) return jsonError("acesso negado", 403);

    const { data: mentor, error: mentorErr } = await supabase
      .from("mentors")
      .select("name, ai_persona")
      .eq("id", match.mentor_id)
      .maybeSingle();
    if (mentorErr) throw mentorErr;

    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("id, sender, content, ai_generated, created_at")
      .eq("match_id", match_id)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    return new Response(
      JSON.stringify({
        messages: messages ?? [],
        human_requested: match.human_requested,
        mentor_name: mentor?.name ?? "mentor",
        ai_persona: mentor?.ai_persona ?? false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-messages error:", err);
    return jsonError("erro interno", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
