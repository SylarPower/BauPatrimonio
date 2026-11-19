import { describe, it, expect } from "vitest";
import { demo, demoHistory, latest, totals, today } from "./model";
import {
  history,
  composition,
  comparison,
  eventDates,
  freshness,
} from "./insights-model";
import { recordOperation } from "./operations";
import { isStore } from "./validation";
describe("Insight: dati reali, non curve inventate", () => {
  it("una sola rilevazione produce un solo punto", () => {
    const s = demo();
    expect(history(s, today(), "Tutto")).toHaveLength(1);
  });
  it("storico demo opt-in conserva i totali e non modifica l’originale", () => {
    const s = demo(),
      d = demoHistory(s);
    expect(totals(d.assets).net).toBe(112000);
    expect(s.assets[0].valuations).toHaveLength(1);
    expect(eventDates(d)).toHaveLength(7);
    expect(d.assets.every((a) => a.valuations.length === 7)).toBe(true);
  });
  it("composizione esclude debiti e applica le quote", () => {
    const slices = composition(demo().assets, today(), "category");
    expect(slices.reduce((sum, s) => sum + s.amount, 0)).toBe(172000);
    expect(slices.find((s) => s.key === "property")?.amount).toBe(120000);
    expect(slices.reduce((sum, s) => sum + s.percent, 0)).toBeCloseTo(100);
  });
  it("gruppi per istituto e natura conservano il totale", () => {
    for (const group of ["institution", "nature"] as const)
      expect(
        composition(demo().assets, today(), group).reduce(
          (s, r) => s + r.amount,
          0,
        ),
      ).toBe(172000);
  });
  it("una data priva di cambio resta parziale nel grafico", () => {
    const s = demo();
    s.assets[0].valuations[0].currency = "USD";
    expect(history(s, today(), "Tutto")[0].missing).toContain("Conto corrente");
    expect(freshness(s, today()).missing).toContain("Conto corrente");
  });
  it("il confronto rispetta dati mancanti e archiviazione", () => {
    const s = demo();
    s.assets[0].valuations[0].date = "2026-01-01";
    s.assets[0].archivedAt = "2026-03-01";
    const r = comparison(s, "2026-02-01", "2026-04-01");
    expect(r[0].delta).toBe(-12000);
    expect(r[1].delta).toBe(null);
  });
  it("le variazioni delle singole voci riconciliano il netto", () => {
    const s = demoHistory(demo()),
      from = eventDates(s)[0],
      to = today();
    expect(
      comparison(s, from, to).reduce((n, r) => n + (r.delta || 0), 0),
    ).toBeCloseTo(totals(s.assets, to).net - totals(s.assets, from).net);
  });
  it("il filtro temporale non aggiunge punti giornalieri fittizi", () => {
    const s = demoHistory(demo());
    const points = history(s, today(), "1M");
    expect(points.length).toBeLessThan(7);
    expect(points.every((p) => eventDates(s).includes(p.date))).toBe(true);
  });
});
describe("Registrazioni contabili senza ordini o pagamenti", () => {
  it("acquisto ETF a prezzi invariati non incrementa il patrimonio", () => {
    const s = demo(),
      next = recordOperation(
        s,
        s.assets[0].id,
        s.assets[2].id,
        "buy",
        "1000",
        "0",
        today(),
      );
    expect(totals(next.assets).net).toBe(112000);
    expect(latest(next.assets[0])?.amount).toBe("11000");
    expect(latest(next.assets[2])?.amount).toBe("9000");
  });
  it("le commissioni riducono il netto", () => {
    const s = demo();
    expect(
      totals(
        recordOperation(
          s,
          s.assets[0].id,
          s.assets[2].id,
          "buy",
          "1000",
          "5",
          today(),
        ).assets,
      ).net,
    ).toBe(111995);
  });
  it("rimborso di capitale con quota mutuo 50% lascia invariato il netto", () => {
    const s = demo(),
      next = recordOperation(
        s,
        s.assets[0].id,
        s.assets[6].id,
        "repay",
        "1000",
        "0",
        today(),
      );
    expect(totals(next.assets).net).toBe(112000);
    expect(latest(next.assets[6])?.amount).toBe("118000");
  });
  it("gli interessi riducono il netto, non sono capitale residuo", () => {
    const s = demo(),
      next = recordOperation(
        s,
        s.assets[0].id,
        s.assets[6].id,
        "repay",
        "1000",
        "100",
        today(),
      );
    expect(totals(next.assets).net).toBe(111900);
  });
  it("vendita a valore di carico non inventa un guadagno", () => {
    const s = demo(),
      next = recordOperation(
        s,
        s.assets[0].id,
        s.assets[2].id,
        "sell",
        "1000",
        "2",
        today(),
      );
    expect(totals(next.assets).net).toBe(111998);
  });
  it("non consente saldi negativi o capitale oltre la posizione", () => {
    const s = demo();
    expect(() =>
      recordOperation(
        s,
        s.assets[0].id,
        s.assets[2].id,
        "sell",
        "9000",
        "0",
        today(),
      ),
    ).toThrow();
    expect(() =>
      recordOperation(
        s,
        s.assets[0].id,
        s.assets[6].id,
        "repay",
        "61000",
        "0",
        today(),
      ),
    ).toThrow();
  });
});
describe("Backup senza segreti: validazione strutturale", () => {
  it("accetta dati e storico demo", () => {
    expect(isStore(demo())).toBe(true);
    expect(isStore(demoHistory(demo()))).toBe(true);
  });
  it("rifiuta cambi, date e riferimenti non validi", () => {
    const s = demo();
    s.assets[0].valuations[0].fx = "NaN";
    expect(isStore(s)).toBe(false);
    expect(
      isStore({
        assets: [],
        movements: [],
        imports: [],
        createdAt: "2026-02-31",
      }),
    ).toBe(false);
  });
  it("un valore mancante è permesso e resta parziale", () => {
    const s = demo();
    s.assets[0].valuations = [];
    expect(isStore(s)).toBe(true);
    expect(totals(s.assets).missing).toContain("Conto corrente");
  });
});
