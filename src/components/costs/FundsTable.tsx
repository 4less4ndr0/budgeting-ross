import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CategoryCombobox from '@/components/costs/CategoryCombobox';
import CategoryFilter from '@/components/costs/CategoryFilter';
import { formatMonthLabel, groupByMonth } from '@/lib/groupByMonth';
import { useAppStore } from '@/lib/storage/store';
import type { FundEntry } from '@/types/domain';

function formatEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function FundEntryCard({
  entry,
  categories,
  onUpdate,
  onDeleteCategory,
  onRemove,
}: {
  entry: FundEntry;
  categories: string[];
  onUpdate: (patch: Partial<Omit<FundEntry, 'id'>>) => void;
  onDeleteCategory: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          type="date"
          className="flex-1"
          value={entry.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={onRemove} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <div className="mb-2">
        <CategoryCombobox
          value={entry.category}
          options={categories}
          onChange={(category) => onUpdate({ category })}
          onDelete={onDeleteCategory}
        />
      </div>
      <Input
        type="text"
        placeholder="Descrizione"
        className="mb-2"
        value={entry.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <Input
        type="number"
        step="0.01"
        placeholder="Importo (€)"
        value={entry.amount}
        onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
      />
    </div>
  );
}

export default function FundsTable() {
  const fundEntries = useAppStore((s) => s.fundEntries);
  const addFundEntry = useAppStore((s) => s.addFundEntry);
  const updateFundEntry = useAppStore((s) => s.updateFundEntry);
  const removeFundEntry = useAppStore((s) => s.removeFundEntry);
  const fundCategories = useAppStore((s) => s.fundCategories);
  const removeFundCategory = useAppStore((s) => s.removeFundCategory);

  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const filteredFundEntries = useMemo(
    () => (categoryFilter.length === 0 ? fundEntries : fundEntries.filter((e) => categoryFilter.includes(e.category))),
    [fundEntries, categoryFilter],
  );
  const groups = useMemo(() => groupByMonth(filteredFundEntries), [filteredFundEntries]);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [openMonth, setOpenMonth] = useState<string | undefined>(() => groups[0]?.[0]);

  function handleAdd() {
    addFundEntry({
      date: new Date().toISOString().slice(0, 10),
      category: '',
      amount: 0,
      description: '',
    });
    setOpenMonth(currentMonthKey);
  }

  function handleRemove(id: string) {
    removeFundEntry(id);
    toast.success('Fondo eliminato');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Fondi disponibili
          <InfoTooltip content="Capitale già disponibile per il business (risparmi, investimenti, incassi già raccolti) — si somma ai ricavi proiettati per calcolare il break-even. Raggruppati per mese, dal più recente." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top CTA: adding a fund shouldn't require scrolling past the whole list first. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={handleAdd}>
            <Plus />
            Aggiungi fondo
          </Button>
          <CategoryFilter categories={fundCategories} selected={categoryFilter} onChange={setCategoryFilter} />
        </div>

        {groups.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nessun fondo ancora registrato.</p>}

        <Accordion type="single" collapsible value={openMonth} onValueChange={setOpenMonth}>
          {groups.map(([month, entries]) => {
            const total = entries.reduce((sum, e) => sum + e.amount, 0);

            return (
              <AccordionItem key={month} value={month}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pr-2">
                    <span className="flex items-baseline gap-2">
                      <span>{formatMonthLabel(month)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {entries.length} {entries.length === 1 ? 'fondo' : 'fondi'}
                      </span>
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatEUR(total)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Mobile: one card per row. */}
                  <div className="space-y-3 sm:hidden">
                    {entries.map((entry) => (
                      <FundEntryCard
                        key={entry.id}
                        entry={entry}
                        categories={fundCategories}
                        onUpdate={(patch) => updateFundEntry(entry.id, patch)}
                        onDeleteCategory={removeFundCategory}
                        onRemove={() => handleRemove(entry.id)}
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
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Input
                                type="date"
                                value={entry.date}
                                onChange={(e) => updateFundEntry(entry.id, { date: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <CategoryCombobox
                                value={entry.category}
                                options={fundCategories}
                                onChange={(category) => updateFundEntry(entry.id, { category })}
                                onDelete={removeFundCategory}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={entry.description}
                                onChange={(e) => updateFundEntry(entry.id, { description: e.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={entry.amount}
                                onChange={(e) => updateFundEntry(entry.id, { amount: Number(e.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(entry.id)}
                                title="Elimina"
                              >
                                <Trash2 className="text-muted-foreground hover:text-destructive" />
                              </Button>
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
    </Card>
  );
}
