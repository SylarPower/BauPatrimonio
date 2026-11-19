import Decimal from "decimal.js";
import {
  categories,
  latest,
  today,
  totals,
  value,
  type Asset,
  type Store,
} from "./model";
export const categoryColors: Record<string, string> = {
  cash: "#658b73",
  investment: "#a5ba90",
  pension: "#d2b979",
  property: "#345b43",
  vehicle: "#a49a87",
  other: "#868da5",
  debt: "#be7658",
};
export function eventDates(s: Store, asOf = today()) {
  return [
    ...new Set(
      s.assets.flatMap((a) => [
        ...a.valuations.map((v) => v.date),
        ...(a.archivedAt ? [a.archivedAt] : []),
      ]),
    ),
  ]
    .filter((d) => d <= asOf)
    .sort();
}
export function history(s: Store, asOf: string, range: string) {
  const months: Record<string, number> = {
    "1M": 1,
    "3M": 3,
    "6M": 6,
    "1A": 12,
  };
  const end = new Date(asOf + "T00:00:00Z"),
    start = new Date(end);
  if (months[range]) {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - months[range]);
    const last = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    ).getUTCDate();
    start.setUTCDate(Math.min(day, last));
  }
  return eventDates(s, asOf)
    .filter((d) => !months[range] || d >= start.toISOString().slice(0, 10))
    .map((date) => ({ date, ...totals(s.assets, date) }));
}
export type Slice = {
  key: string;
  label: string;
  amount: number;
  color: string;
  percent: number;
};
export function composition(
  assets: Asset[],
  date: string,
  by: "category" | "institution" | "nature",
): Slice[] {
  const groups = new Map<string, Decimal>();
  for (const a of assets) {
    if (a.category === "debt" || (a.archivedAt && a.archivedAt <= date))
      continue;
    const n = value(a, date);
    if (n === null || n.lte(0)) continue;
    const nature =
      a.category === "other"
        ? a.details.Natura || "Bene non liquido"
        : {
            cash: "Liquidità",
            investment: "Capitale investito",
            pension: "Previdenza",
            property: "Bene non liquido",
            vehicle: "Bene non liquido",
          }[a.category];
    const key =
      by === "category"
        ? a.category
        : by === "institution"
          ? a.institution || "Senza istituto"
          : nature;
    groups.set(key, (groups.get(key) || new Decimal(0)).add(n));
  }
  const sum = Decimal.sum(0, ...groups.values());
  return [...groups.entries()]
    .sort((a, b) => b[1].cmp(a[1]))
    .map(([key, n], i) => ({
      key,
      label:
        by === "category" ? categories[key as keyof typeof categories] : key,
      amount: n.toNumber(),
      percent: sum.isZero() ? 0 : n.div(sum).mul(100).toNumber(),
      color:
        by === "category"
          ? categoryColors[key]
          : Object.values(categoryColors)[i % 7],
    }));
}
export function contribution(a: Asset, date: string): number | null {
  if (a.archivedAt && a.archivedAt <= date) return 0;
  const n = value(a, date);
  return n === null ? null : n.mul(a.category === "debt" ? -1 : 1).toNumber();
}
export function comparison(s: Store, from: string, to: string) {
  return s.assets.map((a) => {
    const before = contribution(a, from),
      after = contribution(a, to);
    return {
      id: a.id,
      label: a.name,
      before,
      after,
      delta:
        before === null || after === null
          ? null
          : new Decimal(after).minus(before).toNumber(),
      source: latest(a, to)?.source || "Non disponibile",
    };
  });
}
export function freshness(s: Store, date: string) {
  const assets = s.assets.filter((a) => !a.archivedAt || a.archivedAt > date);
  return {
    total: assets.length,
    missing: assets.filter((a) => value(a, date) === null).map((a) => a.name),
    old: assets
      .filter((a) => {
        const v = latest(a, date);
        return v && (Date.parse(date) - Date.parse(v.date)) / 86400000 > 90;
      })
      .map((a) => a.name),
  };
}
