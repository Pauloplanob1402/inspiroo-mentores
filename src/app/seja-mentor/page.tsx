"use client";

import { useState } from "react";
import { callFunction } from "@/lib/api";

const CATEGORIES = [
  { value: "carreira", label: "carreira" },
  { value: "mente", label: "mente" },
  { value: "exterior", label: "morar fora" },
  { value: "ia", label: "IA no trabalho" },
  { value: "familia", label: "família" },
  { value: "financas", label: "finanças" },
];

export default function SejaMentor() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhoto(file: File | null) {
    setPhotoFile(file);
    if (file) setPhotoPreview(URL.createObjectURL(file));
    else setPhotoPreview(null);
  }

  async function handleSubmit() {
    if (!name.trim() || !bio.trim() || !category || !contact.trim() || loading)
      return;
    setLoading(true);
    setError(null);
    try {
      let photo_base64: string | undefined;
      let photo_mime: string | undefined;
      if (photoFile) {
        photo_base64 = await fileToBase64(photoFile);
        photo_mime = photoFile.type;
      }

      await callFunction("apply-mentor", {
        name: name.trim(),
        bio: bio.trim(),
        category,
        contact: contact.trim(),
        photo_base64,
        photo_mime,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="rise-once max-w-sm">
          <p
            className="text-2xl mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            candidatura recebida.
          </p>
          <p className="text-sm text-dim leading-relaxed">
            a gente dá uma olhada com carinho em cada candidatura antes de
            colocar no ar. se fizer sentido, entramos em contato por{" "}
            {contact}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-14">
      <div className="w-full max-w-md">
        <p
          className="text-center text-3xl mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          seja mentor da tribo
        </p>
        <p className="text-center text-sm text-dim mb-8">
          se você já passou pelo que outra pessoa está atravessando agora, e
          topa compartilhar como fez — começa aqui.
        </p>

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-panel border border-[#3a2f47] flex items-center justify-center overflow-hidden shrink-0">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-dim text-center px-1">
                  sua foto
                </span>
              )}
            </div>
            <span className="text-xs text-marigold underline underline-offset-2">
              escolher foto (opcional por enquanto)
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
            />
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="seu nome"
            className="bg-panel border border-[#3a2f47] rounded-xl px-4 py-3 text-sm outline-none focus:border-marigold transition-colors"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-panel border border-[#3a2f47] rounded-xl px-4 py-3 text-sm outline-none focus:border-marigold transition-colors text-paper"
          >
            <option value="">área principal</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="conte, em poucas linhas, o problema concreto que você ajuda as pessoas a resolver"
            maxLength={600}
            rows={4}
            className="bg-panel border border-[#3a2f47] rounded-xl px-4 py-3 text-sm outline-none focus:border-marigold transition-colors resize-none"
          />

          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="seu e-mail ou whatsapp, pra gente te avisar"
            className="bg-panel border border-[#3a2f47] rounded-xl px-4 py-3 text-sm outline-none focus:border-marigold transition-colors"
          />

          {error && <p className="text-sm text-[#e08a8a]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={
              !name.trim() || !bio.trim() || !category || !contact.trim() || loading
            }
            className="bg-marigold text-ink font-semibold rounded-xl py-3.5 text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "enviando..." : "enviar candidatura"}
          </button>
        </div>
      </div>
    </main>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
