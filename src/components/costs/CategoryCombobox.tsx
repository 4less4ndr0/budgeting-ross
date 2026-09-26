import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function CategoryCombobox({
  value,
  options,
  onChange,
  onDelete,
  placeholder = 'Seleziona categoria',
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onDelete: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Il valore attuale della riga resta sempre selezionabile/visibile, anche se qualcuno lo ha
  // nel frattempo eliminato dall'elenco gestito — altrimenti il trigger apparirebbe vuoto pur
  // avendo la voce ancora quel testo (le voci esistenti "restano com'erano").
  const allOptions = useMemo(() => {
    const set = new Set(options);
    if (value) set.add(value);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [options, value]);

  const trimmedSearch = search.trim();
  const filtered = useMemo(
    () => allOptions.filter((o) => o.toLowerCase().includes(trimmedSearch.toLowerCase())),
    [allOptions, trimmedSearch],
  );
  const hasExactMatch = allOptions.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase());

  function selectCategory(name: string) {
    onChange(name);
    setSearch('');
    setOpen(false);
  }

  function requestDelete(name: string) {
    setOpen(false);
    setPendingDelete(name);
  }

  function confirmDelete() {
    if (pendingDelete) {
      onDelete(pendingDelete);
      toast.success(`Categoria "${pendingDelete}" eliminata`, {
        description: 'Le voci che la usavano mantengono il loro testo.',
      });
    }
    setPendingDelete(null);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cerca o crea categoria..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filtered.length === 0 && trimmedSearch === '' && (
                <CommandEmpty>Nessuna categoria ancora.</CommandEmpty>
              )}
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => selectCategory(option)}
                    className="group justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Check className={cn('h-4 w-4 shrink-0', option === value ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{option}</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Elimina categoria "${option}"`}
                          className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(option);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Elimina categoria &quot;{option}&quot;</TooltipContent>
                    </Tooltip>
                  </CommandItem>
                ))}
              </CommandGroup>
              {trimmedSearch !== '' && !hasExactMatch && (
                <CommandGroup>
                  <CommandItem value={`__create__${trimmedSearch}`} onSelect={() => selectCategory(trimmedSearch)}>
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      Crea categoria &quot;{trimmedSearch}&quot;
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la categoria &quot;{pendingDelete}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Non comparirà più tra le opzioni per nuove scelte. Le voci che la usano già non vengono toccate:
              mantengono il loro testo esattamente com&apos;è.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
