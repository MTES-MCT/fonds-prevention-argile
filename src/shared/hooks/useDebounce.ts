"use client";

import { useState, useEffect } from "react";

/**
 * Hook pour debouncer une valeur
 *
 * @param value - Valeur à debouncer
 * @param delay - Délai en millisecondes
 * @returns Valeur debouncée
 *
 * @example
 * ```tsx
 * const [input, setInput] = useState("");
 * const debouncedInput = useDebounce(input, 300);
 *
 * useEffect(() => {
 *   if (debouncedInput.length >= 5) {
 *     fetchResults(debouncedInput);
 *   }
 * }, [debouncedInput]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
