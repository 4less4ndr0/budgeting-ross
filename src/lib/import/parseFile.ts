import * as XLSX from 'xlsx';

export interface RawSheet {
  headers: string[];
  rows: string[][];
}

/**
 * Reads a File (CSV or XLSX — SheetJS auto-detects) into raw string headers/rows.
 * Uses raw:false so cells come back as display strings we control the parsing of,
 * instead of SheetJS guessing numbers/dates for us.
 */
export async function parseFile(file: File): Promise<RawSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...rest] = grid;
  const headers = headerRow.map((h) => String(h ?? '').trim());
  const rows = rest.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));

  return { headers, rows };
}
