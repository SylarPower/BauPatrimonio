import { useEffect, useRef, useState } from "react";
import { cloudOpen, cloudLogout } from "./cloud";
import type { Store } from "./model";
export default function AuthGate({
  onReady,
  onCancel,
}: {
  onReady: (s: Store) => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  return (
    <section className="auth-card card">
      <h2>Accedi al tuo patrimonio</h2>
      <p>
        I tuoi dati sono online, nel tuo archivio privato. Sul computer e sul
        telefono usa lo stesso account.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            email = String(f.get("email")),
            password = String(f.get("password"));
          e.currentTarget.reset();
          setBusy(true);
          setError("");
          try {
            const s = await cloudOpen(email, password);
            if (live.current) onReady(s);
            else cloudLogout();
          } catch (err) {
            if (live.current)
              setError(
                err instanceof TypeError ||
                  (err as Error).name === "TimeoutError"
                  ? "Connessione non riuscita. Verifica la rete e riprova: nessun dato è stato caricato."
                  : (err as Error).message,
              );
          } finally {
            if (live.current) setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={busy}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Accesso e caricamento…" : "Accedi"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="auth-help">
        Usa l’utente già creato per BauPatrimonio, non le credenziali bancarie
        né la password della dashboard Supabase. Nessuna chiave da inserire.
      </p>
      <button className="text-button" disabled={busy} onClick={onCancel}>
        Torna indietro
      </button>
    </section>
  );
}
