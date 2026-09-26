/**
 * Turns the markdown body of a GitHub release into the flat node list the
 * changelog dialog renders.
 *
 * Two bullet shapes have to work at once: the one GitHub auto-generates
 * ("* Titolo by @utente in https://.../pull/40") and the legacy
 * "- Titolo (#40)" of the old CHANGELOG.md, whose entries were pasted as-is
 * into the historical releases instead of being rewritten line by line.
 */

export type ChangelogNode =
  | { kind: 'topic'; text: string }
  | { kind: 'item'; text: string; prNumber?: string };

/** `## Titolo` but not `### Titolo`: the `\s` after `##` fails on a third `#`. */
const SECTION_RE = /^##\s+(.*)$/;
const TOPIC_RE = /^###\s+(.*)$/;
const BULLET_RE = /^[*-]\s+(.*)$/;
/** Greedy head, so a title that itself contains " by @… in <url>" keeps the last match. */
const GENERATED_SUFFIX_RE = /^(.*)\s+by\s+@[\w-]+\s+in\s+https?:\/\/\S*\/pull\/(\d+)$/;
const LEGACY_SUFFIX_RE = /^(.*)\s\(#(\d+)\)$/;

function toItem(text: string): ChangelogNode {
  const generated = text.match(GENERATED_SUFFIX_RE);
  if (generated) return { kind: 'item', text: generated[1].trim(), prNumber: generated[2] };

  const legacy = text.match(LEGACY_SUFFIX_RE);
  if (legacy) return { kind: 'item', text: legacy[1].trim(), prNumber: legacy[2] };

  return { kind: 'item', text };
}

export function parseReleaseNotes(body: string | null | undefined): ChangelogNode[] {
  if (!body) return [];

  const nodes: ChangelogNode[] = [];
  let skipping = false;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();

    const section = line.match(SECTION_RE);
    if (section) {
      // GitHub appends "New Contributors" after the real entries, and its
      // bullets are people rather than changes — drop that whole block.
      skipping = /^new contributors/i.test(section[1].trim());
      continue;
    }
    if (skipping) continue;

    const topic = line.match(TOPIC_RE);
    if (topic) {
      nodes.push({ kind: 'topic', text: topic[1].trim() });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) nodes.push(toItem(bullet[1].trim()));
  }

  return nodes;
}
