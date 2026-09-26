import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Icona "i" accanto a un titolo, che al passaggio del mouse mostra una spiegazione oggi
 * scritta come testo fisso — usata per liberare le card dai paragrafi sempre visibili.
 * Stesso stile (dimensione, colori idle/hover) del pulsante elimina-categoria in
 * CategoryCombobox.tsx, unico altro punto dell'app che usa Tooltip.
 */
export function InfoTooltip({ content }: { content: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Informazioni"
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{content}</TooltipContent>
    </Tooltip>
  );
}
