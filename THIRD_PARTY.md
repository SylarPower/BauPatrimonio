# Componenti e licenze

- DM Sans e Newsreader: font distribuiti localmente dai pacchetti @fontsource, SIL Open Font License 1.1. Copie delle licenze in `public/licenses/`, incluse nella build.
- Lucide: icone lineari, licenza ISC del pacchetto lucide-react.
- React, Vite, TypeScript, Decimal.js e Papa Parse: componenti distribuiti con le rispettive licenze nei pacchetti npm. Le dipendenze e versioni esatte sono elencate nel lockfile.

Non sono usati servizi di rendering grafici o font a pagamento. Questo elenco non modifica le licenze originali dei componenti.

- read-excel-file e fflate: lettura locale XLSX e controllo archivio ZIP, licenza MIT. write-excel-file (MIT) è usato solo nei test per generare esempi sintetici, non incluso nel client.

## TradingView (servizio esterno opzionale)

Widget Advanced Chart ospitato da TradingView, configurazione secondo la documentazione ufficiale:
https://www.tradingview.com/widget-docs/widgets/charts/legacy-advanced-chart/
https://www.tradingview.com/widget-docs/tutorials/iframe/build-page/widget-integration/

Non viene incorporato codice del fornitore nel bundle: lo script remoto viene caricato solo su richiesta in un iframe sandbox a origine opaca, con attribuzione TradingView visibile. Nessun account del provider attivato, nessun contratto accettato o servizio acquistato. Dati e copertura sono soggetti ai termini del fornitore e dei mercati; nessuna redistribuzione, memorizzazione o API prezzi propria. Non si garantisce accesso realtime o copertura di ogni titolo/ETF.
