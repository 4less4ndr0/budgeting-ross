# csv-imports/

Metti qui dentro i file CSV del bilancio (es. l'estratto conto esportato dalla banca).
La pagina di import li rileva **in automatico**: appena apri la sezione "Importa", vedrai
un elenco con tutti i CSV presenti in questa cartella, pronti da importare con un click
(stessa mappatura colonne e anteprima di sempre — il file non viene mai modificato).

## stato-sito.json — snapshot completo

Oltre ai CSV di movimenti, questa cartella può contenere anche uno **snapshot completo
dello stato del sito** (costi, fondi, assunzioni ricavi — override compresi), generato dal
tasto "Esporta" → "Salva stato (.json)". Sposta il file scaricato qui (sovrascrivendo
`stato-sito.json` a ogni salvataggio) e committa/pusha: la tab "Importa" lo rileva e con un
click ricarica esattamente quella situazione, anche su un altro dispositivo — utile perché
i dati normalmente restano solo nel browser di chi li ha inseriti (`localStorage`, non
condiviso tra dispositivi).

## Come funziona

- **In locale** (`npm run dev`): basta salvare un nuovo CSV qui dentro, il sito lo rileva
  al volo (o al massimo con un refresh della pagina), senza bisogno di build.
- **Sul sito pubblicato** (GitHub Pages): i CSV vengono inclusi solo con la build, quindi
  serve prima fare `git add`, `commit` e `push` su `main` — il workflow rifà la build e li
  pubblica in automatico.

## Attenzione: repo pubblica

Questa repository è **pubblica**. Ogni CSV committato qui (e la sua cronologia git) resta
visibile a chiunque, anche se in seguito lo cancelli. Mettici solo file che sei d'accordo
a rendere pubblici.

## Convenzione nomi

Un file per ogni importazione, nome libero purché finisca in `.csv`, ad esempio:

```
csv-imports/2026-01-conto-corrente.csv
csv-imports/2026-02-conto-corrente.csv
```
