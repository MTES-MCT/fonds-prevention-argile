"use client";

import { useState, useEffect } from "react";

/**
 * Renvoie `true` seulement si `active` reste vrai plus de `delayMs` millisecondes.
 * Évite un flash de loader pour les opérations qui se terminent vite (réseau performant) ;
 * redevient `false` immédiatement dès que `active` repasse à faux.
 *
 * @example
 * ```tsx
 * const showSpinner = useDelayedFlag(isLoading, 300);
 * ```
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return show;
}
