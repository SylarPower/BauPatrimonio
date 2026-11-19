# BauPatrimonio — app web gratuita

Taccuino personale del patrimonio, in italiano: **quanto possiedo, quanto devo e cosa è cambiato**. React 19, TypeScript, Vite, PWA, font locali e Decimal.js. Non dispone pagamenti e non invia ordini di investimento.

## Zero abbonamenti, nessun servizio obbligatorio

La versione standard non usa Supabase ospitato, servizi bancari, API a pagamento, account, analytics o font remoti. È stato rimosso il client cloud dall'app: non basta aggiungere una variabile d'ambiente per inviare dati a un server. Dati e importazioni restano nel browser, in IndexedDB. In localStorage ci sono solo preferenze non finanziarie.

**Telefono e computer hanno archivi indipendenti.** Il trasferimento gratuito dei dati avviene tramite backup JSON e ripristino, non tramite una sincronizzazione promessa ma inesistente. Non serve una carta di credito. I costi del proprio computer/rete non sono un servizio dell'app.

➡ **Guida utente passo passo:** apri `public/GUIDA.html` oppure **Profilo → Guida passo passo** nell'app. È disponibile anche offline nella build di produzione.

## Uso online: nessuna installazione di Node.js

**Pubblicazione preparata, non ancora attiva:** il tentativo API di attivare Pages ha restituito `403 Resource not accessible by integration`. Serve un solo intervento del proprietario: apri [Settings → Pages](https://github.com/SylarPower/BauPatrimonio/settings/pages), scegli **Deploy from a branch → arena/dcc936f9-baupatrimonio → /docs → Save**. Nessun Node.js e nessun workflow da creare. Dopo il deployment apri **https://sylarpower.github.io/BauPatrimonio/**. Il codice e i dati di esempio sono pubblici, i tuoi dati personali restano nel browser. Apri la guida da **Profilo → Guida passo passo**. Su Chrome puoi installare l’app; su Safari usa Condividi → Aggiungi alla schermata Home. Dopo la prima apertura completa funziona anche offline.

### Pubblicazione per il manutentore

La build statica è in `docs/`, generata con `npm run prepare:pages`; il manifesto `.pages-files.json` permette di aggiornare soltanto gli artefatti senza cancellare la documentazione sorgente. Nessun workflow privilegiato è necessario. La configurazione Pages da selezionare è **Deploy from a branch → arena/dcc936f9-baupatrimonio → /docs** per questa pubblicazione; dopo un eventuale merge si può scegliere `main /docs`. Questo non pubblica il database locale o backup.

I comandi Node sono esclusivamente per chi sviluppa/manutiene, non per chi usa l’app:

```sh
npm ci
npm run dev             # sviluppo
npm run prepare:pages   # genera docs/ con base /BauPatrimonio/
```

Il modello Actions in `docs/pages-workflow.yml.example` resta un’alternativa facoltativa non installata: la connessione non ha permessi di modifica dei workflow. Non attivare piani a pagamento, runner speciali o upgrade. Lo stato effettivo della pubblicazione va verificato nella pagina Settings → Pages, non dedotto dalla presenza dei file.

## Funziona subito

- Copertina, archivio personale vuoto e demo **separata**, quattro sezioni, Chiaro/AMOLED ricordato prima del rendering, barra mobile, modali con focus trap.
- Tutte le categorie principali, quote indipendenti per beni e debiti, pensione distinta dalla liquidità, categoria personalizzata/natura delle altre attività.
- Primo conto in pochi campi: nome, saldo, valuta, data. Disponibilità e vincoli informativi non si sommano al saldo contabile. Valore sconosciuto inseribile esplicitamente e segnalato come mancante, mai presunto zero.
- Rilevazioni datate/versionate, originali e cambi verso EUR con fonte/data, storico, confronti per data, archiviazione senza cancellare il passato.
- Dossier aggregato oppure strumenti con ISIN facoltativo, quantità e prezzi decimali, fonte/data. Conferma di riconciliazione: il dettaglio **sostituisce** l'aggregato.
- Registrazione contabile di trasferimenti, acquisti/vendite **già eseguiti** e rimborsi capitale, con costi/interessi separati e applicazione della quota del dossier/debito. Operazioni abbinate limitate a EUR, con conto di liquidità al 100%.
- CSV saldi, posizioni e movimenti con mapping, separatori, importi/date italiani, anteprima, errori, duplicati e conferma dei casi ambigui. Gli strumenti sono conservati se sono abbinate descrizione/nome, quantità e prezzo; senza questi campi si conserva il totale per data.
- Privacy visiva, CSV riepilogo, backup/ripristino JSON validato, eliminazione con conferma testuale.
- PWA con manifest/icone e precache versionata di soli file statici. Nessuna risposta finanziaria privata, file importato o token nel service worker.

## Insight: più formati, non più rumore

Due visualizzazioni principali e un approfondimento espandibile, non dieci grafici in competizione.

### Andamento

- **Gradini** (predefinito), **Linee** oppure **Colonne**.
- Patrimonio netto oppure **Attività e debiti** come serie distinte.
- Periodi 1M, 3M, 6M, 1A, Tutto, distanze sull'asse X proporzionali alle **date effettive**.
- Un solo dato rimane un punto; nessun riempimento giornaliero o curva inventata. I gradini riportano il valore noto fino alla successiva rilevazione; le linee sono dichiarate guide visive, non quotazioni intermedie.
- Punti parziali vuoti/non collegati, dettaglio delle voci mancanti. Tocca o usa Tab e frecce/Home/End. Readout persistente e tabella alternativa.

### Composizione

- **Anello**, **Barre**, **Tabella**.
- Raggruppamento per categoria, istituto o natura/liquidabilità.
- Quote applicate, debiti esclusi dal denominatore attività, importi e percentuali su attività **note**. Previdenza sempre distinta dal denaro disponibile.

### Confronto e qualità

- **Cascata**, **Variazioni per voce**, **Tabella** tra date scelte.
- La cascata non viene disegnata se i dati di una delle date sono parziali. Non trasformiamo un valore sconosciuto in una variazione negativa/positiva.
- Nei portafogli grandi, la cascata mostra le sette variazioni più grandi e aggrega le altre; tabella e CSV mantengono tutto il dettaglio.
- Copertura dei dati, rilevazioni oltre 90 giorni, rapporto debiti/attività con limitazioni esplicite. Il rapporto non è consulenza né una misura della sostenibilità delle rate.
- **SVG** vettoriale, **PNG** 2×, **CSV** dei dati. Colori coerenti con il tema corrente, legenda/etichette per leggere il file esportato. In modalità Tabella si esporta CSV; quando gli importi sono nascosti nessun export dell'insight è disponibile.

Per provare tutte le viste: demo → **Prova i grafici con sei mesi di storico dimostrativo**. È un'azione opt-in nell'archivio demo, chiaramente fittizio; non inventa lo storico del patrimonio personale. I totali attuali restano quelli dello scenario richiesto.

## Regole contabili e limiti

- Attività di competenza − capitale residuo di competenza. La quota della casa non imposta quella del mutuo.
- Demo: conto 12.000, liquidità broker 2.000, ETF 8.000, pensione 20.000, casa 240.000 × 50%, auto 10.000, mutuo 120.000 × 50% → **attività 172.000, debiti 60.000, netto 112.000 EUR**.
- Trasferire 1.000 tra conto e broker non cambia il netto. Acquistare un ETF a prezzi invariati non crea patrimonio; commissioni e interessi lo riducono. Il rimborso del solo capitale riduce sia conto sia debito.
- Rilevazione valida: ultima non successiva alla data scelta. Nuove stime non riscrivono il mese precedente. Versioni nella stessa data: vale l'ultima inserita, le precedenti restano nel registro. Non è uno storico intragiornaliero.
- Importi, quantità e cambi sono stringhe decimali, calcoli con Decimal.js a precisione 40. Conversioni conservano il verso **EUR per 1 unità originale**, data e fonte. Un cambio non può avere data successiva alla rilevazione.
- Senza valore/cambio: **Totale parziale**, voci mancanti elencate. Prima della prima rilevazione non si assume zero.
- Archiviare una voce termina il contributo da quella data, non cancella lo storico e non inventa la liquidità di una vendita.
- Movimenti CSV non modificano automaticamente le valutazioni. Un saldo non è un versamento. Contributi pensionistici, TFR, disponibilità e prezzo d'acquisto sono informativi, non attività aggiuntive.
- Il dettaglio di un dossier riconcilia il suo aggregato. Il raggruppamento per istituto non scopre se l'utente registra due volte lo stesso bene in voci diverse: non aggiungere «broker totale» insieme alle sue sottovoci.
- **Riferimento EUR** in questa versione; originali EUR/USD/GBP/CHF/JPY/CAD con cambio manuale. Non ancora selezionabile una diversa valuta di riferimento.
- Nessun rendimento TWR/IRR, prezzo/cambio live, attribuzione automatica separata di mercato/cambi/flussi, PDF/XLSX, piano di ammortamento, rate automatiche o pagamenti/ordini. I collegamenti tra beni e finanziamenti sono informativi.
- Strumenti nella stessa valuta del dossier; una registrazione contabile di acquisto/vendita crea una nuova rilevazione aggregata. Riconcilia il dettaglio strumenti se lo aggiorni in seguito.

## File CSV e idempotenza

Esempi in `public/examples/`, scaricabili da Fonti e dalla guida. **Sono tracciati BauPatrimonio, non formati ufficiali delle banche.**

- Crea prima la voce destinataria; scegli saldi/posizioni oppure movimenti.
- File UTF-8 fino a 2 MB, data `AAAA-MM-GG` o `GG/MM/AAAA`, importi `1.234,56` oppure `1234.56`, valuta opzionale EUR. Con separatore virgola, racchiudi normalmente i decimali con virgola tra virgolette CSV. Un punto isolato è decimale, non separatore delle migliaia.
- Per i debiti usa capitale residuo positivo; un conto scoperto va rappresentato come passività. Le posizioni vanno in una voce Investimenti; non includere totali insieme ai componenti.
- Se mappi quantità e prezzo, `quantità × prezzo` deve riconciliare l'eventuale importo della riga entro mezzo centesimo; altrimenti la riga è esclusa. Valute diverse nello stesso gruppo/data non vengono sommate senza cambio.
- Lo stesso contenuto/conto/percorso è riconosciuto con SHA-256. Con ID operazione, identità conto + percorso + ID, anche su file diversi.
- Senza ID, identità file + numero riga. Due operazioni legittime con stessa data/importo **non** vengono collassate; i casi dubbi sono esclusi finché l'utente non conferma esplicitamente che sono distinti.
- Rilevazioni già presenti alla stessa data non vengono sovrascritte dal CSV. Aggiornale dal dettaglio con una nuova versione consapevole.
- Non è una deduplicazione bancaria universale: file modificati arbitrariamente o esportazioni parzialmente sovrapposte richiedono verifica dell'anteprima. Il file originale non viene conservato, solo dati confermati e registro importazione.
- Valuta estera senza cambio → totale parziale; registra dal dettaglio la valutazione con il cambio pertinente.

## Banche e sandbox: stato effettivo

**Nessun connettore bancario è attivo o testato in sandbox.** Verifica documentale aggiornata al 19 novembre 2026: Fideuram dispone di un percorso AIS tramite CBI Globe ed è citata nella documentazione Enable Banking per l’Italia. Trade Republic documenta conti, saldi e movimenti e il provider include clienti italiani; i movimenti risultano limitati a importo, valuta e data, senza descrizioni. **Le posizioni titoli/ETF e la previdenza non risultano coperte dalle API AIS consultate.**

I termini Enable Banking prevedono uso gratuito personale limitato ai propri Linked Accounts, modalità restricted. Richiede registrazione personale, app, consensi e un backend riservato per la chiave privata: GitHub Pages da solo non può sincronizzare le banche. Non sono stati attivati conti o servizi, accettati contratti o acquistati abbonamenti. Fonti, limiti, condizioni e passi mancanti in [`docs/COLLEGAMENTI.md`](docs/COLLEGAMENTI.md), anche nell’interfaccia Fonti.

## Architettura e riservatezza

Frontend locale pubblico, nessuna operazione riservata lato browser e nessun segreto nel bundle. Non esiste una sincronizzazione silenziosa remota. La separazione locale è tra archivio demo e personale, **non** tra persone che condividono lo stesso profilo del browser.

Sono conservati `supabase/migrations/202611190001_initial.sql` e `supabase/tests/isolation.sql` come **schema opzionale per futuri sviluppi server/self-hosted**, non necessari né collegati alla versione standard. Una riga JSONB per proprietario, revisioni, RLS e RPC atomica SECURITY INVOKER. Importi come stringhe decimali. Area privata per eventuali connettori, senza grant browser. Il campo token cifrato non è un'implementazione di un provider o della cifratura AEAD: nessun token esistente. La migrazione è stata eseguita e testata su PostgreSQL embedded con due identità. Non è stato creato un progetto Supabase remoto.

Se un futuro gestore decide di sviluppare un backend, dovrà separare frontend pubblico, credenziali server, RLS e funzioni di consenso/callback/sync; **non** inserire `service_role` o token in `VITE_*`. Non devi farlo per usare questa versione gratuita.

La PWA cache-a esclusivamente file statici di build, guida e CSV di esempio; gli archivi finanziari sono dati applicativi espliciti IndexedDB, non cache HTTP. Le cache di altre app sullo stesso dominio non vengono eliminate. Percorso/base e hash del contenuto versionano la shell offline.

Header consigliati per hosting sotto il tuo controllo: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Nessun estratto conto o backup deve essere pubblico. Non certificato WCAG, non verificato con dispositivi fisici o lettore di schermo reale; sono implementati etichette, focus, controlli di tastiera, importi non espressi soltanto dal colore e alternative tabellari.

## Backup ed eliminazione, manualmente

1. Profilo → **Scarica backup strutturato**. JSON contiene dati finanziari in chiaro: conservalo in un luogo privato.
2. Trasferiscilo tra i tuoi dispositivi tramite un mezzo sotto il tuo controllo.
3. Sul destinatario entra nello stesso tipo di archivio → **Ripristina backup JSON** → conferma sostituzione. Nessuna fusione automatica: conserva prima un backup della copia che stai sostituendo.
4. Per eliminare l'archivio attuale: Profilo → **Elimina dati** → scrivi `ELIMINA`. Non modifica l'altro archivio. Eventuali backup devono essere eliminati separatamente. Nessuna promessa di cancellazione forense da dischi/backup.

## Test eseguiti e riproducibili, senza servizi

```sh
npm test                     # contabilità, insight, operazioni e validazione backup
npm run test:db              # PostgreSQL/PGlite, RLS tra due utenti (nessun server remoto)
npm run build
npx playwright install --with-deps chromium
BAU_TEST_PRODUCTION=1 npm run test:e2e
npm audit
```

Fallback Linux senza CDN browser:

```sh
BAU_TEST_PRODUCTION=1 BAU_USE_PACKAGED_CHROMIUM=1 npm run test:e2e
```

I test coprono demo 112k, primo conto e reload, nuove stime storiche, trasferimento, acquisto/vendita, capitale/interessi, archiviazione, dati mancanti/cambi, reimportazione, import strumenti, navigazione e insight in tutti i formati a **320, 390 e 1440 px** in Chiaro e AMOLED; tastiera, grafici parziali, export SVG/PNG/CSV, privacy ed esecuzione offline di produzione. Screenshot e download di test in `test-results/` ignorati da Git. Nessuna CI automatica su push/PR: per evitare consumo di servizi non richiesti i test si eseguono localmente. L'unico modello di workflow è il deploy Pages **opt-in**, da aggiungere manualmente con i propri permessi GitHub.

## Struttura principale

```text
src/App.tsx               sezioni, modali e archivio
src/model.ts              rilevazioni, precisione, quote, demo e trasferimenti
src/insights-model.ts      serie temporali, composizione, confronto e qualità
src/Insights.tsx           visualizzazioni accessibili e formati alternativi
src/chart-export.ts       SVG/PNG locali, nessun servizio di rendering
src/operations.ts          registrazioni abbinate, capitale e costi/interessi
src/Importer.tsx           CSV e strumenti con riconciliazione
src/Portfolio.tsx          strumenti manuali e riconciliazione dossier
src/validation.ts          validazione backup
public/GUIDA.html          istruzioni utente offline
scripts/build-sw.mjs      precache statica con percorso e hash di contenuto
supabase/                 schema server opzionale, non collegato al frontend
```
