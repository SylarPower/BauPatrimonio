import { useState } from "react";
import {
  cloudActive,
  cloudLogin,
  cloudLogout,
  cloudRead,
  cloudSave,
  cloudUseLoaded,
  type CloudConfig,
} from "./cloud";
import type { Store } from "./model";
import { save } from "./storage";
function config(): CloudConfig {
  try {
    return (
      JSON.parse(localStorage.getItem("bau-cloud-config") || "null") || {
        url: "",
        key: "",
      }
    );
  } catch {
    return { url: "", key: "" };
  }
}
export default function CloudPanel({
  store,
  personal,
  onLoad,
}: {
  store: Store;
  personal: boolean;
  onLoad: (s: Store) => void;
}) {
  const [c, setC] = useState(config),
    [configExpanded, setConfigExpanded] = useState(!c.url),
    [logged, setLogged] = useState(cloudActive),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card cloud-panel">
      <h3>Il tuo archivio online</h3>
      <p>
        Supabase personale, opzionale. Solo il tuo account può leggere
        l’archivio con le regole SQL previste. Non collega automaticamente le
        banche. Nessun promemoria di backup.
      </p>
      <p role="status">
        {cloudActive()
          ? "Archivio online aperto: le prossime modifiche vengono inviate al tuo progetto."
          : "Cloud non attivo: i dati attuali sono solo nel browser."}
      </p>
      {!personal ? (
        <p>
          Passa al patrimonio personale per collegare il cloud. La demo non
          viene caricata.
        </p>
      ) : (
        <>
          {!logged ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  email = String(f.get("email")),
                  password = String(f.get("password"));
                e.currentTarget.reset();
                void run(async () => {
                  await cloudLogin(c, email, password);
                  localStorage.setItem("bau-cloud-config", JSON.stringify(c));
                  setLogged(true);
                  setMessage(
                    "Accesso riuscito. Apri l’archivio online o crea il primo salvataggio.",
                  );
                });
              }}
            >
              <details
                open={configExpanded}
                onToggle={(e) => setConfigExpanded(e.currentTarget.open)}
              >
                <summary>Configura il tuo progetto gratuito</summary>
                <p>
                  Segui la guida online Supabase. Servono progetto sul piano
                  Free, migrazione SQL e utente Auth. Qui inserisci solo URL e
                  chiave PUBBLICA, mai password database, service_role o chiavi
                  bancarie.
                </p>
                <label>
                  Project URL
                  <input
                    type="url"
                    required
                    value={c.url}
                    onChange={(e) =>
                      setC({
                        ...c,
                        url: e.target.value.trim().replace(/\/$/, ""),
                      })
                    }
                    placeholder="https://progetto.supabase.co"
                  />
                </label>
                <label>
                  Chiave pubblica publishable / anon
                  <input
                    required
                    value={c.key}
                    onChange={(e) => setC({ ...c, key: e.target.value.trim() })}
                  />
                </label>
              </details>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password Supabase Auth
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="secondary" disabled={busy}>
                Accedi
              </button>
            </form>
          ) : (
            <>
              <label className="setting-row">
                <span>
                  Confermo l’apertura del cloud al posto della copia
                  visualizzata
                  <small>
                    Non vengono unite automaticamente copie diverse. Eventuali
                    modifiche solo locali vanno prima riconciliate.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
              </label>
              <button
                className="secondary"
                disabled={busy || !consent}
                onClick={() =>
                  void run(async () => {
                    const remote = await cloudRead();
                    if (!remote) {
                      setMessage(
                        "Archivio online vuoto. Puoi creare il primo salvataggio con il pulsante dedicato.",
                      );
                      return;
                    }
                    await save("personal", remote);
                    cloudUseLoaded();
                    onLoad(remote);
                    setMessage(
                      "Archivio online aperto. Le prossime modifiche verranno salvate online.",
                    );
                    setConsent(false);
                  })
                }
              >
                Apri / rileggi archivio online
              </button>
              <button
                className="secondary"
                disabled={busy || !consent}
                onClick={() =>
                  void run(async () => {
                    const remote = await cloudRead();
                    if (remote)
                      throw Error(
                        "Esiste già un archivio online: aprilo. Non viene sostituito dalla copia locale.",
                      );
                    await cloudSave(store, true);
                    onLoad({ ...store });
                    setMessage(
                      "Primo salvataggio online riuscito. Le modifiche successive verranno salvate online.",
                    );
                    setConsent(false);
                  })
                }
              >
                Crea il primo salvataggio online
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  cloudLogout();
                  onLoad({ ...store });
                  setLogged(false);
                  setConsent(false);
                  setMessage(
                    "Disconnesso. La copia nel browser non è stata cancellata.",
                  );
                }}
              >
                Disconnetti
              </button>
            </>
          )}
          <p>
            La sessione dura fino alla scadenza o alla chiusura della pagina: il
            token resta solo in memoria. Su ogni dispositivo accedi e apri
            l’archivio online prima di modificarlo. In caso di conflitto, rete
            assente o sessione scaduta, nessuna sovrascrittura automatica: la
            copia locale viene conservata e l’app segnala l’errore. Rileggere il
            cloud scarta le modifiche solo locali. Non è sincronizzazione
            realtime.
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
