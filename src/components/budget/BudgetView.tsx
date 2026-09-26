import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RunwayCard from '@/components/budget/RunwayCard';
import { CHART_COLORS } from '@/lib/charts/colors';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useAppStore } from '@/lib/storage/store';
import type { BudgetItem } from '@/types/domain';

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function colorFor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function LockToggle({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      title={locked ? 'Sblocca questa voce' : 'Blocca questa voce'}
    >
      {locked ? <Lock className="text-foreground" /> : <Unlock className="text-muted-foreground" />}
    </Button>
  );
}

function BudgetItemCard({
  item,
  color,
  onUpdate,
  onRemove,
}: {
  item: BudgetItem;
  color: string;
  onUpdate: (patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${item.bloccato ? 'border-foreground/30 bg-secondary/40' : 'border-border'}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Input
          type="text"
          placeholder="Voce"
          className="flex-1"
          disabled={item.bloccato}
          value={item.nome}
          onChange={(e) => onUpdate({ nome: e.target.value })}
        />
        <LockToggle locked={item.bloccato} onToggle={() => onUpdate({ bloccato: !item.bloccato })} />
        <Button variant="ghost" size="icon" onClick={onRemove} title="Elimina">
          <Trash2 className="text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      <Input
        type="number"
        step="0.01"
        placeholder="Importo (€)"
        disabled={item.bloccato}
        value={item.importo}
        onChange={(e) => onUpdate({ importo: Number(e.target.value) })}
      />
    </div>
  );
}

export default function BudgetView() {
  const isMobile = useIsMobile();
  const budgetItems = useAppStore((s) => s.budgetItems);
  const addBudgetItem = useAppStore((s) => s.addBudgetItem);
  const updateBudgetItem = useAppStore((s) => s.updateBudgetItem);
  const removeBudgetItem = useAppStore((s) => s.removeBudgetItem);
  const budgetTotale = useAppStore((s) => s.budgetTotale);
  const setBudgetTotale = useAppStore((s) => s.setBudgetTotale);

  const allocato = useMemo(() => budgetItems.reduce((sum, i) => sum + (i.importo || 0), 0), [budgetItems]);
  const bloccatoTotale = useMemo(
    () => budgetItems.filter((i) => i.bloccato).reduce((sum, i) => sum + (i.importo || 0), 0),
    [budgetItems],
  );
  const margine = budgetTotale - allocato;
  const sforato = budgetTotale > 0 && allocato > budgetTotale;

  // Chart slices skip zero/negative amounts (an empty or negative slice has nothing to draw)
  // and unnamed voci fall back to a placeholder label so the legend/tooltip aren't blank.
  const chartData = useMemo(
    () =>
      budgetItems
        .filter((i) => i.importo > 0)
        .map((i, idx) => ({ id: i.id, name: i.nome.trim() || `Voce ${idx + 1}`, value: i.importo })),
    [budgetItems],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((entry, i) => {
      config[entry.id] = { label: entry.name, color: colorFor(i) };
    });
    return config;
  }, [chartData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Budget totale
            <InfoTooltip content="Il tetto di spesa previsto. Blocca le voci già decise e gioca con le altre restando dentro questo limite." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-1.5 sm:max-w-xs">
            <Label className="font-normal text-muted-foreground">Budget totale previsto (€)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0 = nessun limite impostato"
              value={budgetTotale || ''}
              onChange={(e) => setBudgetTotale(e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-secondary/60 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Budget totale
              </div>
              <div className="mt-1 text-lg font-bold">{eur(budgetTotale)}</div>
            </div>
            <div className="rounded-lg bg-secondary/60 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Allocato</div>
              <div className="mt-1 text-lg font-bold">{eur(allocato)}</div>
            </div>
            <div className="rounded-lg bg-secondary/60 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Di cui bloccato
              </div>
              <div className="mt-1 text-lg font-bold">{eur(bloccatoTotale)}</div>
            </div>
            <div className="rounded-lg bg-secondary/60 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Margine</div>
              <div className={`mt-1 text-lg font-bold ${sforato ? 'text-destructive' : ''}`}>
                {budgetTotale > 0 ? eur(margine) : '—'}
              </div>
            </div>
          </div>

          {budgetTotale > 0 && (
            <Alert className="mt-4" variant={sforato ? 'destructive' : 'success'}>
              {sforato ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertTitle>{sforato ? 'Hai sforato il budget' : 'Sei dentro il budget'}</AlertTitle>
              <AlertDescription>
                {sforato
                  ? `Le voci allocate superano il budget totale di ${eur(Math.abs(margine))}.`
                  : `Hai ancora ${eur(margine)} di margine prima di sforare.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Voci di budget
              <InfoTooltip content="Nome libero e importo per ogni voce — aggiungine quante ne servono. Blocca una voce per escluderla dalle modifiche mentre riequilibri le altre." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: one card per row, consistent with LineItemsTable/FundsTable. */}
            <div className="space-y-3 sm:hidden">
              {budgetItems.map((item, i) => (
                <BudgetItemCard
                  key={item.id}
                  item={item}
                  color={colorFor(i)}
                  onUpdate={(patch) => updateBudgetItem(item.id, patch)}
                  onRemove={() => removeBudgetItem(item.id)}
                />
              ))}
            </div>

            {/* Desktop/tablet: the original table. */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Voce</TableHead>
                    <TableHead>Importo (€)</TableHead>
                    <TableHead />
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems.map((item, i) => (
                    <TableRow key={item.id} className={item.bloccato ? 'bg-secondary/40' : undefined}>
                      <TableCell className="w-4">
                        <span
                          className="block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: colorFor(i) }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Voce"
                          disabled={item.bloccato}
                          value={item.nome}
                          onChange={(e) => updateBudgetItem(item.id, { nome: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          disabled={item.bloccato}
                          value={item.importo}
                          onChange={(e) => updateBudgetItem(item.id, { importo: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <LockToggle
                          locked={item.bloccato}
                          onToggle={() => updateBudgetItem(item.id, { bloccato: !item.bloccato })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBudgetItem(item.id)}
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

            {budgetItems.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nessuna voce ancora inserita.</p>
            )}

            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => addBudgetItem({ nome: '', importo: 0, bloccato: false })}
            >
              <Plus />
              Aggiungi voce
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Ripartizione del budget
              <InfoTooltip content="Ogni voce con un importo > 0 diventa una fetta della ciambella." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aggiungi almeno una voce con un importo per vedere il grafico.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm">
                  Totale voci: <span className="font-semibold">{eur(allocato)}</span>
                </p>
                <ChartContainer config={chartConfig} className="h-[320px] w-full">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={isMobile ? 55 : 80}
                      outerRadius={isMobile ? 92 : 130}
                      paddingAngle={chartData.length > 1 ? 2 : 0}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={entry.id} fill={colorFor(i)} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <RunwayCard />
    </div>
  );
}
