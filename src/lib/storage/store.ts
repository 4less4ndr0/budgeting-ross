import { addMonths, differenceInCalendarMonths, format, parseISO, startOfMonth } from 'date-fns';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultRevenueAssumptions, defaultRunwayAssumptions } from '../defaults';
import type {
  AppState,
  BudgetItem,
  FundEntry,
  LineItem,
  RevenueAssumptions,
  RunwayAssumptions,
} from '../../types/domain';

const SCHEMA_VERSION = 3;

/**
 * Backfills fields added after data may already have been saved (persisted localStorage,
 * or an older stato-sito.json snapshot) with their defaults, so old data doesn't turn into
 * NaN in the projections just because a newer field is missing.
 */
function withAssumptionDefaults(assumptions: RevenueAssumptions): RevenueAssumptions {
  const defaults = defaultRevenueAssumptions();
  return {
    ...assumptions,
    simple: { ...defaults.simple, ...assumptions.simple },
    funnel: { ...defaults.funnel, ...assumptions.funnel },
  };
}

/** Stesso ruolo di withAssumptionDefaults, per il calcolatore Runway. */
function withRunwayDefaults(assumptions: RunwayAssumptions): RunwayAssumptions {
  const defaults = defaultRunwayAssumptions();
  return {
    ...defaults,
    ...assumptions,
    detailedBurn: { ...defaults.detailedBurn, ...assumptions.detailedBurn },
  };
}

/** Backfills `bloccato` on voci saved before the lock feature existed. */
function withBudgetItemDefaults(
  items: Array<Omit<BudgetItem, 'bloccato'> & { bloccato?: boolean }>,
): BudgetItem[] {
  return items.map((item) => ({ bloccato: false, ...item }));
}

/** Backfills `recurring` on voci saved before the recurring-item feature existed. */
function withLineItemDefaults(
  items: Array<Omit<LineItem, 'recurring'> & { recurring?: boolean }>,
): LineItem[] {
  return items.map((item) => ({ recurring: false, ...item }));
}

/** Backfills `category` on fondi saved before categories existed. */
function withFundEntryDefaults(items: Array<Omit<FundEntry, 'category'> & { category?: string }>): FundEntry[] {
  return items.map((item) => ({ category: '', ...item }));
}

/**
 * Seeds a managed category list from whatever's already in use in the data, so historical
 * free-text categories aren't invisible in the new managed list the first time it's built
 * (from an old snapshot/localStorage that predates managed categories entirely).
 */
function withCategoryListDefaults(list: string[] | undefined, items: { category: string }[]): string[] {
  const inUse = items.map((i) => i.category).filter((c): c is string => Boolean(c));
  return Array.from(new Set([...(list ?? []), ...inUse]));
}

/** Adds `name` to `list` if it's non-empty and not already present (case-insensitive). */
function registerCategory(list: string[], name: string | undefined): string[] {
  const trimmed = name?.trim();
  if (!trimmed) return list;
  const exists = list.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  return exists ? list : [...list, trimmed];
}

export interface AppStore extends AppState {
  addLineItem: (item: Omit<LineItem, 'id'>) => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  importLineItems: (items: Omit<LineItem, 'id'>[], mode: 'append' | 'replace') => void;
  /**
   * First click on a not-yet-expanded item: materializes one real LineItem per month from
   * the item's own month through targetBreakEvenDate (same category/description/amount/type),
   * all sharing a recurringGroupId. Click on a not-currently-recurring item that still has a
   * recurringGroupId (individually toggled off before): just flips it back on, no regeneration.
   * A no-op if the item is already recurring — ending an active series goes through
   * `endRecurringFrom` instead (it needs user confirmation first, since it deletes rows).
   */
  expandRecurring: (id: string) => void;
  /**
   * Ends a recurring series starting the month after the given item: deletes every sibling
   * (same recurringGroupId) dated after it, and clears `recurring`/`recurringGroupId` on the
   * item itself and every earlier sibling — the whole surviving series stops counting as
   * recurring, not just the future. A no-op if the item doesn't exist.
   */
  endRecurringFrom: (id: string) => void;

  addFundEntry: (entry: Omit<FundEntry, 'id'>) => void;
  updateFundEntry: (id: string, patch: Partial<Omit<FundEntry, 'id'>>) => void;
  removeFundEntry: (id: string) => void;

  addBudgetItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, patch: Partial<Omit<BudgetItem, 'id'>>) => void;
  removeBudgetItem: (id: string) => void;
  setBudgetTotale: (value: number) => void;

  /** Rimuove solo dall'elenco gestito — non tocca le voci che già usano questa categoria. */
  removeLineItemCategory: (name: string) => void;
  removeFundCategory: (name: string) => void;

  updateRevenueAssumptions: (patch: Partial<RevenueAssumptions>) => void;
  updateRunwayAssumptions: (patch: Partial<RunwayAssumptions>) => void;
  loadSnapshot: (
    snapshot: Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'> & {
      // Optional: snapshots saved before "Gestione del bilancio"/Runway/Budget/categorie esistessero non li hanno.
      budgetItems?: AppState['budgetItems'];
      budgetTotale?: AppState['budgetTotale'];
      runwayAssumptions?: AppState['runwayAssumptions'];
      lineItemCategories?: AppState['lineItemCategories'];
      fundCategories?: AppState['fundCategories'];
    },
  ) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      lineItems: [],
      fundEntries: [],
      budgetItems: [],
      budgetTotale: 0,
      lineItemCategories: [],
      fundCategories: [],
      revenueAssumptions: defaultRevenueAssumptions(),
      runwayAssumptions: defaultRunwayAssumptions(),
      schemaVersion: SCHEMA_VERSION,

      addLineItem: (item) =>
        set((state) => ({
          lineItems: [...state.lineItems, { ...item, id: nanoid() }],
          lineItemCategories: registerCategory(state.lineItemCategories, item.category),
        })),

      updateLineItem: (id, patch) =>
        set((state) => ({
          lineItems: state.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
          lineItemCategories: registerCategory(state.lineItemCategories, patch.category),
        })),

      removeLineItem: (id) =>
        set((state) => ({ lineItems: state.lineItems.filter((li) => li.id !== id) })),

      importLineItems: (items, mode) =>
        set((state) => {
          const newItems = items.map((item) => ({ ...item, id: nanoid() }));
          let lineItemCategories = state.lineItemCategories;
          for (const item of items) {
            lineItemCategories = registerCategory(lineItemCategories, item.category);
          }
          return {
            lineItems: mode === 'replace' ? newItems : [...state.lineItems, ...newItems],
            lineItemCategories,
          };
        }),

      expandRecurring: (id) =>
        set((state) => {
          const item = state.lineItems.find((li) => li.id === id);
          // Ending an already-active series needs confirmation first — see endRecurringFrom.
          if (!item || item.recurring) return {};

          // Individually toggled off before, still linked to its group — just flip it back on.
          if (item.recurringGroupId) {
            return {
              lineItems: state.lineItems.map((li) => (li.id === id ? { ...li, recurring: true } : li)),
            };
          }

          const groupId = nanoid();
          const itemDate = parseISO(item.date);
          const itemMonth = startOfMonth(itemDate);
          const targetMonth = startOfMonth(parseISO(state.revenueAssumptions.targetBreakEvenDate));
          const monthsToGenerate = Math.max(differenceInCalendarMonths(targetMonth, itemMonth), 0);

          const generated: LineItem[] = [];
          for (let i = 1; i <= monthsToGenerate; i++) {
            generated.push({
              ...item,
              id: nanoid(),
              // Same day-of-month as the original (date-fns clamps overflow, e.g. Jan 31 -> Feb 28).
              date: format(addMonths(itemDate, i), 'yyyy-MM-dd'),
              recurring: true,
              recurringGroupId: groupId,
            });
          }

          return {
            lineItems: [
              ...state.lineItems.map((li) =>
                li.id === id ? { ...li, recurring: true, recurringGroupId: groupId } : li,
              ),
              ...generated,
            ],
          };
        }),

      endRecurringFrom: (id) =>
        set((state) => {
          const item = state.lineItems.find((li) => li.id === id);
          if (!item) return {};

          const groupId = item.recurringGroupId;
          // Without a real group, the clicked item is its own group of one — the logic below
          // still reduces to just switching that single row off.
          const inGroup = (li: LineItem) => (groupId ? li.recurringGroupId === groupId : li.id === id);

          return {
            lineItems: state.lineItems
              .filter((li) => !(inGroup(li) && li.date > item.date))
              .map((li) =>
                inGroup(li) && li.date <= item.date
                  ? { ...li, recurring: false, recurringGroupId: undefined }
                  : li,
              ),
          };
        }),

      addFundEntry: (entry) =>
        set((state) => ({
          fundEntries: [...state.fundEntries, { ...entry, id: nanoid() }],
          fundCategories: registerCategory(state.fundCategories, entry.category),
        })),

      updateFundEntry: (id, patch) =>
        set((state) => ({
          fundEntries: state.fundEntries.map((f) => (f.id === id ? { ...f, ...patch } : f)),
          fundCategories: registerCategory(state.fundCategories, patch.category),
        })),

      removeFundEntry: (id) =>
        set((state) => ({ fundEntries: state.fundEntries.filter((f) => f.id !== id) })),

      addBudgetItem: (item) =>
        set((state) => ({ budgetItems: [...state.budgetItems, { ...item, id: nanoid() }] })),

      updateBudgetItem: (id, patch) =>
        set((state) => ({
          budgetItems: state.budgetItems.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBudgetItem: (id) =>
        set((state) => ({ budgetItems: state.budgetItems.filter((b) => b.id !== id) })),

      setBudgetTotale: (value) => set({ budgetTotale: value }),

      removeLineItemCategory: (name) =>
        set((state) => ({
          lineItemCategories: state.lineItemCategories.filter((c) => c !== name),
        })),

      removeFundCategory: (name) =>
        set((state) => ({
          fundCategories: state.fundCategories.filter((c) => c !== name),
        })),

      updateRevenueAssumptions: (patch) =>
        set((state) => ({ revenueAssumptions: { ...state.revenueAssumptions, ...patch } })),

      updateRunwayAssumptions: (patch) =>
        set((state) => ({ runwayAssumptions: { ...state.runwayAssumptions, ...patch } })),

      loadSnapshot: (snapshot) => {
        const lineItems = withLineItemDefaults(snapshot.lineItems);
        const fundEntries = withFundEntryDefaults(snapshot.fundEntries);
        set({
          lineItems,
          fundEntries,
          budgetItems: withBudgetItemDefaults(snapshot.budgetItems ?? []),
          budgetTotale: snapshot.budgetTotale ?? 0,
          lineItemCategories: withCategoryListDefaults(snapshot.lineItemCategories, lineItems),
          fundCategories: withCategoryListDefaults(snapshot.fundCategories, fundEntries),
          revenueAssumptions: withAssumptionDefaults(snapshot.revenueAssumptions),
          runwayAssumptions: snapshot.runwayAssumptions
            ? withRunwayDefaults(snapshot.runwayAssumptions)
            : defaultRunwayAssumptions(),
          schemaVersion: SCHEMA_VERSION,
        });
      },

      resetAll: () =>
        set({
          lineItems: [],
          fundEntries: [],
          budgetItems: [],
          budgetTotale: 0,
          lineItemCategories: [],
          fundCategories: [],
          revenueAssumptions: defaultRevenueAssumptions(),
          runwayAssumptions: defaultRunwayAssumptions(),
          schemaVersion: SCHEMA_VERSION,
        }),
    }),
    {
      name: 'budgeting-ross-store',
      version: SCHEMA_VERSION,
      migrate: (persisted) => {
        const state = persisted as AppStore;
        const fundEntries = withFundEntryDefaults(state.fundEntries ?? []);
        return {
          ...state,
          fundEntries,
          revenueAssumptions: withAssumptionDefaults(state.revenueAssumptions),
          budgetItems: withBudgetItemDefaults(state.budgetItems ?? []),
          lineItemCategories: withCategoryListDefaults(state.lineItemCategories, state.lineItems ?? []),
          fundCategories: withCategoryListDefaults(state.fundCategories, fundEntries),
        };
      },
    },
  ),
);
