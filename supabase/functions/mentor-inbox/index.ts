// ============================================================
// INSPIROO — Edge Function: mentor-inbox
// Lista as conversas de um mentor, autenticado pelo próprio
// access_token (link pessoal, sem senha).
//
// Deploy: supabase functions deploy mentor-inbox --no-verify-jwt
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
    const { access_token } = await req.json();
    if (!access_token) return jsonError("access_token é obrigatório", 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: mentor, error: mentorErr } = await supabase
      .from("mentors")
      .select("id, name, bio, category")
      .eq("access_token", access_token)
      .maybeSingle();
    if (mentorErr) throw mentorErr;
    if (!mentor) return jsonError("acesso inválido", 404);

    const { data: matches, error: matchesErr } = await supabase
      .from("matches")
      .select("id, human_requested, created_at, moments(text)")
      .eq("mentor_id", mentor.id)
      .order("created_at", { ascending: false });
    if (matchesErr) throw matchesErr;

    const conversations = (matches ?? []).map((m) => {
      const moment = Array.isArray(m.moments) ? m.moments[0] : m.moments;
      return {
        match_id: m.id,
        moment_text: moment?.text ?? "",
        human_requested: m.human_requested,
        created_at: m.created_at,
      };
    });

    return new Response(
      JSON.stringify({ mentor, conversations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mentor-inbox error:", err);
    return jsonError("erro interno", 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
