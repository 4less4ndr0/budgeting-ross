import { useMemo, useState, type ReactNode } from 'react';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/storage/store';
import type { RevenueModelType, SaleMode } from '@/types/domain';

function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <Label className="font-normal text-muted-foreground sm:w-48 sm:shrink-0">{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const MONTHS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

/**
 * Three plain <Select> dropdowns instead of a native <input type="date">. The native date
 * input renders inconsistently across browsers (centered on Safari/iOS, left-aligned
 * elsewhere, partially so after CSS overrides) — this renders identically everywhere since
 * it's built from the same Select component used throughout the rest of the app.
 */
function DateTargetPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const date = parseISO(value);
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  function update(newDay: number, newMonth: number, newYear: number) {
    const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
    const clampedDay = Math.min(newDay, maxDay);
    const iso = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    onChange(iso);
  }

  return (
    <div className="flex gap-2">
      <Select value={String(day)} onValueChange={(v) => update(Number(v), month, year)}>
        <SelectTrigger className="w-[4.5rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(month)} onValueChange={(v) => update(day, Number(v), year)}>
        <SelectTrigger className="min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS_IT.map((label, i) => (
            <SelectItem key={label} value={String(i)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => update(day, month, Number(v))}>
        <SelectTrigger className="w-24 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatEUR(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export default function AssumptionsView() {
  const assumptions = useAppStore((s) => s.revenueAssumptions);
  const update = useAppStore((s) => s.updateRevenueAssumptions);
  const lineItems = useAppStore((s) => s.lineItems);

  // Purely local UI state — not persisted, not linked to costRunRateOverride. Checking it
  // fires a one-time write of the current recurring total into the override field; it does
  // not keep the two values in sync afterwards.
  const [useRecurringTotal, setUseRecurringTotal] = useState(false);

  // Total monthly amount of active recurring cost items — one contribution per series
  // (recurringGroupId), not per generated row, otherwise a series spanning N months would
  // count its own amount N times instead of once.
  const recurringMonthlyCostTotal = useMemo(() => {
    const seenGroups = new Set<string>();
    let total = 0;
    for (const li of lineItems) {
      if (!li.recurring || li.type !== 'cost') continue;
      const groupKey = li.recurringGroupId ?? li.id;
      if (seenGroups.has(groupKey)) continue;
      seenGroups.add(groupKey);
      total += li.amount;
    }
    return total;
  }, [lineItems]);

  function handleUseRecurringTotalChange(checked: boolean) {
    setUseRecurringTotal(checked);
    if (checked) {
      update({ costRunRateOverride: recurringMonthlyCostTotal });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Obiettivo break-even</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Data target">
            <DateTargetPicker
              value={assumptions.targetBreakEvenDate}
              onChange={(iso) => update({ targetBreakEvenDate: iso })}
            />
          </Field>
          <Field label="Modello di ricavo attivo">
            <Select
              value={assumptions.activeModel}
              onValueChange={(value) => update({ activeModel: value as RevenueModelType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Semplice (prezzo × volume)</SelectItem>
                <SelectItem value="funnel">Funnel B2B (lead × conversione)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={
              <span className="flex items-center gap-1.5">
                Override run-rate costi mensile
                <InfoTooltip
                  content={
                    <>
                      Serve a stimare quanto spenderai nei mesi futuri in cui non hai ancora registrato spese
                      reali. Lasciando il campo vuoto, la dashboard calcola una stima automatica: la media delle
                      spese degli ultimi 3 mesi con dati. Scrivici un numero se vuoi decidere tu quella cifra —
                      utile quando la media automatica non ti rappresenta (es. un mese con una spesa una tantum
                      che la falsa), oppure metti 0 se vuoi vedere la proiezione assumendo che da qui in avanti
                      non ci siano altre spese. Se hai voci di costo ricorrenti attive, spunta la casella qui
                      sotto per scrivere subito nel campo il loro totale mensile — è un&apos;azione singola, non
                      resta collegata: dopo puoi modificare il campo liberamente, e se vuoi aggiornarlo di nuovo
                      basta spuntare la casella un&apos;altra volta.
                    </>
                  }
                />
              </span>
            }
          >
            <Input
              type="number"
              step="0.01"
              placeholder="automatico (media ultimi 3 mesi)"
              value={assumptions.costRunRateOverride ?? ''}
              onChange={(e) =>
                update({
                  costRunRateOverride: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <div className="mb-3 flex items-start gap-2 sm:ml-[calc(12rem+0.75rem)]">
            <Checkbox
              id="use-recurring-total"
              checked={useRecurringTotal}
              disabled={recurringMonthlyCostTotal === 0}
              onCheckedChange={(checked) => handleUseRecurringTotalChange(checked === true)}
            />
            <Label htmlFor="use-recurring-total" className="font-normal text-muted-foreground">
              {recurringMonthlyCostTotal > 0
                ? `Usa il totale delle voci ricorrenti (${formatEUR(recurringMonthlyCostTotal)})`
                : 'Usa il totale delle voci ricorrenti (nessuna voce ricorrente attiva)'}
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Modello semplice
              <InfoTooltip content="Ricavo mensile = prezzo × numero di vendite al mese, con crescita composta." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier 1
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.tier1Price}
                onChange={(e) =>
                  update({ simple: { ...assumptions.simple, tier1Price: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Vendite / mese">
              <Input
                type="number"
                value={assumptions.simple.tier1SitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, tier1SitesPerMonth: Number(e.target.value) },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier 2
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.tier2Price}
                onChange={(e) =>
                  update({ simple: { ...assumptions.simple, tier2Price: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Vendite / mese">
              <Input
                type="number"
                value={assumptions.simple.tier2SitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, tier2SitesPerMonth: Number(e.target.value) },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tier 3
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.tier3Price}
                onChange={(e) =>
                  update({ simple: { ...assumptions.simple, tier3Price: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Vendite / mese">
              <Input
                type="number"
                value={assumptions.simple.tier3SitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, tier3SitesPerMonth: Number(e.target.value) },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Wholesale B2B
            </h3>
            <Field label="Prezzo (€)">
              <Input
                type="number"
                value={assumptions.simple.wholesalePrice}
                onChange={(e) =>
                  update({
                    simple: { ...assumptions.simple, wholesalePrice: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Vendite / mese">
              <Input
                type="number"
                value={assumptions.simple.wholesaleSitesPerMonth}
                onChange={(e) =>
                  update({
                    simple: {
                      ...assumptions.simple,
                      wholesaleSitesPerMonth: Number(e.target.value),
                    },
                  })
                }
              />
            </Field>

            <Separator className="my-4" />

            <Field label="Crescita mensile (%)">
              <Input
                type="number"
                step="0.1"
                value={assumptions.simple.monthlyGrowthRatePct}
                onChange={(e) =>
                  update({
                    simple: {
                      ...assumptions.simple,
                      monthlyGrowthRatePct: Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Modello funnel B2B
              <InfoTooltip content="Ricavo mensile = lead × tasso di conversione × prezzo (vendita diretta o commissione di segnalazione)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Lead mensili">
              <Input
                type="number"
                value={assumptions.funnel.monthlyLeads}
                onChange={(e) =>
                  update({ funnel: { ...assumptions.funnel, monthlyLeads: Number(e.target.value) } })
                }
              />
            </Field>
            <Field label="Partnership attive">
              <Input
                type="number"
                value={assumptions.funnel.activePartnerships}
                onChange={(e) =>
                  update({
                    funnel: { ...assumptions.funnel, activePartnerships: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Tasso di conversione (%)">
              <Input
                type="number"
                step="0.1"
                value={assumptions.funnel.conversionRatePct}
                onChange={(e) =>
                  update({
                    funnel: { ...assumptions.funnel, conversionRatePct: Number(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Modalità vendita">
              <Select
                value={assumptions.funnel.saleMode}
                onValueChange={(value) =>
                  update({ funnel: { ...assumptions.funnel, saleMode: value as SaleMode } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Vendita diretta</SelectItem>
                  <SelectItem value="referral_commission">Commissione di segnalazione</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prezzo medio vendita (€)">
              <Input
                type="number"
                value={assumptions.funnel.avgSalePrice}
                onChange={(e) =>
                  update({ funnel: { ...assumptions.funnel, avgSalePrice: Number(e.target.value) } })
                }
              />
            </Field>
            {assumptions.funnel.saleMode === 'referral_commission' && (
              <Field label="Commissione (%)">
                <Input
                  type="number"
                  step="0.1"
                  value={assumptions.funnel.commissionRatePct}
                  onChange={(e) =>
                    update({
                      funnel: { ...assumptions.funnel, commissionRatePct: Number(e.target.value) },
                    })
                  }
                />
              </Field>
            )}
            <Field label="Crescita lead mensile (%)">
              <Input
                type="number"
                step="0.1"
                value={assumptions.funnel.monthlyGrowthRatePct}
                onChange={(e) =>
                  update({
                    funnel: {
                      ...assumptions.funnel,
                      monthlyGrowthRatePct: Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
