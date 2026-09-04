"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionId } from "@/lib/session";
import { callFunction } from "@/lib/api";

type Message = {
  id: string;
  sender: "user" | "mentor";
  content: string;
  ai_generated: boolean;
  created_at: string;
};

type GetMessagesResponse = {
  messages: Message[];
  human_requested: boolean;
  mentor_name: string;
  ai_persona: boolean;
};

export default function ChatPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [mentorName, setMentorName] = useState("mentor");
  const [aiPersona, setAiPersona] = useState(false);
  const [humanRequested, setHumanRequested] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getSessionId();

    async function poll() {
      try {
        const data = await callFunction<GetMessagesResponse>("get-messages", {
          match_id: matchId,
          session_id: sessionId,
        });
        if (cancelled) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setMentorName(data.mentor_name ?? "mentor");
        setAiPersona(Boolean(data.ai_persona));
        setHumanRequested(Boolean(data.human_requested));
      } catch {
        // silencioso — tenta de novo no próximo ciclo
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    try {
      await callFunction("send-message", {
        match_id: matchId,
        session_id: getSessionId(),
        content,
      });
      const data = await callFunction<GetMessagesResponse>("get-messages", {
        match_id: matchId,
        session_id: getSessionId(),
      });
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "não deu pra enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleRequestHuman() {
    setError(null);
    try {
      await callFunction("send-message", {
        match_id: matchId,
        session_id: getSessionId(),
        request_human: true,
      });
      setHumanRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "não deu pra pedir");
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-5 py-4 border-b border-[#3a2f47] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-marigold to-teal shrink-0" />
        <div className="min-w-0">
          <p
            className="text-lg leading-tight truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mentorName}
          </p>
          <p className="text-xs text-dim">
            {humanRequested
              ? "conversa passada pro mentor de verdade"
              : aiPersona
              ? "respostas vindas do que ele(a) já ensinou por aqui"
              : "mentor verificado"}
          </p>
        </div>
      </header>

      {aiPersona && !humanRequested && (
        <div className="mx-5 mt-4 rounded-2xl border border-marigold/30 bg-marigold/10 px-4 py-3 text-xs text-paper leading-relaxed">
          as primeiras respostas vêm da nossa inteligência, construída a
          partir do que {mentorName} já ensinou por aqui — quando quiser, é
          só pedir pra falar com ele(a) direto.
          <button
            onClick={handleRequestHuman}
            className="block mt-2 text-marigold font-semibold hover:opacity-80"
          >
            falar com {mentorName} de verdade →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto thin-scroll px-5 py-5 flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender === "user"
                ? "self-end max-w-[78%] bg-marigold text-ink rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed"
                : "self-start max-w-[78%] bg-panel border border-[#3a2f47] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="self-start flex gap-1 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-dim pulse-dot" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-dim pulse-dot"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-dim pulse-dot"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-5 pb-1 text-xs text-[#e08a8a]">{error}</p>
      )}

      <div className="px-5 py-4 border-t border-[#3a2f47] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="escrever..."
          className="flex-1 bg-panel border border-[#3a2f47] rounded-full px-4 py-3 text-sm outline-none focus:border-marigold transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-full bg-marigold text-ink flex items-center justify-center disabled:opacity-50 shrink-0"
          aria-label="enviar"
        >
          →
        </button>
      </div>
    </main>
  );
}
