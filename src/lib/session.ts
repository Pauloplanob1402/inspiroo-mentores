// ============================================================
// session.ts — identidade anônima do dispositivo
// Mesmo padrão do STREIK: um UUID guardado no navegador, sem
// nome, sem conta.
// ============================================================

const KEY = "inspiroo_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
