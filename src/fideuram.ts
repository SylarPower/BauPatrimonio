import Decimal from "decimal.js";
import { suggestClassification } from "./movement-categories";
import {
  fingerprint,
  parseNumber,
  today,
  type Store,
  type Movement,
} from "./model";
export type Cell = string | number | boolean | Date | null;
export type BankRow = {
  row: number;
  date: string;
  amount: string;
  currency: string;
  operation: string;
  details: string;
  account: string;
  status: string;
  category: string;
  error: string;
};
export type BankPreview = BankRow & {
  id: string;
  doubt: boolean;
  action: "new" | "update" | "unchanged" | "excluded";
  matchId?: string;
  reason: string;
};
const headers = [
  "Data",
  "Operazione",
  "Dettagli",
  "Conto o carta",
  "Contabilizzazione",
  "Categoria",
  "Valuta",
  "Importo",
];
const norm = (v: Cell | undefined) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
function dateValue(value: Cell | undefined) {
  let date =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value ?? "").trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [d, m, y] = date.split("/");
    date = `${y}-${m}-${d}`;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > today()
  )
    throw Error("Data non valida o futura");
  return date;
}
export function parseFideuram(
  sheets: { sheet: string; data: Cell[][] }[],
): BankRow[] {
  const candidates = sheets.flatMap((s) => {
    const header = s.data
      .slice(0, 60)
      .findIndex((row) =>
        headers.every((h) => row.some((c) => norm(c) === norm(h))),
      );
    return header < 0 ? [] : [{ ...s, header }];
  });
  if (candidates.length !== 1)
    throw Error(
      candidates.length
        ? "Più fogli con movimenti: esporta un solo elenco per file."
        : "Formato Fideuram non riconosciuto: mancano le colonne della lista operazioni.",
    );
  const { data, header } = candidates[0];
  const columns = headers.map((h) => {
    const matches = data[header].flatMap((c, i) =>
      norm(c) === norm(h) ? [i] : [],
    );
    if (matches.length !== 1) throw Error("Intestazione duplicata nel file.");
    return matches[0];
  });
  if (data.length - header - 1 > 10000)
    throw Error("Troppi movimenti: massimo 10.000 righe per file.");
  return data.slice(header + 1).flatMap((cells, i) => {
    if (cells.every((c) => c === null || String(c).trim() === "")) return [];
    const values = columns.map((c) => cells[c]);
    const text = (i: number) => String(values[i] ?? "").trim();
    const result: BankRow = {
      row: header + i + 2,
      date: "",
      amount: "",
      operation: text(1),
      details: text(2),
      account: text(3),
      status: text(4),
      category: text(5),
      currency: text(6).toUpperCase(),
      error: "",
    };
    try {
      result.date = dateValue(values[0]);
      if (
        result.operation.length > 1000 ||
        result.account.length > 200 ||
        result.category.length > 100 ||
        result.status.length > 100
      )
        throw Error("Campo troppo lungo");
      if (!result.operation || !result.account)
        throw Error("Operazione o conto/carta mancanti");
      if (norm(result.status) !== "contabilizzato")
        throw Error("Movimento non contabilizzato: non importato");
      if (!["EUR", "USD", "GBP", "CHF", "JPY", "CAD"].includes(result.currency))
        throw Error("Valuta mancante o non supportata");
      // Celle numeriche OOXML lette come stringa dal parser per preservare i decimali.
      const raw = values[7];
      if (
        raw === null ||
        raw === undefined ||
        typeof raw === "boolean" ||
        raw instanceof Date ||
        String(raw).trim() === ""
      )
        throw Error("Importo mancante o non valido");
      result.amount = parseNumber(String(raw));
      if (new Decimal(result.amount).isZero())
        throw Error("Importo zero: verifica la riga");
      if (
        `${result.operation}\n${result.details}\nCategoria Fideuram: ${result.category}`
          .length > 2000
      )
        throw Error("Descrizione troppo lunga (massimo 2.000 caratteri)");
    } catch (err) {
      result.error = (err as Error).message;
    }
    return [result];
  });
}

export async function previewFideuram(
  rows: BankRow[],
  source: string,
  destination: string,
  store: Store,
  mode: "merge" | "replace" = "merge",
): Promise<BankPreview[]> {
  const target = store.assets.find(
    (a) => a.id === destination && !a.archivedAt && a.category === "cash",
  );
  if (!target)
    throw Error("Scegli una voce Liquidità attiva come destinazione.");
  const selected = rows.filter((r) => r.account === source);
  if (!source || !selected.length)
    throw Error("Scegli un conto o una carta del file.");
  const occurrences = new Map<string, number>(),
    amounts = new Set<string>();
  const output: BankPreview[] = [];
  for (const r of selected) {
    const key = JSON.stringify([
      destination,
      norm(r.account),
      r.date,
      r.amount,
      r.currency,
      norm(r.operation),
      norm(r.details),
    ]);
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    const legacyId = await fingerprint("fideuram-v1|" + key + "|" + occurrence);
    const id = legacyId;
    const candidates = store.movements.filter(
      (m) => m.assetId === destination && m.id === id,
    );
    let error = r.error;
    if (candidates.length > 1)
      error =
        "Più movimenti esistenti con la stessa identità: aggiornamento bloccato";
    const existing = candidates[0];
    const amountKey = JSON.stringify([r.date, r.amount, r.currency]);
    const sameAmount = amounts.has(amountKey);
    if (!r.error) amounts.add(amountKey);
    const description =
      `${r.operation}\n${r.details}\nCategoria Fideuram: ${r.category}`.trim();
    const unchanged =
      existing &&
      existing.date === r.date &&
      new Decimal(existing.amount).eq(r.amount || 0) &&
      existing.currency === r.currency &&
      existing.description === description;
    const action: BankPreview["action"] = error
      ? "excluded"
      : existing
        ? unchanged
          ? "unchanged"
          : "update"
        : "new";
    const doubt =
      !error &&
      !existing &&
      (occurrence > 0 ||
        sameAmount ||
        (mode === "merge" &&
          store.movements.some(
            (m) =>
              m.assetId === destination &&
              m.bank?.account === r.account &&
              norm(m.bank.operation) === norm(r.operation) &&
              norm(m.bank.details) === norm(r.details),
          )) ||
        (mode === "merge" &&
          store.movements.some(
            (m) =>
              m.assetId === destination &&
              m.date === r.date &&
              m.currency === r.currency &&
              new Decimal(m.amount).eq(r.amount),
          )));
    output.push({
      ...r,
      id,
      error,
      doubt,
      action,
      matchId: existing?.id,
      reason: existing
        ? "Stessi campi e contenuto della riga"
        : doubt
          ? "Somiglianza di data/importo o dettagli: nessun aggiornamento automatico. Se confermi sarà aggiunto un movimento distinto."
          : "Nessuna corrispondenza certa",
    });
  }
  return output;
}
export function fideuramMovement(
  row: BankPreview,
  destination: string,
  importId: string,
  history: Movement[] = [],
): Movement {
  const existing = history.find((m) => m.id === row.matchId);
  const classification =
    existing?.categoryOrigin === "manual"
      ? {
          category: existing.category,
          movementKind: existing.movementKind,
          categoryOrigin: "manual" as const,
        }
      : suggestClassification(
          row.operation,
          row.category,
          row.amount,
          destination,
          history,
          row.details,
        );
  return {
    ...existing,
    id: existing?.id || row.id,
    assetId: destination,
    date: row.date,
    amount: row.amount,
    currency: row.currency,
    description:
      `${row.operation}\n${row.details}\nCategoria Fideuram: ${row.category}`.trim(),
    importId,
    ...classification,
    bank: {
      provider: "fideuram",
      account: row.account,
      operation: row.operation,
      details: row.details,
      category: row.category,
      status: row.status,
    },
  };
}
export function applyFideuram(
  store: Store,
  preview: BankPreview[],
  destination: string,
  mode: "merge" | "replace",
  allow: boolean,
  importId: string,
) {
  const accepted = preview.filter((r) => !r.error && (!r.doubt || allow));
  if (!accepted.length)
    throw Error("Nessuna operazione valida. Nessun dato modificato.");
  if (mode === "replace" && preview.some((r) => r.error || (r.doubt && !allow)))
    throw Error(
      "Sostituzione bloccata: risolvi tutte le righe escluse o dubbie del conto. Nessun movimento cancellato.",
    );
  const next = structuredClone(store);
  if (mode === "replace")
    next.movements = next.movements.filter((m) => m.assetId !== destination);
  for (const row of accepted) {
    const index = next.movements.findIndex(
      (m) => m.id === (row.matchId || row.id),
    );
    if (mode === "merge" && row.action === "unchanged") continue;
    const movement = fideuramMovement(
      row,
      destination,
      importId,
      store.movements,
    );
    if (index < 0) next.movements.push(movement);
    else next.movements[index] = movement;
  }
  return next;
}
