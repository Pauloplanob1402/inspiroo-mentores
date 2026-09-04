// ============================================================
// INSPIROO — Edge Function: apply-mentor
// Recebe uma candidatura de mentor (nome, bio, categoria, foto
// em base64) e guarda em mentor_applications com status
// "pending" — não vai pro ar sozinho, precisa de aprovação
// manual (ver aprovar-mentor.sql).
//
// Deploy: supabase functions deploy apply-mentor --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_CATEGORIES = ["carreira", "mente", "exterior", "ia", "familia", "financas"];
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  try {
    const { name, bio, category, tags, contact, photo_base64, photo_mime } =
      await req.json();

    if (!name || !bio || !category || !contact) {
      return jsonError("nome, bio, categoria e contato são obrigatórios", 400);
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return jsonError("categoria inválida", 400);
    }
    if (bio.length > 600) {
      return jsonError("bio longa demais (máximo 600 caracteres)", 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let photo_url: string | null = null;
    if (photo_base64 && photo_mime) {
      const bytes = base64ToBytes(photo_base64);
      if (bytes.length > MAX_PHOTO_BYTES) {
        return jsonError("foto muito grande (máximo 4MB)", 400);
      }
      const ext = photo_mime.split("/")[1] ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("mentor-photos")
        .upload(path, bytes, { contentType: photo_mime });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage
        .from("mentor-photos")
        .getPublicUrl(path);
      photo_url = pub.publicUrl;
    }

    const { error: insertErr } = await supabase.from("mentor_applications").insert({
      name,
      bio,
      category,
      tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
      contact,
      photo_url,
    });
    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("apply-mentor error:", err);
    return jsonError("erro interno", 500);
  }
});

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
