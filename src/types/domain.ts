export type EntryType = 'cost' | 'income';

export interface LineItem {
  id: string;
  date: string; // ISO yyyy-mm-dd
  category: string;
  description: string;
  amount: number; // always positive; sign implied by `type`
  type: EntryType;
  source: 'imported' | 'manual';
  // Marks this row as part of a recurring series (display only — the calc engine treats it
  // like any other dated row; the actual monthly rows are real materialized LineItems, not a
  // calc-time projection). Toggling it on a not-yet-expanded item generates one real LineItem
  // per month through targetBreakEvenDate, all sharing `recurringGroupId`.
  recurring: boolean;
  recurringGroupId?: string;
}

export interface FundEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // capital available (savings, investment, prior revenue already collected)
  description: string;
  category: string;
}

/** A free-form voce di budget: name + amount, shown as a slice of the donut chart in "Budget". */
export interface BudgetItem {
  id: string;
  nome: string;
  importo: number;
  bloccato: boolean; // locked: importo is frozen while reallocating the other voci
}

export type RevenueModelType = 'simple' | 'funnel';

export interface SimpleModelAssumptions {
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  wholesalePrice: number;
  tier1SitesPerMonth: number;
  tier2SitesPerMonth: number;
  tier3SitesPerMonth: number;
  wholesaleSitesPerMonth: number;
  monthlyGrowthRatePct: number;
}

export type SaleMode = 'direct' | 'referral_commission';

export interface FunnelModelAssumptions {
  monthlyLeads: number;
  activePartnerships: number;
  conversionRatePct: number;
  saleMode: SaleMode;
  avgSalePrice: number;
  commissionRatePct: number;
  monthlyGrowthRatePct: number;
}

export interface RevenueAssumptions {
  activeModel: RevenueModelType;
  simple: SimpleModelAssumptions;
  funnel: FunnelModelAssumptions;
  projectionStartDate: string; // ISO yyyy-mm-dd, default = today
  costRunRateOverride: number | null; // null = auto trailing 3-month average
  targetBreakEvenDate: string; // ISO yyyy-mm-dd, default = today + 6 months
}

export interface MonthlyProjection {
  month: string; // yyyy-MM
  actualCost: number;
  actualIncome: number;
  projectedCost: number;
  projectedRevenue: number;
  netCashFlow: number;
  burnRate: number; // = -netCashFlow; positive means burning cash
  cumulativeFunds: number;
  cumulativeCosts: number;
  cumulativeRevenue: number;
  cumulativePosition: number; // cumulativeFunds + cumulativeRevenue - cumulativeCosts
  cumulativeNetProfit: number; // cumulativeRevenue - cumulativeCosts, EXCLUDING cumulativeFunds — P&L view, not cash position
  isBreakEven: boolean;
}

export type BreakEvenStatus = 'ahead' | 'on-track' | 'behind' | 'at-risk';

export interface BreakEvenResult {
  status: BreakEvenStatus;
  breakEvenMonth: string | null;
  targetMonth: string;
  monthsDelta: number | null; // negative = ahead, positive = behind, null if at-risk
}

export type BurnInputMode = 'aggregate' | 'detailed';
export type RunwayProjectionMode = 'static' | 'dynamic';

export interface RunwayDetailedBurn {
  salariesAndTeam: number;
  toolsAndSoftware: number;
  officeAndOperations: number;
  marketingAndSales: number;
  other: number;
}

export interface RunwayAssumptions {
  burnInputMode: BurnInputMode;
  projectionMode: RunwayProjectionMode;
  cashAvailable: number; // valore libero scelto dall'utente, scollegato dai Fondi disponibili
  aggregateMonthlyBurn: number;
  detailedBurn: RunwayDetailedBurn;
  monthlyRevenue: number;
  burnGrowthPct: number; // usato solo in modalità dynamic
  revenueGrowthPct: number; // usato solo in modalità dynamic
}

export interface RunwayResult {
  totalMonthlyBurn: number;
  netMonthlyBurn: number; // totalMonthlyBurn - monthlyRevenue, prima di eventuale crescita
  isProfitable: boolean;
  runwayMonths: number | null; // con decimali; null quando isProfitable
}

export interface AppState {
  lineItems: LineItem[];
  fundEntries: FundEntry[];
  budgetItems: BudgetItem[];
  budgetTotale: number; // 0 = non impostato, nessun avviso di sforamento
  // Elenchi gestiti delle categorie disponibili per nuove scelte — indipendenti tra loro.
  // Eliminare una categoria da qui NON tocca le voci esistenti che la usano già (restano
  // com'erano, semplicemente quella categoria non ricompare più tra le opzioni).
  lineItemCategories: string[];
  fundCategories: string[];
  revenueAssumptions: RevenueAssumptions;
  runwayAssumptions: RunwayAssumptions;
  schemaVersion: number;
}
