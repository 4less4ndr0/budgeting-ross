import { useMemo, useState } from 'react';
import { FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { listRepoSnapshots } from '@/lib/import/repoImports';
import { useAppStore } from '@/lib/storage/store';

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Shows any full-state snapshot (costi, fondi, assunzioni ricavi) found in csv-imports/
 * — prodotto dal menu "Esporta" → "Salva stato (.json)" — e permette di ricaricarlo
 * con un click, sovrascrivendo lo stato corrente del dispositivo.
 *
 * La conferma è inline (non window.confirm): alcuni browser in-app / webapp installate
 * sospendono i dialoghi nativi, quindi un confirm() lì risulterebbe silenziosamente nullo.
 */
export default function SnapshotRestoreCard() {
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const snapshots = useMemo(() => listRepoSnapshots(), []);
  const [pendingName, setPendingName] = useState<string | null>(null);

  if (snapshots.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Stato salvato
          <InfoTooltip
            content={
              <>
                Rilevato in <code>csv-imports/</code>: sostituisce costi, fondi e assunzioni ricavi con quelli
                salvati in quel momento (override compresi). Utile per riportare un altro dispositivo alla stessa
                identica situazione.
              </>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {snapshots.map(({ name, snapshot }) => (
            <li key={name} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 truncate">
                  <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {name}
                    <span className="block text-xs text-muted-foreground">
                      Salvato il {formatSavedAt(snapshot.savedAt)}
                    </span>
                  </span>
                </span>
                {pendingName !== name && (
                  <Button size="sm" variant="secondary" onClick={() => setPendingName(name)}>
                    Carica questo stato
                  </Button>
                )}
              </div>
              {pendingName === name && (
                <Alert className="mt-3">
                  <AlertDescription>
                    Sovrascrive i dati attuali di questo dispositivo (costi, fondi, assunzioni ricavi) con
                    quelli salvati. Confermi?
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          loadSnapshot(snapshot);
                          setPendingName(null);
                          toast.success('Stato ripristinato', {
                            description: 'Costi, fondi e assunzioni sono quelli dello snapshot.',
                          });
                        }}
                      >
                        Sì, sovrascrivi
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setPendingName(null)}>
                        Annulla
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
