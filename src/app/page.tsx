"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionId } from "@/lib/session";
import { callFunction } from "@/lib/api";

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

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <p
            className="text-2xl tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            inspiroo<span className="text-marigold">.</span>
          </p>
        </div>

        {!result && (
          <div className="rise-once">
            <h1
              className="text-[2.1rem] leading-[1.15] mb-7 text-center"
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
          </div>
        )}

        {result && (
          <div className="rise-once">
            <p className="text-center text-sm text-dim mb-6">
              encontramos {result.mentors.length} mentores que já ajudaram
              gente na sua situação
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
      <div className="flex items-start justify-between gap-3 mb-2">
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
