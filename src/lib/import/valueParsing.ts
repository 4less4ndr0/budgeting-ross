/**
 * Locale-aware amount parsing: strips currency symbols/spaces, and normalizes
 * both "1.234,56" (Italian) and "1,234.56" (US) into a plain JS number.
 */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (s === '') return null;

  s = s.replace(/[€$\s]/g, '');
  const isNegative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/^-/, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator appears last is the decimal separator.
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Only a comma present: decimal if it looks like ",dd" (<=2 digits after), else thousands.
    const decimals = s.length - lastComma - 1;
    s = decimals <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  // Only a dot, or no separator: already a valid JS number format.

  const value = Number(s);
  if (Number.isNaN(value)) return null;
  return isNegative ? -value : value;
}

const DATE_FORMATS = [
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: ['y', 'm', 'd'] as const }, // yyyy-mm-dd
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: ['d', 'm', 'y'] as const }, // dd/mm/yyyy
  { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: ['d', 'm', 'y'] as const }, // dd-mm-yyyy
];

/**
 * Parses a date string into ISO yyyy-mm-dd. Tries yyyy-mm-dd, then dd/mm/yyyy (the
 * common Italian format), then dd-mm-yyyy. Returns null if nothing matches.
 */
export function parseDateToISO(raw: string): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  for (const { regex, order } of DATE_FORMATS) {
    const match = s.match(regex);
    if (!match) continue;
    const parts: Record<'y' | 'm' | 'd', string> = { y: '', m: '', d: '' };
    order.forEach((key, i) => {
      parts[key] = match[i + 1];
    });
    const year = Number(parts.y);
    const month = Number(parts.m);
    const day = Number(parts.d);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Excel serial date number as string (SheetJS with raw:false shouldn't normally hit this,
  // but guard for pasted numeric dates anyway).
  const serial = Number(s);
  if (!Number.isNaN(serial) && serial > 20000 && serial < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(epoch.getTime() + serial * 86400000);
    return date.toISOString().slice(0, 10);
  }

  return null;
}
