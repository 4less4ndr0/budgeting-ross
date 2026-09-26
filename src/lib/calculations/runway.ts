import type { RunwayAssumptions, RunwayResult } from '../../types/domain';

const MAX_MONTHS = 1200; // 100 anni di cap di sicurezza, evita loop infiniti in scenari patologici

/**
 * Calcolatore "runway": quanti mesi di liquidità restano da oggi, dato quanto hai in cassa
 * e quanto bruci al mese. La modalità statica è il caso particolare della dinamica con
 * crescita 0% — un'unica simulazione mese per mese, non due formule separate.
 */
export function computeRunway(cashAvailable: number, a: RunwayAssumptions): RunwayResult {
  const totalMonthlyBurn =
    a.burnInputMode === 'aggregate'
      ? a.aggregateMonthlyBurn
      : a.detailedBurn.salariesAndTeam +
        a.detailedBurn.toolsAndSoftware +
        a.detailedBurn.officeAndOperations +
        a.detailedBurn.marketingAndSales +
        a.detailedBurn.other;

  const netMonthlyBurn = totalMonthlyBurn - a.monthlyRevenue;

  if (netMonthlyBurn <= 0) {
    return { totalMonthlyBurn, netMonthlyBurn, isProfitable: true, runwayMonths: null };
  }

  const burnGrowth = a.projectionMode === 'dynamic' ? a.burnGrowthPct / 100 : 0;
  const revenueGrowth = a.projectionMode === 'dynamic' ? a.revenueGrowthPct / 100 : 0;

  let cash = cashAvailable;
  let burn = totalMonthlyBurn;
  let revenue = a.monthlyRevenue;
  let monthsElapsed = 0;

  while (monthsElapsed < MAX_MONTHS) {
    const net = burn - revenue;
    if (net <= 0) {
      // La crescita delle entrate ha superato quella della spesa a metà simulazione.
      return { totalMonthlyBurn, netMonthlyBurn, isProfitable: true, runwayMonths: null };
    }
    if (cash <= net) {
      const fraction = cash > 0 ? cash / net : 0;
      return { totalMonthlyBurn, netMonthlyBurn, isProfitable: false, runwayMonths: monthsElapsed + fraction };
    }
    cash -= net;
    monthsElapsed += 1;
    burn *= 1 + burnGrowth;
    revenue *= 1 + revenueGrowth;
  }

  return { totalMonthlyBurn, netMonthlyBurn, isProfitable: false, runwayMonths: monthsElapsed };
}
