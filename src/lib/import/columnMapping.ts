import type { LineItem } from '../../types/domain';
import type { RawSheet } from './parseFile';
import { parseAmount, parseDateToISO } from './valueParsing';

export type InternalField = 'date' | 'category' | 'description' | 'amount' | 'type';

export const INTERNAL_FIELDS: { key: InternalField; label: string; required: boolean }[] = [
  { key: 'date', label: 'Data', required: true },
  { key: 'category', label: 'Categoria', required: false },
  { key: 'description', label: 'Descrizione', required: false },
  { key: 'amount', label: 'Importo', required: true },
  { key: 'type', label: 'Tipo (costo/entrata)', required: false },
];

const SYNONYMS: Record<InternalField, string[]> = {
  date: ['date', 'data', 'giorno', 'day'],
  category: ['category', 'categoria', 'tipo spesa', 'voce', 'group', 'gruppo'],
  description: ['description', 'descrizione', 'note', 'notes', 'dettaglio', 'nota'],
  amount: ['amount', 'importo', 'euro', '€', 'valore', 'costo', 'prezzo', 'total', 'totale'],
  type: ['type', 'tipo', 'entrata/uscita', 'entrata-uscita', 'cost/income', 'flusso'],
};

/** -1 means "no column mapped for this field". */
export type ColumnMapping = Record<InternalField, number>;

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping = { date: -1, category: -1, description: -1, amount: -1, type: -1 } as ColumnMapping;
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  for (const field of INTERNAL_FIELDS) {
    const synonyms = SYNONYMS[field.key];
    const idx = lowerHeaders.findIndex((h) => synonyms.some((syn) => h.includes(syn)));
    if (idx > -1) mapping[field.key] = idx;
  }
  return mapping;
}

export type TypeFallback = 'all-cost' | 'sign';

export interface NormalizeOptions {
  mapping: ColumnMapping;
  typeFallback: TypeFallback;
}

export interface NormalizeResult {
  items: Omit<LineItem, 'id'>[];
  skippedRowCount: number;
}

export function normalizeRows(sheet: RawSheet, options: NormalizeOptions): NormalizeResult {
  const { mapping, typeFallback } = options;
  const items: Omit<LineItem, 'id'>[] = [];
  let skippedRowCount = 0;

  for (const row of sheet.rows) {
    const rawDate = mapping.date > -1 ? row[mapping.date] : '';
    const rawAmount = mapping.amount > -1 ? row[mapping.amount] : '';

    const date = parseDateToISO(rawDate);
    const amountRaw = parseAmount(rawAmount);

    if (date === null || amountRaw === null) {
      skippedRowCount += 1;
      continue;
    }

    const category = mapping.category > -1 ? (row[mapping.category] ?? '').trim() : '';
    const description = mapping.description > -1 ? (row[mapping.description] ?? '').trim() : '';
    const rawType = mapping.type > -1 ? (row[mapping.type] ?? '').trim().toLowerCase() : '';

    let type: 'cost' | 'income';
    let amount: number;

    if (mapping.type > -1 && rawType !== '') {
      const isIncome = /entrat|income|ricav|incass/.test(rawType);
      type = isIncome ? 'income' : 'cost';
      amount = Math.abs(amountRaw);
    } else if (typeFallback === 'sign') {
      type = amountRaw < 0 ? 'cost' : 'income';
      amount = Math.abs(amountRaw);
    } else {
      type = 'cost';
      amount = Math.abs(amountRaw);
    }

    items.push({
      date,
      category: category || 'Non categorizzato',
      description: description || category || 'Voce importata',
      amount,
      type,
      source: 'imported',
      recurring: false,
    });
  }

  return { items, skippedRowCount };
}
