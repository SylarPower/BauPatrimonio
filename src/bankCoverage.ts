// Evidenze documentali consultate il 19 novembre 2026. Non indicano un conto collegato.
export const bankCoverage = [
  {
    name: "Fideuram",
    country: "Italia",
    account:
      "Percorso AIS documentato tramite CBI Globe; Enable Banking cita Fideuram in Italia.",
    transactions:
      "Movimenti di conto; disponibilità e profondità effettive da verificare con il conto e il consenso.",
    securities:
      "Dossier titoli e fondo pensione: nessuna copertura verificata nelle fonti consultate.",
    source:
      "https://psd2.intesasanpaolo.com/it/homepage/tpp-dedicated-interface-under-psd2.html",
    providerSource: "https://enablebanking.com/docs/markets/it/",
  },
  {
    name: "Trade Republic",
    country: "Clienti in Italia inclusi nella documentazione del provider",
    account:
      "API AIS ufficiale per conti di pagamento, saldi correnti e disponibili; integrazione Enable Banking documentata.",
    transactions:
      "Il provider segnala importo, valuta e data contabile, senza descrizioni (limite documentato ad agosto 2026, tutti i paesi).",
    securities:
      "Posizioni ETF, azioni e storico titoli: non documentati dalle API AIS consultate.",
    source:
      "https://assets.traderepublic.com/assets/files/TPP_API_Guide_v2.pdf",
    providerSource: "https://enablebanking.com/docs/markets/de/#trade-republic",
  },
];
export const coverageChecked = "19 novembre 2026";
export const personalProviderTerms = "https://enablebanking.com/terms/";
export const personalProviderActivation =
  "https://enablebanking.com/docs/api/linked-accounts/";
