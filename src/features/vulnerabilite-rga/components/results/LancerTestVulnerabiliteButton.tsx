"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import { useAdresseChoisieStore } from "@/shared/stores";
import { useVulnerabiliteStore } from "../../stores/vulnerabilite.store";
import { VULNERABILITE_RGA_URL } from "../../domain/value-objects/vulnerabilite-routes";

interface LancerTestVulnerabiliteButtonProps {
  /** Adresse du compte : le test s'ouvre dessus au lieu d'une nouvelle saisie. */
  adresse: AdresseChoisie | null;
  /** Repart d'un parcours vierge, pour refaire un test déjà terminé dans cette session. */
  recommencer?: boolean;
  className?: string;
  children: ReactNode;
}

/** Ouvre le simulateur de vulnérabilité depuis le compte, adresse reprise de la simulation d'éligibilité. */
export function LancerTestVulnerabiliteButton({
  adresse,
  recommencer = false,
  className = "fr-btn",
  children,
}: LancerTestVulnerabiliteButtonProps) {
  const router = useRouter();
  const memoriserAdresse = useAdresseChoisieStore((state) => state.memoriser);

  const lancer = () => {
    if (adresse) memoriserAdresse(adresse);
    if (recommencer) useVulnerabiliteStore.getState().reset();
    router.push(VULNERABILITE_RGA_URL);
  };

  return (
    <button type="button" className={className} onClick={lancer}>
      {children}
    </button>
  );
}
