import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportStateSnapshot } from '@/lib/export/exportSnapshot';
import { exportWorkbook } from '@/lib/export/exportWorkbook';
import type { AppState } from '@/types/domain';

export default function ExportMenu({ state }: { state: AppState }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <Download />
          Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem
          className="items-start"
          onSelect={() => {
            exportWorkbook(state);
            toast.success('Excel esportato', { description: 'Controlla la cartella dei download.' });
          }}
        >
          <FileSpreadsheet className="mt-0.5" />
          <span>
            <span className="block font-medium">Excel (.xlsx)</span>
            <span className="block text-xs text-muted-foreground">
              Costi, fondi, assunzioni e proiezioni — per Google Sheets/Excel
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="items-start"
          onSelect={() => {
            exportStateSnapshot(state);
            toast.success('Stato salvato', { description: 'Snapshot .json scaricato.' });
          }}
        >
          <FileJson className="mt-0.5" />
          <span>
            <span className="block font-medium">Salva stato (.json)</span>
            <span className="block text-xs text-muted-foreground">
              Sposta il file scaricato in <code>csv-imports/</code> per ricaricare questa
              identica situazione (override compresi) anche da un altro dispositivo
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
