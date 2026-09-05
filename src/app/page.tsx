"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionId } from "@/lib/session";
import { callFunction } from "@/lib/api";
import Onboarding from "./Onboarding";

type Mentor = {
  id: string;
  name: string;
  bio: string;
  category: string;
  tags: string[];
  verified: boolean;
  rating: number;
  sessions_count: number;
  weekly_slots: number;
  photo_url: string | null;
  similarity: number;
};

type MatchResponse = {
  moment_id: string;
  free_conversations_left: number;
  mentors: Mentor[];
};

const CATEGORY_LABEL: Record<string, string> = {
  carreira: "carreira",
  mente: "mente",
  exterior: "morar fora",
  ia: "IA no trabalho",
  familia: "família",
  financas: "finanças",
};

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("inspiroo_onboarded");
    setShowOnboarding(!seen);
    setCheckedOnboarding(true);
  }, []);

  function finishOnboarding() {
    localStorage.setItem("inspiroo_onboarded", "1");
    setShowOnboarding(false);
  }

  async function handleSubmit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callFunction<MatchResponse>("match-mentors", {
        text: text.trim(),
        session_id: getSessionId(),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartConversation(mentorId: string) {
    if (!result || startingId) return;
    setStartingId(mentorId);
    setError(null);
    try {
      const data = await callFunction<{ match_id: string }>(
        "start-conversation",
        {
          moment_id: result.moment_id,
          mentor_id: mentorId,
          session_id: getSessionId(),
        }
      );
      router.push(`/chat/${data.match_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "algo deu errado");
      setStartingId(null);
    }
  }

  if (!checkedOnboarding) return null;
  if (showOnboarding) return <Onboarding onFinish={finishOnboarding} />;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 sm:py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8 sm:mb-10 text-center relative">
          <div
            className="rise-once absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-24 sm:w-80 sm:h-28 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, #F2A93B 0%, #4FB6A6 60%, transparent 80%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="inspiroo."
            className="rise-once relative inline-block h-16 sm:h-20 w-auto"
          />
          <div className="mt-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-xs text-dim hover:text-marigold transition-colors underline underline-offset-2"
            >
              como funciona
            </button>
          </div>
        </div>

        {!result && (
          <div className="rise-once">
            <h1
              className="text-[clamp(1.6rem,6vw,2.1rem)] leading-[1.15] mb-6 sm:mb-7 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              qual momento da sua vida você está atravessando agora?
            </h1>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="escreve com suas palavras — quanto mais específico, melhor o mentor que a gente encontra"
              maxLength={500}
              rows={5}
              className="w-full bg-panel border border-[#3a2f47] rounded-2xl p-4 text-[0.95rem] leading-relaxed text-paper outline-none focus:border-marigold transition-colors resize-none"
            />

            {error && (
              <p className="mt-3 text-sm text-[#e08a8a]">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="mt-4 w-full bg-marigold text-ink font-semibold rounded-2xl py-4 text-[0.95rem] disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              {loading ? "buscando mentores certos..." : "encontrar meu mentor"}
            </button>

            <p className="mt-4 text-center text-xs text-dim">
              3 conversas grátis. sem cadastro pra começar.
            </p>
            <p className="mt-2 text-center text-xs text-dim">
              já passou por algo assim?{" "}
              <a
                href="/seja-mentor"
                className="text-marigold underline underline-offset-2"
              >
                seja mentor da tribo
              </a>
            </p>
          </div>
        )}

        {result && (
          <div className="rise-once">
            {result.mentors.length > 0 ? (
              <>
                <p className="text-center text-sm text-dim mb-6">
                  encontramos {result.mentors.length} mentores que já
                  ajudaram gente na sua situação
                </p>

                <div className="flex flex-col gap-4">
                  {result.mentors.map((mentor, i) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      featured={i === 0}
                      loading={startingId === mentor.id}
                      onSelect={() => handleStartConversation(mentor.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <ReferralOpportunity momentText={text} />
            )}

            {error && (
              <p className="mt-4 text-sm text-[#e08a8a] text-center">
                {error}
              </p>
            )}

            <button
              onClick={() => {
                setResult(null);
                setText("");
              }}
              className="mt-6 w-full text-center text-sm text-dim hover:text-paper transition-colors"
            >
              escrever outro momento
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ReferralOpportunity({ momentText }: { momentText: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Tô no inspiroo. — escrevi "${momentText.slice(
    0,
    80
  )}${momentText.length > 80 ? "..." : ""}" e tô procurando quem já passou por isso. Se você (ou alguém que você conhece) já viveu essa experiência e topa compartilhar como fez, dá uma olhada na plataforma — nossa tribo de mentores cresce assim.`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // pessoa cancelou o compartilhamento nativo — cai pro fallback
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard indisponível — sem mais fallback necessário aqui
    }
  }

  return (
    <div className="rounded-3xl p-6 bg-panel border border-marigold/30 text-center">
      <p
        className="text-xl mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        ainda não tem ninguém na tribo pra esse momento específico.
      </p>
      <p className="text-sm text-dim leading-relaxed mb-5">
        você conhece alguém que já viveu exatamente isso e topa compartilhar
        como fez? essa pessoa pode ser a próxima mentora da tribo — e você é
        quem vai levar ela até aqui.
      </p>
      <button
        onClick={handleShare}
        className="w-full bg-marigold text-ink font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 transition-opacity"
      >
        {copied ? "copiado — cola pra essa pessoa" : "indicar alguém pra tribo"}
      </button>
    </div>
  );
}

function MentorCard({
  mentor,
  featured,
  loading,
  onSelect,
}: {
  mentor: Mentor;
  featured: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={
        featured
          ? "rounded-3xl p-6 bg-gradient-to-br from-panel to-[#3a2f47] border border-marigold/40"
          : "rounded-3xl p-5 bg-panel border border-[#3a2f47]"
      }
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className={
            featured
              ? "w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-marigold to-teal"
              : "w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-marigold to-teal"
          }
        >
          {mentor.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mentor.photo_url}
              alt={mentor.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 flex items-start justify-between gap-3">
          <div>
            <p
              className={featured ? "text-xl" : "text-lg"}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {mentor.name}
            </p>
            <p className="text-xs text-teal mt-0.5">
              {CATEGORY_LABEL[mentor.category] ?? mentor.category}
              {mentor.verified ? " · verificado" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-marigold">★ {mentor.rating.toFixed(1)}</p>
            <p className="text-[0.7rem] text-dim mt-0.5">
              {mentor.sessions_count} sessões
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-dim leading-relaxed mb-4">{mentor.bio}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {mentor.tags.map((tag) => (
          <span
            key={tag}
            className="text-[0.7rem] bg-ink/40 border border-[#3a2f47] rounded-full px-2.5 py-1 text-dim"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={loading}
        className={
          featured
            ? "w-full bg-marigold text-ink font-semibold rounded-xl py-3 text-sm disabled:opacity-50 transition-opacity hover:opacity-90"
            : "w-full bg-transparent border border-[#3a2f47] text-paper rounded-xl py-3 text-sm disabled:opacity-50 hover:border-marigold transition-colors"
        }
      >
        {loading ? "abrindo conversa..." : "conversar grátis"}
      </button>
    </div>
  );
}
