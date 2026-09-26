import { useShallow } from 'zustand/react/shallow';
import AssumptionsView from '@/components/assumptions/AssumptionsView';
import BudgetView from '@/components/budget/BudgetView';
import ChangelogButton from '@/components/changelog/ChangelogButton';
import FundsTable from '@/components/costs/FundsTable';
import LineItemsTable from '@/components/costs/LineItemsTable';
import DashboardView from '@/components/dashboard/DashboardView';
import ExportMenu from '@/components/export/ExportMenu';
import ImportView from '@/components/import/ImportView';
import SnapshotRestoreCard from '@/components/import/SnapshotRestoreCard';
import ThemeToggle, { useTheme } from '@/components/theme/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/storage/store';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const state = useAppStore(
    useShallow((s) => ({
      lineItems: s.lineItems,
      fundEntries: s.fundEntries,
      budgetItems: s.budgetItems,
      budgetTotale: s.budgetTotale,
      lineItemCategories: s.lineItemCategories,
      fundCategories: s.fundCategories,
      revenueAssumptions: s.revenueAssumptions,
      runwayAssumptions: s.runwayAssumptions,
      schemaVersion: s.schemaVersion,
    })),
  );

  return (
    // Un solo provider per tutti i tooltip dell'app (richiesto da Radix).
    <TooltipProvider delayDuration={200}>
      <Tabs defaultValue="bep">
        {/* Title + top-level tabs pinned to the top of the viewport: they no longer scroll
            away with the page, so there's nothing left to look like it's "moving" while
            scrolling. */}
        <div className="sticky top-0 z-20 bg-background">
          <div className="mx-auto max-w-6xl px-safe pt-6">
            <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Budgeting Ross</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Burn rate, runway e proiezione break-even
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start">
                <ExportMenu state={state} />
                <ChangelogButton />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
            </header>

            <TabsList>
              <TabsTrigger value="bep">BEP</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-safe pb-safe pt-4">
          <TabsContent value="bep">
            {/* Own sub-navigation, only visible while BEP is the active top-level tab. */}
            <Tabs defaultValue="dashboard">
              <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="costi">Costi & Fondi</TabsTrigger>
                <TabsTrigger value="assunzioni">Assunzioni ricavi</TabsTrigger>
                <TabsTrigger value="importa">Importa</TabsTrigger>
              </TabsList>

              <div className="pt-4">
                <TabsContent value="dashboard">
                  <DashboardView />
                </TabsContent>
                <TabsContent value="costi" className="space-y-4">
                  <LineItemsTable />
                  <FundsTable />
                </TabsContent>
                <TabsContent value="assunzioni">
                  <AssumptionsView />
                </TabsContent>
                <TabsContent value="importa" className="space-y-4">
                  <SnapshotRestoreCard />
                  <ImportView />
                </TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          {/* Budget stands on its own: no sub-tabs, nothing from BEP shows through. */}
          <TabsContent value="budget">
            <BudgetView />
          </TabsContent>
        </div>
      </Tabs>
      <Toaster position="bottom-right" theme={theme} />
    </TooltipProvider>
  );
}
