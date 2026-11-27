import { useRef, useState } from "react";
import { uid, today, type Store } from "./model";
import {
  previewFideuram,
  applyFideuram,
  type BankRow,
  type BankPreview,
} from "./fideuram";
export default function FideuramImporter({
  store,
  onSave,
  onClose,
}: {
  store: Store;
  onSave: (s: Store) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<BankRow[]>([]),
    [preview, setPreview] = useState<BankPreview[] | null>(null),
    [source, setSource] = useState(""),
    [destination, setDestination] = useState(""),
    [filename, setFilename] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [allow, setAllow] = useState(false),
    [mode, setMode] = useState<"merge" | "replace">("merge"),
    [confirmation, setConfirmation] = useState("");
  const generation = useRef(0),
    committed = useRef(false);
  const targets = store.assets.filter(
    (a) => a.category === "cash" && !a.archivedAt,
  );
  const sources = [...new Set(rows.map((r) => r.account).filter(Boolean))];
  const valid =
    preview?.filter(
      (r) =>
        !r.error &&
        (!r.doubt || allow) &&
        (mode === "replace" || r.action !== "unchanged"),
    ) || [];
  const replacing = store.movements.filter(
    (m) => m.assetId === destination,
  ).length;
  const targetName = targets.find((a) => a.id === destination)?.name || "";
  const replaceBlocked =
    mode === "replace" &&
    (confirmation !== targetName ||
      !!preview?.some((r) => r.error || (r.doubt && !allow)));
  return (
    <>
      <p className="form-intro">
        Excel Fideuram · Lista operazioni (.xlsx). Il file viene letto nel
        browser, senza inviare l’originale. Si importano solo operazioni
        contabilizzate.
      </p>
      <p className="warning">
        I movimenti arricchiscono il registro, ma non modificano saldi,
        rilevazioni o rendimenti. Bonifici e ricariche possono essere
        trasferimenti tra tuoi conti: non sono classificati automaticamente come
        spese o guadagni.
      </p>
      {!preview ? (
        <>
          <label className="file-drop">
            Scegli Excel Fideuram
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const ticket = ++generation.current;
                setRows([]);
                setSource("");
                setFilename("");
                setError("");
                setAllow(false);
                if (!/\.xlsx$/i.test(file.name)) {
                  setError("Scegli un file .xlsx, non .xls, PDF o CSV.");
                  return;
                }
                if (file.size > 2000000) {
                  setError("Il limite è 2 MB per file.");
                  return;
                }
                setBusy(true);
                try {
                  const { readFideuramExcel } =
                    await import("./fideuram-excel");
                  const result = await readFideuramExcel(
                    await file.arrayBuffer(),
                  );
                  if (ticket === generation.current) {
                    setRows(result);
                    setFilename(file.name);
                    const accounts = [
                      ...new Set(result.map((r) => r.account).filter(Boolean)),
                    ];
                    setSource(accounts.length === 1 ? accounts[0] : "");
                  }
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "File non leggibile.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
            <small>
              Massimo 2 MB · nessuna macro eseguita · l’originale non viene
              conservato
            </small>
          </label>
          {filename && (
            <p role="status">
              {filename} · {rows.length} righe lette
            </p>
          )}
          {rows.length > 0 && (
            <label>
              Conto o carta nel file
              <select
                disabled={busy}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Scegli conto o carta</option>
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Voce di destinazione
            <select
              disabled={busy}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Scegli una voce Liquidità</option>
              {targets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {!targets.length && (
            <p className="warning">
              Aggiungi prima un conto nella categoria Liquidità del patrimonio.
            </p>
          )}
          <label>
            Come importare
            <select
              value={mode}
              disabled={busy}
              onChange={(e) => {
                setMode(e.target.value as "merge" | "replace");
                setConfirmation("");
              }}
            >
              <option value="merge">Aggiungi e aggiorna gli esistenti</option>
              <option value="replace">
                Sostituisci tutti i movimenti del conto selezionato
              </option>
            </select>
          </label>
          <p className="field-note">
            Aggiungi e aggiorna conserva gli altri movimenti. Sostituisci
            elimina anche i movimenti manuali e quelli fuori dal periodo del
            file, ma soltanto dalla voce scelta. Saldi e altri conti non
            cambiano.
          </p>
          <p className="field-note">
            Importa un conto o carta alla volta. Gli altri restano esclusi; non
            sommare automaticamente movimenti di carta e conto, perché
            potrebbero descrivere lo stesso pagamento. Le righe future, non
            contabilizzate o non valide vengono indicate nell’anteprima.
          </p>
        </>
      ) : (
        <>
          <div className="import-stats">
            <span>
              {preview.filter((r) => !r.error && r.action === "new").length}{" "}
              nuovi
            </span>
            <span>
              {preview.filter((r) => !r.error && r.action === "update").length}{" "}
              da aggiornare
            </span>
            <span>
              {
                preview.filter((r) => !r.error && r.action === "unchanged")
                  .length
              }{" "}
              invariati
            </span>
            <span>{preview.filter((r) => r.error).length} escluse</span>
            <span>{preview.filter((r) => r.doubt).length} da confermare</span>
          </div>
          <p>
            {source} → {targets.find((a) => a.id === destination)?.name}.{" "}
            {rows.length - preview.length} righe di altri conti/carte o prive di
            conto escluse.
          </p>
          <div className="preview-scroll">
            <table>
              <thead>
                <tr>
                  <th>Riga / data</th>
                  <th>Operazione</th>
                  <th>Importo</th>
                  <th>Esito</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.row} · {r.date || "—"}
                    </td>
                    <td>
                      {r.operation}
                      <small>{r.details}</small>
                      <small>{r.category}</small>
                    </td>
                    <td>
                      {r.amount || "—"} {r.currency}
                    </td>
                    <td>
                      {r.error ||
                        (r.doubt
                          ? "Possibile duplicato: da confermare"
                          : r.action === "update"
                            ? "Sarà aggiornato"
                            : r.action === "unchanged"
                              ? "Invariato"
                              : "Nuovo")}
                      <small>{r.reason}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.some((r) => r.doubt) && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={allow}
                onChange={(e) => setAllow(e.target.checked)}
              />
              <span>
                Ho verificato i possibili duplicati: sono operazioni distinte.
                Includile.
              </span>
            </label>
          )}
          <p className="field-note">
            Il confronto usa conto di destinazione, conto del file, data,
            importo e dettagli. Il file non fornisce un ID univoco verificato:
            usiamo conto, data, importo, valuta e dettagli completi. Numeri nel
            testo e descrizione da sola non identificano un movimento. Gli
            invariati restano intatti, le corrispondenze certe vengono
            aggiornate preservando le categorie corrette da te. I casi dubbi
            richiedono conferma.
          </p>
        </>
      )}
      {preview && mode === "replace" && (
        <section className="warning">
          <h3>Sostituzione del conto: {targetName}</h3>
          <p>
            Saranno rimossi tutti i {replacing} movimenti attuali di questa voce
            e inserite {valid.length} righe del file. Gli altri conti, le
            valutazioni e i saldi restano intatti. Non c’è annullamento
            automatico.
          </p>
          <label>
            Scrivi il nome del conto per confermare
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
            />
          </label>
          {preview.some((r) => r.error || (r.doubt && !allow)) && (
            <p>
              Risolvi prima le righe escluse o dubbie: nessun movimento verrà
              cancellato con un’importazione parziale.
            </p>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            preview ? (setPreview(null), setAllow(false)) : onClose()
          }
        >
          {preview ? "Indietro" : "Annulla"}
        </button>
        {preview ? (
          <button
            className="primary"
            disabled={busy || !valid.length || replaceBlocked}
            onClick={async () => {
              if (committed.current) return;
              committed.current = true;
              setBusy(true);
              setError("");
              try {
                const fresh = await previewFideuram(
                  rows,
                  source,
                  destination,
                  store,
                  mode,
                );
                if (mode === "replace" && confirmation !== targetName)
                  throw Error("Conferma il nome del conto.");
                const importId = uid();
                const next = applyFideuram(
                  store,
                  fresh,
                  destination,
                  mode,
                  allow,
                  importId,
                );
                next.imports.push({
                  id: importId,
                  name: filename.slice(0, 250),
                  date: today(),
                  rows: valid.length,
                  kind:
                    mode === "replace"
                      ? "Sostituzione movimenti Fideuram"
                      : "Aggiunta/aggiornamento Fideuram",
                });
                onSave(next);
              } catch (err) {
                setError((err as Error).message);
                committed.current = false;
              } finally {
                setBusy(false);
              }
            }}
          >
            Conferma {valid.length} movimenti
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy || !source || !destination}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setPreview(
                  await previewFideuram(rows, source, destination, store, mode),
                );
                setAllow(false);
                setConfirmation("");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Lettura…" : "Verifica anteprima"}
          </button>
        )}
      </div>
    </>
  );
}
