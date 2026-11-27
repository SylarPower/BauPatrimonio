import MovementInsights from "./MovementInsights";
import { movementCatalog } from "./movement-catalog";
import { useState } from "react";
import type { Store } from "./model";
import {
  categoryOf,
  normalizeText,
  kindOf,
  movementKinds,
  movementSummary,
  type MovementKind,
} from "./movement-categories";
export default function Movements({
  store,
  onSave,
  onImport,
  hidden = false,
}: {
  hidden?: boolean;
  store: Store;
  onSave: (s: Store) => void;
  onImport: () => void;
}) {
  const [search, setSearch] = useState(""),
    [account, setAccount] = useState(""),
    [kind, setKind] = useState(""),
    [category, setCategory] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [currency, setCurrency] = useState("EUR"),
    [page, setPage] = useState(0);
  const filtered = store.movements
    .filter(
      (m) =>
        (!account || m.assetId === account) &&
        (!kind || kindOf(m) === kind) &&
        (!category || categoryOf(m) === category) &&
        m.currency === currency &&
        (!from || m.date >= from) &&
        (!to || m.date <= to) &&
        normalizeText(
          m.description + " " + categoryOf(m) + " " + m.amount,
        ).includes(normalizeText(search)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const catalog = movementCatalog(store.movements);
  const summary = movementSummary(filtered),
    format = (n: { toString: () => string }) =>
      hidden
        ? "••••••"
        : new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency,
          }).format(Number(n.toString()));
  function change(id: string, fields: object) {
    const next = structuredClone(store);
    Object.assign(
      next.movements.find((m) => m.id === id)!,
      fields,
      { categoryOrigin: "manual" },
    );
    onSave(next);
  }
  const max = Math.max(0, Math.ceil(filtered.length / 40) - 1),
    current = Math.min(page, max);
  return (
    <>
      <section className="card content-card movement-tools">
        <div className="section-heading">
          <div>
            <h2>Entrate e spese, senza confusione</h2>
            <p>
              I movimenti non cambiano i saldi. Trasferimenti e operazioni da
              verificare sono esclusi dalle entrate e spese.
            </p>
          </div>
          <button className="primary" onClick={onImport}>
            Importa Excel Fideuram
          </button>
        </div>
        <div className="movement-filters" onChange={() => setPage(0)}>
          <label>
            Cerca
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descrizione, categoria, importo"
            />
          </label>
          <label>
            Conto
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Tutti i conti</option>
              {store.assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Tutti i tipi</option>
              {Object.entries(movementKinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Tutte le categorie</option>
              {[...new Set(store.movements.map(categoryOf))].sort().map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Dal
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Al
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Valuta
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {[
                ...new Set(["EUR", ...store.movements.map((m) => m.currency)]),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {from && to && from > to && (
          <p role="alert">La data iniziale deve precedere quella finale.</p>
        )}
        <button
          className="secondary"
          type="button"
          onClick={() => {
            setSearch("");
            setAccount("");
            setKind("");
            setCategory("");
            setFrom("");
            setTo("");
            setCurrency("EUR");
            setPage(0);
          }}
        >
          Azzera filtri
        </button>
      </section>
      <section className="card content-card movement-summary">
        <h2>Nel periodo e nei filtri selezionati</h2>
        <div className="movement-metrics">
          <p>
            Entrate
            <strong className="movement-total">{format(summary.income)}</strong>
          </p>
          <p>
            Spese nette
            <strong className="movement-total">
              {format(summary.expense)}
            </strong>
          </p>
          <p>
            Differenza
            <strong className="movement-total">
              {format(summary.balance)}
            </strong>
          </p>
        </div>
        <p>
          {summary.transfers} trasferimenti · {summary.review} da verificare ·
          Importi nominali, non ponderati per quota di possesso. Nessuna
          conversione tra valute.
        </p>
      </section>
      <MovementInsights
        movements={filtered}
        hidden={hidden}
        currency={currency}
        onCategory={(c) => {
          setCategory(c);
          setPage(0);
        }}
      />
      <section className="card content-card movement-register">
        <h2>{filtered.length} movimenti</h2>
        <p>
          Correggi categoria e tipo direttamente qui. Le tue correzioni restano
          prioritarie nelle importazioni successive.
        </p>
        {filtered.slice(current * 40, (current + 1) * 40).map((m) => (
          <article className="movement-row" key={m.id}>
            <div>
              <small>
                {m.date.split("-").reverse().join("/")} ·{" "}
                {store.assets.find((a) => a.id === m.assetId)?.name}
              </small>
              <strong className="movement-description">
                {m.bank?.operation || m.description.split("\n")[0]}
              </strong>
              <details>
                <summary>Dettagli operazione</summary>
                <p className="movement-description">{m.description}</p>
                <small>
                  Origine categoria:{" "}
                  {m.categoryOrigin === "manual"
                    ? "corretta da te"
                    : m.categoryOrigin === "history"
                      ? "suggerita dalle tue correzioni"
                      : "banca / classificazione iniziale"}
                </small>
              </details>
            </div>
            <strong>{format(m.amount)}</strong>
            <label>
              Tipo
              <select
                value={kindOf(m)}
                onChange={(e) =>
                  change(m.id, { movementKind: e.target.value as MovementKind })
                }
              >
                {Object.entries(movementKinds).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select
                aria-label="Categoria del movimento"
                value={categoryOf(m)}
                onChange={(e) => change(m.id, { category: e.target.value })}
              >
                {catalog.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </article>
        ))}
        {!filtered.length && (
          <p>
            Nessun movimento per questi filtri. Importa un file Excel o cambia
            la ricerca.
          </p>
        )}
        <div className="form-actions">
          <button
            className="secondary"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            Precedenti
          </button>
          <span>
            Pagina {current + 1} di {max + 1}
          </span>
          <button
            className="secondary"
            disabled={current >= max}
            onClick={() => setPage(current + 1)}
          >
            Successivi
          </button>
        </div>
      </section>
      {store.imports.length > 0 && (
        <details className="card content-card movement-import-log">
          <summary>Registro importazioni · {store.imports.length}</summary>
          {[...store.imports].reverse().map((i) => (
            <p key={i.id}>
              {i.date} · {i.name} · {i.rows} righe · {i.kind}
            </p>
          ))}
        </details>
      )}
    </>
  );
}
