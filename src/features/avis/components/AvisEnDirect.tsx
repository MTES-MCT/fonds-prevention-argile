"use client";

import { useEffect, useState } from "react";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { titreAvis, type SujetAnonyme } from "../domain/value-objects/avis";
import { FormulaireAvis } from "./FormulaireAvis";

const CODE_DEPARTEMENT = /^(\d{2,3}|2[AB])$/;

interface AvisEnDirectProps {
  sujet: SujetAnonyme;
  simulationEligible?: boolean;
  codeDepartement?: string | number | null;
}

function departementOfficiel(code: string | number | null | undefined): string | undefined {
  if (code === null || code === undefined || code === "") return undefined;
  const officiel = toOfficialCodeDepartement(code);
  return CODE_DEPARTEMENT.test(officiel) ? officiel : undefined;
}

function avisDejaDonne(cle: string): boolean {
  try {
    return window.localStorage.getItem(cle) !== null;
  } catch {
    return false;
  }
}

// Avis anonyme sous le résultat d'un simulateur : ni dans l'iframe des partenaires, ni deux fois de suite.
export function AvisEnDirect({ sujet, simulationEligible, codeDepartement }: AvisEnDirectProps) {
  const [visible, setVisible] = useState(false);
  const cle = `fpa-avis-${sujet}`;

  useEffect(() => {
    setVisible(window === window.parent && !avisDejaDonne(cle));
  }, [cle]);

  if (!visible) return null;

  const memoriser = () => {
    try {
      window.localStorage.setItem(cle, new Date().toISOString());
    } catch {
      // Stockage indisponible (navigation privée) : la question pourra être reposée.
    }
  };

  return (
    <section className="fr-container fr-mb-8w" aria-labelledby={`avis-${sujet}-titre`}>
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-8">
          <h2 className="fr-h5" id={`avis-${sujet}-titre`}>
            {titreAvis(sujet)}
          </h2>
          <p>Cela nous permettra d&apos;améliorer nos services.</p>
          <FormulaireAvis
            cible={{
              sujet,
              simulationEligible,
              codeDepartement: departementOfficiel(codeDepartement),
            }}
            origine="en_direct"
            onTermine={memoriser}
          />
        </div>
      </div>
    </section>
  );
}
