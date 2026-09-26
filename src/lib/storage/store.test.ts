import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore } from './store';
import { defaultRevenueAssumptions, defaultRunwayAssumptions } from '../defaults';
import type { StateSnapshot } from '../export/exportSnapshot';
import type { AppState } from '../../types/domain';

describe('loadSnapshot', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('replaces lineItems, fundEntries and revenueAssumptions with the snapshot, override included', () => {
    const snapshot: StateSnapshot = {
      lineItems: [
        {
          id: 'x',
          date: '2026-02-20',
          category: 'Dominio',
          description: 'Rinnovo',
          amount: 3,
          type: 'cost',
          source: 'imported',
          recurring: false,
        },
      ],
      fundEntries: [
        { id: 'f1', date: '2026-01-01', amount: 500, description: 'Fondo iniziale', category: 'Capitale' },
      ],
      budgetItems: [{ id: 'b1', nome: 'Location', importo: 5000, bloccato: true }],
      budgetTotale: 8000,
      lineItemCategories: ['Dominio'],
      fundCategories: ['Capitale'],
      revenueAssumptions: { ...defaultRevenueAssumptions(), costRunRateOverride: 0 },
      runwayAssumptions: defaultRunwayAssumptions(),
      schemaVersion: 1,
      savedAt: '2026-09-02T12:00:00.000Z',
    };

    useAppStore.getState().loadSnapshot(snapshot);
    const state = useAppStore.getState();

    expect(state.lineItems).toEqual(snapshot.lineItems);
    expect(state.fundEntries).toEqual(snapshot.fundEntries);
    expect(state.budgetItems).toEqual(snapshot.budgetItems);
    expect(state.budgetTotale).toBe(8000);
    expect(state.lineItemCategories).toEqual(['Dominio']);
    expect(state.fundCategories).toEqual(['Capitale']);
    // The whole point: an override deliberately left at 0 must survive as 0, not be
    // dropped/coerced to null ("automatico") by the round-trip.
    expect(state.revenueAssumptions.costRunRateOverride).toBe(0);
  });

  it('defaults budgetItems to [] and budgetTotale to 0 when loading a snapshot saved before "Budget" existed', () => {
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().budgetItems).toEqual([]);
    expect(useAppStore.getState().budgetTotale).toBe(0);
  });

  it('backfills bloccato:false on voci saved before the lock feature existed', () => {
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      budgetItems: [{ id: 'b1', nome: 'Location', importo: 5000 }],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions' | 'budgetItems'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().budgetItems[0].bloccato).toBe(false);
  });

  it('defaults runwayAssumptions when loading a snapshot saved before the Runway calculator existed', () => {
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().runwayAssumptions).toEqual(defaultRunwayAssumptions());
  });

  it('overwrites data left over from a previous session rather than merging it', () => {
    useAppStore.getState().addLineItem({
      date: '2020-01-01',
      category: 'Vecchio',
      description: 'Dato da sovrascrivere',
      amount: 999,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });

    useAppStore.getState().loadSnapshot({
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: defaultRevenueAssumptions(),
    });

    expect(useAppStore.getState().lineItems).toEqual([]);
  });

  it('backfills fields added later (e.g. Tier 3) with defaults instead of leaving them undefined', () => {
    // Simulates a snapshot saved before Tier 3 existed — the shape genuinely lacks the field,
    // as opposed to a TS-literal test object that the compiler would just reject.
    const oldSnapshot = {
      lineItems: [],
      fundEntries: [],
      revenueAssumptions: {
        ...defaultRevenueAssumptions(),
        simple: { tier1Price: 200, tier2Price: 600, tier1SitesPerMonth: 3, tier2SitesPerMonth: 1 },
      },
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);
    const { simple } = useAppStore.getState().revenueAssumptions;

    expect(simple.tier3Price).toBe(defaultRevenueAssumptions().simple.tier3Price);
    expect(simple.tier3SitesPerMonth).toBe(defaultRevenueAssumptions().simple.tier3SitesPerMonth);
    // Fields the old snapshot did have must survive, not just fall back to defaults.
    expect(simple.tier1Price).toBe(200);
  });

  it('seeds lineItemCategories/fundCategories from historical data when loading a snapshot saved before managed categories existed', () => {
    const oldSnapshot = {
      lineItems: [
        {
          id: 'x',
          date: '2026-02-20',
          category: 'Marketing',
          description: 'Meta ads',
          amount: 100,
          type: 'cost',
          source: 'manual',
          recurring: false,
        },
      ],
      fundEntries: [{ id: 'f1', date: '2026-01-01', amount: 2800, description: 'Capitale iniziale', category: 'Capitale' }],
      revenueAssumptions: defaultRevenueAssumptions(),
    } as unknown as Pick<AppState, 'lineItems' | 'fundEntries' | 'revenueAssumptions'>;

    useAppStore.getState().loadSnapshot(oldSnapshot);

    expect(useAppStore.getState().lineItemCategories).toEqual(['Marketing']);
    expect(useAppStore.getState().fundCategories).toEqual(['Capitale']);
  });
});

describe('category management', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('auto-registers a new lineItem category on add, without duplicating an existing one (case-insensitive)', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-01',
      category: 'Marketing',
      description: 'ads',
      amount: 10,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    expect(useAppStore.getState().lineItemCategories).toEqual(['Marketing']);

    useAppStore.getState().addLineItem({
      date: '2026-01-02',
      category: 'marketing', // same category, different casing
      description: 'ads 2',
      amount: 5,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    expect(useAppStore.getState().lineItemCategories).toEqual(['Marketing']);
  });

  it('auto-registers a lineItem category on update', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-01',
      category: '',
      description: 'voce',
      amount: 10,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [item] = useAppStore.getState().lineItems;

    useAppStore.getState().updateLineItem(item.id, { category: 'Lovable' });
    expect(useAppStore.getState().lineItemCategories).toEqual(['Lovable']);
  });

  it('auto-registers every distinct category on importLineItems', () => {
    useAppStore.getState().importLineItems(
      [
        { date: '2026-01-01', category: 'Marketing', description: 'a', amount: 1, type: 'cost', source: 'imported', recurring: false },
        { date: '2026-01-02', category: 'Lovable', description: 'b', amount: 2, type: 'cost', source: 'imported', recurring: false },
        { date: '2026-01-03', category: 'Marketing', description: 'c', amount: 3, type: 'cost', source: 'imported', recurring: false },
      ],
      'append',
    );
    expect(useAppStore.getState().lineItemCategories.sort()).toEqual(['Lovable', 'Marketing']);
  });

  it('removeLineItemCategory only removes it from the managed list, leaving existing voci untouched', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-01',
      category: 'Marketing',
      description: 'ads',
      amount: 10,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [item] = useAppStore.getState().lineItems;

    useAppStore.getState().removeLineItemCategory('Marketing');

    expect(useAppStore.getState().lineItemCategories).toEqual([]);
    expect(useAppStore.getState().lineItems.find((li) => li.id === item.id)?.category).toBe('Marketing');
  });

  it('keeps lineItem and fund category lists independent', () => {
    useAppStore.getState().addFundEntry({ date: '2026-01-01', amount: 2800, description: 'Capitale iniziale', category: 'Capitale' });
    expect(useAppStore.getState().fundCategories).toEqual(['Capitale']);
    expect(useAppStore.getState().lineItemCategories).toEqual([]);
  });
});

describe('budgetItems CRUD', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('adds, updates and removes a voce di budget', () => {
    useAppStore.getState().addBudgetItem({ nome: 'Location', importo: 5000, bloccato: false });
    const [added] = useAppStore.getState().budgetItems;
    expect(added).toMatchObject({ nome: 'Location', importo: 5000, bloccato: false });
    expect(added.id).toBeTruthy();

    useAppStore.getState().updateBudgetItem(added.id, { importo: 5500 });
    expect(useAppStore.getState().budgetItems[0].importo).toBe(5500);

    useAppStore.getState().removeBudgetItem(added.id);
    expect(useAppStore.getState().budgetItems).toEqual([]);
  });

  it('locking a voce is just a flag on updateBudgetItem — no dedicated action needed', () => {
    useAppStore.getState().addBudgetItem({ nome: 'Location', importo: 5000, bloccato: false });
    const [added] = useAppStore.getState().budgetItems;

    useAppStore.getState().updateBudgetItem(added.id, { bloccato: true });
    expect(useAppStore.getState().budgetItems[0].bloccato).toBe(true);
  });
});

describe('setBudgetTotale', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
  });

  it('sets budgetTotale, defaulting to 0 after resetAll', () => {
    expect(useAppStore.getState().budgetTotale).toBe(0);

    useAppStore.getState().setBudgetTotale(10000);
    expect(useAppStore.getState().budgetTotale).toBe(10000);

    useAppStore.getState().resetAll();
    expect(useAppStore.getState().budgetTotale).toBe(0);
  });
});

describe('expandRecurring', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    useAppStore.getState().updateRevenueAssumptions({ targetBreakEvenDate: '2026-04-15' });
  });

  it('materializes one real LineItem per month through the break-even target', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-15',
      category: 'software',
      description: 'abbonamento',
      amount: 50,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [original] = useAppStore.getState().lineItems;

    useAppStore.getState().expandRecurring(original.id);
    const { lineItems } = useAppStore.getState();

    // Jan (original) + Feb, Mar, Apr generated = 4 rows, all real, editable LineItems.
    expect(lineItems).toHaveLength(4);
    expect(lineItems.map((li) => li.date).sort()).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);

    const groupIds = new Set(lineItems.map((li) => li.recurringGroupId));
    expect(groupIds.size).toBe(1);
    expect([...groupIds][0]).toBeTruthy();
    expect(lineItems.every((li) => li.recurring)).toBe(true);
    expect(lineItems.every((li) => li.amount === 50 && li.category === 'software')).toBe(true);
    // Each generated row has its own id — not four copies of the original.
    expect(new Set(lineItems.map((li) => li.id)).size).toBe(4);
  });

  it('is a no-op on an item that is already recurring — ending a series needs endRecurringFrom instead', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-15',
      category: 'software',
      description: 'abbonamento',
      amount: 50,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [original] = useAppStore.getState().lineItems;

    useAppStore.getState().expandRecurring(original.id);
    const afterFirstClick = useAppStore.getState().lineItems;
    expect(afterFirstClick).toHaveLength(4);

    useAppStore.getState().expandRecurring(original.id);
    expect(useAppStore.getState().lineItems).toEqual(afterFirstClick);
  });

  it('re-activates an item that was individually toggled off but is still linked to its group', () => {
    useAppStore.getState().addLineItem({
      date: '2026-01-15',
      category: 'software',
      description: 'abbonamento',
      amount: 50,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [original] = useAppStore.getState().lineItems;
    useAppStore.getState().expandRecurring(original.id);

    useAppStore.getState().updateLineItem(original.id, { recurring: false });
    expect(useAppStore.getState().lineItems.find((li) => li.id === original.id)?.recurringGroupId).toBeTruthy();

    useAppStore.getState().expandRecurring(original.id);
    const { lineItems } = useAppStore.getState();
    expect(lineItems).toHaveLength(4); // no regeneration
    expect(lineItems.find((li) => li.id === original.id)?.recurring).toBe(true);
  });
});

describe('endRecurringFrom', () => {
  beforeEach(() => {
    useAppStore.getState().resetAll();
    useAppStore.getState().updateRevenueAssumptions({ targetBreakEvenDate: '2026-04-15' });
  });

  function seedRecurringSeries() {
    useAppStore.getState().addLineItem({
      date: '2026-01-15',
      category: 'software',
      description: 'abbonamento',
      amount: 50,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [original] = useAppStore.getState().lineItems;
    useAppStore.getState().expandRecurring(original.id);
    return useAppStore
      .getState()
      .lineItems.slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  it('deletes siblings dated after the clicked item and ends recurrence for it and every earlier one', () => {
    const series = seedRecurringSeries(); // Jan, Feb, Mar, Apr

    useAppStore.getState().endRecurringFrom(series[1].id); // click on February

    const { lineItems } = useAppStore.getState();
    expect(lineItems.map((li) => li.date).sort()).toEqual(['2026-01-15', '2026-02-15']);
    expect(lineItems.every((li) => li.recurring === false)).toBe(true);
    expect(lineItems.every((li) => li.recurringGroupId === undefined)).toBe(true);
  });

  it('ending it on the last month of the series deletes nothing but still ends recurrence for all', () => {
    const series = seedRecurringSeries();

    useAppStore.getState().endRecurringFrom(series[3].id); // click on April, the last month

    const { lineItems } = useAppStore.getState();
    expect(lineItems).toHaveLength(4); // nothing deleted
    expect(lineItems.every((li) => li.recurring === false)).toBe(true);
    expect(lineItems.every((li) => li.recurringGroupId === undefined)).toBe(true);
  });

  it('turns off a defensive recurring:true item that has no recurringGroupId, without touching anything else', () => {
    useAppStore.getState().addLineItem({
      date: '2026-02-01',
      category: 'misc',
      description: 'una tantum ma segnata ricorrente',
      amount: 10,
      type: 'cost',
      source: 'manual',
      recurring: true,
    });
    useAppStore.getState().addLineItem({
      date: '2026-03-01',
      category: 'altro',
      description: 'voce indipendente',
      amount: 20,
      type: 'cost',
      source: 'manual',
      recurring: false,
    });
    const [orphan, other] = useAppStore.getState().lineItems;

    useAppStore.getState().endRecurringFrom(orphan.id);

    const { lineItems } = useAppStore.getState();
    expect(lineItems).toHaveLength(2);
    expect(lineItems.find((li) => li.id === orphan.id)?.recurring).toBe(false);
    expect(lineItems.find((li) => li.id === other.id)).toEqual(other); // untouched
  });
});
