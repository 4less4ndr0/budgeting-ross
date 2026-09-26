import { parseReleaseNotes, type ChangelogNode } from './parseReleaseNotes';

/**
 * Reads the changelog straight from the repo's GitHub Releases at runtime.
 *
 * The site is a static build on GitHub Pages, so there is no server to ask:
 * the browser hits the public API directly (the repo is public, no token
 * needed, and api.github.com allows cross-origin reads). The upside over the
 * old bundled CHANGELOG.md is that publishing a release shows up in the app
 * immediately, with no rebuild — which is why this revalidates on every open
 * instead of trusting a stored copy for a while.
 */

const RELEASES_API_URL = 'https://api.github.com/repos/4less4ndr0/budgeting-ross/releases?per_page=20';
export const RELEASES_PAGE_URL = 'https://github.com/4less4ndr0/budgeting-ross/releases';

/** Deliberately not the zustand key (`budgeting-ross-store`) — this copy is only an offline fallback. */
const CACHE_KEY = 'budgeting-ross-releases';

export type ReleaseEntry = {
  id: number;
  /** Release name, falling back to the tag when a release was published unnamed. */
  title: string;
  tagName: string;
  htmlUrl: string;
  nodes: ChangelogNode[];
};

type GitHubRelease = {
  id: number;
  name: string | null;
  tag_name: string;
  html_url: string;
  body: string | null;
  draft: boolean;
};

type Cache = { entries: ReleaseEntry[] };

function readCache(): ReleaseEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Cache>;
    return Array.isArray(parsed?.entries) ? parsed.entries : null;
  } catch {
    // Private browsing, or an entry left over in a shape we no longer write.
    return null;
  }
}

function writeCache(entries: ReleaseEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ entries } satisfies Cache));
  } catch {
    // The fallback is a nicety, never a requirement.
  }
}

function toEntry(release: GitHubRelease): ReleaseEntry {
  return {
    id: release.id,
    title: release.name?.trim() || release.tag_name,
    tagName: release.tag_name,
    htmlUrl: release.html_url,
    nodes: parseReleaseNotes(release.body),
  };
}

export async function fetchReleases(): Promise<ReleaseEntry[]> {
  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      // GitHub serves unauthenticated reads with max-age=60, so a default
      // fetch can hand back a response from just before a release was
      // published. Revalidating keeps the dialog honest and costs nothing:
      // a conditional request answered 304 doesn't count against the limit.
      cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`GitHub API ha risposto ${response.status}`);

    const entries = ((await response.json()) as GitHubRelease[]).filter((r) => !r.draft).map(toEntry);
    writeCache(entries);
    return entries;
  } catch (error) {
    // Offline, or the 60 req/h unauthenticated limit: the stored copy still
    // beats an empty dialog, since the changelog is read-only reference material.
    const cached = readCache();
    if (cached) return cached;
    throw error;
  }
}
