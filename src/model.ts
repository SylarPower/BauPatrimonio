import Decimal from "decimal.js";
Decimal.set({ precision: 40 });
export type Category =
  "cash" | "investment" | "pension" | "property" | "vehicle" | "other" | "debt";
export const categories: Record<Category, string> = {
  cash: "Liquidità",
  investment: "Investimenti",
  pension: "Fondo pensione",
  property: "Immobili",
  vehicle: "Veicoli",
  other: "Altre attività",
  debt: "Debiti",
};
export type Position = {
  id: string;
  name: string;
  isin: string;
  quantity: string;
  price: string;
  currency: string;
  source: string;
  date: string;
};
export type Valuation = {
  id: string;
  date: string;
  amount: string;
  currency: string;
  fx?: string;
  fxDate?: string;
  fxSource?: string;
  source: string;
  note?: string;
  positions?: Position[];
};
export type Asset = {
  id: string;
  name: string;
  category: Category;
  institution: string;
  share: string;
  archivedAt?: string;
  valuations: Valuation[];
  details: Record<string, string>;
};
export type Movement = {
  id: string;
  assetId: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  importId?: string;
  /** Flusso EUR di quota posseduta: ingresso positivo, uscita negativa. */
  performanceFlow?: string;
};
export type Store = {
  assets: Asset[];
  movements: Movement[];
  imports: {
    id: string;
    name: string;
    date: string;
    rows: number;
    kind: string;
  }[];
  createdAt: string;
};
export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => crypto.randomUUID();
export const empty = (): Store => ({
  assets: [],
  movements: [],
  imports: [],
  createdAt: today(),
});
export function latest(a: Asset, date = today()) {
  return [...a.valuations]
    .reverse()
    .filter((v) => v.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
export function value(a: Asset, date = today()): Decimal | null {
  const v = latest(a, date);
  if (!v || (!v.fx && v.currency !== "EUR")) return null;
  return new Decimal(v.amount)
    .mul(a.share)
    .div(100)
    .mul(v.currency === "EUR" ? 1 : v.fx!);
}
export function totals(assets: Asset[], date = today()) {
  let active = new Decimal(0),
    debt = new Decimal(0);
  const missing: string[] = [];
  assets
    .filter((a) => !a.archivedAt || a.archivedAt > date)
    .forEach((a) => {
      const n = value(a, date);
      if (n === null) missing.push(a.name);
      else if (a.category === "debt") debt = debt.add(n);
      else active = active.add(n);
    });
  return {
    active: active.toNumber(),
    debt: debt.toNumber(),
    net: active.minus(debt).toNumber(),
    missing,
  };
}
export function transfer(
  s: Store,
  fromId: string,
  toId: string,
  amount: string,
  date: string,
): Store {
  if (fromId === toId) throw Error("Scegli due conti diversi.");
  const n = new Decimal(amount);
  if (!n.isFinite() || !n.isPositive())
    throw Error("Inserisci un importo positivo.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > today()
  )
    throw Error("Data non valida o futura.");
  const from = s.assets.find((a) => a.id === fromId),
    to = s.assets.find((a) => a.id === toId);
  if (!from || !to) throw Error("Conto non trovato.");
  if ([from, to].some((a) => a.valuations.some((v) => v.date > date)))
    throw Error(
      "Usa una data uguale o successiva all’ultima rilevazione dei due conti.",
    );
  for (const a of [from, to])
    if (
      a.category !== "cash" ||
      a.share !== "100" ||
      latest(a, date)?.currency !== "EUR"
    )
      throw Error(
        "Il trasferimento rapido richiede due liquidità in EUR di tua completa proprietà.",
      );
  if (new Decimal(latest(from, date)!.amount).lt(n))
    throw Error("Saldo insufficiente.");
  return {
    ...s,
    assets: s.assets.map((a) =>
      a.id === fromId || a.id === toId
        ? {
            ...a,
            valuations: [
              ...a.valuations,
              {
                id: uid(),
                date,
                amount: new Decimal(latest(a, date)!.amount)
                  .add(a.id === fromId ? n.neg() : n)
                  .toString(),
                currency: "EUR",
                source: "Manuale",
                note: "Trasferimento interno",
              },
            ],
          }
        : a,
    ),
    movements: [
      ...s.movements,
      ...[fromId, toId].map((id) => ({
        id: uid(),
        assetId: id,
        date,
        amount: (id === fromId ? n.neg() : n).toString(),
        currency: "EUR",
        description: "Trasferimento interno",
      })),
    ],
  };
}
export function demo(): Store {
  const s = empty();
  const list: [string, Category, string, string, string][] = [
    ["Conto corrente", "cash", "12000", "100", "Fideuram"],
    ["Liquidità broker", "cash", "2000", "100", "Trade Republic"],
    ["Portafoglio ETF", "investment", "8000", "100", "Trade Republic"],
    [
      "Il mio fondo pensione",
      "pension",
      "20000",
      "100",
      "Previdenza complementare",
    ],
    ["Casa", "property", "240000", "50", "Patrimonio personale"],
    ["Auto", "vehicle", "10000", "100", "Patrimonio personale"],
    ["Mutuo casa", "debt", "120000", "50", "Fideuram"],
  ];
  s.assets = list.map(([name, category, amount, share, institution]) => ({
    id: uid(),
    name,
    category,
    institution,
    share,
    details: {},
    valuations: [
      {
        id: uid(),
        date: today(),
        amount,
        currency: "EUR",
        source: ["property", "vehicle"].includes(category)
          ? "Stima personale"
          : "Manuale",
        note: "Dato dimostrativo · prima rilevazione",
      },
    ],
  }));
  return s;
}
export function money(n: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    useGrouping: "always",
    maximumFractionDigits: 2,
  }).format(n);
}
export function dateLabel(s: string) {
  return new Date(s + "T12:00:00").toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function parseNumber(s: string) {
  const text = s.trim().replace(/\s|€/g, "");
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const n = new Decimal(normalized);
  if (!n.isFinite() || n.abs().gt("1e18"))
    throw Error("Numero non valido o troppo grande (massimo 10¹⁸).");
  return n.toString();
}
export async function fingerprint(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function keepLastOnFailure<T>(
  previous: T,
  result: { ok: boolean; data?: T },
) {
  return result.ok && result.data !== undefined ? result.data : previous;
}
export function consentCanSync(status: string) {
  return status === "active";
}

// Opt-in esclusivo della demo: cifre fittizie per provare i grafici, mai dati personali.
export function demoHistory(s: Store): Store {
  const amounts: Record<string, number[]> = {
    cash: [8000, 9000, 8500, 10000, 11000, 11500],
    investment: [6000, 6200, 6400, 6800, 7200, 7600],
    pension: [18000, 18300, 18700, 19000, 19400, 19800],
    property: [220000, 220000, 230000, 230000, 240000, 240000],
    vehicle: [12500, 12000, 11500, 11000, 10500, 10200],
    debt: [130000, 128000, 126000, 124000, 122000, 121000],
  };
  return {
    ...s,
    assets: s.assets.map((a, index) => ({
      ...a,
      valuations: [
        ...Array.from({ length: 6 }, (_, i) => {
          const d = new Date(today() + "T00:00:00Z");
          d.setUTCDate(1);
          d.setUTCMonth(d.getUTCMonth() - (6 - i));
          return {
            id: uid(),
            date: d.toISOString().slice(0, 10),
            amount: String(
              a.category === "cash" && index === 1
                ? [1000, 1200, 1800, 2000, 1700, 2000][i]
                : amounts[a.category]?.[i] || Number(latest(a)?.amount || 0),
            ),
            currency: "EUR",
            source: ["property", "vehicle"].includes(a.category)
              ? "Stima personale"
              : "Manuale",
            note: "Storico dimostrativo fittizio, non dati reali",
          };
        }),
        ...a.valuations,
      ],
    })),
  };
}
