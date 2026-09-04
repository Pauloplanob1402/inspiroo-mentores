// ============================================================
// INSPIROO — Edge Function: seed-wisdom
// Roda UMA VEZ (ou de novo quando você quiser adicionar mais
// temas). Insere sínteses de temas do seu material de 30 anos,
// com embedding real do Gemini, pra alimentar a mentor-reply.
//
// IMPORTANTE: cada "synthesis" abaixo é uma síntese em texto
// PRÓPRIO das ideias centrais do tema — nunca uma citação longa
// e literal dos autores originais (Maxwell, Napoleon Hill,
// Meneghetti etc). É assim que evitamos reproduzir conteúdo
// protegido por direito autoral em escala.
//
// ESTE É O LOTE 1 — 24 temas de um total de 304 no material
// original. Cobre os temas mais centrais pra conversas de
// desenvolvimento pessoal. Os outros ~280 podem ser adicionados
// depois, em lotes novos, sem quebrar nada do que já existe.
//
// Deploy: supabase functions deploy seed-wisdom --no-verify-jwt
// Secret necessário: GEMINI_API_KEY, SEED_KEY
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

const WISDOM: { theme: string; synthesis: string }[] = [
  {
    theme: "Ações",
    synthesis: "O que você faz revela quem você é muito mais do que o que você sente ou diz que vai fazer. Adiar a ação por excesso de análise é uma forma de paralisia — o resultado quase sempre importa menos do que o hábito de simplesmente começar, ajustando o plano pelo caminho.",
  },
  {
    theme: "Atitude",
    synthesis: "Sua atitude é sempre percebida pelos outros, mesmo quando você acha que está escondendo. Grande parte do que você chama de reação a uma pessoa ou situação é, na verdade, reação aos seus próprios sentimentos — e isso é algo que você pode escolher administrar.",
  },
  {
    theme: "Autoconfiança",
    synthesis: "Autoconfiança não é ausência de dúvida, é continuar apostando nas próprias ideias mesmo diante do primeiro sinal de derrota. Quem sabe o que quer e recusa aceitar 'impossível' como resposta final tende a levar vantagem sobre quem desiste cedo.",
  },
  {
    theme: "Autoconhecimento",
    synthesis: "Boa parte do sofrimento vem de não assumir que somos nós que escolhemos, mesmo quando parece que a vida só acontece com a gente. Aceitar essa autoria é desconfortável porque implica em mudar — e a maioria resiste exatamente por isso.",
  },
  {
    theme: "Audácia",
    synthesis: "Chega um momento em que esperar virar a pessoa que você quer ser não basta mais — é preciso agir como se você já fosse essa pessoa. A maioria só muda quando a dor de continuar igual fica maior que o medo de mudar.",
  },
  {
    theme: "Adversidade",
    synthesis: "O caminho pra qualquer objetivo raramente é reto. Boa parte dos obstáculos não tem relação direta com sua competência — tem a ver com o fato de que nem todo mundo ao redor está torcendo pelo seu sucesso, e é preciso seguir mesmo assim.",
  },
  {
    theme: "Decisões",
    synthesis: "Toda decisão boa costuma incomodar um pouco hoje e recompensar amanhã — e toda decisão ruim costuma parecer confortável agora e cobrar depois. Pessoas decididas avaliam rápido, decidem e agem; a indecisão é o verdadeiro desperdício de tempo.",
  },
  {
    theme: "Desânimo",
    synthesis: "Ninguém mantém você desanimado além de você mesmo — mas isso não significa que seja fácil sair sozinho disso. Estar perto de quem te escuta bem, e prestar atenção no diálogo interno que você mantém consigo, muda o jogo mais do que parece.",
  },
  {
    theme: "Desafios",
    synthesis: "A diferença entre encarar algo como maldição ou como desafio está mais na sua interpretação do que no fato em si. As situações mais duras costumam ser exatamente as que preparam você pra lidar com as próximas, maiores.",
  },
  {
    theme: "Determinação",
    synthesis: "Determinação é a capacidade de tomar decisões difíceis rápido e agir sobre elas, sem ficar procrastinando o desconforto. Quem não sabe o que quer da vida dificilmente vai reconhecer quando a oportunidade certa aparecer.",
  },
  {
    theme: "Foco",
    synthesis: "Cada pessoa precisa encontrar o próprio caminho — copiar o caminho de outra pessoa, mesmo bem-sucedida, tende a levar a lugares que não fazem sentido pra você. Foco também significa não construir pontes com quem não entende o que está em jogo pra você.",
  },
  {
    theme: "Hábitos",
    synthesis: "O futuro se decide muito mais na rotina repetida do dia a dia do que em decisões grandiosas ocasionais. Hábitos se formam devagar, quase imperceptivelmente, até ficarem tão arraigados que dão a sensação de que a vida simplesmente acontece, sem escolha.",
  },
  {
    theme: "Sintomas dos medos",
    synthesis: "O medo se disfarça de coisas comuns: indiferença (falta de ambição, aceitar qualquer coisa sem reagir), indecisão (deixar os outros pensarem por você), dúvida (usar desculpas pra justificar fracasso) e preocupação excessiva. Reconhecer esses disfarces é o primeiro passo pra lidar com o medo em vez de ser conduzido por ele.",
  },
  {
    theme: "Metas",
    synthesis: "Meta sem prazo é só uma boa intenção. Duas armadilhas comuns: metas impossíveis demais (que servem de desculpa antecipada pro fracasso) e metas pequenas demais (que não desafiam nada) — o ponto certo fica no meio, com prazo definido.",
  },
  {
    theme: "Perseverança/persistência",
    synthesis: "Persistir depende de quatro coisas: um objetivo claro sustentado por desejo real, um plano que vire ação constante, blindagem contra influências negativas de quem está por perto, e ter ao menos uma pessoa que te puxe pra frente no plano. Sem esforço sustentado, a fé no próprio objetivo enfraquece.",
  },
  {
    theme: "Relacionamentos",
    synthesis: "Sucesso, no fundo, é uma coleção de relacionamentos bem construídos, não uma conquista solitária. Relacionamentos de qualidade nascem de confiança real — a que vem de manter combinados, compartilhar de verdade e ser responsável pelo que se promete.",
  },
  {
    theme: "Tempo",
    synthesis: "O problema raramente é fazer mais coisas em menos tempo — é fazer as coisas certas, de forma equilibrada. Quem não respeita o próprio tempo dificilmente terá o respeito alheio por aquilo que sabe ou pensa.",
  },
  {
    theme: "Missão",
    synthesis: "Definir a missão é a primeira tarefa de quem lidera — a própria vida ou outras pessoas. Viver sem clareza de propósito é diferente de viver empenhado numa direção: um chamado claro é o que mais motiva quem está ao redor.",
  },
  {
    theme: "Mudança",
    synthesis: "Mudança consciente nasce de pra onde você direciona atenção e intenção — o que você foca, cresce; o que você deixa de focar, enfraquece. Muita gente fracassa não por falta de capacidade, mas por recusar sair da zona de conforto: mesmo emprego, mesma cidade, mesmas pessoas.",
  },
  {
    theme: "Procrastinação",
    synthesis: "Procrastinar é o hábito de empurrar pra depois o que já devia ter sido feito — e cada vez que você adia, fica mais fácil adiar de novo, até o hábito ficar difícil de quebrar. A cura é simples de descrever e difícil de praticar: agir, imediatamente, assim que o preparo estiver pronto.",
  },
  {
    theme: "Autocontrole",
    synthesis: "Autocontrole não é sobre reprimir tudo, é sobre discernir o que vale reação. Aceitar uma circunstância como ela é, no momento em que ela está acontecendo, é diferente de se resignar — é reconhecer onde você tem controle real e onde não tem.",
  },
  {
    theme: "Sabedoria",
    synthesis: "Sabedoria muitas vezes parece inação, mas não é — é saber a hora certa de deixar uma situação (ou uma pessoa) seguir seu próprio curso sem interferência, porque forçar no momento errado quase sempre piora as coisas.",
  },
  {
    theme: "Gratidão",
    synthesis: "Quem pratica gratidão pelo que já tem, mesmo no pequeno, tende a atrair mais motivos pra seguir grato — é quase um ciclo que se retroalimenta. Nos dias em que parece não ter nada bom pra reconhecer, dá pra inverter e agradecer pelo que ruim não está acontecendo.",
  },
  {
    theme: "Solidão",
    synthesis: "Quem não suporta ficar sozinho nem por um minuto costuma, no fundo, não gostar muito de si mesmo — e paradoxalmente, essa dependência constante dos outros tende a afastar as próprias pessoas que essa pessoa mais quer por perto. Solidão bem vivida é diferente de isolamento.",
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
  const results: { theme: string; ok: boolean }[] = [];

  for (const w of WISDOM) {
    try {
      const embedding = await getEmbeddingWithBackoff(`${w.theme}: ${w.synthesis}`);

      const { error } = await supabase.from("wisdom_chunks").insert({
        theme: w.theme,
        synthesis: w.synthesis,
        embedding,
      });
      if (error) throw error;

      results.push({ theme: w.theme, ok: true });
    } catch (err) {
      console.error("seed-wisdom error for theme:", w.theme, err);
      results.push({ theme: w.theme, ok: false });
    }
  }

  const inserted = results.filter((r) => r.ok).length;
  return new Response(
    JSON.stringify({ inserted, total: WISDOM.length, results }),
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
