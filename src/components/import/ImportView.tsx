import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FolderSync, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  INTERNAL_FIELDS,
  normalizeRows,
  suggestMapping,
  type ColumnMapping,
  type TypeFallback,
} from '@/lib/import/columnMapping';
import { parseFile, type RawSheet } from '@/lib/import/parseFile';
import { listRepoImports, repoImportToFile } from '@/lib/import/repoImports';
import { useAppStore } from '@/lib/storage/store';

type Step = 'upload' | 'mapping' | 'confirm';

export default function ImportView() {
  const importLineItems = useAppStore((s) => s.importLineItems);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [sheet, setSheet] = useState<RawSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: -1,
    category: -1,
    description: -1,
    amount: -1,
    type: -1,
  });
  const [typeFallback, setTypeFallback] = useState<TypeFallback>('all-cost');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [error, setError] = useState<string>('');

  async function handleFile(file: File) {
    setError('');
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0) {
        setError('Il file sembra vuoto o non leggibile.');
        return;
      }
      setSheet(parsed);
      setMapping(suggestMapping(parsed.headers));
      setFileName(file.name);
      setStep('mapping');
    } catch {
      setError('Non sono riuscito a leggere il file. Assicurati che sia un CSV o un XLSX valido.');
    }
  }

  const normalized = useMemo(() => {
    if (!sheet || step !== 'confirm') return null;
    return normalizeRows(sheet, { mapping, typeFallback });
  }, [sheet, mapping, typeFallback, step]);

  const canProceedToConfirm = mapping.date > -1 && mapping.amount > -1;
  const repoFiles = useMemo(() => listRepoImports(), []);

  function reset() {
    setStep('upload');
    setSheet(null);
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function confirmImport() {
    if (!normalized) return;
    const count = normalized.items.length;
    importLineItems(normalized.items, importMode);
    toast.success(`${count} ${count === 1 ? 'voce importata' : 'voci importate'}`, {
      description: importMode === 'replace' ? 'Le voci precedenti sono state sostituite.' : 'Aggiunte alle voci esistenti.',
    });
    reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Importa costi/entrate da CSV o Excel
          <InfoTooltip content="Il file originale non viene mai modificato: i dati vengono letti una sola volta e copiati nella dashboard, dove puoi editarli liberamente." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'upload' && repoFiles.length > 0 && (
          <div className="mb-4 rounded-lg border border-border p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FolderSync className="h-3.5 w-3.5" />
              Rilevati in <code>csv-imports/</code>
            </p>
            <ul className="flex flex-col gap-2">
              {repoFiles.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{f.name}</span>
                  <Button size="sm" variant="secondary" onClick={() => void handleFile(repoImportToFile(f))}>
                    Importa
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 'upload' && (
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <UploadCloud className="h-6 w-6" />
            Trascina qui un file .csv o .xlsx, oppure clicca per selezionarlo
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step !== 'upload' && sheet && (
          <>
            <p className="text-sm text-muted-foreground">
              File: <strong className="text-foreground">{fileName}</strong> — {sheet.rows.length} righe
              rilevate
            </p>

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mappa le colonne
            </h3>
            {INTERNAL_FIELDS.map((field) => (
              <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3" key={field.key}>
                <Label className="font-normal text-muted-foreground sm:w-48 sm:shrink-0">
                  {field.label}
                  {field.required ? ' *' : ''}
                </Label>
                <Select
                  value={String(mapping[field.key])}
                  onValueChange={(value) => setMapping((m) => ({ ...m, [field.key]: Number(value) }))}
                >
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">— nessuna —</SelectItem>
                    {sheet.headers.map((h, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {h || `Colonna ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {mapping.type === -1 && (
              <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Label className="font-normal text-muted-foreground sm:w-48 sm:shrink-0">
                  Come determinare costo/entrata
                </Label>
                <Select value={typeFallback} onValueChange={(v) => setTypeFallback(v as TypeFallback)}>
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-cost">Tutte le righe sono costi</SelectItem>
                    <SelectItem value="sign">Usa il segno dell&apos;importo (negativo = costo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Anteprima righe grezze
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {sheet.headers.map((h, i) => (
                    <TableHead key={i}>{h || `Colonna ${i + 1}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {sheet.headers.map((_, j) => (
                      <TableCell key={j}>{row[j] ?? ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {step === 'mapping' && (
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={reset}>
                  Annulla
                </Button>
                <Button disabled={!canProceedToConfirm} onClick={() => setStep('confirm')}>
                  Continua
                  <ArrowRight />
                </Button>
              </div>
            )}

            {step === 'confirm' && normalized && (
              <>
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Anteprima normalizzata ({normalized.items.length} righe valide
                  {normalized.skippedRowCount > 0
                    ? `, ${normalized.skippedRowCount} scartate (data/importo non validi)`
                    : ''}
                  )
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normalized.items.slice(0, 10).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.amount.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'cost' ? 'destructive' : 'success'}>
                            {item.type === 'cost' ? 'Costo' : 'Entrata'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mb-1 mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <Label className="font-normal text-muted-foreground sm:w-48 sm:shrink-0">Modalità import</Label>
                  <Select value={importMode} onValueChange={(v) => setImportMode(v as 'append' | 'replace')}>
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="append">Aggiungi ai dati esistenti</SelectItem>
                      <SelectItem value="replace">Sostituisci tutti i dati esistenti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setStep('mapping')}>
                    <ArrowLeft />
                    Indietro
                  </Button>
                  <Button disabled={normalized.items.length === 0} onClick={confirmImport}>
                    Importa {normalized.items.length} righe
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
