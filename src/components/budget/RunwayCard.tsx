import { useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { computeRunway } from '@/lib/calculations/runway';
import { useAppStore } from '@/lib/storage/store';
import { cn } from '@/lib/utils';
import type { BurnInputMode, RunwayProjectionMode } from '@/types/domain';

const DETAILED_BURN_FIELDS = [
  ['salariesAndTeam', 'Stipendi & Team'],
  ['toolsAndSoftware', 'Strumenti & Software'],
  ['officeAndOperations', 'Ufficio & Operazioni'],
  ['marketingAndSales', 'Marketing & Vendite'],
  ['other', 'Altro'],
] as const;

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function formatRunwayMonths(months: number): string {
  return `${months.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mesi`;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix emette stringa vuota quando si ri-clicca l'opzione attiva: qui una scelta
      // deve sempre esserci, quindi il valore vuoto si ignora.
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="grid grid-cols-2 gap-0 overflow-hidden rounded-md border border-input"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className={cn(
            'h-auto rounded-none px-3 py-3 text-sm font-medium text-muted-foreground sm:py-2',
            'hover:bg-transparent hover:text-foreground',
            'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          )}
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default function RunwayCard() {
  const runway = useAppStore((s) => s.runwayAssumptions);
  const update = useAppStore((s) => s.updateRunwayAssumptions);

  const result = useMemo(() => computeRunway(runway.cashAvailable, runway), [runway]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Runway
            <InfoTooltip content="Quanti mesi di liquidità hai, da oggi." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <FieldLabel>Tipo di input spesa</FieldLabel>
            <SegmentedToggle<BurnInputMode>
              value={runway.burnInputMode}
              onChange={(v) => update({ burnInputMode: v })}
              options={[
                { value: 'aggregate', label: 'Aggregato' },
                { value: 'detailed', label: 'Dettagliato' },
              ]}
            />
          </div>

          <div>
            <FieldLabel>Proiezione</FieldLabel>
            <SegmentedToggle<RunwayProjectionMode>
              value={runway.projectionMode}
              onChange={(v) => update({ projectionMode: v })}
              options={[
                { value: 'static', label: 'Statica' },
                { value: 'dynamic', label: 'Dinamica' },
              ]}
            />
          </div>

          <div>
            <FieldLabel>Liquidità disponibile oggi</FieldLabel>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              value={runway.cashAvailable}
              onChange={(e) => update({ cashAvailable: Number(e.target.value) })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Cifra libera, scelta da te — scollegata dal totale dei Fondi disponibili in Costi & Fondi.
            </p>
          </div>

          {runway.burnInputMode === 'aggregate' ? (
            <div>
              <FieldLabel>Spesa mensile</FieldLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={runway.aggregateMonthlyBurn}
                onChange={(e) => update({ aggregateMonthlyBurn: Number(e.target.value) })}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <FieldLabel>Dettaglio spesa mensile</FieldLabel>
              {DETAILED_BURN_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={runway.detailedBurn[key]}
                    onChange={(e) =>
                      update({ detailedBurn: { ...runway.detailedBurn, [key]: Number(e.target.value) } })
                    }
                  />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Spesa mensile totale</span>
                <span className="font-semibold">{eur(result.totalMonthlyBurn)}</span>
              </div>
            </div>
          )}

          <div>
            <FieldLabel>
              Entrate mensili, se presenti <span className="normal-case">(opzionale)</span>
            </FieldLabel>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              value={runway.monthlyRevenue}
              onChange={(e) => update({ monthlyRevenue: Number(e.target.value) })}
            />
          </div>

          {runway.projectionMode === 'dynamic' && (
            <div className="space-y-3 border-t border-border pt-3">
              <FieldLabel>Assunzioni di crescita</FieldLabel>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Crescita mensile spesa attesa (opzionale) %
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={runway.burnGrowthPct}
                  onChange={(e) => update({ burnGrowthPct: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Crescita mensile entrate attesa (opzionale) %
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={runway.revenueGrowthPct}
                  onChange={(e) => update({ revenueGrowthPct: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pannello scuro anche in tema chiaro: in tema scuro va schiarito, altrimenti si
          confonderebbe con lo sfondo della pagina e smetterebbe di risaltare. */}
      <Card className="border-l-4 border-l-emerald-500 bg-slate-900 text-slate-50 dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Runway</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              {runway.projectionMode === 'static' ? 'Statica' : 'Dinamica'}
            </span>
          </div>
          <div className={cn('mt-3 text-4xl font-bold', result.isProfitable && 'text-emerald-400')}>
            {result.isProfitable ? 'Redditizio' : formatRunwayMonths(result.runwayMonths ?? 0)}
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {result.isProfitable
              ? 'Le entrate coprono già la spesa: a questo ritmo la liquidità non si esaurisce.'
              : 'Al ritmo di spesa attuale, è quando la liquidità arriva a zero — assumendo nessun nuovo capitale in ingresso.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
