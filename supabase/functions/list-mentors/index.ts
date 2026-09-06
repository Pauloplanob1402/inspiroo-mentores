// ============================================================
// INSPIROO — Edge Function: list-mentors
// Lista pública dos mentores (nome, foto, categoria, nota) —
// sem dado sensível, só o que já aparece nos cards de match.
//
// Deploy: supabase functions deploy list-mentors --no-verify-jwt
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("mentors")
    .select("id, name, photo_url, category, rating, sessions_count")
    .order("sessions_count", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: "erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ mentors: data ?? [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
