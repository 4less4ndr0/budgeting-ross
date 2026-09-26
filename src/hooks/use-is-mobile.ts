import { useEffect, useState } from 'react';

/** Stessa soglia del breakpoint `sm` di Tailwind, così CSS e JS restano allineati. */
const MOBILE_BREAKPOINT = 640;

/**
 * Per i casi in cui una classe responsive non basta: recharts vuole numeri veri come prop
 * (larghezza dell'asse, raggi della ciambella), non classi CSS.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
