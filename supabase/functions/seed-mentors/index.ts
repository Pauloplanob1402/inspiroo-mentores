// ============================================================
// INSPIROO — Edge Function: seed-mentors
// Roda UMA VEZ (ou de novo quando adicionar mentores novos).
// Insere mentores com embedding real do Gemini (bio + tags),
// pra que o primeiro usuário de verdade já encontre 3 opções
// na Tela 2. Insere também 1 post de cada, pra alimentar o
// "enquanto isso" da Tela 1.
//
// Protegida por SEED_KEY — sem essa chave, ninguém mais
// consegue chamar essa function e encher seu banco de lixo.
//
// TROQUE O ARRAY "SEED_MENTORS" ABAIXO PELOS SEUS MENTORES REAIS
// assim que tiver os cadastros de verdade.
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEED_KEY = Deno.env.get("SEED_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-key",
};

const SEED_MENTORS: {
  name: string;
  bio: string;
  category: string;
  tags: string[];
  rating: number;
  sessions_count: number;
  weekly_slots: number;
  post: { title: string; body: string; read_minutes: number };
}[] = [
  {
    name: "Renata Aquino",
    bio: "Ajudo pessoas que sentem que travaram na carreira depois de anos no mesmo cargo, sem saber se devem subir de nível onde estão ou mudar de direção completamente. 12 anos migrando executivos pra liderança sênior.",
    category: "carreira",
    tags: ["TransiçãoDeCarreira", "GestãoDePessoas"],
    rating: 4.9,
    sessions_count: 127,
    weekly_slots: 10,
    post: {
      title: "Ninguém trava na carreira. Trava na decisão que não tomou.",
      body: "Depois de 200 mentorias, percebi que \"estagnado\" quase nunca é sobre competência. É sobre uma decisão que a pessoa está adiando há meses — mudar de área, pedir promoção, ou simplesmente admitir que quer outra coisa. O primeiro passo nunca é currículo novo, é nomear a decisão.",
      read_minutes: 4,
    },
  },
  {
    name: "Carlos Bittencourt",
    bio: "Fui diretor executivo por 15 anos antes de virar mentor de recolocação. Trabalho com quem foi demitido, quem está pensando em sair, ou quem sente que o mercado mudou e não sabe mais se posicionar.",
    category: "carreira",
    tags: ["Recolocação", "Networking"],
    rating: 4.8,
    sessions_count: 89,
    weekly_slots: 2,
    post: {
      title: "O erro que todo executivo comete ao sair",
      body: "Quase todo mundo que demito, digo isso: o erro não é sair sem plano, é sair sem rede. As pessoas guardam o networking pra quando precisam dele — e nessa hora já é tarde. Rede se constrói quando você ainda não precisa de nada de ninguém.",
      read_minutes: 3,
    },
  },
  {
    name: "Juliana Mendes",
    bio: "Coach especializada em ansiedade, mente acelerada e burnout. Trabalho com pessoas que sentem que não conseguem desligar, que vivem no automático, ou que perderam a clareza sobre o que realmente querem.",
    category: "mente",
    tags: ["Ansiedade", "Clareza Mental"],
    rating: 4.9,
    sessions_count: 64,
    weekly_slots: 6,
    post: {
      title: "Ansiedade não pede solução. Pede direção.",
      body: "A pergunta que eu mudo em toda sessão não é \"como faço pra parar de sentir isso\", e sim \"o que essa ansiedade está tentando me dizer que eu não quero ouvir\". Quase sempre tem uma decisão adiada por trás do peso no peito.",
      read_minutes: 3,
    },
  },
  {
    name: "Marcos Tavares",
    bio: "Morei em 3 países diferentes nos últimos 10 anos. Ajudo quem quer se mudar pra fora com segurança — visto, trabalho remoto, adaptação cultural, e o medo de recomeçar do zero longe de casa.",
    category: "exterior",
    tags: ["Visto", "TrabalhoRemoto", "Adaptação"],
    rating: 4.7,
    sessions_count: 52,
    weekly_slots: 8,
    post: {
      title: "O que ninguém te conta sobre morar fora nos primeiros 6 meses",
      body: "Segurança não é sobre o visto certo. É sobre ter alguém que já passou por isso pra te dizer que o mês 3 é o mais difícil, não o mês 1. A euforia passa antes da papelada acabar, e ninguém avisa isso.",
      read_minutes: 6,
    },
  },
  {
    name: "Felipe Nogueira",
    bio: "Lidero equipes de tecnologia há 8 anos e hoje ajudo gestores a integrar IA no time sem perder a confiança das pessoas. Trabalho com quem sente medo de ser substituído ou não sabe como conduzir a mudança.",
    category: "ia",
    tags: ["IA na Prática", "Liderança Tech"],
    rating: 4.8,
    sessions_count: 41,
    weekly_slots: 7,
    post: {
      title: "Sua equipe não tem medo da IA. Tem medo de você não explicar o plano.",
      body: "Todo gestor que me procura assustado com IA tem o mesmo problema: introduziu a ferramenta antes de introduzir o motivo. Equipe sem contexto lê qualquer automação como ameaça. Com contexto, lê como alívio.",
      read_minutes: 4,
    },
  },
  {
    name: "Patrícia Lemos",
    bio: "Terapeuta de casal e família, especialista em comunicação não violenta. Ajudo famílias em que a conversa virou briga e ninguém mais sabe como falar sem magoar o outro.",
    category: "familia",
    tags: ["ComunicaçãoNãoViolenta", "Casamento"],
    rating: 4.9,
    sessions_count: 98,
    weekly_slots: 5,
    post: {
      title: "Comunicação em casa não quebra de uma vez. Ela desgasta.",
      body: "Nenhum casal chega em briga por um motivo só. Chega por seis meses de pequenas coisas engolidas. O trabalho não é resolver a última briga — é abrir espaço pras cinco que vieram antes dela e nunca foram ditas.",
      read_minutes: 4,
    },
  },
  {
    name: "Roberto Diniz",
    bio: "Consultor financeiro pessoal há 12 anos. Ajudo famílias a organizar as finanças, sair de dívidas e planejar o patrimônio sem depender de fórmulas prontas de internet.",
    category: "financas",
    tags: ["OrganizaçãoFinanceira", "SaídaDeDívidas"],
    rating: 4.7,
    sessions_count: 73,
    weekly_slots: 9,
    post: {
      title: "Preciso organizar as finanças, não emagrecer o orçamento",
      body: "As pessoas chegam pedindo pra cortar gastos. O problema quase nunca é o gasto — é a ausência de um sistema pra decidir onde o dinheiro vai antes dele chegar na conta. Orçamento não é dieta, é rota.",
      read_minutes: 3,
    },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("método não permitido", 405);

  const providedKey = req.headers.get("x-seed-key");
  if (!SEED_KEY || providedKey !== SEED_KEY) {
    return jsonError("não autorizado", 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: { name: string; ok: boolean }[] = [];

  for (const m of SEED_MENTORS) {
    try {
      const embeddingSource = `${m.bio} ${m.tags.join(" ")}`;
      const embedding = await getEmbeddingWithBackoff(embeddingSource);

      const { data: newMentor, error } = await supabase
        .from("mentors")
        .insert({
          name: m.name,
          bio: m.bio,
          category: m.category,
          tags: m.tags,
          embedding,
          verified: true,
          rating: m.rating,
          sessions_count: m.sessions_count,
          weekly_slots: m.weekly_slots,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: postErr } = await supabase.from("posts").insert({
        mentor_id: newMentor.id,
        title: m.post.title,
        body: m.post.body,
        category: m.category,
        read_minutes: m.post.read_minutes,
        reads_count: Math.floor(Math.random() * 250) + 50,
      });
      if (postErr) throw postErr;

      results.push({ name: m.name, ok: true });
    } catch (err) {
      console.error("seed error for mentor:", m.name, err);
      results.push({ name: m.name, ok: false });
    }
  }

  const inserted = results.filter((r) => r.ok).length;
  return new Response(
    JSON.stringify({ inserted, total: SEED_MENTORS.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

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

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
