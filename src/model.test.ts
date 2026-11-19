import { describe, it, expect } from "vitest";
import {
  demo,
  empty,
  totals,
  latest,
  today,
  uid,
  transfer,
  parseNumber,
  keepLastOnFailure,
  consentCanSync,
  type Asset,
} from "./model";
describe("Contabilità del patrimonio", () => {
  it("scenario richiesto: 172000 - 60000 = 112000 senza duplicare il broker", () => {
    const s = demo();
    expect(totals(s.assets)).toEqual({
      active: 172000,
      debt: 60000,
      net: 112000,
      missing: [],
    });
    expect(
      s.assets
        .filter((a) => a.institution === "Trade Republic")
        .reduce((sum, a) => sum + Number(latest(a)?.amount), 0),
    ).toBe(10000);
  });
  it("prima voce in un archivio vuoto", () => {
    const s = empty();
    expect(totals(s.assets).net).toBe(0);
    s.assets.push(demo().assets[0]);
    expect(totals(s.assets).net).toBe(12000);
  });
  it("trasferisce 1000 EUR senza guadagni, anche con saldo rilevato lo stesso giorno", () => {
    const s = demo(),
      next = transfer(s, s.assets[0].id, s.assets[1].id, "1000", today());
    expect(totals(next.assets).net).toBe(112000);
    expect(latest(next.assets[0])?.amount).toBe("11000");
    expect(latest(next.assets[1])?.amount).toBe("3000");
    expect(next.movements).toHaveLength(2);
    expect(s.assets[0].valuations).toHaveLength(1);
  });
  it("una stima nuova non modifica il mese precedente", () => {
    const a = demo().assets[4];
    a.valuations[0].date = "2026-09-01";
    a.valuations.push({
      id: uid(),
      date: "2026-10-01",
      amount: "260000",
      currency: "EUR",
      source: "Stima personale",
    });
    expect(totals([a], "2026-09-30").net).toBe(120000);
    expect(totals([a], "2026-10-31").net).toBe(130000);
  });
  it("quota del mutuo indipendente dalla proprietà", () => {
    const a = demo().assets[6];
    a.share = "25";
    expect(totals([a]).debt).toBe(30000);
  });
  it("archiviazione conserva i confronti precedenti", () => {
    const a = demo().assets[0];
    a.valuations[0].date = "2026-01-01";
    a.archivedAt = "2026-11-01";
    expect(totals([a], "2026-10-31").net).toBe(12000);
    expect(totals([a], "2026-11-01").net).toBe(0);
    expect(a.valuations).toHaveLength(1);
  });
  it("un cambio futuro non riscrive il passato, cambio mancante non è zero", () => {
    const a = demo().assets[0];
    a.valuations = [
      {
        id: uid(),
        date: "2026-01-01",
        amount: "100",
        currency: "USD",
        fx: "0.9",
        fxSource: "Test",
        fxDate: "2026-01-01",
        source: "Manuale",
      },
      {
        id: uid(),
        date: "2026-02-01",
        amount: "100",
        currency: "USD",
        fx: "0.95",
        fxSource: "Test",
        fxDate: "2026-02-01",
        source: "Manuale",
      },
    ];
    expect(totals([a], "2026-01-31").net).toBe(90);
    expect(totals([a], "2026-02-28").net).toBe(95);
    delete a.valuations[0].fx;
    expect(totals([a], "2026-01-31").missing).toEqual([a.name]);
  });
  it("contributi pensionistici e saldi disponibili non si sommano al contabile", () => {
    const s = demo();
    s.assets[0].details = { Disponibilità: "10000", "Somme vincolate": "2000" };
    s.assets[3].details = {
      "Contributi personali": "8000",
      "TFR conferito": "12000",
    };
    expect(totals(s.assets).net).toBe(112000);
  });
  it("preserva la precisione decimale", () => {
    expect(parseNumber("12.345,6789")).toBe("12345.6789");
    const a = demo().assets[0];
    a.share = "33.333333";
    a.valuations[0].amount = "0.3";
    expect(totals([a]).net).toBeCloseTo(0.099999999, 9);
  });
  it("rifiuta trasferimenti invalidi", () => {
    const s = demo();
    expect(() =>
      transfer(s, s.assets[0].id, s.assets[0].id, "10", today()),
    ).toThrow();
    expect(() =>
      transfer(s, s.assets[0].id, s.assets[1].id, "-10", today()),
    ).toThrow();
    expect(() =>
      transfer(s, s.assets[0].id, s.assets[1].id, "100000", today()),
    ).toThrow();
  });
  it("la riconciliazione del dossier sostituisce, non somma", () => {
    const a = demo().assets[2];
    a.valuations.push({
      id: uid(),
      date: today(),
      amount: "8000",
      currency: "EUR",
      source: "Manuale",
      positions: [
        {
          id: uid(),
          name: "ETF",
          isin: "",
          quantity: "80",
          price: "100",
          currency: "EUR",
          source: "Test",
          date: today(),
        },
      ],
    });
    expect(totals([a]).net).toBe(8000);
  });
});
describe("Invarianti per futuri connettori (non test di una banca)", () => {
  it("un errore mantiene ultimo dato valido", () => {
    const old = { balance: "12000", date: "2026-11-01" };
    expect(keepLastOnFailure(old, { ok: false })).toBe(old);
  });
  it("consenso revocato o scaduto non sincronizzabile", () => {
    expect(consentCanSync("revoked")).toBe(false);
    expect(consentCanSync("expired")).toBe(false);
    expect(consentCanSync("active")).toBe(true);
  });
});
