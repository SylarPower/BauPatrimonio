# Registro collegamenti ufficiali

**Data del controllo di stato: 19 novembre 2026.**

L’ambiente di sviluppo permette traffico esterno solo verso GitHub e registri di pacchetti. Non è stato possibile completare una verifica corrente e autorevole delle directory di copertura bancarie. **Questa data non è una certificazione della copertura**. Non è stato scelto un connettore sulla base di supposizioni.

| Istituto e paese       | Saldi pagamento | Movimenti pagamento | Posizioni titoli | Storico titoli / pensione | Fonte ufficiale corrente verificata |
| ---------------------- | --------------- | ------------------- | ---------------- | ------------------------- | ----------------------------------- |
| Fideuram, Italia       | Da verificare   | Da verificare       | Da verificare    | Da verificare             | Nessuna: verifica non completata    |
| Trade Republic, Italia | Da verificare   | Da verificare       | Da verificare    | Da verificare             | Nessuna: verifica non completata    |

| Requisito                                      | Sandbox       | Produzione    |
| ---------------------------------------------- | ------------- | ------------- |
| Provider autorizzato per cliente Italia        | Da verificare | Da verificare |
| Contratto, approvazioni e costi                | Da verificare | Da verificare |
| Client ID, segreti gestore e modalità consenso | Da verificare | Da verificare |
| Saldi / movimenti / titoli separati            | Da verificare | Da verificare |
| Flusso funzionante eseguito                    | **No**        | **No**        |

## Gate obbligatorio prima di implementare/attivare un adattatore

1. Ottenere documentazione **ufficiale corrente**, directory per paese/prodotto e condizioni d’uso. Registrare URL, data, identificativo istituto e prodotti coperti. Non basta il marchio della banca.
2. Verificare che conti dei clienti italiani siano accessibili, incluse eventuali differenze IBAN estero/italiano e banca/filiale. Non assumere accesso a dossier o pensione tramite AIS.
3. Verificare licenza e condizioni del provider, ruolo del gestore dell’app, contratti, approvazioni, prezzi, credenziali e limiti di uso personale. Richiedere consenso dell’utente prima di qualsiasi costo o conto reale.
4. Implementare sul server avvio consenso con state anti-CSRF, redirect ufficiale, callback autenticata e validata, cifratura AEAD dei token, idempotenza per ID evento/provider, verifica scadenza/revoca, webhook firmati se previsti.
5. Testare in sandbox creazione, successo, rifiuto, scadenza, revoca, errori rete, dati parziali e retry. Un errore non deve sostituire l’ultimo saldo con zero. Registrare l’ultimo aggiornamento **riuscito**, distinto dall’ultimo tentativo.
6. Mostrare soltanto la copertura effettiva: ad esempio liquidità sincronizzata e titoli da importare, se realmente documentata.
7. Scollegare/revocare sul provider e interrompere nuovi aggiornamenti senza cancellare dati storici; eliminazione dei dati distinta e confermata.

Non sono implementati scraping, raccolta di password/PIN/OTP bancari, API private di Trade Republic, aggiramenti della 2FA o SDK non ufficiali. I pacchetti npm presenti non dimostrano supporto bancario. Manuale e CSV rimangono immediatamente disponibili.
