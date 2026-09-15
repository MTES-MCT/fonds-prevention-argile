"use client";

import { useState } from "react";
import { LIBELLE_FORMULAIRE } from "@/features/parcours/dossiers-ds/domain/value-objects/libelle-formulaire";
import type { Step } from "../../domain";
import { RecreerFormulaireModal } from "./RecreerFormulaireModal";

interface SecoursLienFormulaireProps {
  step: Step;
}

/**
 * Secours du demandeur dont le lien DN ne mène nulle part : brouillon ouvert avec un autre
 * compte Démarches Numériques, ou resté trop longtemps sans être complété (ADR-0027).
 *
 * On ne sait pas diagnostiquer l'état d'un brouillon côté DN : on invite donc d'abord à le
 * retrouver, et on ne propose qu'ensuite d'en créer un neuf.
 */
export function SecoursLienFormulaire({ step }: SecoursLienFormulaireProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <details className="fr-mt-3w">
        <summary className="fr-text--sm">Ce lien ne fonctionne plus ?</summary>
        <div className="fr-mt-1w fr-text--sm">
          <p>
            Cela arrive quand le formulaire a été ouvert avec un autre compte Démarches Numériques, ou lorsqu&apos;il
            est resté trop longtemps sans être complété.
          </p>
          <p>Avant de recommencer, deux vérifications qui vous feront peut-être gagner du temps :</p>
          <ul>
            <li>
              connectez-vous à Démarches Numériques <strong>avec l&apos;adresse e-mail que vous utilisez ici</strong> ;
            </li>
            <li>regardez vos dossiers en cours : votre formulaire s&apos;y trouve peut-être déjà.</li>
          </ul>
          <p>Sinon, nous pouvons vous en créer un nouveau.</p>
          <button type="button" onClick={() => setIsModalOpen(true)} className="fr-btn fr-btn--secondary fr-btn--sm">
            Créer un nouveau formulaire {LIBELLE_FORMULAIRE[step]}
          </button>
        </div>
      </details>

      <RecreerFormulaireModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} step={step} />
    </>
  );
}
