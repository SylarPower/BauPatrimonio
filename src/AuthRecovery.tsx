import { useState } from "react";
import { cloudResetPassword } from "./cloud";
// Acquisito una sola volta, prima del rendering StrictMode. Mai storage/URL/log.
export default function AuthRecovery({
  token: recoveryToken,
}: {
  token: string | null;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  return (
    <main className="welcome">
      <section className="auth-card card">
        <h1>Nuova password</h1>
        {done ? (
          <>
            <p role="status">
              Password aggiornata. Accedi con la nuova password.
            </p>
            <a href={import.meta.env.BASE_URL}>Vai ad Accedi</a>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form),
                password = String(f.get("password"));
              if (password !== String(f.get("confirm"))) {
                setError("Le password non coincidono.");
                return;
              }
              if (!recoveryToken) {
                setError("Link di recupero non valido.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                await cloudResetPassword(recoveryToken, password);
                form.reset();
                setDone(true);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Recupero non riuscito.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              Scegli una password nuova di almeno 10 caratteri. Nessun dato
              patrimoniale viene caricato durante il recupero.
            </p>
            <label>
              Nuova password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                disabled={busy}
              />
            </label>
            <label>
              Conferma password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                disabled={busy}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Aggiornamento…" : "Salva nuova password"}
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
