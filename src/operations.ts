import Decimal from "decimal.js";
import { latest, today, uid, type Store } from "./model";
export type Operation = "buy" | "sell" | "repay";
export function recordOperation(
  s: Store,
  cashId: string,
  targetId: string,
  kind: Operation,
  principal: string,
  cost: string,
  date: string,
): Store {
  const cash = s.assets.find((a) => a.id === cashId),
    target = s.assets.find((a) => a.id === targetId);
  if (!cash || !target || cashId === targetId)
    throw Error("Scegli due voci diverse.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > today()
  )
    throw Error("Data non valida.");
  const n = new Decimal(principal),
    fee = new Decimal(cost);
  if (!n.isFinite() || !n.gt(0) || !fee.isFinite() || fee.lt(0))
    throw Error("Capitale positivo e costi/interessi non negativi.");
  if (cash.category !== "cash" || !new Decimal(cash.share).eq(100))
    throw Error("Scegli liquidità di tua completa proprietà.");
  if (target.category !== (kind === "repay" ? "debt" : "investment"))
    throw Error("Categoria di destinazione non compatibile.");
  for (const a of [cash, target]) {
    if (a.archivedAt || latest(a, date)?.currency !== "EUR")
      throw Error("Servono voci attive con rilevazione EUR.");
    if (a.valuations.some((v) => v.date > date))
      throw Error("Usa una data uguale o successiva all’ultima rilevazione.");
  }
  const cashDelta = kind === "sell" ? n.sub(fee) : n.add(fee).neg();
  const targetDelta = n
    .mul(100)
    .div(target.share)
    .mul(kind === "buy" ? 1 : -1);
  const cb = new Decimal(latest(cash, date)!.amount).add(cashDelta),
    tb = new Decimal(latest(target, date)!.amount).add(targetDelta);
  if (cb.lt(0) || tb.lt(0))
    throw Error("Il capitale supera il saldo o la posizione residua.");
  const description =
    kind === "repay"
      ? "Rimborso capitale e interessi"
      : kind === "buy"
        ? "Acquisto investimento già eseguito"
        : "Vendita investimento già eseguita";
  return {
    ...s,
    assets: s.assets.map((a) =>
      a.id === cashId || a.id === targetId
        ? {
            ...a,
            valuations: [
              ...a.valuations,
              {
                id: uid(),
                date,
                amount: (a.id === cashId ? cb : tb).toString(),
                currency: "EUR",
                source: "Manuale",
                note: `${description} · capitale di tua competenza ${n.toString()} EUR · ${kind === "repay" ? "interessi" : "costi"} ${fee.toString()} EUR. Nuovo valore aggregato.`,
              },
            ],
          }
        : a,
    ),
    movements: [
      ...s.movements,
      ...[cashId, targetId].map((id) => ({
        id: uid(),
        assetId: id,
        date,
        amount: (id === cashId ? cashDelta : targetDelta).toString(),
        currency: "EUR",
        description,
        ...(id === targetId && kind !== "repay"
          ? {
              performanceFlow: (kind === "buy"
                ? n.add(fee)
                : n.sub(fee).neg()
              ).toString(),
            }
          : {}),
      })),
    ],
  };
}
