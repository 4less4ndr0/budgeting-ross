import { describe, expect, it } from 'vitest';
import { parseAmount, parseDateToISO } from './valueParsing';

describe('parseAmount', () => {
  it('parses plain integers', () => {
    expect(parseAmount('180')).toBe(180);
  });

  it('parses Italian-style decimals (comma, dot thousands)', () => {
    expect(parseAmount('1.234,56')).toBeCloseTo(1234.56);
    expect(parseAmount('180,00')).toBeCloseTo(180);
  });

  it('parses US-style decimals (dot, comma thousands)', () => {
    expect(parseAmount('1,234.56')).toBeCloseTo(1234.56);
  });

  it('strips currency symbols and spaces', () => {
    expect(parseAmount('€ 220,00')).toBeCloseTo(220);
    expect(parseAmount('220 €')).toBeCloseTo(220);
  });

  it('handles negative amounts and parenthesized negatives', () => {
    expect(parseAmount('-50')).toBe(-50);
    expect(parseAmount('(50)')).toBe(-50);
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
  });
});

describe('parseDateToISO', () => {
  it('parses ISO dates as-is', () => {
    expect(parseDateToISO('2026-06-20')).toBe('2026-06-20');
  });

  it('parses Italian dd/mm/yyyy dates', () => {
    expect(parseDateToISO('20/06/2026')).toBe('2026-06-20');
  });

  it('parses dd-mm-yyyy dates', () => {
    expect(parseDateToISO('20-06-2026')).toBe('2026-06-20');
  });

  it('rejects an out-of-range month/day', () => {
    expect(parseDateToISO('32/13/2026')).toBeNull();
  });

  it('returns null for empty or garbage input', () => {
    expect(parseDateToISO('')).toBeNull();
    expect(parseDateToISO('not a date')).toBeNull();
  });
});
