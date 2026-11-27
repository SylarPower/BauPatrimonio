import { useState } from "react";
import Decimal from "decimal.js";
import { marketDocument } from "./market-widget";
import type { Asset } from "./model";
export default function InstrumentAnalysis({
  assets,
  hidden = false,
}: {
  assets: Asset[];
  hidden?: boolean;
}) {
  const instruments = [
    ...new Map(
      assets.flatMap((a) =>
        a.valuations.flatMap((v) =>
          (v.positions || []).map((p) => [p.isin || p.name, p] as const),
        ),
      ),
    ).values(),
  ];
  const [instrument, setInstrument] = useState(""),
    [symbol, setSymbol] = useState(""),
    [document, setDocument] = useState(""),
    [error, setError] = useState(""),
    [currency, setCurrency] = useState("EUR"),
    [account, setAccount] = useState("");
  const accountId = account || assets[0]?.id || "";
  const records = assets
    .filter((a) => a.id === accountId)
    .flatMap((a) =>
      a.valuations.flatMap((v) =>
        (v.positions || [])
          .filter((p) => (p.isin || p.name) === instrument)
          .map((p) => ({ ...p, account: a.name, valuation: v.date })),
      ),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const points = records.filter((p) => p.currency === currency);
  const first = points[0],
    last = points.at(-1);
  const delta =
    first && last && new Decimal(first.price).gt(0)
      ? new Decimal(last.price).div(first.price).sub(1).mul(100).toFixed(2)
      : null;
  const prices = points.map((p) => new Decimal(p.price).toNumber()),
    low = Math.min(...prices),
    high = Math.max(...prices);
  return (
    <section className="card">
      <h2>Azioni ed ETF · prezzi</h2>
      <p>
        Consulta il mercato separatamente dai prezzi registrati nel tuo dossier.
        Nessuna quotazione modifica automaticamente il patrimonio.
      </p>
      <label>
        Strumento registrato
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
        >
          <option value="">Scegli uno strumento</option>
          {instruments.map((p) => (
            <option key={p.isin || p.name} value={p.isin || p.name}>
              {p.name} · {p.isin || "ISIN non registrato"}
            </option>
          ))}
        </select>
      </label>
      {!instruments.length && (
        <p>
          Nessuno strumento registrato: apri un dossier di investimento e scegli
          Dettaglio strumenti e riconciliazione. I prezzi online sono
          consultabili anche senza strumenti personali.
        </p>
      )}
      {instrument && (
        <>
          <h3>I tuoi prezzi registrati</h3>
          <label>
            Dossier dei prezzi personali
            <select
              value={accountId}
              onChange={(e) => setAccount(e.target.value)}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Valuta dei prezzi
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {[...new Set(["EUR", ...records.map((p) => p.currency)])].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
          {!hidden && first && last && points.length > 1 && (
            <>
              <p>
                Dal {first.date} al {last.date}: variazione del prezzo{" "}
                {delta === null ? "non calcolabile" : delta + "%"}. Non è il
                rendimento del portafoglio.
              </p>
              <svg
                className="personal-price-chart"
                role="img"
                aria-label="Andamento dei prezzi personali registrati, punti equidistanti per rilevazione"
                viewBox="0 0 600 160"
              >
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  points={prices
                    .map(
                      (p, i) =>
                        `${10 + (i * 580) / (prices.length - 1)},${140 - (high === low ? 60 : ((p - low) / (high - low)) * 120)}`,
                    )
                    .join(" ")}
                />
              </svg>
            </>
          )}
          {!points.length && <p>Nessun prezzo registrato in questa valuta.</p>}
          {points.map((p, i) => (
            <p key={i}>
              {p.date} ·{" "}
              <strong>
                {hidden ? "••••••" : p.price} {p.currency}
              </strong>{" "}
              · {p.account} · fonte: {p.source}
            </p>
          ))}
          <p>
            Prezzi unitari storici inseriti da te, non rendimento: acquisti,
            vendite e dividendi non sono inclusi nel confronto.
          </p>
        </>
      )}
      <details>
        <summary>Prezzi e grafici online · TradingView</summary>
        <p>
          Carica qui il grafico del mercato oppure aprilo in una nuova scheda.
          Cerca il simbolo e verifica borsa, valuta e identità dello strumento;
          un ISIN può avere più quotazioni. Dati e possibili ritardi sono
          indicati dal fornitore. Il caricamento contatta TradingView e i suoi
          fornitori (indirizzo IP e simbolo scelto). Non inviamo quantità, saldi
          o operazioni; nessun caricamento prima del tuo consenso.
        </p>
        <label>
          Simbolo e borsa
          <input
            placeholder="Es. NASDAQ:AAPL"
            maxLength={80}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </label>
        <div className="form-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              try {
                setDocument(marketDocument(symbol.trim(), documentDark()));
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Carica grafico online
          </button>
          {document && (
            <button type="button" onClick={() => setDocument("")}>
              Chiudi grafico online
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        {document && !hidden && (
          <>
            <iframe
              className="market-chart"
              title="Prezzi e storico di mercato TradingView"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              srcDoc={document}
            />
            <p>
              Se il grafico resta vuoto o il simbolo non è coperto, usa il
              collegamento esterno. La disponibilità del servizio non è
              garantita; nessun prezzo mancante è sostituito da zero.
            </p>
          </>
        )}
        <a
          className="text-button"
          href={
            "https://www.tradingview.com/chart/" +
            (symbol.trim()
              ? "?symbol=" + encodeURIComponent(symbol.trim())
              : "")
          }
          target="_blank"
          rel="noreferrer"
        >
          Apri prezzi e storico online ↗
        </a>
        <p>
          Dati forniti da TradingView: non è una sincronizzazione o una fonte di
          prezzi verificata dall’app.
        </p>
      </details>
    </section>
  );
}

function documentDark() {
  return window.document.documentElement.dataset.theme === "amoled";
}
