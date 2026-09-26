import type { StateSnapshot } from '@/lib/export/exportSnapshot';

/**
 * Auto-discovers CSV/JSON files committed in `csv-imports/` at the repo root.
 *
 * Vite's `import.meta.glob` scans the folder at build/dev-server time, so any file
 * dropped in there shows up here with zero registration — no manifest to maintain.
 * In `npm run dev` this updates live when a file is added/removed; on the published
 * site it only picks up files that were present at the last build (i.e. committed and
 * pushed before the GitHub Actions deploy ran).
 */
const csvModules = import.meta.glob('/csv-imports/*.csv', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const jsonModules = import.meta.glob('/csv-imports/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export interface RepoImportFile {
  /** File name only, e.g. "2026-01-conto-corrente.csv" */
  name: string;
  /** Raw file content */
  content: string;
}

export function listRepoImports(): RepoImportFile[] {
  return Object.entries(csvModules)
    .map(([path, content]) => ({ name: path.split('/').pop() ?? path, content }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

/** Wraps raw CSV text as a File, so it can go through the same parseFile() pipeline as a manual upload. */
export function repoImportToFile(file: RepoImportFile): File {
  return new File([file.content], file.name, { type: 'text/csv' });
}

export interface RepoSnapshotFile {
  name: string;
  snapshot: StateSnapshot;
}

/** Lists valid state snapshots found in csv-imports/*.json — malformed files are skipped, not thrown. */
export function listRepoSnapshots(): RepoSnapshotFile[] {
  const found: RepoSnapshotFile[] = [];
  for (const [path, content] of Object.entries(jsonModules)) {
    const name = path.split('/').pop() ?? path;
    const parsed = parseSnapshot(content);
    if (parsed) found.push({ name, snapshot: parsed });
  }
  return found.sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

function parseSnapshot(content: string): StateSnapshot | null {
  try {
    const data: unknown = JSON.parse(content);
    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray((data as Partial<StateSnapshot>).lineItems) ||
      !Array.isArray((data as Partial<StateSnapshot>).fundEntries) ||
      typeof (data as Partial<StateSnapshot>).revenueAssumptions !== 'object'
    ) {
      return null;
    }
    return data as StateSnapshot;
  } catch {
    return null;
  }
}
