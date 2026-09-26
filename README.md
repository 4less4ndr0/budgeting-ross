# budgeting-ross

**Live: https://4less4ndr0.github.io/budgeting-ross/**

Lo storico delle modifiche sono le
[Release](https://github.com/4less4ndr0/budgeting-ross/releases) della repo (stessa
lista è visibile anche nell'app, dal bottone "Changelog" accanto a "Esporta").

Dashboard finanziaria per tenere i conti di un progetto: importa i tuoi costi (CSV/Excel), tienili
aggiornati in una dashboard interattiva e capisci il **burn rate**, l'**utile netto** e se
raggiungerai il **break-even** entro la data che ti sei dato (default: 6 mesi da oggi).

App 100% client-side: nessun backend, nessun database. I dati restano nel browser
(localStorage) e il file che importi non viene mai modificato — viene solo letto e copiato
nella dashboard.

## Funzionalità

- **Import CSV/Excel** con mappatura colonne (il tuo file può avere qualsiasi struttura:
  scegli tu quale colonna è data, categoria, importo, ecc.), più rilevamento **automatico**
  di ogni CSV presente nella cartella [`csv-imports/`](csv-imports/) — un click e passa
  nello stesso wizard di mappatura.
- **Tabelle editabili** per costi/entrate e fondi disponibili — su mobile diventano card
  verticali (una per voce) invece di una tabella stretta, pensate per lo schermo di un
  telefono.
- **Due modelli di proiezione ricavi**, selezionabili:
  - *Semplice*: prezzo × vendite al mese, fino a tre fasce + wholesale
  - *Funnel B2B*: lead mensili × tasso di conversione × vendita diretta o commissione di
    segnalazione
- **Dashboard**: burn rate mensile, posizione cumulativa (fondi + ricavi vs costi), **utile
  netto mensile e cumulato** (conto economico puro, senza contare i fondi), stato rispetto
  al target di break-even (in anticipo / in linea / in ritardo / a rischio), grafici e
  tabella mensile
- **Export** in due formati dal menu "Esporta": Excel (dati + proiezioni, riaggiornabile e
  riapribile su Google Sheets) oppure **snapshot completo in JSON** (costi, fondi,
  assunzioni ricavi, override inclusi) per portare l'identica situazione su un altro
  dispositivo — la tab "Importa" lo rileva e lo ricarica con un click se lo metti in
  `csv-imports/` come `stato-sito.json`

## Stack UI

Componenti [shadcn/ui](https://ui.shadcn.com) (Radix UI + Tailwind CSS, tema chiaro
"neutral") — sorgenti in `src/components/ui/`, non un pacchetto npm. `components.json` è
già configurato, quindi una volta installato Node puoi aggiungere altri componenti con:

```bash
npx shadcn@latest add <componente>
```

## Prerequisiti

Serve **Node.js** (versione 20 o superiore) e npm. Per installarli:

```bash
brew install node
```

Se `brew` non è installato, prima esegui l'installer ufficiale da
[brew.sh](https://brew.sh), oppure scarica Node direttamente da
[nodejs.org](https://nodejs.org/) (installer `.pkg`).

## Sviluppo locale

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Ogni merge su `main` fa partire automaticamente il workflow GitHub Actions
(`.github/workflows/deploy.yml`) che builda e pubblica su GitHub Pages:
https://4less4ndr0.github.io/budgeting-ross/. Lo stesso workflow gira anche (solo
build + test, senza deploy) su ogni Pull Request verso `main`, per far emergere un errore
prima del merge. **Passo manuale una tantum**: in Settings → Pages della repo, imposta
Source = "GitHub Actions".

## Lavorare in due sulla repo

`main` è protetto: niente push diretti, nemmeno per gli admin — solo via Pull Request.
Ognuno lavora sul proprio branch persistente (es. `<nome>/lavoro`), e quando una modifica
è pronta apre una PR verso `main`:

```bash
git checkout -b <tuo-nome>/lavoro origin/main   # la prima volta
git push -u origin <tuo-nome>/lavoro
# ... lavori, committi ...
gh pr create --base main
```

Non serve l'approvazione dell'altra persona per mergere la propria PR (evita blocchi
quando uno dei due non è online) — la PR è comunque il momento in cui build e test girano
e in cui si vede il diff prima che vada in produzione.

**Devono esistere solo due branch di lavoro: `alessandro/lavoro` e `leo/lavoro`.** Mai
crearne altri (niente `git checkout -b <qualcos'altro>`) — si continua a lavorare sul
proprio branch persistente, PR dopo PR, invece di aprirne uno nuovo ogni volta.

**Occhio all'editor web di GitHub.** Se modifichi un file dalla UI di GitHub (la matita
"Edit"), controlla di essere sul tuo branch — l'URL deve contenere `/tree/<tuo-nome>/lavoro/`
o il menu del branch in alto deve mostrarlo — **prima** di premere la matita. Se lo fai
mentre stai guardando `main`, che è protetto, GitHub non ti fa scegliere: crea da solo un
branch nuovo tipo `<utente>-patch-1` e ci apre sopra una PR. È così che sono nati i branch
fantasma ripuliti in passato — la fix è semplice, basta partire dal proprio branch invece
che da `main`.

**Metti una label sulla PR prima di aprirla.** Non c'è nessun changelog da aggiornare a
mano: lo storico sono le Release, e GitHub le compila da solo usando i titoli delle PR
mergiate. La label (`interfaccia`, `dashboard`, `costi-fondi`, `runway-budget`,
`categorie`, `assunzioni-ricavi`, `import-export`, `fix-tecnici`,
`documentazione-processo`) decide solo in che sezione finisce la voce; senza label la PR
compare sotto "Altro".

**A fine sessione di lavoro pubblica una release**, così le PR mergiate diventano una voce
di changelog visibile all'altra persona e dentro l'app:

```bash
gh release create v0.1.0 --title "$(date +%F)" --generate-notes
```

Il popup "Changelog" dell'app legge le release da GitHub a runtime: appena pubblichi
compare, senza aspettare un nuovo deploy.

## Cartella `csv-imports/`

Ci metti dentro due tipi di file, entrambi rilevati in automatico dalla tab "Importa":

- **CSV di movimenti** (es. estratto conto) → wizard di mappatura colonne con un click.
- **`stato-sito.json`** → snapshot completo generato da "Esporta" → "Salva stato (.json)",
  per portare la stessa identica situazione (dati + assunzioni) su un altro dispositivo.

Dettagli, convenzioni di naming e **attenzione sulla repo pubblica** (ogni file qui dentro
resta visibile nella cronologia git anche se lo cancelli) in
[`csv-imports/README.md`](csv-imports/README.md).

In [`sample-data/esempio-costi.csv`](sample-data/esempio-costi.csv) trovi invece un file
CSV di prova con header italiani, utile per testare subito il flusso di import manuale
(drag&drop, non passa da `csv-imports/`).
