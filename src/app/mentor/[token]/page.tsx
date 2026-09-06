"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Conversation = {
  match_id: string;
  moment_text: string;
  human_requested: boolean;
  created_at: string;
};

type Message = {
  id: string;
  sender: "user" | "mentor";
  content: string;
  ai_generated: boolean;
  created_at: string;
};

async function callFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY ?? "" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `erro ${res.status}`);
  }
  return res.json();
}

export default function MentorPanel() {
  const params = useParams();
  const token = params.token as string;

  const [mentorName, setMentorName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callFn<{ mentor: { name: string }; conversations: Conversation[] }>("mentor-inbox", {
      access_token: token,
    })
      .then((data) => {
        setMentorName(data.mentor.name);
        setConversations(data.conversations);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    async function poll() {
      try {
        const data = await callFn<{ messages: Message[] }>("mentor-conversation", {
          access_token: token,
          match_id: selected,
        });
        if (!cancelled) setMessages(data.messages);
      } catch {
        // silencioso
      }
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected, token]);

  async function handleSend() {
    if (!input.trim() || !selected) return;
    const content = input.trim();
    setInput("");
    try {
      await callFn("mentor-send", { access_token: token, match_id: selected, content });
      const data = await callFn<{ messages: Message[] }>("mentor-conversation", {
        access_token: token,
        match_id: selected,
      });
      setMessages(data.messages);
      setConversations((prev) =>
        prev.map((c) => (c.match_id === selected ? { ...c, human_requested: true } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "não deu pra enviar");
    }
  }

  if (loading) return null;

  if (error && conversations.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 text-center">
        <p className="text-sm text-[#e08a8a]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-72 border-b md:border-b-0 md:border-r border-[#3a2f47] p-5">
        <p className="text-lg mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {mentorName}
        </p>
        <p className="text-xs text-dim mb-5">suas conversas</p>
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <button
              key={c.match_id}
              onClick={() => setSelected(c.match_id)}
              className={
                selected === c.match_id
                  ? "text-left rounded-xl p-3 bg-marigold/20 border border-marigold/40"
                  : "text-left rounded-xl p-3 bg-panel border border-[#3a2f47] hover:border-marigold/40 transition-colors"
              }
            >
              <p className="text-xs text-dim mb-1">
                {c.human_requested ? "você já respondeu" : "IA respondendo"}
              </p>
              <p className="text-sm line-clamp-2">{c.moment_text}</p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-sm text-dim">nenhuma conversa ainda.</p>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-dim px-5 text-center">
            escolhe uma conversa ao lado pra ver as mensagens
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto thin-scroll px-5 py-5 flex flex-col gap-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender === "mentor"
                      ? "self-end max-w-[78%] bg-marigold text-ink rounded-2xl rounded-br-sm px-4 py-2.5 text-sm"
                      : "self-start max-w-[78%] bg-panel border border-[#3a2f47] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm"
                  }
                >
                  {m.content}
                  {m.sender === "mentor" && m.ai_generated && (
                    <span className="block text-[0.65rem] opacity-60 mt-1">
                      resposta automática
                    </span>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="px-5 pb-1 text-xs text-[#e08a8a]">{error}</p>}
            <div className="px-5 py-4 border-t border-[#3a2f47] flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="responder de verdade..."
                className="flex-1 bg-panel border border-[#3a2f47] rounded-full px-4 py-3 text-sm outline-none focus:border-marigold transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-11 h-11 rounded-full bg-marigold text-ink flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                →
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
