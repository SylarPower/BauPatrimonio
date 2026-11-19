import { useState } from "react";
import Papa from "papaparse";
import Decimal from "decimal.js";
import { Upload, CheckCircle2, Info } from "lucide-react";
import {
  fingerprint,
  parseNumber,
  today,
  uid,
  type Store,
  type Valuation,
  type Position,
} from "./model";
type Props = {
  kind: "balances" | "movements";
  store: Store;
  onClose: () => void;
  onSave: (s: Store) => void;
};
type Row = {
  date: string;
  amount: string;
  currency: string;
  description: string;
  external: string;
  id: string;
  error: string;
  doubt: boolean;
  position?: Position;
};
function validDate(s: string) {
  let d = s.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [day, month, year] = d.split("/");
    d = `${year}-${month}-${day}`;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
    Number.isNaN(Date.parse(d)) ||
    new Date(d).toISOString().slice(0, 10) !== d ||
    d > today()
  )
    throw Error("Data non valida o futura");
  return d;
}
export default function Importer({ kind, store, onClose, onSave }: Props) {
  const [account, setAccount] = useState(
      store.assets.find((a) => !a.archivedAt)?.id || "",
    ),
    [raw, setRaw] = useState(""),
    [filename, setFilename] = useState(""),
    [delimiter, setDelimiter] = useState(""),
    [fields, setFields] = useState<string[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [rows, setRows] = useState<Row[]>([]),
    [hash, setHash] = useState(""),
    [error, setError] = useState(""),
    [stage, setStage] = useState(0),
    [allow, setAllow] = useState(false),
    [positions, setPositions] = useState(false);
  const parse = (text: string, sep = delimiter) => {
    const p = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      delimiter: sep,
    });
    if (p.errors.length)
      throw Error("CSV non leggibile: " + p.errors[0].message);
    return p;
  };
  const read = async (file: File) => {
    setError("");
    if (file.size > 2_000_000) {
      setError("Il limite è 2 MB per file.");
      return;
    }
    try {
      const text = await file.text();
      const p = parse(text);
      const f = p.meta.fields || [];
      setRaw(text);
      setFilename(file.name);
      setFields(f);
      const aliases: Record<string, string[]> = {
        date: ["data", "date"],
        amount: ["importo", "amount", "saldo", "valore"],
        currency: ["valuta", "currency"],
        description: ["descrizione", "description", "nome"],
        external: ["id", "riferimento"],
        quantity: ["quantita", "quantità", "quantity"],
        price: ["prezzo", "price"],
        isin: ["isin"],
      };
      setMapping(
        Object.fromEntries(
          Object.entries(aliases).map(([k, v]) => [
            k,
            f.find((c) => v.includes(c.toLowerCase().trim())) || "",
          ]),
        ),
      );
      setRows([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const preview = async () => {
    try {
      setError("");
      if (
        !account ||
        !mapping.date ||
        (!mapping.amount && !(positions && mapping.quantity && mapping.price))
      )
        throw Error("Scegli conto, data e importo.");
      if (
        positions &&
        store.assets.find((a) => a.id === account)?.category !== "investment"
      )
        throw Error("Le posizioni vanno importate in un dossier Investimenti.");
      if (positions && !!mapping.quantity !== !!mapping.price)
        throw Error(
          "Per conservare gli strumenti abbina sia quantità sia prezzo.",
        );
      const h = await fingerprint(`${account}|${kind}|${positions}|${raw}`);
      setHash(h);
      if (store.imports.some((i) => i.id === h))
        throw Error(
          "Questo file è già stato importato in questo conto e con questo percorso. Nessun dato duplicato.",
        );
      const p = parse(raw);
      const seen = new Set<string>();
      const result: Row[] = [];
      for (let i = 0; i < p.data.length; i++) {
        const r = p.data[i];
        let error = "",
          date = "",
          amount = "",
          currency = r[mapping.currency]?.trim().toUpperCase() || "EUR";
        const external = r[mapping.external]?.trim() || "";
        const id =
          external && kind === "movements"
            ? await fingerprint(`${account}|${kind}|external:${external}`)
            : await fingerprint(`${h}|${i}`);
        let position: Position | undefined;
        try {
          date = validDate(r[mapping.date] || "");
          if (positions && mapping.quantity && mapping.price) {
            const quantity = parseNumber(r[mapping.quantity] || ""),
              price = parseNumber(r[mapping.price] || ""),
              name = r[mapping.description]?.trim();
            if (!name || Number(quantity) < 0 || Number(price) < 0)
              throw Error(
                "Nome, quantità e prezzo non negativi sono richiesti per gli strumenti.",
              );
            const calculated = new Decimal(quantity).mul(price);
            amount = calculated.toString();
            if (
              mapping.amount &&
              r[mapping.amount]?.trim() &&
              calculated.minus(parseNumber(r[mapping.amount])).abs().gt("0.005")
            )
              throw Error(
                "Importo diverso da quantità × prezzo: riconcilia il file.",
              );
            const isin = r[mapping.isin]?.trim().toUpperCase() || "";
            if (isin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin))
              throw Error("Formato ISIN non valido");
            position = {
              id: uid(),
              name,
              isin,
              quantity,
              price,
              currency,
              source: "Importato da file",
              date,
            };
          } else amount = parseNumber(r[mapping.amount] || "");
          if (!["EUR", "USD", "GBP", "CHF", "JPY", "CAD"].includes(currency))
            throw Error("Valuta non supportata");
          if (kind === "balances" && Number(amount) < 0)
            throw Error("Un saldo patrimoniale non può essere negativo");
          if (
            store.movements.some((m) => m.id === id) ||
            result.some((r) => r.id === id)
          )
            throw Error("Identificativo operazione già presente");
          if (
            kind === "balances" &&
            store.assets
              .find((a) => a.id === account)
              ?.valuations.some((v) => v.date === date)
          )
            throw Error(
              "Rilevazione già presente alla data: nessuna sovrascrittura",
            );
          if (
            kind === "balances" &&
            !positions &&
            result.some((r) => r.date === date && !r.error)
          )
            throw Error(
              "Più saldi alla stessa data: usa il percorso posizioni per sommarli",
            );
        } catch (err) {
          error = (err as Error).message;
        }
        const key = `${date}|${amount}|${currency}`;
        const doubt =
          !error &&
          kind === "movements" &&
          !external &&
          (seen.has(key) ||
            store.movements.some(
              (m) =>
                m.assetId === account &&
                m.date === date &&
                m.amount === amount &&
                m.currency === currency,
            ));
        seen.add(key);
        result.push({
          date,
          amount,
          currency,
          description: r[mapping.description] || "",
          external,
          id,
          error,
          doubt,
          position,
        });
      }
      if (positions && kind === "balances") {
        const grouped: Record<string, Row[]> = {};
        result
          .filter((r) => !r.error)
          .forEach((r) => (grouped[r.date] ||= []).push(r));
        for (const group of Object.values(grouped))
          if (new Set(group.map((r) => r.currency)).size > 1)
            group.forEach(
              (r) => (r.error = "Non si sommano posizioni in valute diverse"),
            );
      }
      setRows(result);
      setStage(1);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const valid = rows.filter((r) => !r.error && (!r.doubt || allow));
  const commit = () => {
    const next = structuredClone(store);
    if (kind === "movements")
      next.movements.push(
        ...valid.map((r) => ({
          id: r.id,
          assetId: account,
          date: r.date,
          amount: r.amount,
          currency: r.currency,
          description: r.description || "Movimento importato",
          importId: hash,
        })),
      );
    else {
      const a = next.assets.find((a) => a.id === account)!;
      const groups: Record<string, Row[]> = {};
      valid.forEach((r) => (groups[r.date] ||= []).push(r));
      const vals: Valuation[] = Object.entries(groups).map(([date, rs]) => ({
        id: uid(),
        date,
        amount: rs
          .reduce((sum, r) => sum.add(r.amount), new Decimal(0))
          .toString(),
        currency: rs[0].currency,
        source: "Importato da file",
        positions:
          positions && rs.every((r) => r.position)
            ? rs.map((r) => r.position!)
            : undefined,
        note: positions
          ? `Totale di ${rs.length} posizioni; sostituisce il valore aggregato, non si somma ad esso.`
          : "Fotografia del saldo",
      }));
      a.valuations.push(...vals);
    }
    next.imports.push({
      id: hash,
      name: filename,
      date: today(),
      rows: valid.length,
      kind: kind === "balances" ? "Rilevazioni" : "Movimenti",
    });
    onSave(next);
  };
  return (
    <>
      <p className="form-intro">
        {kind === "balances"
          ? "Una fotografia del valore, non un versamento. Il valore importato sostituisce il precedente dalla data indicata."
          : "Le operazioni vengono conservate nel registro. Non modificano automaticamente i saldi: importa anche una rilevazione aggiornata."}
      </p>
      {stage === 0 ? (
        <>
          <label>
            Voce di destinazione
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Scegli una voce</option>
              {store.assets
                .filter((a) => !a.archivedAt)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          {!store.assets.length && (
            <p className="warning">
              Aggiungi prima una voce al patrimonio, poi importa il file.
            </p>
          )}
          <label>
            Separatore
            <select
              value={delimiter}
              onChange={(e) => {
                setDelimiter(e.target.value);
                if (raw) {
                  try {
                    const p = parse(raw, e.target.value);
                    setFields(p.meta.fields || []);
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }
              }}
            >
              <option value="">Rilevamento automatico</option>
              <option value=";">Punto e virgola (;)</option>
              <option value=",">Virgola (,)</option>
              <option value={"\t"}>Tabulazione</option>
            </select>
          </label>
          <label className="file-drop">
            <Upload size={24} />
            <strong>{filename || "Scegli un file CSV"}</strong>
            <span>Fino a 2 MB · Il file originale non viene conservato</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
            />
          </label>
          {raw && (
            <>
              <h3>Abbina le colonne</h3>
              <div className="mapping-grid">
                {[
                  ["date", "Data *"],
                  [
                    "amount",
                    positions
                      ? "Valore posizione (oppure quantità × prezzo)"
                      : "Importo *",
                  ],
                  ["currency", "Valuta (altrimenti EUR)"],
                  ["description", "Descrizione"],
                  ["external", "ID operazione (se disponibile)"],
                  ...(positions
                    ? [
                        ["quantity", "Quantità (per conservare strumenti)"],
                        ["price", "Prezzo unitario"],
                        ["isin", "ISIN (facoltativo)"],
                      ]
                    : []),
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <select
                      value={mapping[key] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [key]: e.target.value })
                      }
                    >
                      <option value="">Non presente</option>
                      {fields.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {kind === "balances" && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={positions}
                    onChange={(e) => setPositions(e.target.checked)}
                  />
                  <span>
                    Ogni riga è il valore totale di una posizione: somma per
                    data. Non includere anche la riga totale del portafoglio.
                    Abbina descrizione/nome, quantità e prezzo per conservare
                    anche gli strumenti.
                  </span>
                </label>
              )}
              <p className="field-note">
                Importi come 1.234,56 o 1234.56 · date AAAA-MM-GG o GG/MM/AAAA.
                Per i debiti usa capitale residuo positivo. Valute non EUR senza
                cambio: totale parziale, aggiorna manualmente la valutazione in
                un’altra data con il cambio.
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="import-stats">
            <span>
              <CheckCircle2 size={17} />
              {valid.length} valide
            </span>
            <span>{rows.filter((r) => r.error).length} escluse</span>
            <span>{rows.filter((r) => r.doubt).length} da confermare</span>
          </div>
          <div className="preview-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data / descrizione</th>
                  <th>Importo</th>
                  <th>Esito</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.date || "—"}
                      <small>{r.description}</small>
                    </td>
                    <td>
                      {r.amount} {r.currency}
                    </td>
                    <td className={r.error ? "error" : ""}>
                      {r.error || (r.doubt ? "Possibile duplicato" : "Valida")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.some((r) => r.doubt) && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={allow}
                onChange={(e) => setAllow(e.target.checked)}
              />
              <span>
                Ho controllato: le operazioni senza ID con stessa data e importo
                sono distinte. Includile.
              </span>
            </label>
          )}
          {positions && (
            <p className="warning">
              Confermo che le righe sono posizioni distinte, non includono
              totali o liquidità già conteggiati. Il dettaglio strumenti è
              conservato se hai abbinato nome/descrizione, quantità e prezzo.
            </p>
          )}
          <p className="field-note">
            <Info size={14} /> Questi sono tracciati dell’app, non formati
            ufficiali bancari.
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          className="secondary"
          onClick={() => (stage ? setStage(0) : onClose())}
        >
          {stage ? "Indietro" : "Annulla"}
        </button>
        {stage ? (
          <button className="primary" disabled={!valid.length} onClick={commit}>
            Conferma {valid.length} righe
          </button>
        ) : (
          <button
            className="primary"
            disabled={!raw || !account}
            onClick={preview}
          >
            Verifica anteprima
          </button>
        )}
      </div>
    </>
  );
}
