import { useState } from "react";
import Decimal from "decimal.js";
import { Plus, Trash2, Info } from "lucide-react";
import {
  latest,
  parseNumber,
  today,
  uid,
  money,
  type Asset,
  type Position,
} from "./model";
const blank = (): Position => ({
  id: uid(),
  name: "",
  isin: "",
  quantity: "",
  price: "",
  currency: "EUR",
  source: "Manuale",
  date: today(),
});
export default function Portfolio({
  asset,
  onSave,
  onClose,
}: {
  asset: Asset;
  onSave: (a: Asset) => void;
  onClose: () => void;
}) {
  const current = latest(asset);
  const [positions, setPositions] = useState<Position[]>(
      current?.positions || [blank()],
    ),
    [date, setDate] = useState(today()),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  const change = (id: string, key: keyof Position, v: string) => {
    setConfirmed(false);
    setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: v } : p)));
  };
  let total = new Decimal(0);
  try {
    positions.forEach((p) => {
      total = total.add(
        new Decimal(parseNumber(p.quantity)).mul(parseNumber(p.price)),
      );
    });
  } catch {
    total = new Decimal(0);
  }
  const save = () => {
    try {
      if (!positions.length) throw Error("Aggiungi almeno uno strumento.");
      if (!date || date > today()) throw Error("Scegli una data valida.");
      for (const p of positions) {
        if (!p.source.trim()) throw Error("Indica la fonte di ogni strumento.");
        if (!p.name.trim()) throw Error("Ogni strumento deve avere un nome.");
        if (p.isin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(p.isin))
          throw Error("Controlla il formato ISIN (12 caratteri).");
        if (
          Number(parseNumber(p.quantity)) < 0 ||
          Number(parseNumber(p.price)) < 0
        )
          throw Error("Quantità e prezzo non possono essere negativi.");
        if (p.currency !== (current?.currency || "EUR"))
          throw Error(
            "In questa versione gli strumenti devono essere nella valuta del portafoglio.",
          );
        if (!p.date || p.date > date)
          throw Error(
            "La data del prezzo deve essere uguale o precedente alla valutazione.",
          );
      }
      if (current?.fxDate && current.fxDate > date)
        throw Error(
          "Il cambio del dossier è successivo alla valutazione. Usa una valutazione aggregata con il cambio pertinente.",
        );
      if (!confirmed)
        throw Error("Conferma la riconciliazione prima di salvare.");
      onSave({
        ...asset,
        valuations: [
          ...asset.valuations,
          {
            id: uid(),
            date,
            amount: total.toString(),
            currency: current?.currency || "EUR",
            fx: current?.fx,
            fxDate: current?.fxDate,
            fxSource: current?.fxSource,
            source: "Manuale",
            note: "Riconciliazione: il dettaglio sostituisce il valore aggregato.",
            positions: positions.map((p) => ({
              ...p,
              quantity: parseNumber(p.quantity),
              price: parseNumber(p.price),
            })),
          },
        ],
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <p className="form-intro">
        Il dettaglio sostituisce il valore totale del dossier: non si aggiunge
        ad esso. Non registrare qui liquidità già conteggiata altrove. Questa è
        una rilevazione, non un ordine di acquisto.
      </p>
      <label>
        Data della valutazione
        <input
          type="date"
          max={today()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setConfirmed(false);
          }}
        />
      </label>
      {positions.map((p, i) => (
        <fieldset className="position-fields" key={p.id}>
          <legend>Strumento {i + 1}</legend>
          <button
            className="iconbutton position-remove"
            aria-label={`Rimuovi strumento ${i + 1}`}
            onClick={() => {
              setPositions(positions.filter((x) => x.id !== p.id));
              setConfirmed(false);
            }}
          >
            <Trash2 size={16} />
          </button>
          <label>
            Nome
            <input
              value={p.name}
              onChange={(e) => change(p.id, "name", e.target.value)}
              placeholder="Es. ETF azionario globale"
            />
          </label>
          <label>
            ISIN (facoltativo)
            <input
              value={p.isin}
              onChange={(e) =>
                change(p.id, "isin", e.target.value.toUpperCase())
              }
            />
          </label>
          <div className="form-row">
            <label>
              Quantità
              <input
                inputMode="decimal"
                value={p.quantity}
                onChange={(e) => change(p.id, "quantity", e.target.value)}
              />
            </label>
            <label>
              Prezzo unitario
              <input
                inputMode="decimal"
                value={p.price}
                onChange={(e) => change(p.id, "price", e.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Valuta
              <select
                value={p.currency}
                onChange={(e) => change(p.id, "currency", e.target.value)}
              >
                {[current?.currency || "EUR"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Data prezzo
              <input
                type="date"
                max={date}
                value={p.date}
                onChange={(e) => change(p.id, "date", e.target.value)}
              />
            </label>
          </div>
          <label>
            Fonte
            <input
              value={p.source}
              onChange={(e) => change(p.id, "source", e.target.value)}
              placeholder="Es. prospetto del broker"
            />
          </label>
        </fieldset>
      ))}
      <button
        className="secondary"
        onClick={() => {
          setPositions([...positions, blank()]);
          setConfirmed(false);
        }}
      >
        <Plus size={16} /> Aggiungi strumento
      </button>
      <div className="reconciliation">
        <h3>Riconcilia il valore</h3>
        <p>
          Ultimo aggregato:{" "}
          <strong>
            {current
              ? money(Number(current.amount), current.currency)
              : "Non presente"}
          </strong>
        </p>
        <p>
          Nuovo dettaglio:{" "}
          <strong>{money(total.toNumber(), current?.currency || "EUR")}</strong>
        </p>
        <p>
          Differenza da spiegare:{" "}
          <strong>
            {money(
              total.minus(current?.amount || 0).toNumber(),
              current?.currency || "EUR",
            )}
          </strong>
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            Ho verificato la differenza. Il nuovo dettaglio rappresenta tutto il
            dossier e sostituisce il totale aggregato dalla data selezionata.
          </span>
        </label>
      </div>
      {current?.currency !== "EUR" && (
        <p className="warning">
          <Info size={14} /> Viene mantenuto il cambio dell’ultima rilevazione:
          controlla la sua data. Puoi inserire una nuova valutazione aggregata
          con un cambio differente.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>
          Annulla
        </button>
        <button className="primary" disabled={!confirmed} onClick={save}>
          Salva dettaglio riconciliato
        </button>
      </div>
    </>
  );
}
