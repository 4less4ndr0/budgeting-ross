import type { AppState } from '../../types/domain';

export const SNAPSHOT_FILENAME = 'stato-sito.json';

/** Full app state as saved by exportStateSnapshot — everything needed to restore it exactly. */
export interface StateSnapshot {
  lineItems: AppState['lineItems'];
  fundEntries: AppState['fundEntries'];
  budgetItems: AppState['budgetItems'];
  budgetTotale: AppState['budgetTotale'];
  lineItemCategories: AppState['lineItemCategories'];
  fundCategories: AppState['fundCategories'];
  revenueAssumptions: AppState['revenueAssumptions'];
  runwayAssumptions: AppState['runwayAssumptions'];
  schemaVersion: number;
  savedAt: string;
}

/**
 * Downloads the full app state (costi, fondi, assunzioni ricavi — override inclusi) as JSON.
 * Pensato per essere spostato manualmente in csv-imports/: non è un CSV di movimenti, ma
 * uno snapshot "cosa vedevo io in quel momento" da poter ricaricare in un click, anche da
 * un altro dispositivo (il browser non può scrivere da solo nel repo).
 */
export function exportStateSnapshot(state: AppState): void {
  const snapshot: StateSnapshot = {
    lineItems: state.lineItems,
    fundEntries: state.fundEntries,
    budgetItems: state.budgetItems,
    budgetTotale: state.budgetTotale,
    lineItemCategories: state.lineItemCategories,
    fundCategories: state.fundCategories,
    revenueAssumptions: state.revenueAssumptions,
    runwayAssumptions: state.runwayAssumptions,
    schemaVersion: state.schemaVersion,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SNAPSHOT_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
