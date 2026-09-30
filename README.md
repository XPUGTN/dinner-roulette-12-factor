# 🎲 Dinner Roulette — Coding Dojo 12-Factor App

Esercizio: correggere un'applicazione TypeScript volutamente progettata male, applicando alcuni principi della metodologia [12-Factor App](https://12factor.net/it/).

- **Durata totale:** 75 minuti
- **Stack:** TypeScript / Node.js, PostgreSQL, Docker

## Indice

- [🍽️ L'applicazione](#lapplicazione)
- [⚠️ Stato iniziale (volutamente sbagliato)](#stato-iniziale-volutamente-sbagliato)
- [⏱️ Scaletta dei 75 minuti](#scaletta-dei-75-minuti)
- [🃏 Carte incidente](#carte-incidente)
- [🔁 Retrospettiva: fattori coperti ed esclusi](#retrospettiva-fattori-coperti-ed-esclusi)
- [🧰 Materiale da preparare prima del dojo](#materiale-da-preparare-prima-del-dojo)
- [🗂️ Struttura suggerita del repository finale](#struttura-suggerita-del-repository-finale)
- [🏆 Criterio di successo](#criterio-di-successo)

---

## L'applicazione

Una piccola API che suggerisce dove cenare ("Bad Edition"). Permette di:

- votare un ristorante;
- ottenere il ristorante suggerito per la cena.

L'app parte e sembra funzionare: i difetti emergono solo con le carte incidente.

### 🔌 API esposte

**Registrare un voto**

```http
POST /votes
Content-Type: application/json

{
  "user": "alice",
  "restaurantId": "sakura"
}
```
curl:
```bash
curl -X POST http://localhost:8080/votes -H 'Content-Type: application/json' -d '{"user": "alice", "restaurantId": "sakura"}'
```



**Ottenere il suggerimento**

```http
GET /suggestion
```
curl:
```bash
curl http://localhost:8080/suggestion
```

Il suggerimento è il ristorante con più voti. In caso di parità o assenza di voti, viene scelto casualmente uno dei candidati.


### 🐛 Difetti presenti nello starter

- locali hardcoded;
- porta e URL del database hardcoded;
- ambiente determinato con un `if`;
- log scritti in un file;
- dipendenza esterna senza timeout;
- sessioni memorizzate nel processo;
- avvio lento;
- arresto immediato, anche durante una richiesta;
- migrazione eseguita automaticamente da ciascuna istanza.

## Stato iniziale (volutamente sbagliato)

L'applicazione consegnata ai partecipanti:

- contiene la lista dei ristoranti nel codice;
- conserva i voti in una `Map` globale;
- contiene la porta HTTP direttamente nel codice;
- importa moduli non dichiarati correttamente;
- non ha un lockfile affidabile;
- dipende implicitamente da strumenti installati globalmente;
- crea direttamente tutte le dipendenze dentro `server.ts`;
- non dispone di migrazioni del database;
- ha pochi test automatici, sufficienti a verificare il comportamento di base.

Esempio concettuale:

```ts
const restaurants = [
  { id: "sakura", name: "Sakura" },
  { id: "napoli", name: "Pizzeria Napoli" }
];

const votes = new Map<string, string>();

app.listen(8080);
```

---

## Scaletta dei 75 minuti

| # | Fase | Durata | Fattori |
|---|------|--------|---------|
| 1 | Presentazione e baseline | 8 min | — |
| 2 | Iterazione 1: gestione delle dipendenze | 10 min | Dependencies |
| 3 | Iterazione 2: lista dei ristoranti esterna | 14 min | Config; backing services |
| 4 | Iterazione 3: voti persistenti | 18 min | Processes; backing services |
| 5 | Iterazione 4: migrazioni del database | 15 min | Admin processes; build, release, run |
| 6 | Retrospettiva finale | 10 min | — |

### 🚀 1. Presentazione e baseline — 8 minuti

**🎬 Scenario.** Il team ha ereditato Dinner Roulette. L'applicazione funziona in locale, ma non è pronta per essere eseguita e mantenuta in ambienti differenti.

**🛠️ Attività**

- avviare l'applicazione;
- chiamare le due API;
- leggere rapidamente il codice;
- individuare i primi problemi;
- verificare che i voti spariscano al riavvio.

**💬 Discussione.** Chiedere ai partecipanti:

- Quali elementi appartengono realmente alla codebase?
- Quale stato non dovrebbe essere conservato nel processo?
- Quali modifiche richiedono oggi una nuova build?

### 2. Iterazione 1: gestione delle dipendenze — 10 minuti

**🃏 Carta incidente:** [Carta 0 — Dipendenze](#carta-0--dipendenze) ("Funziona solo sul computer dell'autore").

Sulla macchina di chi l'ha scritta l'applicazione parte senza problemi. Costruendo l'immagine Docker, no:

- `npm ci` si rifiuta di installare;
- sistemato quello, la build dell'immagine fallisce: un comando che sulla macchina di sviluppo c'è, nell'immagine non c'è;
- costruendola con le sole dipendenze di produzione, il container non si avvia affatto.

Un nuovo sviluppatore clona il repository, ma l'applicazione non parte. Alcuni strumenti sono installati globalmente e una dipendenza usa una versione differente da quella usata dall'autore.

**🚧 Vincoli**

- L'immagine deve potersi costruire su una macchina dove non è installato niente.
- L'immagine di produzione non deve contenere gli strumenti di sviluppo.
- Il comando mancante non va installato nell'immagine: deve sparire il bisogno.

**🛠️ Attività**

- dichiarare tutte le dipendenze nel `package.json`;
- distinguere `dependencies` e `devDependencies`;
- eliminare la necessità di installazioni globali;
- generare e versionare il lockfile;
- aggiungere script standard per avvio, test e build;
- fissare la versione attesa di Node.js.

**✅ Risultato atteso.** L'applicazione può essere installata, compilata, testata e avviata partendo soltanto dal repository e da una versione documentata di Node.js.

**🔍 Verifica**

```bash
npm ci && npm test && npm run build && npm start
docker build and run
```

**🏷️ Fattore affrontato:** Dependencies.

### 3. Iterazione 2: lista dei ristoranti esterna — 14 minuti

**🃏 Carta incidente:** [Carta 1 — Il nuovo locale](#carta-1--il-nuovo-locale).

Ha aperto un nuovo ristorante molto interessante e vogliamo gestirlo come ristorante per la votazione. Ma per aggiungere un locale dobbiamo cambiare il codice… **Il ristorante non è codice!**

Ogni modifica alla lista dei ristoranti richiede una modifica del codice sorgente e una nuova release. La lista sarà ora pubblicata da un servizio HTTP esterno, ad esempio un Gist.

**🛠️ Attività**

- rimuovere la lista hardcoded;
- leggere i ristoranti dal servizio esterno;
- fornire l'URL tramite variabile d'ambiente;
- introdurre un'interfaccia `RestaurantRepository`;
- implementare `HttpRestaurantRepository`;
- mantenere il servizio di suggerimento indipendente dal modo in cui viene caricata la lista.

**⚙️ Configurazione prevista**

```bash
RESTAURANTS_URL=https://...
```

**✅ Risultato atteso.** La stessa build può utilizzare liste differenti senza modificare il codice.

**🔍 Verifica**

- cambiare `RESTAURANTS_URL`;
- riavviare l'applicazione;
- verificare che `GET /suggestion` utilizzi la nuova lista;
- verificare il comportamento quando viene votato un ristorante inesistente.

**🏷️ Fattori affrontati:** Config; backing services.

### 4. Iterazione 3: voti persistenti — 18 minuti

**🃏 Carta incidente:** [Carta 3 — Abbiamo perso tutti i voti](#carta-3--abbiamo-perso-tutti-i-voti) ("Dove sono finiti i voti?").

Il riavvio ha cancellato la cena. L'applicazione viene riavviata e tutti i voti raccolti scompaiono. I voti non possono più essere conservati nella memoria del processo.

**🛠️ Attività**

- avviare PostgreSQL tramite Docker Compose;
- fornire la connessione tramite `DATABASE_URL`;
- introdurre un'interfaccia `VoteRepository`;
- sostituire `InMemoryVoteRepository` con `PostgresVoteRepository`;
- usare query parametrizzate;
- aggiornare `POST /votes` e `GET /suggestion`;
- mantenere separata la logica applicativa dalla persistenza.

**⚙️ Configurazione prevista**

```bash
DATABASE_URL=postgresql://...
```

**✅ Risultato atteso.** I voti sopravvivono al riavvio dell'applicazione.

**🔍 Verifica**

- registrare alcuni voti;
- richiedere il suggerimento;
- riavviare soltanto l'applicazione;
- richiedere nuovamente il suggerimento;
- verificare che i voti siano ancora presenti.

**🏷️ Fattori affrontati:** Processes; backing services.

### 5. Iterazione 4: migrazioni del database — 15 minuti

**🃏 Carta incidente:** [Carta Bonus — Migrazione moltiplicata](#carta-bonus--migrazione-moltiplicata) ("Chi crea la tabella?").

Il repository dei voti richiede una tabella, ma lo schema viene creato manualmente oppure durante l'avvio del server. Non è chiaro quale versione dello schema sia richiesta da ciascuna release.

**Prima soluzione da discutere.** Mostrare perché è problematica:

```ts
await database.query(`
  CREATE TABLE IF NOT EXISTS votes (...)
`);
// eseguita dentro server.ts
```

**🛠️ Attività**

- rimuovere la creazione dello schema dall'avvio dell'applicazione;
- introdurre una directory di migrazioni versionate;
- configurare un migration runner;
- aggiungere un comando dedicato, per esempio `npm run migrate`;
- eseguire le migrazioni come processo amministrativo separato;
- verificare che l'applicazione fallisca in modo chiaro se lo schema richiesto non esiste.

**⏭️ Sequenza desiderata**

```bash
npm run build
npm run migrate
npm start
```

**✅ Risultato atteso.** La modifica dello schema è esplicita, versionata, ripetibile e separata dal normale processo HTTP.

**🔍 Verifica**

- partire da un database vuoto;
- eseguire la migrazione;
- avviare l'applicazione;
- registrare un voto;
- eseguire nuovamente la migrazione e verificarne il comportamento;
- controllare la tabella che registra le migrazioni applicate.

**🏷️ Fattori affrontati:** Admin processes; build, release, run.

### 🔁 6. Retrospettiva finale — 10 minuti

Confrontare la versione iniziale e quella finale.

**❓ Domande guida**

- Quale configurazione è stata rimossa dal codice?
- Quali risorse sono ora sostituibili?
- Quale stato è rimasto nel processo?
- Perché la migrazione non dovrebbe essere eseguita automaticamente dal server?
- Qual è la differenza tra una dipendenza npm e un backing service?
- Quali fattori non sono stati affrontati?
- Quali compromessi abbiamo accettato per restare nei 75 minuti?

---

## Carte incidente

### Carta 0 — Dipendenze

> Non il binario di sistema: il confine fra build e runtime. Con TypeScript è il difetto che ogni team ha spedito almeno una volta.

Lo starter ha un Dockerfile a stadio singolo che fa `npm install` (tutto, dev incluse) e avvia con `ts-node src/index.ts`. Da lì escono tre sintomi, tutti deterministici:

1. L'immagine pesa più di un giga e ci mette dieci secondi a partire, perché si ricompila a ogni avvio e il compilatore è incluso nell'immagine di produzione.
2. "Abbiamo provato a buildare con `--omit=dev` e il container non parte più": `Error: Cannot find module`. Un modulo usato a runtime è finito in `devDependencies`, e in sviluppo non se n'era accorto nessuno perché lì si installa tutto.
3. `GET /version` risponde 500 nel container e funziona sul portatile, perché fa `git rev-parse HEAD` a runtime, e nell'immagine il `.git` non c'è.

**🩺 Diagnosi.** Il runtime di produzione contiene cose che non dovrebbe e non contiene quelle che dovrebbe.

**🔧 Correzione.** Build multi-stadio con `tsc` come passo di build effettivo, `npm ci --omit=dev` a runtime, la dipendenza spostata al posto giusto e la versione iniettata come build arg invece che calcolata all'avvio.

**🏷️ Fattori toccati:** Dependencies; Build, release, run; mezzo Disposability.

> 💡 **Nota per il facilitatore.** L'avvio lento trova finalmente la sua carta: è il sintomo, e dopo il fix la sala vede il container partire in mezzo secondo. In randori, con un solo schermo, quel prima/dopo funziona benissimo.

### Carta 1 — Il nuovo locale

Il team vuole aggiungere "Sushi Zen" alla lista dei locali. Per farlo, è necessario modificare il codice, ripetere i test ed effettuare il rilascio di una nuova versione dell'applicazione.

**📌 Nuovo requisito:** la lista dei locali deve essere letta da un file JSON pubblicato su un Gist.

**🚧 Vincoli**

- L'URL del Gist non deve essere scritto nel codice.
- Lo stesso artefatto deve poter utilizzare Gist differenti in vari ambienti.
- Non occorre creare un'API per modificare i locali.

**🎯 Obiettivo:** spostare la lista fuori dalla codebase e configurare il relativo URL tramite l'ambiente.

**🏷️ Fattori coinvolti:** Config; backing services; build, release, run.

### Carta 2 — Il pranzo è bloccato

Il servizio che ospita l'elenco dei locali è diventato molto lento. Ogni chiamata a `GET /suggestion` rimane in attesa per 30 secondi.

**🚧 Vincoli**

- Il servizio esterno non può essere modificato.
- L'applicazione deve rispondere entro un tempo ragionevole.
- Il client deve ricevere un messaggio di errore comprensibile.

**🎯 Obiettivo:** aggiungere un timeout alla chiamata esterna e gestire esplicitamente il fallimento.

**🏷️ Fattori coinvolti:** Backing services; disposability.

### Carta 3 — Abbiamo perso tutti i voti

È stata distribuita una nuova versione dell'applicazione. Al termine del deployment, tutti i voti raccolti durante la mattina sono scomparsi.

**🚧 Vincoli**

- I processi possono essere interrotti e ripresi in qualsiasi momento.
- Non è possibile scrivere i voti sul filesystem locale.
- Il processo di applicazione non deve essere responsabile della loro durata.

**🎯 Obiettivo:** spostare i voti dalla memoria a un servizio persistente collegato all'applicazione.

**🏷️ Fattori coinvolti:** Processes; backing services.

### Carta 4 — Due istanze, due vincitori

All'ora di pranzo il traffico aumenta. Operations avvia una seconda istanza dell'applicazione. Alcuni utenti ricevono "Sushi Zen" come suggerimento, altri "Pizzeria Napoli". Durante l'analisi si scopre che ogni istanza possiede una propria cache della lista e un proprio stato locale.

**🚧 Vincoli**

- Una richiesta può raggiungere qualsiasi istanza.
- Non è consentito utilizzare sticky session.
- Le istanze devono essere intercambiabili.

**🎯 Obiettivo:** eliminare lo stato specifico dell'istanza oppure renderlo condiviso e coerente.

**🏷️ Fattori coinvolti:** Processes; concurrency; backing services.

### Carta Bonus — Il Gist è sbagliato

Qualcuno aggiorna il Gist introducendo un locale senza `id` e duplicando l'identificativo di un altro locale. L'applicazione accetta il contenuto e poi assegna alcuni voti al locale sbagliato.

**🚧 Vincoli**

- Il Gist è gestito esternamente e non può essere considerato sempre corretto.
- Una configurazione non valida non deve sostituire l'ultima lista valida.
- Il problema deve essere visibile nei log.

**🎯 Obiettivo:** validare i dati esterni, mantenere l'ultima configurazione valida e generare un errore osservabile.

**🏷️ Fattori coinvolti:** Backing services; logs.

### Carta Bonus — Migrazione moltiplicata

Il nuovo rilascio introduce una modifica allo schema dei voti. All'avvio, tutte le istanze tentano contemporaneamente di applicare la migrazione e il deployment fallisce.

**🚧 Vincoli**

- La migrazione deve essere eseguita una sola volta.
- Il normale avvio dell'applicazione non deve modificare lo schema.
- La stessa release deve poter essere promossa tra diversi ambienti.

**🎯 Obiettivo:** separare la migrazione dal processo applicativo ed eseguirla come attività amministrativa distinta.

**🏷️ Fattori coinvolti:** Admin processes; build, release, run.

### Da valutare per l'incontro Cloud Native Comm

#### Carta 5 — Deploy durante la votazione

Una nuova versione viene distribuita mentre alcune richieste sono ancora in corso. Un processo viene terminato durante la registrazione di un voto. Operations non riesce a ricostruire l'accaduto perché i log sono stati scritti in un file che è rimasto nel vecchio container.

**🚧 Vincoli**

- Il processo riceve un segnale di terminazione.
- Le richieste già accettate non devono essere interrotte bruscamente.
- I log non possono essere conservati sul filesystem locale.

**🎯 Obiettivo:** gestire l'arresto controllato e inviare i log allo standard output.

**🏷️ Fattori coinvolti:** Disposability; logs.

---

## Retrospettiva: fattori coperti ed esclusi

| Fattori coperti | Fattori volutamente esclusi |
|-----------------|-----------------------------|
| Dependencies | Concurrency e replica su più istanze |
| Config | Disposability e deploy durante richieste attive |
| Backing services | Log aggregation |
| Build, release, run | Dev/prod parity completa |
| Processes | Port binding come esercizio autonomo |
| Admin processes | |

---

## Materiale da preparare prima del dojo

### 📦 Repository starter

Deve contenere:

- applicazione TypeScript funzionante;
- lista hardcoded;
- voti in memoria;
- almeno un test per ciascuna API;
- Dockerfile iniziale;
- README con i soli comandi essenziali;
- collection HTTP o file `.http` per provare le API.

### 🍣 Servizio dei ristoranti

Preparare:

- un Gist pubblico con una lista JSON valida;
- una seconda lista da usare per la verifica;
- uno schema semplice e stabile.

Esempio:

```json
[
  {
    "id": "sakura",
    "name": "Sakura",
    "category": "japanese"
  },
  {
    "id": "napoli",
    "name": "Pizzeria Napoli",
    "category": "pizza"
  }
]
```

### 🐘 Database

Preparare:

- PostgreSQL in `compose.yaml`;
- credenziali esclusivamente locali;
- health check del container;
- volume persistente;
- migration runner già scelto e installabile.

### 🧑‍🏫 Supporto del facilitatore

Preparare per ogni iterazione:

- carta incidente;
- obiettivo minimo;
- uno o due indizi progressivi;
- commit o tag con una possibile soluzione;
- test aggiuntivi da rivelare alla fine;
- patch di recupero se il gruppo rimane indietro.

---

## Struttura suggerita del repository finale

```text
dinner-roulette/
├── src/
│   ├── server.ts
│   ├── config.ts
│   ├── restaurants/
│   │   ├── restaurant-repository.ts
│   │   ├── hardcoded-restaurant-repository.ts
│   │   └── http-restaurant-repository.ts
│   ├── votes/
│   │   ├── vote-repository.ts
│   │   ├── in-memory-vote-repository.ts
│   │   └── postgres-vote-repository.ts
│   └── suggestion/
│       └── suggestion-service.ts
├── migrations/
│   └── 001-create-votes.sql
├── test/
├── cards/
├── compose.yaml
├── Dockerfile
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── FACILITATOR.md
```

## Criterio di successo

Il dojo è riuscito se, alla fine:

- la lista dei ristoranti proviene da un servizio configurabile;
- i voti persistono dopo il riavvio;
- lo schema è gestito da migrazioni esplicite;
- le dipendenze sono dichiarate e riproducibili;
- i partecipanti sanno collegare ogni modifica a un principio 12-Factor.

Non è necessario ottenere una soluzione production-ready. L'obiettivo è rendere visibili i problemi, discutere le decisioni e arrivare a una soluzione coerente entro il tempo disponibile.
