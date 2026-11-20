# Firebase BauPatrimonio — attivazione senza costi

Progetto dedicato: **baupatrimonio-b99c3**. Mantieni **Spark**, senza fatturazione e senza Blaze. Non abilitare Analytics, Functions, Storage o estensioni: questa app non li usa. Il sito rimane su GitHub Pages.

## 1. Impostazioni console (già dichiarate attive dal gestore)

- Authentication → Metodo di accesso: Email/Password attivo, accesso tramite link email non necessario.
- Authentication → Impostazioni → Domini autorizzati: `sylarpower.github.io` (senza protocollo o percorso). Non rimuovere i domini Firebase esistenti.
- Cloud Firestore: database **(default)**, edizione Standard, località europea scelta dal gestore. Non usare la modalità test.
- Authentication → Modelli: mantieni il gestore azioni Firebase predefinito (`baupatrimonio-b99c3.firebaseapp.com/__/auth/action`). Il client aggiunge il ritorno a `https://sylarpower.github.io/BauPatrimonio/`. Non occorre personalizzare l’URL di azione.

## 2. Passaggio obbligatorio: pubblica le regole

1. Nella console apri il progetto **BauPatrimonio** (`baupatrimonio-b99c3`).
2. **Build → Firestore Database → Regole / Rules**.
3. Apri il file **firestore.rules** di questa versione.
4. Sostituisci **tutto** il testo dell’editor con il contenuto del file.
5. Premi **Pubblica / Publish** e attendi la conferma di salvataggio.

Non aggiungere `allow read, write: if true`, nemmeno temporaneamente. Non pubblicare queste regole su FAW o altri progetti. Non creare documenti a mano e non usare password in console per creare l’account dell’app.

Le regole consentono solo get/create/update di `vaults/{uid}` al suo proprietario con email verificata. Vietano anonimi, utenti non confermati, lettura/scrittura di altri utenti, elenco dei documenti, cancellazione, altri percorsi e campi extra. La revisione deve iniziare da 1 e crescere di 1; il client aggiunge anche una precondizione atomica updateTime. Nessun dato patrimoniale è pubblico.

L’agente dispone della configurazione web pubblica, **non di autorizzazioni amministrative Firebase**. Non può attestare o pubblicare queste regole in remoto. Non inviare chiavi di account di servizio, password, codici email o link di recupero nella chat.

## 3. Verifica prima del merge/rilascio

- Confrontare il file delle regole con quello pubblicato nella console.
- Eseguire i test regole su Firestore Emulator in ambiente di manutenzione. I test REST simulati del client NON provano le regole di produzione. Nell’ambiente agente attuale Java/emulator non sono disponibili.
- Con l’app di prova e dati sintetici, verificare registrazione, consegna della conferma, login verificato, archivio vuoto, modifica e ricaricamento da secondo dispositivo. Non dichiarare inviata un’email se Firebase segnala errore.
- Provare anche recupero password e reinvio conferma (quest’ultimo richiede la password per il token temporaneo).
- Restare sul piano Spark. In caso di quota esaurita l’app deve mostrare errore e conservare le modifiche nella pagina, mai dichiarare salvataggio riuscito.

## 4. Dati preesistenti e rilascio

Account e password Supabase non sono account Firebase. Nessuna migrazione implicita per corrispondenza di email: rischierebbe di attribuire dati all’account sbagliato. Nessuna scrittura o cancellazione sul vecchio database.

Se esistono dati in Supabase, conservarli e utilizzare un proprio backup JSON validato, importato esplicitamente dal Profilo sul nuovo account dopo conferma. Il ripristino sostituisce i dati dell’account di destinazione e richiede conferma. Non copiare dati personali nel repository.

Dopo le verifiche: merge della PR e Pages **main → /docs**. Non pubblicare una migrazione incompleta mentre il database è ancora bloccato dalle regole predefinite. GitHub Pages, demo e configurazione web sono pubblici; i dati Firestore non lo sono.

## Manutenzione opzionale, non istruzioni per l’utente finale

`firebase.json` contiene solo configurazione delle regole e dell’emulator; non crea Hosting o servizi a pagamento. Con Firebase CLI già autorizzata al progetto dedicato è possibile distribuire **solo** le regole con `firebase deploy --only firestore:rules --project baupatrimonio-b99c3`. Non distribuire configurazioni globali su altri progetti.

I test `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:db` usano `demo-baupatrimonio` e rifiutano host non locali. Richiedono Java e Firestore Emulator in esecuzione. `npm run test:db:legacy` verifica solo il vecchio schema PostgreSQL e non certifica Firebase.
