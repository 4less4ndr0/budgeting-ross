import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { AppState, MonthlyProjection } from '../../types/domain';
import { buildProjection } from '../calculations/projection';

function flattenAssumptions(state: AppState) {
  const a = state.revenueAssumptions;
  const r = state.runwayAssumptions;
  return [
    { campo: 'Modello attivo', valore: a.activeModel },
    { campo: 'Data inizio proiezione', valore: a.projectionStartDate },
    { campo: 'Data target break-even', valore: a.targetBreakEvenDate },
    { campo: 'Override run-rate costi', valore: a.costRunRateOverride ?? '(automatico)' },
    { campo: '--- Modello semplice ---', valore: '' },
    { campo: 'Prezzo Tier 1', valore: a.simple.tier1Price },
    { campo: 'Vendite Tier 1 / mese', valore: a.simple.tier1SitesPerMonth },
    { campo: 'Prezzo Tier 2', valore: a.simple.tier2Price },
    { campo: 'Vendite Tier 2 / mese', valore: a.simple.tier2SitesPerMonth },
    { campo: 'Prezzo Tier 3', valore: a.simple.tier3Price },
    { campo: 'Vendite Tier 3 / mese', valore: a.simple.tier3SitesPerMonth },
    { campo: 'Prezzo wholesale', valore: a.simple.wholesalePrice },
    { campo: 'Vendite wholesale / mese', valore: a.simple.wholesaleSitesPerMonth },
    { campo: 'Crescita mensile % (semplice)', valore: a.simple.monthlyGrowthRatePct },
    { campo: '--- Modello funnel ---', valore: '' },
    { campo: 'Lead mensili', valore: a.funnel.monthlyLeads },
    { campo: 'Partnership attive', valore: a.funnel.activePartnerships },
    { campo: 'Tasso di conversione %', valore: a.funnel.conversionRatePct },
    { campo: 'Modalità vendita', valore: a.funnel.saleMode },
    { campo: 'Prezzo medio vendita', valore: a.funnel.avgSalePrice },
    { campo: 'Commissione %', valore: a.funnel.commissionRatePct },
    { campo: 'Crescita mensile % (funnel)', valore: a.funnel.monthlyGrowthRatePct },
    { campo: '--- Runway ---', valore: '' },
    { campo: 'Tipo input spesa', valore: r.burnInputMode },
    { campo: 'Proiezione', valore: r.projectionMode },
    { campo: 'Liquidità disponibile (Runway)', valore: r.cashAvailable },
    { campo: 'Spesa mensile aggregata', valore: r.aggregateMonthlyBurn },
    { campo: 'Spesa: Stipendi & Team', valore: r.detailedBurn.salariesAndTeam },
    { campo: 'Spesa: Strumenti & Software', valore: r.detailedBurn.toolsAndSoftware },
    { campo: 'Spesa: Ufficio & Operazioni', valore: r.detailedBurn.officeAndOperations },
    { campo: 'Spesa: Marketing & Vendite', valore: r.detailedBurn.marketingAndSales },
    { campo: 'Spesa: Altro', valore: r.detailedBurn.other },
    { campo: 'Entrate mensili', valore: r.monthlyRevenue },
    { campo: 'Crescita mensile % spesa', valore: r.burnGrowthPct },
    { campo: 'Crescita mensile % entrate', valore: r.revenueGrowthPct },
  ];
}

export function exportWorkbook(state: AppState): void {
  const projections: MonthlyProjection[] = buildProjection(state);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.lineItems.map(({ date, category, description, amount, type, recurring }) => ({
        date,
        category,
        description,
        amount,
        type,
        recurring,
      })),
    ),
    'Line Items',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      state.fundEntries.map(({ date, category, amount, description }) => ({ date, category, amount, description })),
    ),
    'Fund Entries',
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenAssumptions(state)), 'Assumptions');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { voce: 'Budget totale previsto', importo: state.budgetTotale, bloccato: '' },
      ...state.budgetItems.map(({ nome, importo, bloccato }) => ({ voce: nome, importo, bloccato: bloccato ? 'sì' : '' })),
    ]),
    'Budget',
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projections), 'Monthly Projections');

  XLSX.writeFile(wb, `budgeting-ross-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
