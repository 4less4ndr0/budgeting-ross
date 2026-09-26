import { describe, expect, it } from 'vitest';
import { parseReleaseNotes } from './parseReleaseNotes';

const REPO = 'https://github.com/4less4ndr0/budgeting-ross';

describe('parseReleaseNotes', () => {
  it('reads auto-generated notes with categories', () => {
    const body = [
      "## What's Changed",
      '### Interfaccia',
      `* Tema scuro con interruttore nell'header by @4less4ndr0 in ${REPO}/pull/34`,
      '### Fix tecnici',
      `* Fix: velo grigio sulla riga di tab by @Lepual in ${REPO}/pull/38`,
      '',
      `**Full Changelog**: ${REPO}/compare/v0.1.0...v0.2.0`,
    ].join('\n');

    expect(parseReleaseNotes(body)).toEqual([
      { kind: 'topic', text: 'Interfaccia' },
      { kind: 'item', text: "Tema scuro con interruttore nell'header", prNumber: '34' },
      { kind: 'topic', text: 'Fix tecnici' },
      { kind: 'item', text: 'Fix: velo grigio sulla riga di tab', prNumber: '38' },
    ]);
  });

  it('reads auto-generated notes without categories', () => {
    const body = ["## What's Changed", `* Voce senza categoria by @4less4ndr0 in ${REPO}/pull/7`].join('\n');

    expect(parseReleaseNotes(body)).toEqual([{ kind: 'item', text: 'Voce senza categoria', prNumber: '7' }]);
  });

  it('reads the legacy "- voce (#N)" shape of the migrated CHANGELOG entries', () => {
    const body = ['### Costi & Fondi', '- Confirm before ending an active recurring series (#27)'].join('\n');

    expect(parseReleaseNotes(body)).toEqual([
      { kind: 'topic', text: 'Costi & Fondi' },
      { kind: 'item', text: 'Confirm before ending an active recurring series', prNumber: '27' },
    ]);
  });

  it('drops the New Contributors block, whose bullets are people and not changes', () => {
    const body = [
      "## What's Changed",
      `* Una modifica vera by @4less4ndr0 in ${REPO}/pull/2`,
      '## New Contributors',
      `* @Lepual made their first contribution in ${REPO}/pull/2`,
    ].join('\n');

    expect(parseReleaseNotes(body)).toEqual([{ kind: 'item', text: 'Una modifica vera', prNumber: '2' }]);
  });

  it('keeps an entry without any recognizable PR reference', () => {
    expect(parseReleaseNotes('- Nota scritta a mano')).toEqual([{ kind: 'item', text: 'Nota scritta a mano' }]);
  });

  it('ignores prose and returns nothing for an empty or missing body', () => {
    expect(parseReleaseNotes('Testo libero, nessun elenco.')).toEqual([]);
    expect(parseReleaseNotes('')).toEqual([]);
    expect(parseReleaseNotes(null)).toEqual([]);
  });
});
