"use client";

import { useCallback, useEffect, useState } from "react";
import { VulnerabiliteFormulaire } from "@/features/vulnerabilite-rga/components/VulnerabiliteFormulaire";
import { useVulnerabiliteStore } from "@/features/vulnerabilite-rga/stores/vulnerabilite.store";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import { enregistrerTestVulnerabiliteAgentAction } from "@/features/backoffice/espace-agent/shared/actions/test-vulnerabilite-agent.actions";

interface TestVulnerabiliteAgentProps {
  /** Même identifiant que la page d'origine : validation AMO, ou parcours d'un prospect. */
  id: string;
  nomDemandeur: string;
  adresseInitiale: AdresseChoisie | null;
  urlRetour: string;
}

/**
 * Simulateur de vulnérabilité fait par l'agent avec le demandeur au téléphone.
 *
 * Le store du simulateur vit en sessionStorage et survit au changement de dossier : sans remise à zéro
 * à l'arrivée et au départ, les réponses du demandeur précédent réapparaîtraient chez le suivant.
 */
export function TestVulnerabiliteAgent({ id, nomDemandeur, adresseInitiale, urlRetour }: TestVulnerabiliteAgentProps) {
  const [pret, setPret] = useState(false);

  useEffect(() => {
    useVulnerabiliteStore.getState().reset();
    setPret(true);
    return () => useVulnerabiliteStore.getState().reset();
  }, []);

  const enregistrer = useCallback((payload: unknown) => enregistrerTestVulnerabiliteAgentAction(id, payload), [id]);

  if (!pret) return null;

  return <VulnerabiliteFormulaire agent={{ nomDemandeur, adresseInitiale, enregistrer, urlRetour }} />;
}
