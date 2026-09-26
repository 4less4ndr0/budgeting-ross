import { useState } from 'react';
import { ExternalLink, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchReleases, RELEASES_PAGE_URL, type ReleaseEntry } from '@/lib/changelog/fetchReleases';

const PR_BASE_URL = 'https://github.com/4less4ndr0/budgeting-ross/pull/';

export default function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<ReleaseEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      setReleases(await fetchReleases());
    } catch {
      // No retry logic needed: every reopen tries again.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Every open, not just the first: a release published or edited a moment
    // ago has to show up without reloading the page. Nothing is fetched on
    // mount, though — the dialog is behind a button, so a page load pays
    // nothing for a changelog nobody may open.
    if (next && !loading) void load();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Info />
          Changelog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Changelog
          </DialogTitle>
          <DialogDescription>
            Storico delle modifiche pubblicate su main, preso dalle release della repo e raggruppato per argomento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* Only while there is nothing to show: a revalidation over an
              already-rendered list must not push it down behind a spinner. */}
          {loading && releases === null && (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carico le release…
            </p>
          )}

          {failed && releases === null && (
            <p className="py-6 text-sm text-muted-foreground">
              Non sono riuscito a leggere le release da GitHub. Controlla la connessione e riapri il changelog, oppure{' '}
              <a href={RELEASES_PAGE_URL} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                aprile direttamente su GitHub
              </a>
              .
            </p>
          )}

          {releases?.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Non c'è ancora nessuna release pubblicata.</p>
          )}

          {releases?.map((release) => (
            <section key={release.id} className="mt-6 first:mt-0">
              <h2 className="mb-2 flex items-baseline justify-between gap-3 text-base font-bold">
                {release.title}
                <a
                  href={release.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-normal text-muted-foreground hover:text-foreground hover:underline"
                >
                  {release.tagName}
                </a>
              </h2>
              {release.nodes.map((node, i) =>
                node.kind === 'topic' ? (
                  <h3
                    key={i}
                    className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground first-of-type:mt-0"
                  >
                    {node.text}
                  </h3>
                ) : (
                  <p key={i} className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
                    <span>{node.text}</span>
                    {node.prNumber && (
                      <a
                        href={`${PR_BASE_URL}${node.prNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        #{node.prNumber}
                      </a>
                    )}
                  </p>
                ),
              )}
            </section>
          ))}
        </div>

        <a
          href={RELEASES_PAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Vedi tutte le release su GitHub
        </a>
      </DialogContent>
    </Dialog>
  );
}
