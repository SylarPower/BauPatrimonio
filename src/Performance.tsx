import { useEffect, useState } from "react";
import { dateLabel, money, uid, today, type Store } from "./model";
import { eventDates } from "./insights-model";
import { performance } from "./performance";
export default function Performance({
  store,
  hidden,
  onChange,
}: {
  store: Store;
  hidden: boolean;
  onChange?: (s: Store) => void;
}) {
  const dates = eventDates(store),
    [from, setFrom] = useState(dates[0] || today()),
    [to, setTo] = useState(dates.at(-1) || today()),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setConfirmed(false), [store]);
  const result = performance(store, from, to);
  const fmt = (n: number) => (hidden ? "••••" : money(n));
  const ids = new Set(store.assets.map((a) => a.id));
  const unknown = store.movements.filter(
    (m) =>
      ids.has(m.assetId) &&
      m.date > from &&
      m.date <= to &&
      m.performanceFlow === undefined,
  );
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Rendimento degli investimenti</h2>
        <span className="subtle-tag">Non annualizzato</span>
      </div>
      <p className="muted">
        Tutti gli investimenti insieme, esclusi liquidità e fondo pensione.
        Versamenti e prelievi non sono guadagni.
      </p>
      <div className="chart-controls">
        <label>
          Da{" "}
          <select
            aria-label="Rendimento dal"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setConfirmed(false);
            }}
          >
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          A{" "}
          <select
            aria-label="Rendimento al"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setConfirmed(false);
            }}
          >
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="setting-row">
        <span>
          Ho riconciliato tutti i flussi e le quote di proprietà del periodo
          <small>
            Inclusi proventi incassati fuori dal portafoglio, costi e
            trasferimenti. Nessuna quota di proprietà è cambiata senza essere
            registrata.
          </small>
        </span>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
      </label>
      {"error" in result ? (
        <p role="status">{result.error}</p>
      ) : !confirmed ? (
        <p>
          Conferma la completezza dei flussi per visualizzare il risultato. Le
          sole valutazioni non dimostrano un rendimento.
        </p>
      ) : (
        <div className="quality-grid">
          <div>
            <small>Risultato del periodo</small>
            <strong>{fmt(result.gain!)}</strong>
          </div>
          <div>
            <small>Rendimento stimato · Modified Dietz</small>
            <strong>
              {hidden
                ? "••••"
                : result.rate === null
                  ? "Non calcolabile"
                  : new Intl.NumberFormat("it-IT", {
                      maximumFractionDigits: 2,
                    }).format(result.rate!) + "%"}
            </strong>
          </div>
          <div>
            <small>Flussi netti di tua competenza</small>
            <strong>{fmt(result.flows!)}</strong>
          </div>
        </div>
      )}
      <details>
        <summary>Flussi e metodo di calcolo</summary>
        <p>
          Risultato = valore finale − valore iniziale − ingressi netti. La
          percentuale usa Modified Dietz, con flussi a fine giornata; non è TWR,
          XIRR o rendimento fiscale. Include soltanto costi e imposte
          effettivamente registrati o già detratti dai valori. Flussi e valori
          nella tua quota, in EUR. {dateLabel(from)} → {dateLabel(to)}.
        </p>
        <p>
          Gli acquisti e le vendite registrati dalla funzione Operazione
          includono i costi nei flussi. I movimenti precedenti o importati
          richiedono classificazione esplicita: ingresso positivo,
          uscita/provento distribuito negativo, movimento interno fra
          investimenti zero. Non duplicare flussi già registrati.
        </p>
        {unknown.length > 0 && (
          <p>{unknown.length} movimenti da classificare.</p>
        )}
        {onChange &&
          unknown.map((m) => (
            <form
              key={m.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const n = String(f.get("flow")).trim().replace(",", ".");
                if (
                  !/^-?\d+(\.\d+)?$/.test(n) ||
                  !Number.isFinite(Number(n)) ||
                  Math.abs(Number(n)) > 1e18
                ) {
                  setError("Inserisci un flusso EUR valido.");
                  return;
                }
                onChange({
                  ...store,
                  movements: store.movements.map((x) =>
                    x.id === m.id ? { ...x, performanceFlow: n } : x,
                  ),
                });
                setConfirmed(false);
                setError("");
              }}
            >
              <p>
                {m.date} · {hidden ? "Movimento nascosto" : m.description}
              </p>
              <label>
                Flusso di tua competenza EUR{" "}
                <input
                  name="flow"
                  inputMode="decimal"
                  required
                  placeholder="Es. 1000, -500 oppure 0"
                />
              </label>
              <button type="submit" className="secondary">
                Classifica
              </button>
            </form>
          ))}
        {onChange && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                amount = String(f.get("amount")).trim().replace(",", "."),
                date = String(f.get("date")),
                assetId = String(f.get("asset"));
              if (
                !/^\d+(\.\d+)?$/.test(amount) ||
                !(Number(amount) > 0) ||
                Number(amount) > 1e18 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                Number.isNaN(Date.parse(date)) ||
                new Date(date).toISOString().slice(0, 10) !== date ||
                date > today() ||
                !ids.has(assetId)
              ) {
                setError("Controlla importo, data e investimento.");
                return;
              }
              const out = f.get("direction") === "out";
              onChange({
                ...store,
                movements: [
                  ...store.movements,
                  {
                    id: uid(),
                    assetId,
                    date,
                    amount: "0",
                    currency: "EUR",
                    description:
                      "Flusso per rendimento: " + String(f.get("note")),
                    performanceFlow: (out ? "-" : "") + amount,
                  },
                ],
              });
              setConfirmed(false);
              setError("");
            }}
          >
            <h3>Aggiungi un flusso non ancora registrato</h3>
            <p>
              Serve solo al calcolo: non modifica i saldi. Registra a parte la
              valutazione corretta. Non usare questo modulo per duplicare
              acquisti o vendite.
            </p>
            <label>
              Investimento
              <select name="asset">
                {store.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                name="date"
                required
                max={today()}
                defaultValue={to}
              />
            </label>
            <label>
              Tipo
              <select name="direction">
                <option value="in">Ingresso nel portafoglio</option>
                <option value="out">
                  Uscita o provento distribuito fuori dal portafoglio
                </option>
              </select>
            </label>
            <label>
              Importo EUR, tua quota
              <input name="amount" inputMode="decimal" required />
            </label>
            <label>
              Nota
              <input name="note" required maxLength={200} />
            </label>
            <button className="secondary" type="submit">
              Registra flusso
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
        <h3>Flussi classificati nel periodo</h3>
        <ul>
          {store.movements
            .filter(
              (m) =>
                ids.has(m.assetId) &&
                m.date > from &&
                m.date <= to &&
                m.performanceFlow !== undefined,
            )
            .map((m) => (
              <li key={m.id}>
                {m.date} · {hidden ? "••••" : money(Number(m.performanceFlow))}{" "}
                · {hidden ? "Flusso" : m.description}
                {onChange && (
                  <button
                    className="text-button"
                    onClick={() => {
                      onChange({
                        ...store,
                        movements: store.movements.map((x) =>
                          x.id === m.id
                            ? { ...x, performanceFlow: undefined }
                            : x,
                        ),
                      });
                      setConfirmed(false);
                    }}
                  >
                    Correggi flusso
                  </button>
                )}
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}
