// ============================================================
// api.ts — chamadas pras Edge Functions do Supabase.
// TROQUE SUPABASE_URL e SUPABASE_ANON_KEY pelos valores do seu
// projeto (Project Settings → API), ou configure as duas
// variáveis de ambiente abaixo no .env.local / Vercel.
// ============================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "SUA-ANON-KEY-AQUI";

export async function callFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `erro ${res.status}`);
  }

  return res.json();
}
