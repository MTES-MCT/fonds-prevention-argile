"use client";

import { useEffect, useState } from "react";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { SUJET_SIMULATEUR } from "../domain/value-objects/avis";
import { FormulaireAvis } from "./FormulaireAvis";

const CLE_AVIS_DONNE = "fpa-avis-simulateur";
const CODE_DEPARTEMENT = /^(\d{2,3}|2[AB])$/;

interface AvisSimulateurProps {
  simulationEligible: boolean;
  codeDepartement?: string | number | null;
}

function departementOfficiel(code: string | number | null | undefined): string | undefined {
  if (code === null || code === undefined || code === "") return undefined;
  const officiel = toOfficialCodeDepartement(code);
  return CODE_DEPARTEMENT.test(officiel) ? officiel : undefined;
}

function avisDejaDonne(): boolean {
  try {
    return window.localStorage.getItem(CLE_AVIS_DONNE) !== null;
  } catch {
    return false;
  }
}

// Avis anonyme sous le résultat du simulateur : ni dans l'iframe des partenaires, ni deux fois de suite.
export function AvisSimulateur({ simulationEligible, codeDepartement }: AvisSimulateurProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window === window.parent && !avisDejaDonne());
  }, []);

  if (!visible) return null;

  const memoriser = () => {
    try {
      window.localStorage.setItem(CLE_AVIS_DONNE, new Date().toISOString());
    } catch {
      // Stockage indisponible (navigation privée) : la question pourra être reposée.
    }
  };

  return (
    <section className="fr-container fr-mb-8w" aria-labelledby="avis-simulateur-titre">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8 fr-col-lg-8">
          <h2 className="fr-h5" id="avis-simulateur-titre">
            Votre avis sur le simulateur
          </h2>
          <p>Cela nous permettra d&apos;améliorer nos services.</p>
          <FormulaireAvis
            cible={{
              sujet: SUJET_SIMULATEUR,
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
