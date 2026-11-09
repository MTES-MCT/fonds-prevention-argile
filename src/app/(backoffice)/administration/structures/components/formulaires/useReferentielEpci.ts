"use client";

import { useEffect, useMemo, useState } from "react";
import { getReferentielEpciAction, type EpciReferentiel } from "@/features/backoffice";
import { isDepartementEligible } from "@/shared/constants/rga.constants";
import type { ActionResult } from "@/shared/types";
import type { OptionSelect } from "./SelectMultiple";

// Un seul chargement pour toutes les modales de la page ; un échec est oublié pour être retenté.
let chargement: Promise<ActionResult<EpciReferentiel[]>> | null = null;

export interface ReferentielEpci {
  epcis: EpciReferentiel[];
  erreur: string | null;
}

export function useReferentielEpci(): ReferentielEpci {
  const [etat, setEtat] = useState<ReferentielEpci>({ epcis: [], erreur: null });

  useEffect(() => {
    let actif = true;
    chargement ??= getReferentielEpciAction();
    chargement.then((result) => {
      if (!result.success) chargement = null;
      if (!actif) return;
      setEtat(
        result.success
          ? { epcis: result.data, erreur: null }
          : { epcis: [], erreur: `${result.error} : les EPCI déjà choisis restent affichés par leur code.` }
      );
    });
    return () => {
      actif = false;
    };
  }, []);

  return etat;
}

/** Nom d'un EPCI par son code, pour l'affichage. */
export function useNomsEpci(epcis: EpciReferentiel[]): (code: string) => string | null {
  const noms = useMemo(() => new Map(epcis.map((epci) => [epci.code, epci.nom])), [epcis]);
  return (code) => noms.get(code) ?? null;
}

// Seuls les EPCI qui touchent un département du dispositif ; ceux des départements choisis d'abord.
export function optionsEpci(epcis: EpciReferentiel[], departements: string[]): OptionSelect[] {
  const option = (epci: EpciReferentiel): OptionSelect => ({
    valeur: epci.code,
    libelle: `${epci.nom} (${epci.codesDepartements.join(", ")})`,
    motsCles: epci.code,
  });
  const dansLeDispositif = epcis.filter((epci) => epci.codesDepartements.some(isDepartementEligible));
  const dedans = (epci: EpciReferentiel) => epci.codesDepartements.some((code) => departements.includes(code));
  return [...dansLeDispositif.filter(dedans), ...dansLeDispositif.filter((epci) => !dedans(epci))].map(option);
}
