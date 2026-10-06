"use client";

import { useCallback, useEffect, useState } from "react";
import { getTopDepartementsMatomoAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type {
  DepartementStats,
  PeriodeId,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PartnerKey } from "@/shared/domain/partners";

/** Un échec reste distinct d'un vrai vide : `departements` vaut null et `erreur` est vrai. */
export function useTopDepartementsMatomo(periodeId: PeriodeId, codeDepartement: string, partner: PartnerKey | null) {
  const [departements, setDepartements] = useState<DepartementStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;
    setDepartements(null);
    setErreur(false);
    setLoading(true);

    getTopDepartementsMatomoAction(periodeId, codeDepartement || undefined, partner)
      .then((result) => {
        if (annule) return;
        if (result.success) setDepartements(result.data);
        else setErreur(true);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });

    return () => {
      annule = true;
    };
  }, [periodeId, codeDepartement, partner, tentative]);

  const reessayer = useCallback(() => setTentative((n) => n + 1), []);

  return { departements, loading, erreur, reessayer };
}
