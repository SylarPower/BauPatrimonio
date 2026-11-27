import Decimal from "decimal.js";
import type { Movement } from "./model";
export const movementKinds = {
  income: "Entrata",
  expense: "Spesa",
  transfer: "Trasferimento",
  review: "Da verificare",
} as const;
export type MovementKind = keyof typeof movementKinds;
export const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const generic = new Set(
  "pagamento pagamenti acquisto acquisti spesa spese bonifico disposto favore voi ricevuto da di del della il la e con per pos carta carte conto conti addebito accredito operazione operazioni bancario euro eur".split(
    " ",
  ),
);
function tokens(s: string) {
  return [
    ...new Set(
      normalizeText(s)
        .split(" ")
        .filter((w) => w.length >= 3 && !generic.has(w) && /\p{L}/u.test(w)),
    ),
  ];
}
export function operationOf(m: Movement) {
  return m.bank?.operation || m.description.split("\n")[0];
}
export function categoryOf(m: Movement) {
  return (
    m.category ||
    m.bank?.category ||
    m.description.match(/Categoria Fideuram: (.+)/)?.[1]?.trim() ||
    "Da categorizzare"
  );
}
export function kindOf(m: Movement): MovementKind {
  if (m.movementKind) return m.movementKind;
  if (m.description === "Trasferimento interno" && !m.importId)
    return "transfer";
  // Un flusso contabile interno noto non è una spesa o un'entrata.
  if (m.performanceFlow !== undefined) return "transfer";
  const text = normalizeText(operationOf(m) + " " + categoryOf(m));
  if (/stipendi|stipendio|pensione/.test(text))
    return new Decimal(m.amount).gte(0) ? "income" : "expense";
  if (
    /bonifico|giroconto|ricarica|trasferimento|revolut|trade republic|bbva/.test(
      text,
    )
  )
    return "review";
  return new Decimal(m.amount).lt(0) ? "expense" : "income";
}
/** Ispirato ai suggerimenti di BauSplit: parole intere, migliori precedenti,
 * nessun suggerimento in caso di parità. Solo correzioni esplicite dello stesso conto. */
export function suggestClassification(
  operation: string,
  bankCategory: string,
  amount: string,
  account: string,
  history: Movement[],
  details = "",
) {
  const input = operation + " " + details;
  const words = tokens(input),
    text = normalizeText(input);
  let best = 0;
  let examples: Movement[] = [];
  for (const m of history.filter(
    (m) => m.assetId === account && m.categoryOrigin === "manual",
  )) {
    const previous = normalizeText(
        m.bank
          ? m.bank.operation + " " + m.bank.details
          : m.description.split("Categoria Fideuram:")[0],
      ),
      other = tokens(previous);
    const shared = words.filter((w) => other.includes(w)).length;
    const score =
      text === previous && words.length
        ? 3
        : shared >= 2 && shared === Math.min(words.length, other.length)
          ? 2
          : 0;
    if (!score || score < best) continue;
    if (score > best) {
      best = score;
      examples = [];
    }
    examples.push(m);
  }
  const votes = new Map<
    string,
    { category: string; movementKind: MovementKind; count: number }
  >();
  for (const m of examples) {
    const category = categoryOf(m),
      movementKind = kindOf(m),
      key = category + "|" + movementKind;
    const vote = votes.get(key);
    votes.set(key, { category, movementKind, count: (vote?.count || 0) + 1 });
  }
  const winner = [...votes.values()].find(
    (v) => v.count * 3 >= examples.length * 2,
  );
  if (winner)
    return {
      category: winner.category,
      movementKind: winner.movementKind,
      categoryOrigin: "history" as const,
    };
  const draft: Movement = {
    id: "",
    assetId: account,
    date: "",
    amount,
    currency: "EUR",
    description: operation,
    category: bankCategory || "Da categorizzare",
  };
  return {
    category: bankCategory || "Da categorizzare",
    movementKind: kindOf(draft),
    categoryOrigin: "bank" as const,
  };
}
export function movementSummary(movements: Movement[]) {
  let income = new Decimal(0),
    expense = new Decimal(0),
    transfers = 0,
    review = 0;
  const categories = new Map<string, Decimal>(),
    months = new Map<string, { income: Decimal; expense: Decimal }>();
  for (const m of movements) {
    const kind = kindOf(m),
      amount = new Decimal(m.amount),
      month = m.date.slice(0, 7);
    if (kind === "review") {
      review++;
      continue;
    }
    if (kind === "transfer") {
      transfers++;
      continue;
    }
    const entry = months.get(month) || {
      income: new Decimal(0),
      expense: new Decimal(0),
    };
    if (kind === "income") {
      income = income.add(amount);
      entry.income = entry.income.add(amount);
    } else {
      const cost = amount.neg();
      expense = expense.add(cost);
      entry.expense = entry.expense.add(cost);
      const cat = categoryOf(m);
      categories.set(cat, (categories.get(cat) || new Decimal(0)).add(cost));
    }
    months.set(month, entry);
  }
  return {
    income,
    expense,
    balance: income.sub(expense),
    transfers,
    review,
    categories: [...categories].sort((a, b) => b[1].cmp(a[1])),
    months: [...months].sort((a, b) => a[0].localeCompare(b[0])),
  };
}
