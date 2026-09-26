import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        // I campi numerici dell'app sono tutti importi o percentuali: su iOS `decimal` apre il
        // tastierino invece della tastiera intera. Resta sovrascrivibile passando `inputMode`.
        inputMode={inputMode ?? (type === 'number' ? 'decimal' : undefined)}
        className={cn(
          // text-base su mobile (16px) non per estetica: sotto i 16px Safari iOS zooma da solo
          // sul campo appena lo tocchi. Da `sm` in su si torna alla misura desktop di sempre.
          'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
