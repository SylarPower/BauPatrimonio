# Collegamenti bancari: verifica ufficiale del 19 novembre 2026

Questa verifica sostituisce il precedente stato «documentazione non verificata». **Esiste un percorso documentato per i conti di pagamento; nessun conto reale è collegato e nessuna sandbox bancaria è stata collaudata in BauPatrimonio.** Non è una certificazione del funzionamento su un particolare conto.

## Esito per istituto e prodotto

| Istituto / paese                | Liquidità e saldi                                                                                                                                                                                                               | Movimenti / storico conto                                                                                                                                                                                 | Titoli, ETF, pensione                                                                                                                              | Stato nell'app                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Fideuram / Italia               | Il portale ufficiale Intesa include Fideuram nell'interfaccia PSD2 tramite CBI Globe; Enable Banking cita Fideuram nei dettagli del mercato italiano.                                                                           | Percorso AIS documentato. Enable Banking cita Fideuram tra gli istituti con doppia SCA per i movimenti storici oltre 90 giorni; durata e profondità disponibili dipendono da conto e consenso.            | Nessuna copertura verificata nelle fonti AIS consultate. Non si presume accesso al dossier o al fondo pensione.                                    | Manuale/CSV attivi; collegamento automatico non configurato. |
| Trade Republic / clienti Italia | Guida ufficiale PSD2 v2.2, novembre 2026: account information, saldi correnti e disponibili. Enable Banking include IT fra i paesi serviti nella scheda Trade Republic. Verificare l'effettivo conto/IBAN durante l'onboarding. | La scheda Enable Banking segnala, ad agosto 2026 e per tutti i paesi, soltanto importo, valuta e data contabile, senza descrizioni. Profondità e identificativi stabili da verificare sui dati effettivi. | Non risultano endpoint di posizioni titoli nella guida AIS consultata. Non promettiamo import automatico di ETF, azioni o storico del portafoglio. | Manuale/CSV attivi; collegamento automatico non configurato. |
| Altri istituti italiani         | Enable Banking documenta banche italiane e i relativi limiti nel catalogo e nelle schede mercato. Non è una garanzia universale per tutte le banche o prodotti.                                                                 | Verificare metadata dell'istituto e prodotto effettivi prima di esporre «Collega».                                                                                                                        | Mai dedurre copertura titoli da copertura AIS.                                                                                                     | Nessun connettore generico fittizio.                         |

## Gratuità: una strada ufficiale esiste, ma con condizioni

I **Terms of Service Enable Banking**, aggiornati l'8 gennaio 2026 e consultati il 19 novembre 2026, dichiarano gratuiti Control Panel e API nell'ambito di quei termini. L'uso in produzione è limitato ai **Linked Accounts** per valutazione o uso personale di privati. Il numero dei conti può essere limitato; uso professionale/pubblico richiede accordo separato e può avere costi. Non si estende quindi una licenza personale gratuita a un servizio bancario pubblico per tutti.

La FAQ spiega l'attivazione **restricted** collegando i propri conti; gli altri conti vengono esclusi anche dopo autorizzazione. Sono richiesti un account personale presso il provider, un'applicazione registrata, una chiave RSA privata e consensi. Il provider documenta il proprio ruolo AISP; il gestore personale non deve fingersi un TPP con certificati professionali.

Il changelog ufficiale del 13 novembre 2026 conferma l'uso personale restricted, ma indica assistenza tramite AI per queste applicazioni dalla fine di ottobre 2026. Non viene promessa assistenza tecnica umana o uno SLA gratuito.

## Perché «solo GitHub Pages» non basta per sincronizzare le banche

GitHub Pages distribuisce file statici. Non è un ambiente server per firmare JWT con chiavi private, conservare sessioni/refresh token, validare callback, cifrare token o pianificare sincronizzazioni riservate. La documentazione Enable Banking vieta di esporre la chiave privata al client o incorporarla nelle app installate sul dispositivo.

Non useremo repository, bundle, localStorage, file JSON pubblici o workflow con output finanziari come sostituti di un backend sicuro. GitHub Actions non viene presentato come API bancaria pubblica né come database personale.

Per proseguire occorre accettare **un backend privato aggiuntivo** (eventualmente una funzione server su un piano gratuito, da verificare con i suoi limiti e senza upgrade automatici), oltre a GitHub Pages. In questo turno non è stato attivato alcun servizio bancario o backend esterno e non sono stati accettati termini o consensi per conto dell'utente.

## Accesso diretto alle API delle banche

- **Fideuram / CBI Globe:** area TPP riservata a prestatori AISP/PISP/PIISP; onboarding con certificato eIDAS di produzione o test. L'esistenza della sandbox non significa accesso anonimo gratuito per un'app personale. Costi/contratti specifici: non verificati, nessun acquisto.
- **Trade Republic:** la guida richiede TPP autorizzato, certificato eIDAS QSeal e chiave privata. Sandbox e produzione hanno registrazioni indipendenti; la sandbox non espone dati reali. Non disponiamo di tali requisiti, quindi non sosteniamo di averla testata. Questa app non implementa PIS e non invia pagamenti.

## Fonti ufficiali consultate

1. Intesa Sanpaolo, interfaccia PSD2 con Fideuram e CBI Globe: https://psd2.intesasanpaolo.com/it/homepage/tpp-dedicated-interface-under-psd2.html
2. CBI Globe, registrazione TPP e certificati: https://www.cbiglobe.com/Home-Page/Registrazione-TPP
3. Trade Republic, TPP Integration Guide, contenuto v2.2 novembre 2026: https://assets.traderepublic.com/assets/files/TPP_API_Guide_v2.pdf
4. Enable Banking, condizioni di utilizzo: https://enablebanking.com/terms/
5. Enable Banking, attivazione restricted dei propri conti: https://enablebanking.com/docs/api/linked-accounts/
6. Enable Banking, FAQ, pricing/attivazione/restrizioni: https://enablebanking.com/docs/faq/
7. Enable Banking, mercato Italia e Fideuram: https://enablebanking.com/docs/markets/it/
8. Enable Banking, Trade Republic, paesi e limitazioni: https://enablebanking.com/docs/markets/de/#trade-republic
9. Enable Banking, autenticazione e protezione della chiave: https://enablebanking.com/docs/api/reference/#authentication
10. Enable Banking, changelog ottobre 2026 pubblicato il 13 novembre: https://enablebanking.com/blog/2026/16/11/changelog-october-2026-675wa

## Passi successivi, non ancora eseguiti

1. L’utente ha autorizzato un backend esterno purché gratuito. Il client archivio Supabase è ora implementato, ma non è stato configurato un progetto remoto: seguire la guida `public/GUIDA.html#cloud`. Questo non implementa ancora un backend bancario AIS.
2. Registrazione personale presso il provider e verifica degli istituti/conti effettivamente disponibili, prima in sandbox dove accessibile.
3. Adattatore server AIS-only: consenso con state anti-CSRF, callback autenticata, sessioni cifrate, revoca/scadenza, retry e sincronizzazione idempotente.
4. Test reali in sandbox: successo, rifiuto, scadenza, revoca, parzialità ed errori che preservano l'ultimo saldo valido. Nessun collegamento di conti reali senza conferma separata.
5. Esporre soltanto i prodotti realmente verificati nell'interfaccia; mantenere subito disponibili manuale e importazione CSV.
