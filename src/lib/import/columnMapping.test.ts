import { describe, expect, it } from 'vitest';
import { normalizeRows, suggestMapping } from './columnMapping';
import type { RawSheet } from './parseFile';

describe('suggestMapping', () => {
  it('matches Italian headers to internal fields', () => {
    const mapping = suggestMapping(['Data', 'Categoria', 'Descrizione', 'Importo', 'Tipo']);
    expect(mapping).toEqual({ date: 0, category: 1, description: 2, amount: 3, type: 4 });
  });

  it('matches headers in a different order and with synonyms', () => {
    const mapping = suggestMapping(['Note', 'Valore', 'Giorno', 'Entrata/Uscita']);
    expect(mapping.description).toBe(0);
    expect(mapping.amount).toBe(1);
    expect(mapping.date).toBe(2);
    expect(mapping.type).toBe(3);
    expect(mapping.category).toBe(-1);
  });

  it('leaves unmatched fields at -1', () => {
    const mapping = suggestMapping(['Colonna sconosciuta']);
    expect(mapping.date).toBe(-1);
    expect(mapping.amount).toBe(-1);
  });
});

describe('normalizeRows', () => {
  const sheet: RawSheet = {
    headers: ['Data', 'Categoria', 'Descrizione', 'Importo', 'Tipo'],
    rows: [
      ['20/06/2026', 'Vendite', 'Sito Tier 1', '220', 'Entrata'],
      ['01/06/2026', 'Setup', 'Dominio', '180', 'Costo'],
      ['', '', '', '', ''], // should be skipped (unparseable date/amount)
    ],
  };

  it('normalizes rows using the mapped type column', () => {
    const result = normalizeRows(sheet, {
      mapping: { date: 0, category: 1, description: 2, amount: 3, type: 4 },
      typeFallback: 'all-cost',
    });

    expect(result.items).toHaveLength(2);
    expect(result.skippedRowCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      date: '2026-06-20',
      category: 'Vendite',
      amount: 220,
      type: 'income',
      source: 'imported',
    });
    expect(result.items[1]).toMatchObject({ date: '2026-06-01', amount: 180, type: 'cost' });
  });

  it('falls back to "all rows are costs" when no type column is mapped', () => {
    const result = normalizeRows(sheet, {
      mapping: { date: 0, category: 1, description: 2, amount: 3, type: -1 },
      typeFallback: 'all-cost',
    });
    expect(result.items.every((i) => i.type === 'cost')).toBe(true);
  });

  it('falls back to sign-based typing when requested', () => {
    const signSheet: RawSheet = {
      headers: ['Data', 'Importo'],
      rows: [
        ['20/06/2026', '-100'],
        ['21/06/2026', '50'],
      ],
    };
    const result = normalizeRows(signSheet, {
      mapping: { date: 0, category: -1, description: -1, amount: 1, type: -1 },
      typeFallback: 'sign',
    });
    expect(result.items[0]).toMatchObject({ amount: 100, type: 'cost' });
    expect(result.items[1]).toMatchObject({ amount: 50, type: 'income' });
  });
});
