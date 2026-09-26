import { useMemo, useState } from 'react';
import { Plus, Repeat, Trash2 } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CategoryCombobox from '@/components/costs/CategoryCombobox';
import CategoryFilter from '@/components/costs/CategoryFilter';
import { formatMonthLabel, groupByMonth } from '@/lib/groupByMonth';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { EntryType, LineItem } from '@/types/domain';

function formatEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function RecurringToggle({ item, onToggle }: { item: LineItem; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      title={
        item.recurring
          ? 'Ricorrente — clicca per interrompere la serie dal mese successivo'
          : item.recurringGroupId
            ? 'Rendi di nuovo ricorrente questa voce'
            : 'Genera una voce identica per ogni mese fino al target di break-even'
      }
    >
      <Repeat className={item.recurring ? 'text-primary' : 'text-muted-foreground'} />
    </Button>
  );
}

function LineItemCard({
  item,
  categories,
  onUpdate,
  onDeleteCategory,
  onToggleRecurring,
  onRequestDelete,
}: {
  item: LineItem;
  categories: string[];
  onUpdate: (patch: Partial<Omit<LineItem, 'id'>>) => void;
  onDeleteCategory: (name: string) => void;
  onToggleRecurring: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          type="date"
          className="flex-1"
          value={item.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
        />
        <RecurringToggle item={item} onToggle={onToggleRecurring} />
        <Button variant="ghost" size="icon" onClick={onRequestDelete} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="mb-2">
        <CategoryCombobox
          value={item.category}
          options={categories}
          onChange={(category) => onUpdate({ category })}
          onDelete={onDeleteCategory}
        />
      </div>
      <Input
        type="text"
        placeholder="Descrizione"
        className="mb-2"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <div className="flex gap-2">
        <Input
          type="number"
          step="0.01"
          placeholder="Importo (€)"
          className="min-w-0 flex-1"
          value={item.amount}
          onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
        />
        <Select value={item.type} onValueChange={(value) => onUpdate({ type: value as EntryType })}>
          {/* w-32 fisso lasciava troppo poco all'importo sugli iPhone stretti: qui basta
              quanto serve a "Entrata", e sui telefoni più larghi torna alla misura di prima. */}
          <SelectTrigger className="w-[7.5rem] shrink-0 sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">Costo</SelectItem>
            <SelectItem value="income">Entrata</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function LineItemsTable() {
  const lineItems = useAppStore((s) => s.lineItems);
  const addLineItem = useAppStore((s) => s.addLineItem);
  const updateLineItem = useAppStore((s) => s.updateLineItem);
  const removeLineItem = useAppStore((s) => s.removeLineItem);
  const expandRecurring = useAppStore((s) => s.expandRecurring);
  const endRecurringFrom = useAppStore((s) => s.endRecurringFrom);
  const lineItemCategories = useAppStore((s) => s.lineItemCategories);
  const removeLineItemCategory = useAppStore((s) => s.removeLineItemCategory);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const filteredLineItems = useMemo(
    () => (categoryFilter.length === 0 ? lineItems : lineItems.filter((li) => categoryFilter.includes(li.category))),
    [lineItems, categoryFilter],
  );
  const groups = useMemo(() => groupByMonth(filteredLineItems), [filteredLineItems]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [openMonth, setOpenMonth] = useState<string | undefined>(() => groups[0]?.[0]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingEndRecurringId, setPendingEndRecurringId] = useState<string | null>(null);
  const pendingEndRecurringItem = lineItems.find((li) => li.id === pendingEndRecurringId) ?? null;

  function handleAdd() {
    addLineItem({
      date: new Date().toISOString().slice(0, 10),
      category: '',
      description: '',
      amount: 0,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    // Jump to (and reveal) the current month's group, since that's always where a new entry lands.
    setOpenMonth(currentMonthKey);
  }

  function confirmDelete() {
    if (pendingDeleteId) {
      removeLineItem(pendingDeleteId);
      toast.success('Voce eliminata');
    }
    setPendingDeleteId(null);
  }

  function handleToggleRecurring(item: LineItem) {
    if (item.recurring) {
      setPendingEndRecurringId(item.id);
    } else {
      expandRecurring(item.id);
    }
  }

  function confirmEndRecurring() {
    if (pendingEndRecurringId) {
      endRecurringFrom(pendingEndRecurringId);
      toast.success('Serie ricorrente interrotta', {
        description: 'Le voci dei mesi successivi sono state rimosse.',
      });
    }
    setPendingEndRecurringId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Voci di costo ed entrata
          <InfoTooltip
            content={
              <>
                Modifica liberamente qualsiasi valore: sono i tuoi dati di lavoro, non il file importato.
                Raggruppate per mese, dal più recente. L&apos;icona{' '}
                <Repeat className="inline h-3.5 w-3.5 align-text-bottom" /> genera una voce identica per ogni mese
                successivo fino alla data target di break-even, visibile e modificabile come le altre.
                Ri-cliccandola su una voce già ricorrente, con conferma, interrompe la serie dal mese successivo
                in poi.
              </>
            }
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top CTA: adding an entry shouldn't require scrolling past the whole list first. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus />
            Aggiungi voce
          </Button>
          <CategoryFilter categories={lineItemCategories} selected={categoryFilter} onChange={setCategoryFilter} />
        </div>

        {groups.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Nessuna voce ancora. Importa un file o aggiungine una.
          </p>
        )}

        <Accordion type="single" collapsible value={openMonth} onValueChange={setOpenMonth}>
          {groups.map(([month, items]) => {
            const totalCost = items.filter((i) => i.type === 'cost').reduce((sum, i) => sum + i.amount, 0);
            const totalIncome = items.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
            const net = totalIncome - totalCost;

            return (
              <AccordionItem key={month} value={month}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-2">
                    <span className="flex items-baseline gap-2">
                      <span>{formatMonthLabel(month)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {items.length} {items.length === 1 ? 'voce' : 'voci'}
                      </span>
                    </span>
                    <span className={cn('font-semibold', net < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
                      {formatEUR(net)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Mobile: one card per row. */}
                  <div className="space-y-3 sm:hidden">
                    {items.map((item) => (
                      <LineItemCard
                        key={item.id}
                        item={item}
                        categories={lineItemCategories}
                        onDeleteCategory={removeLineItemCategory}
                        onUpdate={(patch) => updateLineItem(item.id, patch)}
                        onToggleRecurring={() => handleToggleRecurring(item)}
                        onRequestDelete={() => setPendingDeleteId(item.id)}
                      />
                    ))}
                  </div>

                  {/* Desktop/tablet: table, one per month group. */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Importo (€)</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.date}
                                onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <CategoryCombobox
                                value={item.category}
                                options={lineItemCategories}
                                onChange={(category) => updateLineItem(item.id, { category })}
                                onDelete={removeLineItemCategory}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => updateLineItem(item.id, { amount: Number(e.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.type}
                                onValueChange={(value) => updateLineItem(item.id, { type: value as EntryType })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cost">Costo</SelectItem>
                                  <SelectItem value="income">Entrata</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <RecurringToggle item={item} onToggle={() => handleToggleRecurring(item)} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPendingDeleteId(item.id)}
                                  title="Elimina"
                                >
                                  <Trash2 className="text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa voce?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;operazione non è reversibile: la voce verrà rimossa definitivamente da questa dashboard (il
              file originale, se importata, non viene comunque mai toccato).
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

      <AlertDialog
        open={pendingEndRecurringId !== null}
        onOpenChange={(open) => !open && setPendingEndRecurringId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interrompere la ricorrenza?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEndRecurringItem && (
                <>
                  Le voci generate per i mesi successivi a{' '}
                  <strong>{formatMonthLabel(pendingEndRecurringItem.date.slice(0, 7))}</strong> verranno eliminate.
                  Quella di {formatMonthLabel(pendingEndRecurringItem.date.slice(0, 7))} e le precedenti restano,
                  ma non saranno più contate come ricorrenti.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmEndRecurring}
            >
              Interrompi ricorrenza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
