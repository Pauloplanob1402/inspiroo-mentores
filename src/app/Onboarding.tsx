"use client";

import { useState } from "react";

const STEPS = [
  {
    headline: "Você chegou aqui carregando alguma coisa.",
    body: "A partir de agora, você decide o que fazer com isso.",
    cta: "Continuar",
  },
  {
    headline: "Você escreve o que sente.",
    body: "Nossa inteligência encontra quem já sentiu igual — em segundos, sem perfil pra preencher.",
    cta: "Continuar",
  },
  {
    headline: "Você não entrou num app.",
    body: "Entrou numa tribo de mentores que chegaram aqui quando tudo ainda era mato.",
    cta: "Continuar",
  },
  {
    headline: "Essa história é sua, não do mentor.",
    body: "Você decide o momento. Você escolhe quem te ajuda. Você escreve o que vem depois.",
    cta: "encontrar meu mentor",
  },
];

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <div key={step} className="rise-once text-center">
          <h1
            className="text-[clamp(1.7rem,6vw,2.3rem)] leading-[1.2] mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {current.headline}
          </h1>
          <p className="text-[0.95rem] text-dim leading-relaxed max-w-sm mx-auto">
            {current.body}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={
                i === step
                  ? "h-1.5 w-6 rounded-full bg-marigold transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-[#3a2f47] transition-all"
              }
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
          className="w-full bg-marigold text-ink font-semibold rounded-2xl py-4 text-[0.95rem] transition-opacity hover:opacity-90"
        >
          {current.cta}
        </button>

        {!isLast && (
          <button
            onClick={onFinish}
            className="w-full mt-3 text-center text-xs text-dim hover:text-paper transition-colors"
          >
            pular
          </button>
        )}
      </div>
    </div>
  );
}
