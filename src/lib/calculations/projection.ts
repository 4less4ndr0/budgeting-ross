import {
  addMonths,
  differenceInCalendarMonths,
  format,
  max as dateMax,
  min as dateMin,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type {
  AppState,
  BreakEvenResult,
  BreakEvenStatus,
  MonthlyProjection,
} from '../../types/domain';
import { funnelModelRevenue, simpleModelRevenue } from './revenueModels';

function monthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function monthKeyFromISO(iso: string): string {
  return monthKey(parseISO(iso));
}

/**
 * Builds the month-by-month cash projection that drives every chart/summary in the app.
 * Pure function, no React dependency — this is the single source of truth for burn rate
 * and break-even, and the thing to unit-test exhaustively.
 */
export function buildProjection(state: AppState): MonthlyProjection[] {
  const { lineItems, fundEntries, revenueAssumptions } = state;
  const projectionStart = startOfMonth(parseISO(revenueAssumptions.projectionStartDate));
  const targetDate = startOfMonth(parseISO(revenueAssumptions.targetBreakEvenDate));

  const dataDates = [...lineItems.map((li) => parseISO(li.date)), ...fundEntries.map((f) => parseISO(f.date))];
  const lastDataDate = dataDates.length > 0 ? dateMax(dataDates) : projectionStart;
  const earliestDate = dataDates.length > 0 ? dateMin(dataDates) : projectionStart;

  const startMonth = startOfMonth(dateMin([earliestDate, projectionStart]));
  const rangeEndMonth = addMonths(dateMax([targetDate, startOfMonth(lastDataDate)]), 3);
  const totalMonths = differenceInCalendarMonths(rangeEndMonth, startMonth) + 1;

  // Recurring items are real, separate LineItems (one per month, materialized by
  // expandRecurring in the store) — each is just a normal dated row here, no special-casing.
  const costsByMonth = new Map<string, number>();
  const incomeByMonth = new Map<string, number>();
  for (const li of lineItems) {
    const k = monthKeyFromISO(li.date);
    const map = li.type === 'cost' ? costsByMonth : incomeByMonth;
    map.set(k, (map.get(k) ?? 0) + li.amount);
  }

  const fundsByMonth = new Map<string, number>();
  for (const f of fundEntries) {
    const k = monthKeyFromISO(f.date);
    fundsByMonth.set(k, (fundsByMonth.get(k) ?? 0) + f.amount);
  }

  // Trailing 3-month average of months that actually have cost data — used as the
  // cost estimate for future months once real data runs out, so burn rate doesn't
  // artificially fall to zero. Manually overridable via costRunRateOverride.
  const monthsWithActualCost = Array.from(costsByMonth.entries())
    .filter(([, v]) => v > 0)
    .map(([k]) => k)
    .sort();
  const last3 = monthsWithActualCost.slice(-3);
  const trailingAvgCost =
    last3.length > 0 ? last3.reduce((sum, k) => sum + (costsByMonth.get(k) ?? 0), 0) / last3.length : 0;
  const costRunRate = revenueAssumptions.costRunRateOverride ?? trailingAvgCost;

  const projections: MonthlyProjection[] = [];
  let cumulativeFunds = 0;
  let cumulativeCosts = 0;
  let cumulativeRevenue = 0;

  for (let i = 0; i < totalMonths; i++) {
    const monthDate = addMonths(startMonth, i);
    const k = monthKey(monthDate);

    const actualCost = costsByMonth.get(k) ?? 0;
    const actualIncome = incomeByMonth.get(k) ?? 0;
    cumulativeFunds += fundsByMonth.get(k) ?? 0;

    let projectedRevenue: number;
    let projectedCost: number;

    if (monthDate < projectionStart) {
      projectedRevenue = 0;
      projectedCost = actualCost;
    } else {
      const monthIndex = differenceInCalendarMonths(monthDate, projectionStart);
      projectedRevenue =
        revenueAssumptions.activeModel === 'simple'
          ? simpleModelRevenue(monthIndex, revenueAssumptions.simple)
          : funnelModelRevenue(monthIndex, revenueAssumptions.funnel);
      projectedCost = actualCost > 0 ? actualCost : costRunRate;
    }

    const netCashFlow = actualIncome + projectedRevenue - projectedCost;
    const burnRate = -netCashFlow;

    cumulativeCosts += projectedCost;
    cumulativeRevenue += actualIncome + projectedRevenue;
    const cumulativePosition = cumulativeFunds + cumulativeRevenue - cumulativeCosts;
    const cumulativeNetProfit = cumulativeRevenue - cumulativeCosts;
    // Break-even = revenue alone has caught up with costs (the real P&L milestone), not
    // "cash position is positive" — that's covered separately by cumulativePosition, which
    // also counts injected funds and is what tells you if you have enough cash on hand.
    const isBreakEven = cumulativeNetProfit >= 0;

    projections.push({
      month: k,
      actualCost,
      actualIncome,
      projectedCost,
      projectedRevenue,
      netCashFlow,
      burnRate,
      cumulativeFunds,
      cumulativeCosts,
      cumulativeRevenue,
      cumulativePosition,
      cumulativeNetProfit,
      isBreakEven,
    });
  }

  return projections;
}

export function computeBreakEvenStatus(
  projections: MonthlyProjection[],
  targetBreakEvenDateISO: string,
): BreakEvenResult {
  const targetMonth = monthKey(startOfMonth(parseISO(targetBreakEvenDateISO)));
  const breakEvenEntry = projections.find((p) => p.isBreakEven);
  const breakEvenMonth = breakEvenEntry ? breakEvenEntry.month : null;

  if (breakEvenMonth === null) {
    return { status: 'at-risk', breakEvenMonth: null, targetMonth, monthsDelta: null };
  }

  const beDate = parseISO(`${breakEvenMonth}-01`);
  const targetDateParsed = parseISO(`${targetMonth}-01`);
  const monthsDelta = differenceInCalendarMonths(beDate, targetDateParsed);

  let status: BreakEvenStatus;
  if (monthsDelta < 0) status = 'ahead';
  else if (monthsDelta === 0) status = 'on-track';
  else status = 'behind';

  return { status, breakEvenMonth, targetMonth, monthsDelta };
}
