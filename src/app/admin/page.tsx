"use client";

import { useState } from "react";
import { callFunction } from "@/lib/api";

type Application = {
  id: string;
  name: string;
  bio: string;
  category: string;
  tags: string[];
  contact: string;
  photo_url: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unlock() {
    setLoading(true);
    setError(null);
    try {
      const data = await callWithAdminKey<{ applications: Application[] }>(
        "list-applications",
        {},
        adminKey
      );
      setApps(data.applications);
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "chave inválida");
    } finally {
      setLoading(false);
    }
  }

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await callWithAdminKey("review-application", { application_id: id, decision }, adminKey);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "algo deu errado");
    } finally {
      setBusyId(null);
    }
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-xs">
          <p className="text-center text-xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
            painel
          </p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="sua chave de admin"
            className="w-full bg-panel border border-[#3a2f47] rounded-xl px-4 py-3 text-sm outline-none focus:border-marigold transition-colors"
          />
          {error && <p className="mt-2 text-sm text-[#e08a8a]">{error}</p>}
          <button
            onClick={unlock}
            disabled={!adminKey || loading}
            className="mt-3 w-full bg-marigold text-ink font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {loading ? "entrando..." : "entrar"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-2xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
          candidaturas pendentes ({apps.length})
        </p>

        {error && <p className="mb-4 text-sm text-[#e08a8a]">{error}</p>}

        {apps.length === 0 && (
          <p className="text-sm text-dim">nenhuma candidatura pendente agora.</p>
        )}

        <div className="flex flex-col gap-4">
          {apps.map((app) => (
            <div key={app.id} className="rounded-2xl p-5 bg-panel border border-[#3a2f47]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-marigold to-teal shrink-0">
                  {app.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.photo_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{app.name}</p>
                  <p className="text-xs text-dim">{app.category} · {app.contact}</p>
                </div>
              </div>
              <p className="text-sm text-dim leading-relaxed mb-4">{app.bio}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => review(app.id, "approve")}
                  disabled={busyId === app.id}
                  className="flex-1 bg-marigold text-ink font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50"
                >
                  aprovar
                </button>
                <button
                  onClick={() => review(app.id, "reject")}
                  disabled={busyId === app.id}
                  className="flex-1 bg-transparent border border-[#3a2f47] rounded-xl py-2.5 text-sm disabled:opacity-50"
                >
                  rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

async function callWithAdminKey<T>(
  name: string,
  body: Record<string, unknown>,
  adminKey: string
): Promise<T> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY ?? "",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `erro ${res.status}`);
  }
  return res.json();
}
