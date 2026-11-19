import { isStore } from "./validation";
import type { Store } from "./model";
export type CloudConfig = { url: string; key: string };
let session:
  | {
      config: CloudConfig;
      token: string;
      expires: number;
      revision: number;
      ready: boolean;
    }
  | undefined;
let queue: Promise<unknown> = Promise.resolve();
export function validateCloudConfig(c: CloudConfig) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url))
    throw Error(
      "Usa l’URL HTTPS del progetto Supabase, senza percorso finale.",
    );
  if (!c.key.startsWith("sb_publishable_")) {
    try {
      const p = JSON.parse(
        atob(c.key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (p.role !== "anon") throw Error();
    } catch {
      throw Error(
        "Usa soltanto la chiave pubblica publishable/anon, mai service_role o secret.",
      );
    }
  }
}
async function request(path: string, init: RequestInit = {}) {
  if (!session) throw Error("Accedi al tuo archivio online.");
  if (Date.now() > session.expires)
    throw Error(
      "Sessione scaduta: accedi di nuovo e rileggi l’archivio online prima di salvare. La copia locale è conservata.",
    );
  let r: Response;
  try {
    r = await fetch(session.config.url + path, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: session.config.key,
        Authorization: "Bearer " + session.token,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw Error(
      "Connessione cloud non riuscita. Copia locale conservata: riprova dal Profilo.",
    );
  }
  if (!r.ok)
    throw Error(
      r.status === 409 || r.status === 400
        ? "Salvataggio rifiutato o conflitto: rileggi il cloud prima di riprovare. Nessun dato remoto è stato sovrascritto."
        : "Accesso cloud non riuscito. Verifica sessione, configurazione e migrazione SQL.",
    );
  return r.status === 204 ? null : r.json();
}
export async function cloudLogin(
  config: CloudConfig,
  email: string,
  password: string,
) {
  validateCloudConfig(config);
  cloudLogout();
  // Credenziali inviate esclusivamente a Supabase Auth del progetto scelto; mai memorizzate.
  const r = await fetch(config.url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    cache: "no-store",
    headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw Error(
      "Accesso non riuscito. Verifica email, password e conferma dell’account in Supabase.",
    );
  const data = await r.json();
  session = {
    config,
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
    revision: 0,
    ready: false,
  };
}
export function cloudLogout() {
  session = undefined;
}
export function cloudActive() {
  return !!session?.ready && Date.now() < session.expires;
}
export async function cloudRead() {
  const rows = await request("/rest/v1/vaults?select=document,revision");
  if (!session) throw Error("Sessione terminata.");
  if (rows.length > 1) throw Error("Isolamento archivio non valido.");
  if (rows.length && !isStore(rows[0].document))
    throw Error("Documento cloud non valido: nessun dato locale sostituito.");
  session.revision = rows[0]?.revision || 0;
  session.ready = false;
  return rows[0]?.document as Store | undefined;
}
export function cloudUseLoaded() {
  if (session) session.ready = true;
}
export function cloudSave(s: Store, initial = false): Promise<void> {
  const current = session;
  if (!current) return Promise.resolve();
  if (!initial && !current.ready)
    return Promise.reject(
      Error(
        "Cloud non pronto: accedi e apri/rileggi l’archivio dal Profilo. Modifiche conservate solo nel browser.",
      ),
    );
  const work = queue.then(async () => {
    if (session !== current || (!initial && !current.ready))
      throw Error(
        "Cloud interrotto: rileggi l’archivio online dal Profilo prima di continuare.",
      );
    if (!isStore(s)) throw Error("Dati non validi: invio cloud annullato.");
    try {
      const revision = await request("/rest/v1/rpc/save_vault", {
        method: "POST",
        body: JSON.stringify({
          p_document: s,
          p_expected_revision: current.revision,
        }),
      });
      current.revision = Number(revision);
      current.ready = true;
    } catch (e) {
      current.ready = false;
      throw e;
    }
  });
  queue = work.catch(() => {});
  return work;
}
