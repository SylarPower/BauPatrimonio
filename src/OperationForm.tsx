import { useState } from "react";
import { parseNumber, today, type Store } from "./model";
import { recordOperation, type Operation } from "./operations";
export default function OperationForm({
  store,
  onSave,
  onClose,
}: {
  store: Store;
  onSave: (s: Store) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Operation>("buy"),
    [error, setError] = useState("");
  const cash = store.assets.filter(
      (a) => a.category === "cash" && !a.archivedAt,
    ),
    targets = store.assets.filter(
      (a) =>
        a.category === (kind === "repay" ? "debt" : "investment") &&
        !a.archivedAt,
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget);
          onSave(
            recordOperation(
              store,
              String(f.get("cash")),
              String(f.get("target")),
              kind,
              parseNumber(String(f.get("principal"))),
              parseNumber(String(f.get("cost"))),
              String(f.get("date")),
            ),
          );
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <p className="form-intro">
        Solo registrazione contabile di operazioni già eseguite. Non invia
        ordini né dispone pagamenti. Aggiorna insieme liquidità e posizione per
        evitare falsi guadagni.
      </p>
      <label>
        Operazione
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Operation)}
        >
          <option value="buy">Acquisto investimento già eseguito</option>
          <option value="sell">Vendita investimento già eseguita</option>
          <option value="repay">Rimborso capitale di un debito</option>
        </select>
      </label>
      <label>
        Conto di liquidità (EUR, quota 100%)
        <select name="cash" required>
          {cash.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {kind === "repay" ? "Debito" : "Dossier"}
        <select name="target" required>
          {targets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Capitale di mia competenza (EUR)
        <input
          name="principal"
          inputMode="decimal"
          required
          placeholder="1.000,00"
        />
      </label>
      <label>
        {kind === "repay"
          ? "Interessi pagati di mia competenza (EUR)"
          : "Costi complessivi (EUR)"}
        <input name="cost" inputMode="decimal" defaultValue="0" required />
      </label>
      <label>
        Data dell’operazione
        <input
          type="date"
          name="date"
          defaultValue={today()}
          max={today()}
          required
        />
      </label>
      <p className="warning">
        Il capitale spostato non cambia il netto; costi e interessi lo riducono.
        La quota del debito/dossier è applicata separatamente. La nuova
        rilevazione è aggregata: riconcilia poi eventuali strumenti, senza
        aggiungere il loro valore una seconda volta.
      </p>
      {(!cash.length || !targets.length) && (
        <p className="warning">
          Aggiungi prima un conto di liquidità e{" "}
          {kind === "repay" ? "un debito" : "un investimento"}.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Annulla
        </button>
        <button className="primary" disabled={!cash.length || !targets.length}>
          Registra operazione
        </button>
      </div>
    </form>
  );
}
