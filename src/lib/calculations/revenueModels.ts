import type { FunnelModelAssumptions, SimpleModelAssumptions } from '../../types/domain';

function growthFactor(monthlyGrowthRatePct: number, monthIndex: number): number {
  return Math.pow(1 + monthlyGrowthRatePct / 100, monthIndex);
}

export function simpleModelRevenue(monthIndex: number, a: SimpleModelAssumptions): number {
  const base =
    a.tier1Price * a.tier1SitesPerMonth +
    a.tier2Price * a.tier2SitesPerMonth +
    a.tier3Price * a.tier3SitesPerMonth +
    a.wholesalePrice * a.wholesaleSitesPerMonth;
  return base * growthFactor(a.monthlyGrowthRatePct, monthIndex);
}

export function funnelModelRevenue(monthIndex: number, a: FunnelModelAssumptions): number {
  const leads = a.monthlyLeads * growthFactor(a.monthlyGrowthRatePct, monthIndex);
  const sales = leads * (a.conversionRatePct / 100);
  if (a.saleMode === 'direct') {
    return sales * a.avgSalePrice;
  }
  return sales * a.avgSalePrice * (a.commissionRatePct / 100);
}
