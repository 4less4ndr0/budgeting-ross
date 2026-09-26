import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Groups items by yyyy-MM (from their `date` field), months sorted newest-first,
 * items within each month sorted chronologically (oldest-first).
 */
export function groupByMonth<T extends { date: string }>(items: T[]): [string, T[]][] {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, T[]>();
  for (const item of sorted) {
    const month = item.date.slice(0, 7);
    const bucket = groups.get(month);
    if (bucket) bucket.push(item);
    else groups.set(month, [item]);
  }
  return Array.from(groups.entries()).reverse();
}

/** "2026-06" -> "Giugno 2026" */
export function formatMonthLabel(monthKey: string): string {
  const label = format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: it });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
