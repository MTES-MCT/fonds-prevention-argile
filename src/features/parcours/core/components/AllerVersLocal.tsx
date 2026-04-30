"use client";

import { useEffect, useState } from "react";
import { useParcours } from "../context/useParcours";
import { getAllersVersByEpciWithFallbackAction } from "@/features/seo/allers-vers/actions";
import type { AllersVers } from "@/features/seo/allers-vers";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";

/**
 * Sidebar "MON CONSEILLER LOCAL"
 * Affiche au plus un seul aller-vers (le 1er) ; silencieuse si aucun AV pour le département.
 */
export default function AllerVersLocal() {
  const { parcours } = useParcours();
  const [av, setAv] = useState<AllersVers | null>(null);

  useEffect(() => {
    const codeInsee = normalizeCodeInsee(parcours?.rgaSimulationData?.logement?.commune);
    if (!codeInsee) return;

    const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);
    const codeEpci = parcours?.rgaSimulationData?.logement?.epci
      ? String(parcours.rgaSimulationData.logement.epci).trim()
      : undefined;

    getAllersVersByEpciWithFallbackAction(codeDepartement, codeEpci).then((result) => {
      if (result.success && result.data && result.data.length > 0) {
        setAv(result.data[0]);
      }
    });
  }, [parcours?.rgaSimulationData?.logement?.commune, parcours?.rgaSimulationData?.logement?.epci]);

  if (!av) return null;

  const greyStyle: React.CSSProperties = { color: "var(--text-mention-grey)" };

  return (
    <div className="text-left md:text-right">
      <p className="fr-text--xs fr-text--bold uppercase fr-mb-1w">
        <span className="fr-icon-question-line fr-icon--sm fr-mr-1v" aria-hidden="true" />
        Mon conseiller local
      </p>
      <p className="fr-mb-1v fr-text--xs" style={greyStyle}>
        {av.nom}
      </p>
      {av.emails.length > 0 && (
        <p className="fr-mb-1v fr-text--xs">
          <a className="fr-link fr-text--xs" href={`mailto:${av.emails[0]}`}>
            {av.emails[0]}
          </a>
        </p>
      )}
      {av.telephone && (
        <p className="fr-text--xs fr-mb-0" style={greyStyle}>
          {av.telephone}
        </p>
      )}
    </div>
  );
}
