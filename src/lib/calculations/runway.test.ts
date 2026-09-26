import { describe, expect, it } from 'vitest';
import { computeRunway } from './runway';
import type { RunwayAssumptions } from '../../types/domain';

function baseAssumptions(overrides: Partial<RunwayAssumptions> = {}): RunwayAssumptions {
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
    ...overrides,
  };
}

describe('computeRunway', () => {
  it('is profitable when revenue already covers burn', () => {
    const result = computeRunway(1000, baseAssumptions({ aggregateMonthlyBurn: 100, monthlyRevenue: 150 }));
    expect(result.isProfitable).toBe(true);
    expect(result.runwayMonths).toBeNull();
  });

  it('computes an exact whole-month runway in static mode', () => {
    const result = computeRunway(1000, baseAssumptions({ aggregateMonthlyBurn: 100 }));
    expect(result.isProfitable).toBe(false);
    expect(result.runwayMonths).toBeCloseTo(10);
  });

  it('computes a fractional runway when cash runs out mid-month', () => {
    const result = computeRunway(250, baseAssumptions({ aggregateMonthlyBurn: 100 }));
    expect(result.runwayMonths).toBeCloseTo(2.5);
  });

  it('sums the detailed breakdown when burnInputMode is detailed', () => {
    const result = computeRunway(
      1000,
      baseAssumptions({
        burnInputMode: 'detailed',
        detailedBurn: {
          salariesAndTeam: 40,
          toolsAndSoftware: 20,
          officeAndOperations: 10,
          marketingAndSales: 20,
          other: 10,
        },
      }),
    );
    expect(result.totalMonthlyBurn).toBe(100);
    expect(result.runwayMonths).toBeCloseTo(10);
  });

  it('ignores growth rates in static mode even if set', () => {
    const result = computeRunway(
      1000,
      baseAssumptions({ aggregateMonthlyBurn: 100, burnGrowthPct: 50, revenueGrowthPct: 0 }),
    );
    expect(result.runwayMonths).toBeCloseTo(10);
  });

  it('dynamic mode: burn growing faster than revenue shortens the runway vs static', () => {
    const dynamic = computeRunway(
      1000,
      baseAssumptions({ aggregateMonthlyBurn: 100, projectionMode: 'dynamic', burnGrowthPct: 10 }),
    );
    const staticResult = computeRunway(1000, baseAssumptions({ aggregateMonthlyBurn: 100 }));
    expect(dynamic.runwayMonths).not.toBeNull();
    expect(staticResult.runwayMonths).not.toBeNull();
    expect(dynamic.runwayMonths as number).toBeLessThan(staticResult.runwayMonths as number);
  });

  it('dynamic mode: revenue growth overtaking burn growth flips the result to profitable mid-simulation', () => {
    const result = computeRunway(
      1000,
      baseAssumptions({
        aggregateMonthlyBurn: 100,
        monthlyRevenue: 50,
        projectionMode: 'dynamic',
        burnGrowthPct: 0,
        revenueGrowthPct: 20,
      }),
    );
    expect(result.isProfitable).toBe(true);
    expect(result.runwayMonths).toBeNull();
  });
});
