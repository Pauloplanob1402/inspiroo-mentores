// ============================================================
// INSPIROO — Edge Function: list-applications
// Lista candidaturas pendentes. Protegida por ADMIN_KEY (você
// mesmo configura esse secret, é sua senha do painel).
//
// Deploy: supabase functions deploy list-applications --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_KEY = Deno.env.get("ADMIN_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const providedKey = req.headers.get("x-admin-key");
  if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
    return jsonError("não autorizado", 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("mentor_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return jsonError("erro interno", 500);

  return new Response(
    JSON.stringify({ applications: data ?? [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
