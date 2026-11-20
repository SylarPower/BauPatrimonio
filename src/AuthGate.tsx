import { useEffect, useRef, useState } from "react";
import {
  cloudOpen,
  cloudLogout,
  cloudSignUp,
  cloudResendConfirmation,
} from "./cloud";
import type { Store } from "./model";
export default function AuthGate({
  onReady,
  onCancel,
  initialNotice = null,
}: {
  onReady: (s: Store) => void;
  onCancel: () => void;
  initialNotice?: "signin" | "expired" | null;
}) {
  const [view, setView] = useState<"signin" | "signup">("signin"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(
      initialNotice === "expired"
        ? "Il link email è scaduto o non è valido. Puoi richiedere una nuova conferma da Crea account."
        : initialNotice === "signin"
          ? "Hai aperto un link email. Se la conferma è riuscita, accedi con la tua password."
          : "",
    );
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  function change(next: "signin" | "signup") {
    setView(next);
    setPending(false);
    setError("");
    setMessage("");
  }
  function explain(err: unknown) {
    return err instanceof TypeError || (err as Error).name === "TimeoutError"
      ? "Connessione non riuscita. Verifica la rete e riprova."
      : (err as Error).message;
  }
  return (
    <section className="auth-card card">
      <div
        className="insight-tabs auth-tabs"
        role="group"
        aria-label="Accesso o registrazione"
      >
        {(["signin", "signup"] as const).map((v) => (
          <button
            type="button"
            key={v}
            className={view === v ? "selected" : ""}
            aria-pressed={view === v}
            disabled={busy}
            onClick={() => change(v)}
          >
            {v === "signin" ? "Accedi" : "Crea account"}
          </button>
        ))}
      </div>
      <h2>
        {view === "signin" ? "Accedi al tuo patrimonio" : "Crea il tuo account"}
      </h2>
      <p>
        {view === "signin"
          ? "Ritrova i tuoi dati online. Sul computer e sul telefono usa lo stesso account."
          : "Un account gratuito, un archivio privato. Conferma la tua email prima di accedere."}
      </p>
      {view === "signup" && (
        <p className="auth-help">
          Registrazione limitata: il mittente integrato Supabase invia email
          solo agli indirizzi autorizzati del team, con un limite di 2 email
          all’ora per il progetto. Gli altri indirizzi non possono completare la
          conferma.
        </p>
      )}
      {!pending && (
        <form
          key={view}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form),
              password = String(f.get("password"));
            if (view === "signup" && password !== String(f.get("confirm"))) {
              setError("Le password non coincidono.");
              return;
            }
            form.reset();
            setBusy(true);
            setError("");
            setMessage("");
            try {
              if (view === "signup") {
                await cloudSignUp(email, password);
                if (live.current) {
                  setPending(true);
                  setMessage(
                    "Controlla la posta e lo spam: apri il link di conferma, poi torna qui e accedi. Se hai già un account, usa Accedi.",
                  );
                }
              } else {
                const s = await cloudOpen(email, password);
                if (live.current) onReady(s);
                else cloudLogout();
              }
            } catch (err) {
              if (live.current) setError(explain(err));
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              aria-label="Password"
              name="password"
              type="password"
              autoComplete={
                view === "signup" ? "new-password" : "current-password"
              }
              minLength={view === "signup" ? 10 : undefined}
              maxLength={128}
              required
              disabled={busy}
            />
            {view === "signup" && (
              <small>
                Almeno 10 caratteri. Usa una password diversa da quella della
                banca.
              </small>
            )}
          </label>
          {view === "signup" && (
            <label>
              Conferma password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                disabled={busy}
                maxLength={128}
              />
            </label>
          )}
          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? view === "signup"
                ? "Registrazione in corso…"
                : "Accesso e caricamento…"
              : view === "signup"
                ? "Crea account"
                : "Accedi"}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {view === "signup" && (
        <div className="auth-followup">
          <button
            type="button"
            className="text-button"
            disabled={busy || !/^\S+@\S+\.\S+$/.test(email)}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await cloudResendConfirmation(email);
                if (live.current)
                  setMessage(
                    "Se l’indirizzo è in attesa di conferma, riceverai una nuova email. Controlla anche lo spam.",
                  );
              } catch (err) {
                if (live.current) setError(explain(err));
              } finally {
                if (live.current) setBusy(false);
              }
            }}
          >
            Invia di nuovo la conferma
          </button>
          {pending && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => change("signin")}
            >
              Vai ad Accedi
            </button>
          )}
        </div>
      )}
      <p className="auth-help">
        Nessuna chiave da inserire. Non usare le credenziali bancarie o la
        password della dashboard Supabase. L’archivio di ogni account è separato
        dagli altri.
      </p>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={onCancel}
      >
        Torna indietro
      </button>
    </section>
  );
}
