import { describe, it, expect } from "vitest";
import { empty, type Asset } from "./model";
import { performance } from "./performance";
import { recordOperation } from "./operations";
import { isStore } from "./validation";
function fixture() {
  const s = empty();
  const a: Asset = {
    id: "i",
    name: "ETF",
    category: "investment",
    institution: "Broker",
    share: "100",
    details: {},
    valuations: [
      {
        id: "a",
        date: "2026-01-01",
        amount: "1000",
        currency: "EUR",
        source: "Test",
      },
      {
        id: "b",
        date: "2026-01-11",
        amount: "1600",
        currency: "EUR",
        source: "Test",
      },
    ],
  };
  s.assets = [a];
  return s;
}
describe("rendimento portafoglio", () => {
  it("separa versamento e guadagno, pesando il capitale", () => {
    const s = fixture();
    s.movements = [
      {
        id: "m",
        assetId: "i",
        date: "2026-01-06",
        amount: "0",
        currency: "EUR",
        description: "Ingresso",
        performanceFlow: "500",
      },
    ];
    const r = performance(s, "2026-01-01", "2026-01-11");
    expect(r.gain).toBe(100);
    expect(r.rate).toBe(8);
  });
  it("senza flussi il risultato non viene annualizzato", () => {
    const r = performance(fixture(), "2026-01-01", "2026-01-11");
    expect(r.rate).toBe(60);
  });
  it("un prelievo non è una perdita", () => {
    const s = fixture();
    s.assets[0].valuations[1].amount = "600";
    s.movements = [
      {
        id: "m",
        assetId: "i",
        date: "2026-01-11",
        amount: "0",
        currency: "EUR",
        description: "Uscita",
        performanceFlow: "-500",
      },
    ];
    expect(performance(s, "2026-01-01", "2026-01-11").gain).toBe(100);
  });
  it("non inventa un rendimento con date, valori o movimenti mancanti", () => {
    const s = fixture();
    expect(performance(s, "2026-01-02", "2026-01-11").error).toBeTruthy();
    s.movements = [
      {
        id: "m",
        assetId: "i",
        date: "2026-01-06",
        amount: "100",
        currency: "EUR",
        description: "Non classificato",
      },
    ];
    expect(performance(s, "2026-01-01", "2026-01-11").error).toBeTruthy();
  });
  it("nessuna percentuale con capitale nullo", () => {
    const s = fixture();
    s.assets[0].valuations[0].amount = "0";
    expect(performance(s, "2026-01-01", "2026-01-11").rate).toBeNull();
  });
  it("archiviazione nel periodo blocca il risultato", () => {
    const s = fixture();
    s.assets[0].archivedAt = "2026-01-07";
    expect(performance(s, "2026-01-01", "2026-01-11").error).toBeTruthy();
  });
  it("acquisto include costi di transazione nella quota posseduta", () => {
    const s = fixture();
    s.assets[0].valuations = s.assets[0].valuations.slice(0, 1);
    s.assets.push({
      ...s.assets[0],
      id: "c",
      category: "cash",
      valuations: [
        {
          id: "c1",
          date: "2026-01-01",
          amount: "1000",
          currency: "EUR",
          source: "test",
        },
      ],
    });
    const out = recordOperation(s, "c", "i", "buy", "500", "5", "2026-01-06");
    expect(out.movements.find((m) => m.assetId === "i")?.performanceFlow).toBe(
      "505",
    );
    expect(performance(out, "2026-01-01", "2026-01-06").gain).toBe(-5);
    expect(isStore(out)).toBe(true);
  });
  it("backup rifiuta flussi non decimali", () => {
    const s = fixture();
    s.movements = [
      {
        id: "m",
        assetId: "i",
        date: "2026-01-06",
        amount: "0",
        currency: "EUR",
        description: "Flusso",
        performanceFlow: "NaN",
      },
    ];
    expect(isStore(s)).toBe(false);
  });
});
