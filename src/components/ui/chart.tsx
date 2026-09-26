import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${colorConfig
          .map(([key, cfg]) => `  --color-${key}: ${cfg.color};`)
          .join('\n')}\n}`,
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps extends React.ComponentProps<'div'> {
  active?: boolean;
  payload?: readonly ChartTooltipPayloadItem[];
  label?: React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  formatter?: (value: number | string) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
}

interface ChartTooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { fill?: string; [key: string]: unknown };
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      formatter,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) return null;

      const [item] = payload;
      const key = labelKey ?? String(item?.dataKey ?? item?.name ?? 'value');
      const itemConfig = config[key];
      const value = itemConfig?.label ?? label;

      if (labelFormatter) {
        return <div className="font-medium text-foreground">{labelFormatter(value)}</div>;
      }
      if (!value) return null;
      return <div className="font-medium text-foreground">{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, config, labelKey]);

    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl',
          className,
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = nameKey ?? String(item.name ?? item.dataKey ?? 'value');
            const itemConfig = config[key];
            const indicatorColor = item.payload?.fill ?? item.color;

            return (
              <div
                key={String(item.dataKey ?? index)}
                className="flex w-full flex-wrap items-stretch gap-2"
              >
                {!hideIndicator && (
                  <div
                    className={cn('shrink-0 rounded-[2px]', {
                      'h-2.5 w-2.5': indicator === 'dot',
                      'w-1 self-stretch': indicator === 'line',
                      'w-0 border-[1.5px] border-dashed bg-transparent self-stretch': indicator === 'dashed',
                    })}
                    style={{ backgroundColor: indicator === 'dashed' ? undefined : (indicatorColor as string) }}
                  />
                )}
                <div className="flex flex-1 items-center justify-between leading-none">
                  <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                  {item.value !== undefined && (
                    <span className="ml-2 font-mono font-medium tabular-nums text-foreground">
                      {formatter ? formatter(item.value) : item.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendPayloadItem {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
}

interface ChartLegendContentProps extends React.ComponentProps<'div'> {
  payload?: readonly ChartLegendPayloadItem[];
  verticalAlign?: 'top' | 'bottom' | 'middle';
  nameKey?: string;
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  ({ className, payload, verticalAlign = 'bottom', nameKey }, ref) => {
    const { config } = useChart();

    if (!payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className,
        )}
      >
        {payload.map((item) => {
          const key = nameKey ?? String(item.dataKey ?? 'value');
          const itemConfig = config[key];

          return (
            <div
              key={String(item.value)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
              {itemConfig?.label ?? item.value}
            </div>
          );
        })}
      </div>
    );
  },
);
ChartLegendContent.displayName = 'ChartLegendContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
