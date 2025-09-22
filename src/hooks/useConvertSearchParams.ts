"use client";

import { use } from "react";

/**
 * Hook pour convertir les searchParams de Next.js 15 (Promise) vers URLSearchParams
 * Doit être un hook car utilise React.use()
 */
export function useConvertSearchParams(
  searchParams: Promise<Record<string, string | string[] | undefined>>
): URLSearchParams {
  // Unwrap les searchParams avec React.use()
  const resolvedSearchParams = use(searchParams);

  // Convertir en URLSearchParams
  const urlSearchParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => urlSearchParams.append(key, v));
    } else if (value !== undefined) {
      urlSearchParams.append(key, value);
    }
  });

  return urlSearchParams;
}
