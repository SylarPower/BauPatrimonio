import Decimal from "decimal.js";
import { categories, type Store } from "./model";
const currencies = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD"];
const text = (v: unknown, max = 500): v is string =>
  typeof v === "string" && v.length <= max;
const date = (v: unknown): v is string =>
  text(v, 10) &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const decimal = (v: unknown, positive = false) => {
  try {
    return (
      text(v, 80) &&
      v.trim() !== "" &&
      new Decimal(v).isFinite() &&
      (!positive || new Decimal(v).gte(0)) &&
      new Decimal(v).abs().lte("1e18")
    );
  } catch {
    return false;
  }
};
export function isStore(input: unknown): input is Store {
  try {
    if (!input || typeof input !== "object") return false;
    const s = input as Store;
    if (
      !date(s.createdAt) ||
      !Array.isArray(s.assets) ||
      !Array.isArray(s.movements) ||
      !Array.isArray(s.imports)
    )
      return false;
    const ids = new Set<string>();
    for (const a of s.assets) {
      if (
        !a ||
        !text(a.id, 120) ||
        !a.id ||
        ids.has(a.id) ||
        !text(a.name, 100) ||
        !a.name ||
        !Object.hasOwn(categories, a.category) ||
        !decimal(a.share, true) ||
        Number(a.share) <= 0 ||
        Number(a.share) > 100 ||
        !text(a.institution, 150) ||
        !a.details ||
        typeof a.details !== "object" ||
        Array.isArray(a.details) ||
        !Object.values(a.details).every((v) => text(v, 2000)) ||
        !Array.isArray(a.valuations) ||
        (a.archivedAt !== undefined && !date(a.archivedAt))
      )
        return false;
      ids.add(a.id);
      for (const v of a.valuations) {
        if (
          !v ||
          !text(v.id, 120) ||
          !date(v.date) ||
          !decimal(v.amount, true) ||
          !currencies.includes(v.currency) ||
          !text(v.source, 250) ||
          (v.note !== undefined && !text(v.note, 2000))
        )
          return false;
        if (
          v.fx !== undefined &&
          (!decimal(v.fx, true) ||
            Number(v.fx) <= 0 ||
            !date(v.fxDate) ||
            v.fxDate > v.date ||
            !text(v.fxSource, 250))
        )
          return false;
        if (
          v.positions !== undefined &&
          (!Array.isArray(v.positions) ||
            !v.positions.every(
              (p) =>
                p &&
                text(p.id, 120) &&
                text(p.name, 100) &&
                text(p.isin, 12) &&
                decimal(p.price, true) &&
                decimal(p.quantity, true) &&
                p.currency === v.currency &&
                date(p.date) &&
                p.date <= v.date &&
                text(p.source, 250),
            ))
        )
          return false;
      }
    }
    return (
      s.movements.every(
        (m) =>
          m &&
          text(m.id, 120) &&
          ids.has(m.assetId) &&
          date(m.date) &&
          decimal(m.amount) &&
          currencies.includes(m.currency) &&
          text(m.description, 2000),
      ) &&
      s.imports.every(
        (i) =>
          i &&
          text(i.id, 120) &&
          text(i.name, 250) &&
          date(i.date) &&
          Number.isInteger(i.rows) &&
          i.rows >= 0 &&
          text(i.kind, 100),
      )
    );
  } catch {
    return false;
  }
}
