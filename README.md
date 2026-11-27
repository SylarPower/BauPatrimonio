# BauPatrimonio — app web gratuita

Taccuino personale del patrimonio, in italiano: **quanto possiedo, quanto devo e cosa è cambiato**. React 19, TypeScript, Vite, PWA, font locali e Decimal.js. Non dispone pagamenti e non invia ordini di investimento.

## Zero abbonamenti, nessun servizio obbligatorio

Il patrimonio personale è **online-first**: accesso email/password, lettura automatica da Cloud Firestore e salvataggio automatico con revisioni atomiche. I parametri web pubblici Firebase sono configurati in `src/cloud-config.ts`; l’utente non deve copiarli, scegliere un archivio o attivare il cloud. Nessun analytics, font remoto, servizio a pagamento o chiave privilegiata nel client.

La demo resta separata in IndexedDB e funziona offline. Il patrimonio personale corrente e la sessione Auth restano soltanto in memoria durante l’uso, mentre il documento persistente è nel database Firestore privato. Nessun nuovo archivio personale viene scritto in IndexedDB. A ogni ricaricamento occorre accedere: i token non sono persistiti. Gli archivi locali delle vecchie versioni non vengono cancellati né caricati automaticamente su un account.

**Computer e telefono:** accedi con lo stesso account e l’app carica il medesimo documento remoto. Non è sincronizzazione realtime: «Aggiorna dati online» rilegge i cambiamenti dell’altro dispositivo. Un conflitto blocca le scritture; un errore non viene mostrato come successo. Niente upgrade o acquisti effettuati.

➡ **Guida utente passo passo:** apri `public/GUIDA.html` oppure **Profilo → Guida passo passo** nell'app. È disponibile anche offline nella build di produzione.

## Uso online: nessuna installazione di Node.js

**GitHub Pages attivo**, verificato tramite API GitHub il 19 novembre 2026 (`status: built`, branch corrente `/docs`). Apri **https://sylarpower.github.io/BauPatrimonio/**. I nuovi push aggiornano il sito dopo il completamento del build Pages. Il codice e i dati di esempio sono pubblici, i tuoi dati personali non vengono pubblicati nel repository: sono nel tuo archivio Firestore privato, non pubblicati su GitHub. Apri la guida da **Profilo → Guida passo passo**. Su Chrome puoi installare l’app; su Safari usa Condividi → Aggiungi alla schermata Home. La demo e la guida funzionano anche offline dopo il primo caricamento; il patrimonio personale richiede accesso online.

### Pubblicazione per il manutentore

La build statica è in `docs/`, generata con `npm run prepare:pages`; il manifesto `.pages-files.json` permette di aggiornare soltanto gli artefatti senza cancellare la documentazione sorgente. Nessun workflow privilegiato è necessario. La configurazione Pages da selezionare è **Deploy from a branch → main → /docs** dopo il merge approvato. Questo non pubblica il database locale o backup.

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
- Importazione Excel Fideuram con anteprima, aggiunta/aggiornamento e sostituzione limitata al conto scelto.
- Privacy visiva, CSV riepilogo, backup/ripristino JSON validato, eliminazione con conferma testuale.
- PWA con manifest/icone e precache versionata di soli file statici. Nessuna risposta finanziaria privata, file importato o token nel service worker.

## Struttura: quattro sezioni, un compito ciascuna

- **Panoramica**: totale e grafici; filtro Tutto il patrimonio / Investimenti. Prima i grafici, poi il rendimento degli investimenti. «Confronto e qualità dei dati» resta chiuso finché serve.
- **Patrimonio**: gestione delle voci e delle operazioni già eseguite.
- **Storico**: valutazioni del patrimonio e confronto tra date, senza duplicare le operazioni di Movimenti.
- **Movimenti**: registro ricercabile, categorie, entrate e spese; importazione Excel Fideuram.

Il Profilo raccoglie aspetto, accesso e gestione/esportazione dei dati personali. Nessun export dei grafici o nuovo livello di navigazione.

## Insight: più formati, non più rumore

Due visualizzazioni principali e un approfondimento espandibile, non dieci grafici in competizione.

### Investimenti e rendimento

Selettore **Tutto il patrimonio / Investimenti**. Il filtro riguarda tutti i grafici, confronti e qualità senza duplicare dettagli del dossier. Investimenti aggregati, esclusi pensione e liquidità. Il patrimonio totale nella scheda principale resta distinto e non viene filtrato.

Il pannello rendimento usa **Modified Dietz**, non annualizzato: risultato = finale − iniziale − flussi netti; percentuale sul capitale ponderato per giorni, flussi a fine giornata. Solo quota posseduta e flussi EUR. Richiede valutazioni esatte nelle due date, movimenti classificati e conferma esplicita dell’utente sulla completezza. Non è un rendimento certificato/fiscale o una semplice variazione del patrimonio. Acquisti/vendite nuovi includono i costi; movimenti storici/importati richiedono classificazione. I proventi distribuiti fuori dagli investimenti sono uscite negative; fra investimenti i flussi netti si compensano. Cambi di proprietà non registrati invalidano la conferma. Date/valori mancanti o archiviazioni nel periodo bloccano il calcolo; capitale ponderato non positivo non produce una percentuale. I flussi aggiunti a questo scopo non cambiano i saldi e sono correggibili.

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
- Nei portafogli grandi, la cascata mostra le sette variazioni più grandi e aggrega le altre; la tabella mantiene tutto il dettaglio.
- Copertura dei dati, rilevazioni oltre 90 giorni, rapporto debiti/attività con limitazioni esplicite. Il rapporto non è consulenza né una misura della sostenibilità delle rate.
- Nessuna esportazione dai grafici (SVG, PNG o CSV). Le tabelle restano consultabili nell’app; backup JSON e riepilogo personale CSV sono nel Profilo, separati dagli insight.

Per provare tutte le viste: demo → **Prova i grafici con sei mesi di storico dimostrativo**. È un'azione opt-in nell'archivio demo, chiaramente fittizio; non inventa lo storico del patrimonio personale. I totali attuali restano quelli dello scenario richiesto.

## Regole contabili e limiti

- Attività di competenza − capitale residuo di competenza. La quota della casa non imposta quella del mutuo.
- Demo: conto 12.000, liquidità broker 2.000, ETF 8.000, pensione 20.000, casa 240.000 × 50%, auto 10.000, mutuo 120.000 × 50% → **attività 172.000, debiti 60.000, netto 112.000 EUR**.
- Trasferire 1.000 tra conto e broker non cambia il netto. Acquistare un ETF a prezzi invariati non crea patrimonio; commissioni e interessi lo riducono. Il rimborso del solo capitale riduce sia conto sia debito.
- Rilevazione valida: ultima non successiva alla data scelta. Nuove stime non riscrivono il mese precedente. Versioni nella stessa data: vale l'ultima inserita, le precedenti restano nel registro. Non è uno storico intragiornaliero.
- Importi, quantità e cambi sono stringhe decimali, calcoli con Decimal.js a precisione 40. Conversioni conservano il verso **EUR per 1 unità originale**, data e fonte. Un cambio non può avere data successiva alla rilevazione.
- Senza valore/cambio: **Totale parziale**, voci mancanti elencate. Prima della prima rilevazione non si assume zero.
- Archiviare una voce termina il contributo da quella data, non cancella lo storico e non inventa la liquidità di una vendita.
- Movimenti importati non modificano automaticamente le valutazioni. Un saldo non è un versamento. Contributi pensionistici, TFR, disponibilità e prezzo d'acquisto sono informativi, non attività aggiuntive.
- Il dettaglio di un dossier riconcilia il suo aggregato. Il raggruppamento per istituto non scopre se l'utente registra due volte lo stesso bene in voci diverse: non aggiungere «broker totale» insieme alle sue sottovoci.
- **Riferimento EUR** in questa versione; originali EUR/USD/GBP/CHF/JPY/CAD con cambio manuale. Non ancora selezionabile una diversa valuta di riferimento.
- Nessun rendimento TWR/IRR, prezzo/cambio live, attribuzione automatica separata di mercato/cambi/flussi, PDF/XLSX, piano di ammortamento, rate automatiche o pagamenti/ordini. I collegamenti tra beni e finanziamenti sono informativi.
- Strumenti nella stessa valuta del dossier; una registrazione contabile di acquisto/vendita crea una nuova rilevazione aggregata. Riconcilia il dettaglio strumenti se lo aggiorni in seguito.

## Movimenti ed Excel Fideuram

**Movimenti → Importa Excel Fideuram** è l’unico importatore di operazioni. Non ci sono import CSV di saldi/posizioni/movimenti né sezioni di collegamento bancario. Saldi e strumenti si registrano da Patrimonio; il ripristino JSON completo resta nel Profilo.

- `.xlsx` lista operazioni, massimo 2 MB, ZIP espanso massimo 12 MB/200 elementi e 10.000 righe. Parsing locale, nessuna macro/formula eseguita, nessun originale conservato. Colonne Data, Operazione, Dettagli, Conto o carta, Contabilizzazione, Categoria, Valuta, Importo. Struttura desunta dall’esempio privato: nessun dato personale nei test o nel repository.
- Scegli un conto/carta nel file e una voce Liquidità attiva di destinazione. Ogni sorgente si importa separatamente; attenzione alla sovrapposizione tra carta e conto.
- **Aggiungi e aggiorna**: anteprima nuovi, invariati, aggiornamenti certi, esclusi e possibili duplicati. Identità composta da destinazione, conto sorgente, data, importo, valuta, operazione, dettagli e occorrenza. La categoria della banca non fa parte dell’identità: può essere aggiornata senza duplicare. Le correzioni manuali restano prioritarie.
- Non c’è un ID transazione verificato nel file. Numeri nel testo, mandati e descrizione da sola NON sono identificatori. Modifiche a data/importo/dettagli non autorizzano sovrascritture: le somiglianze segnalate richiedono verifica e l’eventuale conferma aggiunge un’operazione distinta. Non è una deduplicazione bancaria universale.
- **Sostituisci**: elimina TUTTI i movimenti della sola voce di destinazione, inclusi manuali e fuori periodo, e carica quelli del conto/carta selezionato nel file. Occorre scrivere il nome della voce. Righe escluse o dubbi non confermati bloccano l’intera sostituzione: nessuna cancellazione parziale. Nessun annullamento automatico.
- Solo operazioni contabilizzate e date/importi/valute validi. Nessuno zero inventato. Importi firmati dalla colonna, non dal testo dei pagamenti esteri. Movimenti non cambiano saldi, valutazioni, cambi o flussi di rendimento.
- Ricerca, conto, tipo, categoria, intervallo e valuta; pagine da 40 movimenti. Entrate, spese nette, differenza, categorie e mesi seguono tutti i filtri. Importi nominali separati per valuta, non ponderati per possesso.
- Categorie iniziali della banca, suggerimenti dalle correzioni manuali dello stesso conto con parole intere e maggioranza di almeno 2/3; astensione nei casi incerti (ispirato a BauSplit). Bonifici/ricariche restano da verificare; trasferimenti e righe da verificare sono esclusi da entrate/spese. Tipo e categoria si correggono nel registro; la categoria si sceglie da un menu a discesa e si salva subito.

## Azioni ed ETF: mercato e prezzi personali

In **Patrimonio → Azioni ed ETF · prezzi** scegli uno strumento dei dossier registrati. La serie personale mostra prezzi unitari, data, valuta e fonte, grafico e variazione primo/ultimo prezzo nella medesima valuta. I punti del grafico sono equidistanti per rilevazione; non è una serie giornaliera né un rendimento, e non include dividendi, flussi o cambi. Nessuna conversione o dato mancante inventato.

Il grafico online usa il [widget ufficiale TradingView](https://www.tradingview.com/widget-docs/widgets/charts/legacy-advanced-chart/) in un iframe sandbox senza accesso al documento/app/archivio, solo dopo **Carica grafico online**. Inserisci BORSA:SIMBOLO (es. NASDAQ:AAPL), verifica identità, borsa e valuta: l’ISIN non viene associato automaticamente. Sono disponibili ricerca e storico del fornitore; copertura, ritardi e disponibilità dipendono dal mercato. Nessuna chiave API o servizio a pagamento configurato. Il fornitore riceve IP e simbolo scelto, mai saldi, quantità o operazioni. Chiusura rimuove il widget; collegamento esterno sempre disponibile. Nessuna quotazione aggiorna il patrimonio o viene salvata nell’archivio/cache applicativa. Le reti esterne possono essere bloccate da browser o policy: non si dichiara il caricamento del frame come prova di disponibilità dei dati.

## Architettura e riservatezza

Frontend statico pubblico + Firebase Authentication email/password e Cloud Firestore, progetto dedicato `baupatrimonio-b99c3`. Configurazione pubblica in `src/cloud-config.ts`. API REST ufficiali, nessun analytics, SDK persistente, Cloud Functions o Cloud Storage. Sessione e refresh token solo in memoria, richieste no-store, nessun accesso al vecchio progetto Supabase dal client.

Ogni account confermato legge solo `vaults/{uid}`. Il documento contiene payload JSON e revisione; il commit usa precondizione `updateTime` (oppure `exists:false` alla creazione), revisioni crescenti e coda di scritture. Regole in `firestore.rules`: proprietario autenticato con email verificata, divieto elenco/cancellazione, campi limitati, nessun altro percorso accessibile. Limite applicativo 900 KB di payload per restare sotto il limite documento Firestore. Non è cifratura end-to-end: l’amministratore Firebase mantiene accesso amministrativo.

Un primo accesso inizializza solo un archivio vuoto, mai la demo o dati locali. Account, password e archivi Supabase NON vengono migrati automaticamente: creare un nuovo account Firebase e, se necessario, importare esplicitamente il proprio backup dal Profilo dopo aver verificato l’account di destinazione. Il vecchio progetto non viene modificato o cancellato.

**Rilascio bloccato finché non sono pubblicate le regole:** seguire [FIREBASE_SETUP.md](./FIREBASE_SETUP.md). Nessuna autorizzazione amministrativa Firebase è disponibile all’agente. I test Auth/Firestore del browser sono simulati e non attestano consegna email, configurazione reale o isolamento di produzione. I test delle regole richiedono Firestore Emulator; non confonderli con i test storici PostgreSQL. Usare solo Spark, nessuna fatturazione/upgrade: raggiunte le quote il servizio può rifiutare richieste; non esiste fallback a scritture locali dichiarate online. Il backend bancario non è implementato.

## Backup ed eliminazione, manualmente

1. Profilo → **Scarica backup strutturato**. JSON contiene dati finanziari in chiaro: conservalo in un luogo privato.
2. Trasferiscilo tra i tuoi dispositivi tramite un mezzo sotto il tuo controllo.
3. Sul destinatario entra nello stesso tipo di archivio → **Ripristina backup JSON** → conferma sostituzione. Nessuna fusione automatica: conserva prima un backup della copia che stai sostituendo.
4. Nel patrimonio personale svuotamento e ripristino modificano il documento ONLINE: controlla il salvataggio riuscito. Nella demo rimangono locali. Per eliminare l'archivio attuale: Profilo → **Elimina dati** → scrivi `ELIMINA`. Non modifica l'altro archivio e non elimina l’account Auth. Eventuali backup devono essere eliminati separatamente. Nessuna promessa di cancellazione forense da dischi/backup.

## Test e verifiche

```sh
npm test                    # unitari contabilità e client Firebase simulato
npm run test:e2e             # browser con API simulate
npm run build
# Solo per manutenzione, con Firestore Emulator locale già avviato:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:db
npm run test:db:legacy       # vecchio schema Supabase/PGlite, non certifica Firebase
```

`tests/firestore.mjs` rifiuta host non locali e usa il progetto `demo-baupatrimonio`: verifica due identità, anonimo, email non confermata, elenco negato, scritture incrociate, schema e revisioni. Richiede emulator e Java disponibili nell’ambiente di manutenzione, mai sul computer dell’utente finale. Le verifiche effettuate dall’agente sono riportate nella PR con eventuali limiti.

## Struttura principale

```text
src/App.tsx               sezioni, modali e archivio
src/model.ts              rilevazioni, precisione, quote, demo e trasferimenti
src/insights-model.ts      serie temporali, composizione, confronto e qualità
src/Insights.tsx           visualizzazioni accessibili e formati alternativi
src/operations.ts          registrazioni abbinate, capitale e costi/interessi
src/FideuramImporter.tsx   Excel, anteprima, aggiunta e sostituzione
src/Movements.tsx          registro e analisi entrate/spese
src/InstrumentAnalysis.tsx prezzi personali e widget di mercato
src/Portfolio.tsx          strumenti manuali e riconciliazione dossier
src/validation.ts          validazione backup
public/GUIDA.html          istruzioni utente offline
scripts/build-sw.mjs      precache statica con percorso e hash di contenuto
firestore.rules           regole del nuovo archivio Firebase
supabase/                 schema storico, non modificato e non usato dal client
```

### Account Firebase e recupero

Signup crea l’account Firebase e richiede la verifica email, senza aprire un archivio; un errore di invio avvisa che l’account è già stato creato e suggerisce reinvio, non una seconda registrazione. Il reinvio richiede email e password, come previsto dall’API Firebase; non conserva token o password. Login verifica l’indirizzo con Firebase prima di leggere Firestore; le regole impongono nuovamente lo stesso requisito.

Le email possono usare il gestore Firebase predefinito: conferma o cambio password avvengono su `baupatrimonio-b99c3.firebaseapp.com`, poi il link Continua torna al sito. Non è necessario un gestore personalizzato. Se si sceglie di configurare il sito come gestore personalizzato, sono supportati `mode=verifyEmail` e `mode=resetPassword` con codice monouso rimosso dall’URL e tenuto solo in memoria; il codice viene validato da Firebase, mai convertito in una sessione del patrimonio. Dopo il recupero si accede con la nuova password. Pausa locale invii 60 secondi; quote e controlli anti-abuso Firebase restano validi.

## Consultazione rapida: insight e strumenti

Movimenti include ripartizione delle spese nette per categoria (barre/anello) e andamento mensile entrate/spese con tabella accessibile. I grafici seguono tutti i filtri e rispettano privacy e valuta; trasferimenti/da verificare sono esclusi. Seleziona una categoria nel grafico per filtrare il registro, Azzera filtri per tornare a tutte. L’anello considera solo le categorie con spesa netta positiva: rimborsi netti e zeri restano elencati senza percentuali; nessun mese mancante è inventato come zero. Le barre mensili usano le grandezze assolute, con segni e valori nella tabella. È un adattamento dei pattern di BauSplit, non un’analisi delle quote tra persone.

Il menu categorie offre un catalogo iniziale insieme a tutte le etichette della banca e storiche, senza rinominarle automaticamente. In Patrimonio, **ETF e azioni** porta direttamente agli strumenti: ogni scheda mostra quantità, prezzo, valuta e data. Un clic apre lo storico personale dello strumento nel dossier corretto; Gestisci strumenti apre direttamente l’editor. Il totale degli strumenti non viene aggiunto una seconda volta al dossier.
