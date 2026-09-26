import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'budgeting-ross-theme';

/** Stessi valori dei token --background: la barra di Safari resta in tinta con la pagina. */
const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#0a0a0a' };

/** Stessa logica dello script inline in index.html, che applica il tema prima del primo paint. */
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Va chiamato una sola volta (in App): il tema vive lì e viene passato a chi serve
 * (il bottone e il Toaster), così non ci sono due stati che si disallineano.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* modalità privata o storage pieno: il tema resta valido per questa sessione */
    }
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const label = theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon" onClick={onToggle} aria-label={label}>
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
