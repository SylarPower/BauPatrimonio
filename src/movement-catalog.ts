import type { Movement } from "./model";
import { categoryOf } from "./movement-categories";
export const defaultMovementCategories = [
  "Da categorizzare",
  "Alimentari",
  "Ristoranti e bar",
  "Casa",
  "Utenze",
  "Trasporti",
  "Auto",
  "Salute",
  "Shopping",
  "Abbigliamento",
  "Tempo libero",
  "Viaggi",
  "Abbonamenti",
  "Famiglia",
  "Animali",
  "Istruzione",
  "Regali",
  "Imposte e commissioni",
  "Stipendio e pensione",
  "Interessi e dividendi",
  "Rimborsi",
  "Trasferimenti",
  "Altro",
];
/** Preserve bank and legacy labels; opening the menu never reclassifies history. */
export function movementCatalog(movements: Movement[]) {
  return [
    ...new Set([...defaultMovementCategories, ...movements.map(categoryOf)]),
  ].sort((a, b) => a.localeCompare(b, "it"));
}
