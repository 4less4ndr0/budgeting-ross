import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * La versione ufficiale shadcn legge il tema da `next-themes`, che qui non c'è:
 * il tema si passa dall'esterno (per ora l'app è solo chiara).
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }}
    {...props}
  />
);

export { Toaster };
