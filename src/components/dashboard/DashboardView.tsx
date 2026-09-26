import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  PartyPopper,
  TrendingDown,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildProjection, computeBreakEvenStatus } from '@/lib/calculations/projection';
import { computeRunway } from '@/lib/calculations/runway';
import { CHART_COLORS as CATEGORY_COLORS } from '@/lib/charts/colors';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatMonthLabel } from '@/lib/groupByMonth';
import { useAppStore } from '@/lib/storage/store';
import type { BreakEvenStatus } from '@/types/domain';

const STATUS_META: Record<
  BreakEvenStatus,
  { title: string; variant: 'success' | 'warning' | 'destructive'; icon: typeof PartyPopper }
> = {
  ahead: { title: 'Sei in anticipo sull’obiettivo di break-even', variant: 'success', icon: PartyPopper },
  'on-track': { title: 'Sei esattamente in linea con l’obiettivo di break-even', variant: 'success', icon: CheckCircle2 },
  behind: { title: 'Sei in ritardo rispetto all’obiettivo di break-even', variant: 'warning', icon: TrendingDown },
  'at-risk': {
    title: 'A queste condizioni non raggiungi il break-even nel periodo proiettato',
    variant: 'destructive',
    icon: AlertTriangle,
  },
};

const CUMULATIVE_CHART_CONFIG = {
  cumulativePosition: { label: 'Posizione cumulativa', color: 'hsl(158 64% 52%)' },
  cumulativeCosts: { label: 'Costi cumulati', color: 'hsl(0 84% 70%)' },
} satisfies ChartConfig;

const BURN_RATE_CHART_CONFIG = {
  burnRate: { label: 'Burn rate', color: 'hsl(43 96% 56%)' },
} satisfies ChartConfig;

const NET_PROFIT_CHART_CONFIG = {
  netCashFlow: { label: 'Utile netto mese', color: 'hsl(217 91% 68%)' },
  cumulativeNetProfit: { label: 'Utile netto cumulato', color: 'hsl(158 64% 52%)' },
} satisfies ChartConfig;

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

// Su iPhone l'asse Y aveva 80px fissi su ~335 di larghezza: con la notazione compatta
// ("12 K €" invece di "12.000 €") ne bastano 44 e il grafico respira.
function eurCompact(n: number): string {
  return n.toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 0,
  });
}

// Stessa logica di formattazione del box Runway in Budget — qui mostriamo lo stesso identico
// risultato, non un secondo calcolo indipendente.
function formatRunway(result: { isProfitable: boolean; runwayMonths: number | null }): string {
  if (result.isProfitable) return 'Redditizio';
  return `${(result.runwayMonths ?? 0).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} mesi`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-secondary/60">
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView() {
  const isMobile = useIsMobile();
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      budgetItems: s.budgetItems,
      budgetTotale: s.budgetTotale,
      lineItemCategories: s.lineItemCategories,
      fundCategories: s.fundCategories,
      revenueAssumptions: s.revenueAssumptions,
      runwayAssumptions: s.runwayAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  const projections = useMemo(() => buildProjection(state), [state]);
  const breakEven = useMemo(
    () => computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate),
    [projections, state.revenueAssumptions.targetBreakEvenDate],
  );

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of state.lineItems) {
      if (item.type !== 'cost') continue;
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
    }
    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.lineItems]);

  const categoryChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryBreakdown.forEach((entry, i) => {
      config[entry.name] = { label: entry.name, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    });
    return config;
  }, [categoryBreakdown]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = projections.find((p) => p.month === currentMonthKey) ?? projections[0];

  // Stesso identico calcolo del box Runway in Budget: stesse assunzioni (incluso il valore
  // di liquidità scelto liberamente lì), prese dallo stesso stato globale — sempre in sync.
  const runwayResult = useMemo(
    () => computeRunway(state.runwayAssumptions.cashAvailable, state.runwayAssumptions),
    [state.runwayAssumptions],
  );

  // Months from today through the break-even target — the range the "Utile netto mensile"
  // tile can browse, and what "Utile netto totale" sums over (falls back to just the
  // current month if the target is somehow before today).
  const horizonProjections = useMemo(() => {
    const inRange = projections.filter((p) => p.month >= currentMonthKey && p.month <= breakEven.targetMonth);
    if (inRange.length > 0) return inRange;
    return currentMonth ? [currentMonth] : [];
  }, [projections, currentMonthKey, breakEven.targetMonth, currentMonth]);

  const totalNetProfitHorizon = useMemo(
    () => horizonProjections.reduce((sum, p) => sum + p.netCashFlow, 0),
    [horizonProjections],
  );

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const safeMonthIndex = Math.min(Math.max(selectedMonthIndex, 0), Math.max(horizonProjections.length - 1, 0));
  const selectedMonthProjection = horizonProjections[safeMonthIndex];

  const tableProjections = useMemo(
    () => projections.filter((p) => p.month <= breakEven.targetMonth),
    [projections, breakEven.targetMonth],
  );

  const statusMeta = STATUS_META[breakEven.status];
  const StatusIcon = statusMeta.icon;

  // ROI: il punto in cui i ricavi cumulati eguagliano il capitale investito (fondi) — il
  // capitale iniettato è stato "ripreso" dai ricavi. Diverso dal break-even (ricavi = costi):
  // ha senso solo se c'è del capitale registrato, altrimenti la soglia sarebbe 0 e banale.
  const roiMonth = useMemo(() => {
    if (state.fundEntries.length === 0) return null;
    return projections.find((p) => p.cumulativeRevenue >= p.cumulativeFunds)?.month ?? null;
  }, [projections, state.fundEntries.length]);

  return (
    <div className="space-y-4">
      <Alert variant={statusMeta.variant}>
        <StatusIcon className="h-4 w-4" />
        <AlertTitle>{statusMeta.title}</AlertTitle>
        <AlertDescription>
          {breakEven.breakEvenMonth
            ? `Break-even proiettato: ${breakEven.breakEvenMonth} — target: ${breakEven.targetMonth}${
                breakEven.monthsDelta ? ` (${breakEven.monthsDelta > 0 ? '+' : ''}${breakEven.monthsDelta} mesi)` : ''
              }`
            : `Nessun break-even entro l'orizzonte proiettato — target: ${breakEven.targetMonth}`}
        </AlertDescription>
      </Alert>

      {state.fundEntries.length > 0 && (
        <Alert variant={roiMonth ? 'success' : 'warning'}>
          <Coins className="h-4 w-4" />
          <AlertTitle>{roiMonth ? 'ROI raggiunto' : 'ROI non ancora raggiunto'}</AlertTitle>
          <AlertDescription>
            {roiMonth
              ? `A partire da ${roiMonth} i ricavi eguagliano il capitale investito: il capitale iniettato è stato recuperato.`
              : `I ricavi non arrivano ancora a coprire il capitale investito entro l'orizzonte proiettato.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Posizione cumulativa attuale" value={eur(currentMonth?.cumulativePosition ?? 0)} />
        <StatTile label="Burn rate mensile (mese corrente)" value={eur(currentMonth?.burnRate ?? 0)} />
        <StatTile label="Runway" value={formatRunway(runwayResult)} />
        <StatTile label="Ricavo proiettato (mese corrente)" value={eur(currentMonth?.projectedRevenue ?? 0)} />
        <Card className="bg-secondary/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Utile netto mensile
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-6 sm:w-6"
                  disabled={safeMonthIndex === 0}
                  onClick={() => setSelectedMonthIndex((i) => Math.max(i - 1, 0))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-6 sm:w-6"
                  disabled={safeMonthIndex >= horizonProjections.length - 1}
                  onClick={() => setSelectedMonthIndex((i) => Math.min(i + 1, horizonProjections.length - 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-1.5 text-2xl font-bold">{eur(selectedMonthProjection?.netCashFlow ?? 0)}</div>
            {selectedMonthProjection && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatMonthLabel(selectedMonthProjection.month)}
              </div>
            )}
          </CardContent>
        </Card>
        <StatTile label="Utile netto totale (mese corrente → target)" value={eur(totalNetProfitHorizon)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posizione cumulativa: fondi + ricavi vs costi</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CUMULATIVE_CHART_CONFIG} className="h-[280px] w-full">
            <AreaChart data={projections}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={isMobile ? 24 : 5}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v: number) => (isMobile ? eurCompact(v) : eur(v))}
                width={isMobile ? 44 : 80}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="cumulativePosition"
                stroke="var(--color-cumulativePosition)"
                fill="var(--color-cumulativePosition)"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCosts"
                stroke="var(--color-cumulativeCosts)"
                fill="var(--color-cumulativeCosts)"
                fillOpacity={0.08}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Burn rate mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={BURN_RATE_CHART_CONFIG} className="h-[240px] w-full">
              <BarChart data={projections}>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={isMobile ? 24 : 5}
              />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: number) => (isMobile ? eurCompact(v) : eur(v))}
                  width={isMobile ? 44 : 80}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                <Bar dataKey="burnRate" fill="var(--color-burnRate)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costi per categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun costo ancora registrato.</p>
            ) : (
              <ChartContainer config={categoryChartConfig} className="h-[240px] w-full">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    label
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Utile netto: mensile e cumulato
            <InfoTooltip content="Entrate + ricavi meno costi, senza contare i Fondi disponibili — è il conto economico puro, diverso dalla posizione cumulativa qui sopra (che invece include il capitale)." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={NET_PROFIT_CHART_CONFIG} className="h-[280px] w-full">
            <ComposedChart data={projections}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={isMobile ? 24 : 5}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v: number) => (isMobile ? eurCompact(v) : eur(v))}
                width={isMobile ? 44 : 80}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => eur(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="netCashFlow" fill="var(--color-netCashFlow)" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="cumulativeNetProfit"
                stroke="var(--color-cumulativeNetProfit)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabella mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">Mese</TableHead>
                <TableHead>Costo reale</TableHead>
                <TableHead>Entrata reale</TableHead>
                <TableHead>Ricavo proiettato</TableHead>
                <TableHead>Burn rate</TableHead>
                <TableHead>Utile netto mese</TableHead>
                <TableHead>Utile netto cumulato</TableHead>
                <TableHead>Posizione cumulativa</TableHead>
                <TableHead>Break-even</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProjections.map((p) => (
                <TableRow key={p.month}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">{p.month}</TableCell>
                  <TableCell>{eur(p.actualCost)}</TableCell>
                  <TableCell>{eur(p.actualIncome)}</TableCell>
                  <TableCell>{eur(p.projectedRevenue)}</TableCell>
                  <TableCell>{eur(p.burnRate)}</TableCell>
                  <TableCell>{eur(p.netCashFlow)}</TableCell>
                  <TableCell>{eur(p.cumulativeNetProfit)}</TableCell>
                  <TableCell>{eur(p.cumulativePosition)}</TableCell>
                  <TableCell>{p.isBreakEven ? '✅' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
