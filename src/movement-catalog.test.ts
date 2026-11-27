import { it, expect } from "vitest";
import { movementCatalog } from "./movement-catalog";
it("includes default categories and preserves unique bank/legacy/custom categories", () => {
  const base = {
    id: "x",
    assetId: "test",
    date: "2025-01-01",
    amount: "-1",
    currency: "EUR",
    description: "Categoria Fideuram: Etichetta storica",
  };
  const input = [
    base,
    { ...base, id: "y", category: "Categoria personalizzata" },
    { ...base, id: "z", category: "Casa" },
  ];
  const copy = structuredClone(input),
    catalog = movementCatalog(input);
  expect(catalog).toContain("Alimentari");
  expect(catalog).toContain("Etichetta storica");
  expect(catalog).toContain("Categoria personalizzata");
  expect(catalog.filter((c) => c === "Casa")).toHaveLength(1);
  expect(input).toEqual(copy);
});
