import { useState } from "react";
import Decimal from "decimal.js";
import type { Movement } from "./model";
import { movementSummary } from "./movement-categories";
/** Charts are a view of the filtered nominal amounts; never a wealth calculation. */
export default function MovementInsights({
  movements,
  hidden,
  currency,
  onCategory,
}: {
  movements: Movement[];
  hidden: boolean;
  currency: string;
  onCategory: (c: string) => void;
}) {
  const [view, setView] = useState<"bars" | "ring">("bars");
  const s = movementSummary(movements),
    positive = s.categories.filter(([, n]) => n.gt(0)),
    total = positive.reduce((n, [, v]) => n.add(v), new Decimal(0));
  const fmt = (v: Decimal) =>
    hidden
      ? "••••••"
      : new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(
          v.toNumber(),
        );
  const max =
    Math.max(
      0,
      ...s.months.flatMap(([, m]) => [
        m.income.abs().toNumber(),
        m.expense.abs().toNumber(),
      ]),
    ) || 1;
  const palette = [
    "#345b43",
    "#387b91",
    "#8d649c",
    "#aa632b",
    "#627a37",
    "#936474",
  ];
  let offset = 0;
  return (
    <section className="card content-card movement-insights">
      <div className="section-heading">
        <div>
          <h2>Insight sui movimenti</h2>
          <p>
            Tutti i grafici seguono i filtri sopra. Trasferimenti e operazioni
            da verificare sono esclusi.
          </p>
        </div>
      </div>
      {!s.months.length ? (
        <p className="insight-empty">
          Nessuna entrata o spesa classificata per questi filtri. Verifica il
          tipo delle operazioni o cambia periodo.
        </p>
      ) : (
        <div className="movement-insight-grid">
          <section>
            <div className="insight-heading">
              <h3>Ripartizione per categoria</h3>
              <div
                className="insight-switch"
                role="group"
                aria-label="Formato categorie"
              >
                <button
                  className="secondary"
                  aria-pressed={view === "bars"}
                  onClick={() => setView("bars")}
                >
                  Barre
                </button>
                <button
                  className="secondary"
                  aria-pressed={view === "ring"}
                  onClick={() => setView("ring")}
                >
                  Anello
                </button>
              </div>
            </div>
            <p>
              Spese nette per categoria. Seleziona una categoria per filtrare il
              registro.
            </p>
            {hidden ? (
              <p>Grafico nascosto per privacy.</p>
            ) : (
              <>
                {view === "ring" && total.gt(0) && (
                  <svg
                    className="movement-ring"
                    viewBox="0 0 180 180"
                    role="img"
                    aria-label="Distribuzione delle categorie con spesa netta positiva"
                  >
                    <circle
                      cx="90"
                      cy="90"
                      r="60"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="24"
                    />
                    {positive.map(([c, n], i) => {
                      const pct = n.div(total).mul(100).toNumber(),
                        start = offset;
                      offset += pct;
                      return (
                        <circle
                          key={c}
                          cx="90"
                          cy="90"
                          r="60"
                          fill="none"
                          stroke={palette[i % palette.length]}
                          strokeWidth="24"
                          pathLength="100"
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={-start}
                          transform="rotate(-90 90 90)"
                        >
                          <title>
                            {c}: {fmt(n)}
                          </title>
                        </circle>
                      );
                    })}
                  </svg>
                )}
                {view === "ring" && (
                  <p className="field-note">
                    L’anello include solo categorie con spesa netta positiva;
                    rimborsi netti e zeri restano nell’elenco, fuori dalle
                    percentuali.
                  </p>
                )}
              </>
            )}
            <ul className="category-chart-list">
              {s.categories.map(([c, n], i) => (
                <li key={c}>
                  <button onClick={() => onCategory(c)}>
                    <span>
                      <i style={{ background: palette[i % palette.length] }} />
                      {c}
                    </span>
                    <strong>{fmt(n)}</strong>
                    {!hidden && view === "bars" && (
                      <span className="category-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${n.gt(0) && total.gt(0) ? n.div(total).mul(100).toNumber() : 0}%`,
                            background: palette[i % palette.length],
                          }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {!s.categories.length && <p>Nessuna spesa classificata.</p>}
          </section>
          <section>
            <h3>Andamento mensile</h3>
            <p>Entrate e spese nette, mese per mese. Valuta: {currency}.</p>
            {hidden ? (
              <p>Grafico nascosto per privacy.</p>
            ) : (
              <div
                className="monthly-chart"
                role="img"
                aria-label="Barre mensili di entrate e spese nette"
              >
                <div className="monthly-legend">
                  <span>● Entrate</span>
                  <span>● Spese nette</span>
                </div>
                {s.months.map(([m, v]) => (
                  <div className="monthly-chart-row" key={m}>
                    <span>{m}</span>
                    <div>
                      <div
                        className="month-bar income-bar"
                        style={{
                          width: `${(v.income.abs().toNumber() / max) * 100}%`,
                        }}
                        title={`Entrate ${fmt(v.income)}`}
                      />
                      <div
                        className="month-bar expense-bar"
                        style={{
                          width: `${(v.expense.abs().toNumber() / max) * 100}%`,
                        }}
                        title={`Spese nette ${fmt(v.expense)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="field-note">
              Lunghezze in valore assoluto; segni e rimborsi sono indicati nella
              tabella. Mesi senza registrazioni non equivalgono a mesi a zero.
            </p>
            <details>
              <summary>Valori mensili accessibili</summary>
              <div className="movement-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mese</th>
                      <th>Entrate</th>
                      <th>Spese nette</th>
                      <th>Differenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.months.map(([m, v]) => (
                      <tr key={m}>
                        <th scope="row">{m}</th>
                        <td>{fmt(v.income)}</td>
                        <td>{fmt(v.expense)}</td>
                        <td>{fmt(v.income.sub(v.expense))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </div>
      )}
    </section>
  );
}
