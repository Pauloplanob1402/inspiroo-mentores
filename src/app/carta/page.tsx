"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CartaContent() {
  const params = useSearchParams();
  const texto = params.get("texto") ?? "";
  const mentor = params.get("mentor") ?? "alguém da tribo";

  async function handleShare() {
    const shareText = `"${texto}"\n\n— ${mentor}, na inspiroo.\n\n${window.location.origin}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // cancelado
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      alert("copiado — cola pra quem você quiser");
    } catch {
      // sem clipboard disponível também, sem mais fallback necessário
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-md rise-once">
        <div className="rounded-3xl p-8 bg-gradient-to-br from-panel to-[#3a2f47] border border-marigold/30 text-center">
          <p
            className="text-2xl leading-snug mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            &ldquo;{texto}&rdquo;
          </p>
          <p className="text-sm text-teal mb-1">{mentor}</p>
          <p className="text-xs text-dim">via inspiroo.</p>
        </div>

        <button
          onClick={handleShare}
          className="w-full mt-6 bg-marigold text-ink font-semibold rounded-2xl py-3.5 text-sm hover:opacity-90 transition-opacity"
        >
          compartilhar esse conselho
        </button>

        <a
          href="/"
          className="block mt-4 text-center text-xs text-dim hover:text-paper transition-colors"
        >
          voltar pra inspiroo.
        </a>
      </div>
    </main>
  );
}

export default function CartaPage() {
  return (
    <Suspense fallback={null}>
      <CartaContent />
    </Suspense>
  );
}
