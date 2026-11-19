import { isStore } from "./validation";
import { empty, type Store } from "./model";
import { cloudConfig } from "./cloud-config";
export type CloudConfig = { url: string; key: string };
let session:
  | {
      config: CloudConfig;
      token: string;
      expires: number;
      refresh?: string;
      revision: number;
      ready: boolean;
    }
  | undefined;
let queue: Promise<unknown> = Promise.resolve();
let generation = 0;
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
  const current = session;
  if (!current) throw Error("Accedi al tuo archivio online.");
  if (Date.now() > current.expires - 30000) {
    if (!current.refresh)
      throw Error(
        "Sessione scaduta: accedi di nuovo. Le modifiche non salvate restano in questa pagina.",
      );
    const r = await fetch(
      current.config.url + "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          apikey: current.config.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: current.refresh }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (session !== current || !r.ok)
      throw Error("Sessione scaduta: accedi di nuovo.");
    const next = await r.json();
    if (session !== current) throw Error("Sessione terminata.");
    current.token = next.access_token;
    current.refresh = next.refresh_token;
    current.expires = Date.now() + next.expires_in * 1000;
  }
  let r: Response;
  try {
    r = await fetch(current.config.url + path, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: current.config.key,
        Authorization: "Bearer " + current.token,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw Error(
      "Connessione non riuscita. Le modifiche non salvate restano in questa pagina: non chiuderla.",
    );
  }
  if (session !== current)
    throw Error("Sessione terminata: risposta ignorata.");
  if (!r.ok)
    throw Error(
      r.status === 409 || r.status === 400
        ? "Salvataggio rifiutato o conflitto con un altro dispositivo. Nessun dato remoto sovrascritto."
        : "Accesso online non riuscito. Verifica la connessione o accedi di nuovo.",
    );
  const result = r.status === 204 ? null : await r.json();
  if (session !== current)
    throw Error("Sessione terminata: risposta ignorata.");
  return result;
}
export async function cloudLogin(
  config: CloudConfig,
  email: string,
  password: string,
) {
  validateCloudConfig(config);
  cloudLogout();
  const ticket = generation;
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
  if (ticket !== generation) throw Error("Accesso annullato.");
  session = {
    config,
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
    refresh: data.refresh_token,
    revision: 0,
    ready: false,
  };
}
export function cloudLogout() {
  generation++;
  session = undefined;
}
export function cloudActive() {
  return !!session?.ready && Date.now() < session.expires;
}
export async function cloudRead() {
  if (session) session.ready = false;
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
  if (!current)
    return Promise.reject(
      Error("Accesso richiesto: nessun dato salvato online."),
    );
  if (!initial && !current.ready)
    return Promise.reject(
      Error(
        "Salvataggio interrotto. Ricarica i dati online o accedi di nuovo; le modifiche non salvate restano in questa pagina.",
      ),
    );
  const work = queue.then(async () => {
    if (session !== current || (!initial && !current.ready))
      throw Error(
        "Salvataggio interrotto: ricarica i dati online prima di continuare.",
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

/** Nessuna lettura dell'archivio locale: ogni account apre solo il proprio documento remoto. */
export async function cloudOpen(email: string, password: string) {
  await cloudLogin(cloudConfig, email, password);
  const current = session;
  try {
    const existing = await cloudRead();
    if (existing) {
      cloudUseLoaded();
      return existing;
    }
    const document = empty();
    await cloudSave(document, true);
    return document;
  } catch (e) {
    if (session === current) cloudLogout();
    throw e;
  }
}
