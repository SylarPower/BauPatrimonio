import { expect, it } from "vitest";
import { empty, demo } from "./model";
import { applyFideuram, previewFideuram, type BankRow } from "./fideuram";
import { suggestClassification, movementSummary } from "./movement-categories";
const row: BankRow = {
  row: 1,
  date: "2025-01-01",
  amount: "-10",
  currency: "EUR",
  operation: "Pagamento negozio test",
  details: "Acquisto sintetico",
  account: "TEST",
  status: "CONTABILIZZATO",
  category: "Acquisti",
  error: "",
};
it("replace removes only selected account including older movements, never balances", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  s.movements.push({
    id: "old",
    assetId: cash.id,
    date: "2020-01-01",
    amount: "1",
    currency: "EUR",
    description: "old",
  });
  const other = s.movements.filter((m) => m.assetId !== cash.id),
    p = await previewFideuram([row], "TEST", cash.id, s, "replace");
  const next = applyFideuram(s, p, cash.id, "replace", true, "test");
  expect(next.movements.filter((m) => m.assetId === cash.id)).toHaveLength(1);
  expect(next.movements.filter((m) => m.assetId !== cash.id)).toEqual(other);
  expect(next.assets).toEqual(s.assets);
  expect(s.movements.some((m) => m.id === "old")).toBe(true);
});
it("blocks partial replacement atomically", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  const p = await previewFideuram(
    [{ ...row, error: "invalid" }],
    "TEST",
    cash.id,
    s,
  );
  expect(() => applyFideuram(s, p, cash.id, "replace", true, "test")).toThrow();
});
it("updates category with exact identity and preserves manual corrections", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  let p = await previewFideuram([row], "TEST", cash.id, s);
  let next = applyFideuram(s, p, cash.id, "merge", true, "one");
  next.movements.at(-1)!.category = "Personalizzata";
  next.movements.at(-1)!.categoryOrigin = "manual";
  p = await previewFideuram(
    [{ ...row, category: "Nuova banca" }],
    "TEST",
    cash.id,
    next,
  );
  expect(p[0].action).toBe("update");
  const updated = applyFideuram(next, p, cash.id, "merge", true, "two");
  expect(updated.movements).toHaveLength(next.movements.length);
  expect(updated.movements.at(-1)!.category).toBe("Personalizzata");
});
it("ambiguous transfers stay outside spending and income", () => {
  const s = empty();
  const c = suggestClassification("Bonifico disposto", "", "-100", "test", []);
  expect(c.movementKind).toBe("review");
  const summary = movementSummary([
    {
      id: "x",
      assetId: "test",
      date: "2025-01-01",
      amount: "-100",
      currency: "EUR",
      description: "Bonifico",
      ...c,
    },
  ]);
  expect(summary.income.toString()).toBe("0");
  expect(summary.expense.toString()).toBe("0");
  expect(summary.review).toBe(1);
});
it("does not overwrite changed amount or arbitrary references in text", async () => {
  const s = demo(),
    cash = s.assets.find((a) => a.category === "cash")!;
  const p = await previewFideuram([row], "TEST", cash.id, s);
  const saved = applyFideuram(s, p, cash.id, "merge", true, "one");
  const changed = await previewFideuram(
    [{ ...row, amount: "-11" }],
    "TEST",
    cash.id,
    saved,
  );
  expect(changed[0].action).toBe("new");
  expect(changed[0].doubt).toBe(true);
  const untouched = applyFideuram(
    saved,
    changed,
    cash.id,
    "merge",
    true,
    "two",
  );
  expect(untouched.movements.find((m) => m.id === p[0].id)?.amount).toBe("-10");
});
it("learns whole words from manual corrections only and abstains on ties", () => {
  const base = {
    id: "x",
    assetId: "test",
    date: "2025-01-01",
    amount: "-10",
    currency: "EUR",
    description: "Supermercato prova",
    category: "Alimentari",
    movementKind: "expense" as const,
    categoryOrigin: "manual" as const,
  };
  expect(
    suggestClassification("Supermercato prova", "Banca", "-10", "test", [base])
      .category,
  ).toBe("Alimentari");
  expect(
    suggestClassification("Supermercato prova", "Banca", "-10", "test", [
      base,
      { ...base, id: "y", category: "Altro" },
    ]).category,
  ).toBe("Banca");
  expect(
    suggestClassification("Supermercato prova", "Banca", "-10", "other", [base])
      .category,
  ).toBe("Banca");
});
it("preserves refunds as negative net spending and decimal precision", () => {
  const base = {
    id: "x",
    assetId: "test",
    date: "2025-01-01",
    currency: "EUR",
    description: "test",
    category: "Acquisti",
    movementKind: "expense" as const,
  };
  const summary = movementSummary([
    { ...base, amount: "-10.10" },
    { ...base, id: "y", amount: "0.20" },
  ]);
  expect(summary.expense.toString()).toBe("9.9");
  expect(summary.balance.toString()).toBe("-9.9");
});
it("does not learn all POS payments as one merchant", () => {
  const history = [
    {
      id: "x",
      assetId: "test",
      date: "2025-01-01",
      amount: "-10",
      currency: "EUR",
      description: "Pagamento POS",
      category: "Spesa casa",
      categoryOrigin: "manual" as const,
      bank: {
        provider: "fideuram" as const,
        operation: "Pagamento POS",
        details: "Negozio mobili sintetico",
        account: "TEST",
        category: "Acquisti",
        status: "CONTABILIZZATO",
      },
    },
  ];
  expect(
    suggestClassification(
      "Pagamento POS",
      "Banca",
      "-10",
      "test",
      history,
      "Farmacia sintetica",
    ).category,
  ).toBe("Banca");
  expect(
    suggestClassification(
      "Pagamento POS",
      "Banca",
      "-10",
      "test",
      history,
      "Negozio mobili sintetico",
    ).category,
  ).toBe("Spesa casa");
});
