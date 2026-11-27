import { it, expect } from "vitest";
import {
  parseFideuram,
  previewFideuram,
  fideuramMovement,
  type Cell,
} from "./fideuram";
import { demo, empty } from "./model";
import { isStore } from "./validation";
const header = [
  "Data",
  "Operazione",
  "Dettagli",
  "Conto o carta",
  "Contabilizzazione",
  "Categoria ",
  "Valuta",
  "Importo",
];
const row = (overrides: Partial<Record<number, Cell>> = {}) =>
  [
    "10/02/2025",
    "Pagamento esempio",
    "Dettaglio sintetico",
    "Conto TEST",
    "CONTABILIZZATO",
    "Acquisti",
    "EUR",
    "-12.34",
  ].map((v, i) => overrides[i] ?? v);
const parse = (rows: Cell[][]) =>
  parseFideuram([
    {
      sheet: "Lista Operazione",
      data: [[null, "Metadati fittizi"], header, ...rows],
    },
  ]);
it("trova intestazione sotto preambolo e preserva segno, valuta e decimali", () => {
  const rows = parse([
    row(),
    row({ 0: new Date("2025-02-11T00:00:00Z"), 7: "1.234,56" }),
  ]);
  expect(rows[0]).toMatchObject({
    row: 3,
    date: "2025-02-10",
    amount: "-12.34",
    error: "",
  });
  expect(rows[1]).toMatchObject({ amount: "1234.56", date: "2025-02-11" });
});
it("non prende date/importi da dettagli in valuta estera", () => {
  const r = parse([
    row({ 2: "Pagamento originale in JPY, data 01/01/2025", 7: "-9.81" }),
  ])[0];
  expect(r.currency).toBe("EUR");
  expect(r.amount).toBe("-9.81");
  expect(r.date).toBe("2025-02-10");
});
it("esclude stati pendenti, valori mancanti e date impossibili", () => {
  for (const r of [
    row({ 4: "DA CONTABILIZZARE" }),
    row({ 7: "" }),
    row({ 0: "31/02/2025" }),
    row({ 6: "" }),
    row({ 0: "2999-01-01" }),
    row({ 7: "NaN" }),
  ])
    expect(parse([r])[0].error).not.toBe("");
});
it("rifiuta intestazione mancante e fogli ambigui", () => {
  expect(() => parseFideuram([{ sheet: "altro", data: [] }])).toThrow(
    "non riconosciuto",
  );
  expect(() =>
    parseFideuram([
      { sheet: "a", data: [header] },
      { sheet: "b", data: [header] },
    ]),
  ).toThrow("Più fogli");
});
it("rifiuta colonne ripetute", () => {
  expect(() =>
    parseFideuram([{ sheet: "a", data: [[...header, "Importo"]] }]),
  ).toThrow("duplicata");
});
it("più conti restano separati e destinazione deve essere Liquidità", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  const rows = parse([row(), row({ 3: "Carta TEST" })]);
  expect(await previewFideuram(rows, "Conto TEST", cash.id, s)).toHaveLength(1);
  await expect(
    previewFideuram(
      rows,
      "Conto TEST",
      s.assets.find((a) => a.category === "investment")!.id,
      s,
    ),
  ).rejects.toThrow("Liquidità");
});
it("reimportazione e file sovrapposti non duplicano; nessun saldo o flusso rendimento modificato", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!,
    before = structuredClone(s.assets);
  const rows = parse([row(), row({ 0: "11/02/2025", 7: "100" })]);
  const p = await previewFideuram(rows, "Conto TEST", cash.id, s);
  s.movements.push(
    ...p.map((r) => fideuramMovement(r, cash.id, "test-import")),
  );
  expect(s.assets).toEqual(before);
  expect(
    s.movements.slice(-2).every((m) => m.performanceFlow === undefined),
  ).toBe(true);
  expect(isStore(s)).toBe(true);
  const again = await previewFideuram(
    [...rows].reverse(),
    "Conto TEST",
    cash.id,
    s,
  );
  expect(again.every((r) => r.action === "unchanged")).toBe(true);
});
it("duplicati identici nel file richiedono conferma e hanno ID distinti", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  const p = await previewFideuram(
    parse([row(), row()]),
    "Conto TEST",
    cash.id,
    s,
  );
  expect(p[0].doubt).toBe(false);
  expect(p[1].doubt).toBe(true);
  expect(p[0].id).not.toBe(p[1].id);
});
it("stessa data/importo del registro con descrizione diversa è ambiguo", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  s.movements.push({
    id: "manual",
    assetId: cash.id,
    date: "2025-02-10",
    amount: "-12.340",
    currency: "EUR",
    description: "manuale",
  });
  expect(
    (await previewFideuram(parse([row()]), "Conto TEST", cash.id, s))[0].doubt,
  ).toBe(true);
});
it("nessun dato nel file vuoto viene inventato", () => {
  expect(parse([[]])).toEqual([]);
  expect(empty().movements).toEqual([]);
});

it("stessa data e importo con dettagli diversi nello stesso file resta da confermare", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  const p = await previewFideuram(
    parse([row(), row({ 2: "Altro pagamento sintetico" })]),
    "Conto TEST",
    cash.id,
    s,
  );
  expect(p[1].doubt).toBe(true);
  expect(p[1].error).toBe("");
});
it("scarta descrizioni troppo lunghe senza troncare identificazione o movimenti", () => {
  expect(parse([row({ 2: "x".repeat(2100) })])[0].error).toContain(
    "troppo lunga",
  );
});
