"use client";

import { useEffect, useState } from "react";
import { useParcours } from "../context/useParcours";
import { getAllersVersByEpciWithFallbackAction } from "@/features/seo/allers-vers/actions";
import type { AllersVers } from "@/features/seo/allers-vers";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";

/**
 * Sidebar "MON CONSEILLER LOCAL"
 */
export default function AllerVersLocal() {
  const { parcours } = useParcours();
  const [allersVers, setAllersVers] = useState<AllersVers[]>([]);

  useEffect(() => {
    const codeInsee = normalizeCodeInsee(parcours?.rgaSimulationData?.logement?.commune);
    if (!codeInsee) return;

    const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
    const codeEpci = parcours?.rgaSimulationData?.logement?.epci
      ? String(parcours.rgaSimulationData.logement.epci).trim()
      : undefined;

    getAllersVersByEpciWithFallbackAction(codeDepartement, codeEpci).then((result) => {
      if (result.success && result.data) {
        setAllersVers(result.data);
      }
    });
  }, [parcours?.rgaSimulationData?.logement?.commune, parcours?.rgaSimulationData?.logement?.epci]);

  if (allersVers.length === 0) return null;

  return (
    <div className="fr-mb-3w">
      <p className="fr-text--xs fr-text--bold fr-text--uppercase fr-mb-1w">
        <span className="fr-icon-question-line fr-icon--sm" aria-hidden="true" /> Mon conseiller local
      </p>
      {allersVers.map((av) => (
        <div key={av.id} className="fr-mb-2w">
          <p className="fr-mb-0">{av.nom}</p>
          {av.emails.length > 0 && (
            <p className="fr-mb-0">
              <a className="fr-link fr-text--sm" href={`mailto:${av.emails[0]}`}>
                {av.emails[0]}
              </a>
            </p>
          )}
          {av.telephone && <p className="fr-text--sm fr-mb-0">{av.telephone}</p>}
        </div>
      ))}
    </div>
  );
}
