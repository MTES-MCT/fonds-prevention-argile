"use client";

import { useState } from "react";
import { assignAmoAutomatique, skipAmoStep } from "../../actions";

interface CalloutChoixAccompagnementProps {
  onSuccess?: () => void;
  refresh?: () => Promise<void>;
}

/**
 * Étape 1 (mode FACULTATIF) : le demandeur choisit s'il souhaite être accompagné
 * par un AMO ou gérer ses démarches seul.
 *
 * - "Oui" → appelle `assignAmoAutomatique` (auto-attribution du 1er AMO du territoire,
 *   skip de l'étape de sélection manuelle puisqu'il n'y a qu'un AMO par département).
 * - "Non" → appelle `skipAmoStep` qui fait avancer le parcours à ELIGIBILITE.
 *
 * Dans les deux cas, le parent (`CalloutManager`) re-route vers le bon callout après refresh.
 */
export default function CalloutChoixAccompagnement({ onSuccess, refresh }: CalloutChoixAccompagnementProps) {
  const [choix, setChoix] = useState<"oui" | "non" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!choix) {
      setError("Merci de sélectionner une option");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const result = choix === "oui" ? await assignAmoAutomatique() : await skipAmoStep();
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Erreur lors de l'enregistrement de votre choix");
      return;
    }

    if (choix === "oui") {
      onSuccess?.();
    }

    if (refresh) {
      await refresh();
    }
  };

  return (
    <div id="choix-amo">
      <div className="fr-callout fr-callout--yellow-moutarde">
        <p className="fr-callout__title">Première étape : choisir votre accompagnement</p>
        <p className="fr-callout__text fr-mb-4w">
          Un Assistant à Maîtrise d'Ouvrage (AMO) peut vous aider à constituer votre dossier et suivre vos travaux. Cet
          accompagnement est <strong>facultatif</strong>, mais recommandé si vous n'êtes pas familier avec ces
          démarches.
        </p>

        <p className="fr-text--bold fr-mb-1w">Souhaitez-vous être accompagné par un AMO ?</p>
        <p className="fr-hint-text fr-mb-2w">Vous pourrez modifier votre choix plus tard si besoin.</p>

        <fieldset className="fr-fieldset" aria-labelledby="choix-amo-radios">
          <div className="fr-fieldset__content">
            <div className="fr-grid-row fr-grid-row--gutters">
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-radio-group">
                  <input
                    type="radio"
                    id="choix-amo-oui"
                    name="choix-amo"
                    value="oui"
                    checked={choix === "oui"}
                    onChange={() => setChoix("oui")}
                  />
                  <label className="fr-label" htmlFor="choix-amo-oui">
                    Oui, je souhaite être accompagné par un AMO
                  </label>
                </div>
              </div>
              <div className="fr-col-12 fr-col-md-6">
                <div className="fr-radio-group">
                  <input
                    type="radio"
                    id="choix-amo-non"
                    name="choix-amo"
                    value="non"
                    checked={choix === "non"}
                    onChange={() => setChoix("non")}
                  />
                  <label className="fr-label" htmlFor="choix-amo-non">
                    Non, je gère mes démarches seul
                  </label>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {error && (
          <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
            <p>{error}</p>
          </div>
        )}

        <button type="button" className="fr-btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Confirmer mon choix"}
        </button>
      </div>
    </div>
  );
}
