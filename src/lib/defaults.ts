import { addMonths, format } from 'date-fns';
import type { RevenueAssumptions, RunwayAssumptions } from '../types/domain';

const todayISO = () => format(new Date(), 'yyyy-MM-dd');

// Every price, volume, growth and funnel assumption
// starts at 0 so the projection reflects nothing until the user sets real numbers.
export function defaultRevenueAssumptions(): RevenueAssumptions {
  const today = new Date();
  return {
    activeModel: 'simple',
    simple: {
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      wholesalePrice: 0,
      tier1SitesPerMonth: 0,
      tier2SitesPerMonth: 0,
      tier3SitesPerMonth: 0,
      wholesaleSitesPerMonth: 0,
      monthlyGrowthRatePct: 0,
    },
    funnel: {
      monthlyLeads: 0,
      activePartnerships: 0,
      conversionRatePct: 0,
      saleMode: 'referral_commission',
      avgSalePrice: 0,
      commissionRatePct: 0,
      monthlyGrowthRatePct: 0,
    },
    projectionStartDate: todayISO(),
    costRunRateOverride: null,
    targetBreakEvenDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
  };
}

export function defaultRunwayAssumptions(): RunwayAssumptions {
  return {
    burnInputMode: 'aggregate',
    projectionMode: 'static',
    cashAvailable: 0,
    aggregateMonthlyBurn: 0,
    detailedBurn: {
      salariesAndTeam: 0,
      toolsAndSoftware: 0,
      officeAndOperations: 0,
      marketingAndSales: 0,
      other: 0,
    },
    monthlyRevenue: 0,
    burnGrowthPct: 0,
    revenueGrowthPct: 0,
  };
}
