import Performance from "./Performance";
import { useMemo, useRef, useState } from "react";
import { Info, ChevronDown, ChartNoAxesCombined } from "lucide-react";
import { dateLabel, money, today, totals, type Store } from "./model";
import {
  comparison,
  composition,
  eventDates,
  freshness,
  history,
  type Slice,
} from "./insights-model";
const pct = (n: number) =>
  new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(n) + "%";
function Tabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="insight-tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={value === o.value}
          className={value === o.value ? "selected" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export default function Insights({
  store: fullStore,
  asOf,
  hidden,
  onChange,
}: {
  store: Store;
  asOf: string;
  hidden: boolean;
  onChange?: (s: Store) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scope, setScope] = useState<"all" | "investment">("all");
  const store = useMemo(
    () =>
      scope === "all"
        ? fullStore
        : {
            ...fullStore,
            assets: fullStore.assets.filter((a) => a.category === "investment"),
          },
    [fullStore, scope],
  );
  const dates = eventDates(store, asOf),
    quality = freshness(store, asOf),
    t = totals(store.assets, asOf);
  return (
    <div className="insights">
      <Tabs
        label="Ambito dei grafici"
        value={scope}
        onChange={setScope}
        options={[
          { value: "all", label: "Tutto il patrimonio" },
          { value: "investment", label: "Investimenti" },
        ]}
      />
      {scope === "investment" && (
        <>
          <p>
            Solo investimenti, senza liquidità, pensione, immobili e debiti. Il
            totale in alto resta il patrimonio complessivo.
          </p>
        </>
      )}
      <div className="dashboard-grid insights-grid">
        <Trend
          store={store}
          asOf={asOf}
          hidden={hidden}
          investments={scope === "investment"}
        />
        <Composition store={store} asOf={asOf} hidden={hidden} />
      </div>
      {scope === "investment" && (
        <Performance
          key={scope}
          store={store}
          hidden={hidden}
          onChange={
            onChange
              ? (s) => onChange({ ...fullStore, movements: s.movements })
              : undefined
          }
        />
      )}
      <button
        className="insights-expand"
        aria-expanded={expanded}
        aria-controls="insights-detail"
        onClick={() => setExpanded(!expanded)}
      >
        <ChartNoAxesCombined size={18} />
        <span>
          <strong>Confronto e qualità dei dati</strong>
          <small>Cosa è cambiato e quali valori sono da aggiornare</small>
        </span>
        <ChevronDown
          size={18}
          style={{ transform: expanded ? "rotate(180deg)" : undefined }}
        />
      </button>
      {expanded && (
        <div id="insights-detail">
          <Compare store={store} asOf={asOf} hidden={hidden} dates={dates} />
          <section className="card quality-card">
            <div className="section-heading">
              <h2>Quanto è completo il quadro?</h2>
              <span className="subtle-tag">Al {dateLabel(asOf)}</span>
            </div>
            <div
              className={
                scope === "investment"
                  ? "quality-grid investment-quality"
                  : "quality-grid"
              }
            >
              <div>
                <small>Copertura delle voci</small>
                <strong>
                  {quality.total
                    ? `${quality.total - quality.missing.length} / ${quality.total}`
                    : "Nessuna voce"}
                </strong>
                <p>
                  {quality.missing.length
                    ? "Valore o cambio mancante: " + quality.missing.join(", ")
                    : "Tutte le voci presenti hanno valore e cambio."}
                </p>
              </div>
              <div>
                <small>Da rivedere · oltre 90 giorni</small>
                <strong>{quality.old.length} voci</strong>
                <p>
                  {quality.old.length
                    ? quality.old.join(", ")
                    : "Nessuna rilevazione oltre 90 giorni."}{" "}
                  Una data recente non certifica la stima.
                </p>
              </div>
              {scope === "all" && (
                <div>
                  <small>Debito / attività note</small>
                  <strong>
                    {hidden
                      ? "••••"
                      : t.active
                        ? pct((t.debt / t.active) * 100)
                        : "Non calcolabile"}
                  </strong>
                  <p>
                    {t.missing.length
                      ? "Rapporto parziale: non descrive tutto il patrimonio."
                      : "Confronto tra capitale residuo e attività di tua competenza. Non è un indicatore di sostenibilità delle rate."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Trend({
  store,
  asOf,
  hidden,
  investments = false,
}: {
  store: Store;
  asOf: string;
  hidden: boolean;
  investments?: boolean;
}) {
  const [range, setRange] = useState("Tutto"),
    [format, setFormat] = useState<"step" | "line" | "bars">("step"),
    [chosenSeries, setSeries] = useState<"net" | "gross">("net"),
    [selected, setSelected] = useState<string | null>(null),
    [table, setTable] = useState(false);
  const series = investments ? "net" : chosenSeries;
  const svg = useRef<SVGSVGElement>(null);
  const points = useMemo(
    () => history(store, asOf, range),
    [store, asOf, range],
  );
  const chosen = points.findIndex((p) => p.date === selected);
  const index = chosen < 0 ? Math.max(0, points.length - 1) : chosen,
    point = points[index];
  const W = 640,
    H = 270,
    left = 76,
    right = 22,
    top = 25,
    bottom = 45;
  const vals = points.flatMap((p) =>
    series === "net" ? [p.net] : [p.active, p.debt],
  );
  const min = Math.min(0, ...vals),
    max = Math.max(1, ...vals),
    span = max - min;
  const first = Date.parse(points[0]?.date || asOf),
    last = Date.parse(points.at(-1)?.date || asOf);
  const x = (i: number) =>
    points.length === 1
      ? (W + left - right) / 2
      : left +
        ((Date.parse(points[i].date) - first) / (last - first)) *
          (W - left - right);
  const y = (n: number) => top + ((max - n) / span) * (H - top - bottom);
  const visible = (n: number) => (hidden ? "••••" : money(n));
  const keys =
    series === "net" ? (["net"] as const) : (["active", "debt"] as const);
  const labels = {
    net: investments ? "Valore degli investimenti" : "Patrimonio netto",
    active: "Attività",
    debt: "Debiti",
  };
  const colors = { net: "var(--accent)", active: "#658b73", debt: "#be7658" };
  const path = (key: "net" | "active" | "debt") => {
    let d = "";
    points.forEach((p, i) => {
      if (p.missing.length) {
        return;
      }
      const prev = points[i - 1];
      d +=
        !prev || prev.missing.length
          ? ` M${x(i)},${y(p[key])}`
          : format === "step"
            ? ` H${x(i)} V${y(p[key])}`
            : ` L${x(i)},${y(p[key])}`;
    });
    return d;
  };
  return (
    <section className="card trend-card">
      <div className="section-heading">
        <h2>
          {investments
            ? "Andamento degli investimenti"
            : "Andamento del patrimonio"}
        </h2>
        <span className="subtle-tag">Variazione, non rendimento</span>
      </div>
      <div className="insight-controls">
        <Tabs
          label="Periodo andamento"
          value={range}
          onChange={setRange}
          options={["1M", "3M", "6M", "1A", "Tutto"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <label className="sr-only" htmlFor="trend-format">
          Formato andamento
        </label>
        <select
          id="trend-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
        >
          <option value="step">Gradini</option>
          <option value="line">Linee</option>
          <option value="bars">Colonne</option>
        </select>
      </div>
      <div className="series-controls">
        {!investments && (
          <Tabs
            label="Serie del grafico"
            value={series}
            onChange={setSeries}
            options={[
              { value: "net", label: "Patrimonio netto" },
              { value: "gross", label: "Attività e debiti" },
            ]}
          />
        )}
        <button
          className="inline-link"
          onClick={() => setTable(!table)}
          aria-expanded={table}
        >
          {table ? "Chiudi tabella" : "Dati in tabella"}
        </button>
      </div>
      <div className="chart-wrap enhanced-chart">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={
            investments
              ? "Andamento degli investimenti per date effettive"
              : "Andamento del patrimonio per date effettive"
          }
        >
          <desc>
            Solo rilevazioni esistenti. Gli importi parziali sono punti vuoti
            non collegati. Usa Tab sui punti e frecce per cambiare data.
          </desc>
          {[0, 1, 2, 3].map((i) => {
            const n = min + (span * i) / 3;
            return (
              <g key={i}>
                <line
                  x1={left}
                  x2={W - right}
                  y1={y(n)}
                  y2={y(n)}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <text
                  x={left - 9}
                  y={y(n) + 4}
                  textAnchor="end"
                  fill="var(--muted)"
                  fontSize="11"
                >
                  {hidden
                    ? "•••"
                    : new Intl.NumberFormat("it-IT", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(n)}
                </text>
              </g>
            );
          })}
          {format !== "bars" &&
            keys.map((key) => (
              <path
                key={key}
                d={path(key)}
                fill="none"
                stroke={colors[key]}
                strokeWidth="2.5"
              />
            ))}
          {points.map((p, i) => (
            <g
              key={p.date}
              role="button"
              tabIndex={0}
              aria-label={`${dateLabel(p.date)}: ${hidden ? "importi nascosti" : keys.map((key) => labels[key] + " " + money(p[key])).join(", ")}${p.missing.length ? ", totale parziale" : ""}`}
              onFocus={() => setSelected(p.date)}
              onClick={() => setSelected(p.date)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? points.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              points.length - 1,
                              i + (e.key === "ArrowLeft" ? -1 : 1),
                            ),
                          );
                  setSelected(points[next].date);
                  const groups =
                    svg.current?.querySelectorAll<SVGGElement>("[role=button]");
                  groups?.[next]?.focus();
                }
              }}
            >
              <rect
                x={x(i) - 12}
                y={top - 5}
                width="24"
                height={H - top - bottom + 15}
                fill="transparent"
              />
              {keys.map((key, k) =>
                format === "bars" ? (
                  <rect
                    key={key}
                    x={
                      x(i) -
                      Math.min(
                        14,
                        (W - left - right) / Math.max(points.length, 1) / 4,
                      ) +
                      k * 12
                    }
                    y={Math.min(y(0), y(p[key]))}
                    width={
                      series === "gross"
                        ? 10
                        : Math.min(
                            24,
                            (W - left - right) / Math.max(points.length, 1) / 2,
                          )
                    }
                    height={Math.max(2, Math.abs(y(p[key]) - y(0)))}
                    fill={p.missing.length ? "var(--card)" : colors[key]}
                    stroke={colors[key]}
                    strokeWidth={i === index ? 2 : 1}
                  />
                ) : (
                  <circle
                    key={key}
                    cx={x(i)}
                    cy={y(p[key])}
                    r={i === index ? 5 : 3.5}
                    fill={p.missing.length ? "var(--card)" : colors[key]}
                    stroke={colors[key]}
                    strokeWidth="2"
                  />
                ),
              )}
              {(i === 0 ||
                i === points.length - 1 ||
                (i === Math.floor(points.length / 2) && points.length > 4)) && (
                <text
                  x={x(i)}
                  y={H - 17}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                >
                  {new Date(p.date + "T12:00:00").toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      {point ? (
        <div className="chart-readout" aria-live="polite">
          <span>
            {dateLabel(point.date)}
            {point.missing.length > 0 && (
              <small>Totale parziale · manca: {point.missing.join(", ")}</small>
            )}
          </span>
          <strong>
            {series === "net"
              ? visible(point.net)
              : `${visible(point.active)} / ${visible(point.debt)}`}
          </strong>
        </div>
      ) : (
        <p className="single-note">
          Nessuna rilevazione in questo periodo. Prova «Tutto» o aggiungi una
          voce.
        </p>
      )}
      {points.length > 1 && (
        <label className="point-select">
          Scegli una rilevazione
          <select
            aria-label="Rilevazione nel grafico"
            value={point?.date || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {points.map((p) => (
              <option key={p.date} value={p.date}>
                {dateLabel(p.date)}
                {p.missing.length ? " · Totale parziale" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="chart-explanation">
        {points.length === 1
          ? "Un solo punto: la prossima rilevazione darà inizio alla tua storia."
          : format === "step"
            ? "Gradini: ogni valore resta valido fino alla rilevazione successiva. Non sono quotazioni giornaliere."
            : format === "line"
              ? "I segmenti uniscono le rilevazioni come guida visiva: tra le date non sono disponibili nuovi valori."
              : "Ogni colonna è una rilevazione, non un guadagno o una perdita."}{" "}
        {series === "gross"
          ? "Attività e debiti sono valori positivi, non si sommano al netto."
          : ""}
      </p>
      {table && (
        <div className="insight-table-scroll">
          <table>
            <caption>Rilevazioni effettive · EUR</caption>
            <thead>
              <tr>
                <th>Data</th>
                {!investments && (
                  <>
                    <th>Attività</th>
                    <th>Debiti</th>
                  </>
                )}
                <th>
                  {investments ? "Investimenti / stato" : "Netto / stato"}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}>
                  <td>{dateLabel(p.date)}</td>
                  {!investments && (
                    <>
                      <td>{visible(p.active)}</td>
                      <td>{visible(p.debt)}</td>
                    </>
                  )}
                  <td>
                    {visible(p.net)}
                    {p.missing.length > 0 ? " · Parziale" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function Composition({
  store,
  asOf,
  hidden,
}: {
  store: Store;
  asOf: string;
  hidden: boolean;
}) {
  const [format, setFormat] = useState<"bars" | "donut" | "table">("donut"),
    [by, setBy] = useState<"category" | "institution" | "nature">("category");
  const slices = composition(store.assets, asOf, by),
    t = totals(store.assets, asOf);
  let offset = 0;
  return (
    <section className="card composition insight-composition">
      <div className="section-heading">
        <h2>Come si compone</h2>
        <span className="subtle-tag">
          {t.missing.length ? "Attività note · parziale" : "Attività"}
        </span>
      </div>
      <div className="composition-controls">
        <select
          aria-label="Ripartizione per"
          value={by}
          onChange={(e) => setBy(e.target.value as typeof by)}
        >
          <option value="category">Per categoria</option>
          <option value="institution">Per istituto</option>
          <option value="nature">Per liquidabilità</option>
        </select>
        <Tabs
          label="Formato composizione"
          value={format}
          onChange={setFormat}
          options={[
            { value: "donut", label: "Anello" },
            { value: "bars", label: "Barre" },
            { value: "table", label: "Tabella" },
          ]}
        />
      </div>
      {slices.length ? (
        <>
          <svg
            className="composition-svg"
            viewBox={
              format === "bars"
                ? `0 0 400 ${Math.max(130, slices.length * 44 + 20)}`
                : `0 0 400 ${230 + slices.length * 24}`
            }
            role="img"
            aria-label={`Ripartizione delle attività ${by === "category" ? "per categoria" : by === "nature" ? "per liquidabilità" : "per istituto"}`}
            style={{ display: format === "table" ? "none" : undefined }}
          >
            {format === "bars" ? (
              slices.map((s, i) => (
                <g key={s.key}>
                  <text x="20" y={i * 44 + 20} fill="var(--text)" fontSize="11">
                    {s.label.length > 30 ? s.label.slice(0, 28) + "…" : s.label}
                  </text>
                  <rect
                    x="20"
                    y={i * 44 + 27}
                    width="310"
                    height="7"
                    rx="3"
                    fill="var(--secondary)"
                  />
                  <rect
                    x="20"
                    y={i * 44 + 27}
                    width={(310 * s.percent) / 100}
                    height="7"
                    rx="3"
                    fill={s.color}
                  />
                  <text
                    x="381"
                    y={i * 44 + 33}
                    textAnchor="end"
                    fill="var(--muted)"
                    fontSize="11"
                  >
                    {pct(s.percent)}
                  </text>
                  <text
                    x="380"
                    y={i * 44 + 20}
                    textAnchor="end"
                    fill="var(--text)"
                    fontSize="11"
                  >
                    {hidden ? "••••" : money(s.amount)}
                  </text>
                </g>
              ))
            ) : (
              <>
                <circle
                  cx="200"
                  cy="103"
                  r="75"
                  fill="none"
                  stroke="var(--secondary)"
                  strokeWidth="25"
                />
                {slices.map((s) => {
                  const start = offset;
                  offset += s.percent;
                  return (
                    <circle
                      key={s.key}
                      cx="200"
                      cy="103"
                      r="75"
                      pathLength="100"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="25"
                      strokeDasharray={`${Math.max(0, s.percent - 0.5)} ${100 - Math.max(0, s.percent - 0.5)}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 200 103)"
                    >
                      <title>
                        {s.label}:{" "}
                        {hidden ? "Importo nascosto" : money(s.amount)} ·{" "}
                        {pct(s.percent)}
                      </title>
                    </circle>
                  );
                })}
                <text
                  x="200"
                  y="98"
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                >
                  {t.missing.length ? "Attività note" : "Totale attività"}
                </text>
                <text
                  x="200"
                  y="122"
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="18"
                  fontWeight="600"
                >
                  {hidden ? "••••••" : money(t.active)}
                </text>
                {slices.map((s, i) => (
                  <g key={s.key}>
                    <rect
                      x="20"
                      y={i * 24 + 215}
                      width="7"
                      height="7"
                      rx="3"
                      fill={s.color}
                    />
                    <text
                      x="36"
                      y={i * 24 + 222}
                      fill="var(--text)"
                      fontSize="11"
                    >
                      {s.label.length > 23
                        ? s.label.slice(0, 21) + "…"
                        : s.label}
                    </text>
                    <text
                      x="380"
                      y={i * 24 + 222}
                      textAnchor="end"
                      fill="var(--text)"
                      fontSize="11"
                    >
                      {hidden ? "••••" : money(s.amount)} · {pct(s.percent)}
                    </text>
                  </g>
                ))}
              </>
            )}
          </svg>
          {format === "bars" && (
            <div className="composition-list">
              {slices.map((s) => (
                <div key={s.key}>
                  <span
                    className="legend-dot"
                    style={{ background: s.color }}
                  />
                  <span>{s.label}</span>
                  <strong>{hidden ? "••••••" : money(s.amount)}</strong>
                  <small>{pct(s.percent)}</small>
                </div>
              ))}
            </div>
          )}
          {format === "table" && (
            <div className="insight-table-scroll">
              <table>
                <caption>
                  Composizione al {dateLabel(asOf)} · attività note
                </caption>
                <thead>
                  <tr>
                    <th>Gruppo</th>
                    <th>Importo EUR</th>
                    <th>Quota</th>
                  </tr>
                </thead>
                <tbody>
                  {slices.map((s) => (
                    <tr key={s.key}>
                      <td>{s.label}</td>
                      <td>{hidden ? "••••" : money(s.amount)}</td>
                      <td>{pct(s.percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="chart-explanation">
            {by === "nature"
              ? "La liquidabilità descrive la natura delle voci, non garantisce tempi di vendita o disponibilità immediata."
              : "Percentuali sulle sole attività note. I debiti sono separati."}{" "}
            La previdenza, quando presente, è distinta dalla liquidità.
          </p>
        </>
      ) : (
        <p className="chart-explanation">
          Aggiungi un’attività con un valore per vedere la ripartizione.
        </p>
      )}
    </section>
  );
}
function Compare({
  store,
  asOf,
  hidden,
  dates,
}: {
  store: Store;
  asOf: string;
  hidden: boolean;
  dates: string[];
}) {
  const [from, setFrom] = useState(dates[0] || asOf),
    [to, setTo] = useState(asOf),
    [format, setFormat] = useState<"waterfall" | "bars" | "table">("waterfall");
  const rows = comparison(store, from, to),
    a = totals(store.assets, from),
    b = totals(store.assets, to),
    partial = !!a.missing.length || !!b.missing.length;
  const visible = (n: number) => (hidden ? "••••" : money(n));
  const changed = rows
    .filter((r) => r.delta !== null && r.delta !== 0)
    .sort((x, y) => Math.abs(y.delta!) - Math.abs(x.delta!));
  const shown = changed.slice(0, 7);
  if (changed.length > 7)
    shown.push({
      id: "other",
      label: "Altre variazioni",
      before: 0,
      after: 0,
      delta: changed.slice(7).reduce((s, r) => s + r.delta!, 0),
      source: "Aggregazione grafica; dettaglio in tabella",
    });
  const items = [
    { label: "Inizio", delta: a.net, start: 0, end: a.net, total: true },
    ...shown.map((r) => ({
      label: r.label,
      delta: r.delta!,
      start: 0,
      end: 0,
      total: false,
    })),
    { label: "Fine", delta: b.net, start: 0, end: b.net, total: true },
  ];
  let running = a.net;
  for (const p of items.slice(1, -1)) {
    p.start = running;
    running += p.delta;
    p.end = running;
  }
  const W = 740,
    H = 320,
    min = Math.min(0, ...items.flatMap((i) => [i.start, i.end])),
    max = Math.max(1, ...items.flatMap((i) => [i.start, i.end])),
    span = max - min;
  const y = (n: number) => 30 + ((max - n) / span) * 220,
    bw = Math.min(55, 580 / Math.max(items.length, 1));
  const dx = (i: number) => 70 + (i * 610) / Math.max(1, items.length - 1);
  const bound = Math.max(1, ...rows.map((r) => Math.abs(r.delta || 0)));
  return (
    <section className="card comparison-insight">
      <div className="section-heading">
        <h2>Perché è cambiato?</h2>
        <span className="subtle-tag">Valutazioni, non rendimento</span>
      </div>
      <div className="comparison-controls">
        <label>
          Da
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
        </label>
        <label>
          A
          <input
            type="date"
            value={to}
            min={from}
            max={today()}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </label>
        <Tabs
          label="Formato confronto"
          value={format}
          onChange={setFormat}
          options={[
            { value: "waterfall", label: "Cascata" },
            { value: "bars", label: "Variazioni" },
            { value: "table", label: "Tabella" },
          ]}
        />
      </div>
      <div className="comparison-summary">
        <span>
          {dateLabel(from)} → {dateLabel(to)}
        </span>
        <strong>
          {partial
            ? "Confronto parziale"
            : `${b.net - a.net >= 0 ? "+" : ""}${visible(b.net - a.net)}`}
        </strong>
      </div>
      {partial && (
        <p className="warning">
          Mancano valori o cambi a una delle date:{" "}
          {[...new Set([...a.missing, ...b.missing])].join(", ")}. La cascata è
          sospesa: non attribuiamo una variazione a dati sconosciuti.
        </p>
      )}
      {format === "waterfall" && !partial && (
        <div
          className="comparison-plot"
          tabIndex={0}
          role="region"
          aria-label="Grafico del confronto, scorrimento orizzontale su telefono"
        >
          <svg
            className="comparison-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Confronto a cascata del patrimonio"
          >
            <line x1="40" x2="710" y1={y(0)} y2={y(0)} stroke="var(--border)" />
            {items.map((p, i) => (
              <g key={i}>
                <rect
                  x={dx(i) - bw / 2}
                  y={Math.min(y(p.start), y(p.end))}
                  width={bw}
                  height={Math.max(2, Math.abs(y(p.start) - y(p.end)))}
                  rx="3"
                  fill={
                    p.total
                      ? "var(--accent)"
                      : p.delta > 0
                        ? "var(--positive)"
                        : "var(--negative)"
                  }
                />
                {i > 0 && i < items.length - 1 && (
                  <line
                    x1={dx(i) + bw / 2}
                    x2={dx(i + 1) - bw / 2}
                    y1={y(p.end)}
                    y2={y(p.end)}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                )}
                <text
                  x={dx(i)}
                  y={Math.max(17, Math.min(y(p.start), y(p.end)) - 8)}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="10"
                >
                  {hidden
                    ? "•••"
                    : new Intl.NumberFormat("it-IT", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(p.delta)}
                </text>
                <text
                  x={dx(i)}
                  y="278"
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="10"
                >
                  {p.label.length > 12 ? p.label.slice(0, 10) + "…" : p.label}
                </text>
                <title>
                  {p.label}: {visible(p.delta)}
                </title>
              </g>
            ))}
          </svg>
        </div>
      )}
      {format === "bars" && (
        <div
          className="comparison-plot"
          tabIndex={0}
          role="region"
          aria-label="Grafico del confronto, scorrimento orizzontale su telefono"
        >
          <svg
            className="comparison-svg"
            viewBox={`0 0 740 ${Math.max(120, rows.length * 47 + 30)}`}
            role="img"
            aria-label="Contributo di ogni voce alla variazione del patrimonio"
          >
            {rows.map((r, i) => (
              <g key={r.id}>
                <text x="16" y={i * 47 + 19} fontSize="12" fill="var(--text)">
                  {r.label.length > 30 ? r.label.slice(0, 28) + "…" : r.label}
                </text>
                <line
                  x1="430"
                  x2="430"
                  y1={i * 47 + 3}
                  y2={i * 47 + 36}
                  stroke="var(--border)"
                />
                {r.delta !== null && (
                  <rect
                    x={
                      r.delta < 0
                        ? 430 - (Math.abs(r.delta) / bound) * 155
                        : 430
                    }
                    y={i * 47 + 9}
                    width={Math.max(2, (Math.abs(r.delta) / bound) * 155)}
                    height="15"
                    rx="2"
                    fill={r.delta >= 0 ? "var(--positive)" : "var(--negative)"}
                  />
                )}
                <text
                  x="720"
                  y={i * 47 + 21}
                  textAnchor="end"
                  fill="var(--text)"
                  fontSize="11"
                >
                  {r.delta === null
                    ? "Non confrontabile"
                    : `${r.delta > 0 ? "+" : ""}${visible(r.delta)}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
      <div className="insight-table-scroll">
        <table>
          <caption>
            {format === "table"
              ? "Confronto tra le due date"
              : "Dettaglio accessibile del confronto"}
          </caption>
          <thead>
            <tr>
              <th>Voce</th>
              <th>Prima</th>
              <th>Dopo</th>
              <th>Effetto sul netto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.label}
                  <small>{r.source}</small>
                </td>
                <td>{r.before === null ? "Manca" : visible(r.before)}</td>
                <td>{r.after === null ? "Manca" : visible(r.after)}</td>
                <td>
                  {r.delta === null
                    ? "Non confrontabile"
                    : `${r.delta > 0 ? "+" : ""}${visible(r.delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="chart-explanation">
        <Info size={13} /> Un debito che diminuisce ha un effetto positivo sul
        netto, a parità di liquidità. Questi confronti includono aggiornamenti
        delle stime, prezzi e cambi; non li chiamano «rendimento». I movimenti
        importati non vengono sommati alle valutazioni.
      </p>
    </section>
  );
}
