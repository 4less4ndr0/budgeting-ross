import { addMonths, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { AppState, RevenueAssumptions } from '../../types/domain';
import { defaultRunwayAssumptions } from '../defaults';
import { buildProjection, computeBreakEvenStatus } from './projection';

const today = new Date();
const todayISO = format(today, 'yyyy-MM-dd');

function baseAssumptions(overrides: Partial<RevenueAssumptions> = {}): RevenueAssumptions {
  return {
    activeModel: 'simple',
    simple: {
      tier1Price: 200,
      tier2Price: 600,
      tier3Price: 900,
      wholesalePrice: 100,
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
      saleMode: 'direct',
      avgSalePrice: 0,
      commissionRatePct: 0,
      monthlyGrowthRatePct: 0,
    },
    projectionStartDate: todayISO,
    costRunRateOverride: 0,
    targetBreakEvenDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
    ...overrides,
  };
}

describe('buildProjection', () => {
  it('reaches break-even immediately when revenue covers costs, even without funds', () => {
    const state: AppState = {
      lineItems: [
        { id: '1', date: todayISO, category: 'setup', description: 'dominio', amount: 100, type: 'cost', source: 'manual', recurring: false },
        { id: '2', date: todayISO, category: 'vendite', description: 'incasso', amount: 100, type: 'income', source: 'manual', recurring: false },
      ],
      fundEntries: [],
      revenueAssumptions: baseAssumptions(),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const currentMonth = projections.find((p) => p.month === format(today, 'yyyy-MM'));
    expect(currentMonth?.isBreakEven).toBe(true);

    const result = computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate);
    expect(result.status).toBe('ahead');
    expect(result.breakEvenMonth).toBe(format(today, 'yyyy-MM'));
  });

  it('funds alone do not trigger break-even without matching revenue', () => {
    const state: AppState = {
      lineItems: [
        { id: '1', date: todayISO, category: 'setup', description: 'dominio', amount: 100, type: 'cost', source: 'manual', recurring: false },
      ],
      fundEntries: [{ id: 'f1', date: todayISO, amount: 1000, description: 'capitale iniziale', category: '' }],
      revenueAssumptions: baseAssumptions(),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const currentMonth = projections.find((p) => p.month === format(today, 'yyyy-MM'));

    // Plenty of cash on hand thanks to the funds...
    expect(currentMonth?.cumulativePosition).toBeGreaterThan(0);
    // ...but no real break-even yet: revenue hasn't caught up with costs.
    expect(currentMonth?.cumulativeNetProfit).toBeLessThan(0);
    expect(currentMonth?.isBreakEven).toBe(false);
  });

  it('is at-risk when costs run rate outpaces revenue indefinitely', () => {
    const state: AppState = {
      lineItems: [
        { id: '1', date: todayISO, category: 'ads', description: 'campagna', amount: 5000, type: 'cost', source: 'manual', recurring: false },
      ],
      fundEntries: [],
      revenueAssumptions: baseAssumptions({ costRunRateOverride: 5000 }),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const result = computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate);
    expect(result.status).toBe('at-risk');
    expect(result.breakEvenMonth).toBeNull();
  });

  it('is behind target when the simple model revenue is too slow to catch up by the target month', () => {
    const state: AppState = {
      lineItems: [
        { id: '1', date: todayISO, category: 'setup', description: 'costi iniziali', amount: 3000, type: 'cost', source: 'manual', recurring: false },
      ],
      fundEntries: [],
      revenueAssumptions: baseAssumptions({
        costRunRateOverride: 0,
        simple: {
          tier1Price: 200,
          tier2Price: 0,
          tier3Price: 0,
          wholesalePrice: 0,
          tier1SitesPerMonth: 1, // only 200/month in revenue vs 3000 cost -> break-even far beyond 6 months
          tier2SitesPerMonth: 0,
          tier3SitesPerMonth: 0,
          wholesaleSitesPerMonth: 0,
          monthlyGrowthRatePct: 0,
        },
      }),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const result = computeBreakEvenStatus(projections, state.revenueAssumptions.targetBreakEvenDate);
    expect(result.status === 'behind' || result.status === 'at-risk').toBe(true);
  });

  it('funnel model with referral commission computes revenue as leads * conversion * price * commission', () => {
    const state: AppState = {
      lineItems: [],
      fundEntries: [{ id: 'f1', date: todayISO, amount: 0, description: 'none', category: '' }],
      revenueAssumptions: baseAssumptions({
        activeModel: 'funnel',
        costRunRateOverride: 0,
        funnel: {
          monthlyLeads: 20,
          activePartnerships: 8,
          conversionRatePct: 50, // 10 sales
          saleMode: 'referral_commission',
          avgSalePrice: 200,
          commissionRatePct: 10, // 10% of 200 * 10 sales = 200
          monthlyGrowthRatePct: 0,
        },
      }),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const currentMonth = projections.find((p) => p.month === format(today, 'yyyy-MM'));
    expect(currentMonth?.projectedRevenue).toBeCloseTo(200);
  });

  it('cumulativeNetProfit excludes fund injections, unlike cumulativePosition', () => {
    const state: AppState = {
      lineItems: [
        { id: '1', date: todayISO, category: 'setup', description: 'costo', amount: 100, type: 'cost', source: 'manual', recurring: false },
        { id: '2', date: todayISO, category: 'vendite', description: 'entrata', amount: 40, type: 'income', source: 'manual', recurring: false },
      ],
      fundEntries: [{ id: 'f1', date: todayISO, amount: 1000, description: 'capitale iniziale', category: '' }],
      revenueAssumptions: baseAssumptions(),
      budgetItems: [],
      runwayAssumptions: defaultRunwayAssumptions(),
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      schemaVersion: 1,
    };

    const projections = buildProjection(state);
    const currentMonth = projections.find((p) => p.month === format(today, 'yyyy-MM'));

    // Net profit: income - cost, no funds involved.
    expect(currentMonth?.cumulativeNetProfit).toBeCloseTo(-60);
    // Cash position: funds + income - cost.
    expect(currentMonth?.cumulativePosition).toBeCloseTo(940);
  });
});
