import { useState } from "react";
import { cloudConfirmEmail } from "./cloud";
export default function AuthVerify({ code }: { code: string | null }) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="welcome">
      <section className="auth-card card">
        <h1>Conferma email</h1>
        {done ? (
          <>
            <p role="status">Email confermata. Ora puoi accedere.</p>
            <a href={import.meta.env.BASE_URL}>Vai ad Accedi</a>
          </>
        ) : (
          <button
            className="primary"
            disabled={busy || !code}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await cloudConfirmEmail(code!);
                setDone(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Conferma non riuscita.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Conferma in corso…" : "Conferma il mio indirizzo"}
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
