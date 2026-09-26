import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // scroll-behavior/overflow-anchor: any scroll correction the browser makes on this
      // element happens instantly, never as a visible sliding animation. The bar itself is
      // pinned via `position: sticky` on its parent in App.tsx, so it doesn't move on scroll.
      // scroll-fade-x: la scrollbar qui è nascosta di proposito (vedi sopra), quindi senza un
      // indizio visivo non si capisce che ci sono altri tab oltre il bordo — su iPhone i
      // sotto-tab non ci stanno tutti. La sfumatura compare e sparisce da sola in base allo
      // scorrimento, senza JavaScript.
      'scroll-fade-x flex h-11 w-full items-center justify-start gap-1 overflow-x-auto border-b border-border bg-transparent p-0 text-muted-foreground [-ms-overflow-style:none] [scroll-behavior:auto] [overflow-anchor:none] [scrollbar-width:none] sm:h-9 [&::-webkit-scrollbar]:hidden',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // h-full: il tab riempie l'altezza della lista, così su mobile l'area toccabile è
      // quella dei 44px della TabsList e non solo quella del testo.
      'inline-flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground hover:text-foreground focus-visible:outline-none',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
