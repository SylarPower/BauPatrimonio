import Decimal from "decimal.js";
import { latest, value, type Store } from "./model";
const day = (s: string) => Date.parse(s + "T00:00:00Z") / 86400000;
/** Modified Dietz, flussi a fine giornata, valori e flussi della sola quota posseduta. */
export function performance(s: Store, from: string, to: string) {
  const assets = s.assets.filter((a) => a.category === "investment");
  if (!assets.length || !(day(to) > day(from)))
    return { error: "Scegli due date diverse e almeno un investimento." };
  if (
    assets.some(
      (a) => a.archivedAt && a.archivedAt > from && a.archivedAt <= to,
    )
  )
    return {
      error:
        "Un investimento è stato archiviato nel periodo: serve prima riconciliare il valore finale e i flussi di uscita.",
    };
  const active = assets.filter((a) => !a.archivedAt || a.archivedAt > to);
  if (!active.length)
    return { error: "Nessun investimento attivo nel periodo." };
  let begin = new Decimal(0),
    end = new Decimal(0),
    flows = new Decimal(0),
    weighted = new Decimal(0);
  for (const a of active) {
    const b = value(a, from),
      e = value(a, to);
    if (b === null || e === null)
      return {
        error:
          "Manca una valutazione o un cambio agli estremi del periodo. Inserisci anche lo zero iniziale per investimenti non ancora aperti.",
      };
    if (latest(a, from)?.date !== from || latest(a, to)?.date !== to)
      return {
        error:
          "Per calcolare il rendimento servono valutazioni di tutti gli investimenti nelle due date scelte, non saldi trascinati da altre date.",
      };
    begin = begin.add(b);
    end = end.add(e);
  }
  const ids = new Set(active.map((a) => a.id));
  for (const m of s.movements.filter(
    (m) => ids.has(m.assetId) && m.date > from && m.date <= to,
  )) {
    if (m.performanceFlow === undefined)
      return {
        error:
          "Ci sono movimenti di investimento non classificati per il rendimento. Riconciliali prima di calcolarlo; non vengono interpretati automaticamente.",
      };
    const f = new Decimal(m.performanceFlow);
    flows = flows.add(f);
    weighted = weighted.add(
      f.mul((day(to) - day(m.date)) / (day(to) - day(from))),
    );
  }
  const gain = end.sub(begin).sub(flows),
    capital = begin.add(weighted);
  return {
    begin: begin.toNumber(),
    end: end.toNumber(),
    flows: flows.toNumber(),
    gain: gain.toNumber(),
    rate: capital.gt(0) ? gain.div(capital).mul(100).toNumber() : null,
  };
}
