# Istruzioni per Claude Code in questa repo

Prima di iniziare un task in questa repo, dai un'occhiata a [`README.md`](README.md) (setup,
workflow, convenzioni) e alle [release più
recenti](https://github.com/4less4ndr0/budgeting-ross/releases) — così sai cosa è già
stato fatto (anche dall'altra persona) prima di continuare.

## Release

Lo storico delle modifiche **non** sta in un file: sono le Release della repo. `CHANGELOG.md`
non esiste più, non ricrearlo.

Per ogni PR che questa sessione apre:
- il **titolo della PR** è la voce di changelog — finisce tale e quale nelle note generate
  da GitHub, quindi scrivilo come lo vorresti leggere nello storico;
- mettici sopra **una label** della tassonomia qui sotto (`gh pr edit <N> --add-label
  <label>`): è quella che decide in che sezione finisce la voce. Senza label la PR compare
  comunque, ma sotto "Altro".

Tassonomia fissa: `interfaccia` · `dashboard` · `costi-fondi` · `runway-budget` ·
`categorie` · `assunzioni-ricavi` · `import-export` · `fix-tecnici` ·
`documentazione-processo`. La mappa label → titolo di sezione sta in
[`.github/release.yml`](.github/release.yml): per aggiungere un argomento nuovo servono sia
la label sulla repo sia una voce lì.

**A fine sessione di lavoro**, quando le PR sono mergiate, pubblica una release:

```bash
gh release create v0.1.0 --title "$(date +%F)" --generate-notes
```

Convenzione: tag `vX.Y.Z` progressivo, titolo = data `YYYY-MM-DD` (è l'intestazione che
l'app mostra nel popup). `--generate-notes` raccoglie da sé tutte le PR mergiate dall'ultimo
tag, già divise per sezione.

Il popup "Changelog" dell'app legge le release dall'API di GitHub a runtime
(`src/lib/changelog/fetchReleases.ts`): appena pubblichi la release compare nell'app, **senza
rebuild né redeploy**.

## Branch

Devono esistere solo due branch di lavoro oltre a `main`: `alessandro/lavoro` e
`leo/lavoro`. Regole:
- Lavora solo sul branch persistente della persona che ha avviato la sessione (chiedi se
  non è chiaro chi sta usando questa sessione). **Mai** `git checkout -b <nome-nuovo>` —
  niente branch nuovi, nemmeno temporanei per un singolo task.
- Se il branch corrente (`git branch --show-current`) non è `alessandro/lavoro` o
  `leo/lavoro`, fermati e chiedi prima di procedere.
- Non cancellare, forzare o riscrivere la storia del branch di lavoro dell'altra persona
  senza conferma esplicita nella chat.
- Prima di iniziare a committare, sincronizza il branch con `origin/main` (fetch + merge)
  così le PR restano piccole e senza conflitti inutili.

`main` è protetto (niente push diretti): ogni modifica passa da una PR aperta dal proprio
branch persistente. Vedi la sezione "Lavorare in due sulla repo" in `README.md` per il
dettaglio del workflow e per il motivo esatto per cui compaiono branch tipo
`<utente>-patch-N` se si modifica un file dall'editor web di GitHub partendo da `main`.
