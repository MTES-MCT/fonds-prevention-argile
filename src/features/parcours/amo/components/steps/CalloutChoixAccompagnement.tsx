"use client";

import { useEffect, useRef, useState } from "react";
import { assignAmoAutomatique, getAmosDisponibles, skipAmoStep } from "../../actions";

interface CalloutChoixAccompagnementProps {
  onSuccess?: () => void;
  refresh?: () => Promise<void>;
}

/**
 * Étape 1 (mode FACULTATIF) : le demandeur choisit s'il souhaite être accompagné
 * par un AMO ou gérer ses démarches seul.
 *
 * Au montage : on fetche les AMOs disponibles.
 *   - Si **0 AMO** seedé pour le département → bypass automatique vers ELIGIBILITE
 *     (`skipAmoStep`). L'utilisateur ne voit jamais les radios Oui/Non.
 *   - Si AMO(s) disponible(s) → affichage des radios :
 *     - "Oui" → `assignAmoAutomatique` (1er AMO du territoire) → CalloutAmoEnAttente.
 *     - "Non" → `skipAmoStep` → ELIGIBILITE.
 */
export default function CalloutChoixAccompagnement({ onSuccess, refresh }: CalloutChoixAccompagnementProps) {
  const [choix, setChoix] = useState<"oui" | "non" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True pendant le fetch initial des AMOs disponibles. Tant que c'est vrai, on n'affiche
  // pas les radios — soit on bypass vers ELIGIBILITE (0 AMO), soit on prépare le rendu.
  const [isCheckingAmoAvailability, setIsCheckingAmoAvailability] = useState(true);
  // Garde pour ne lancer le check qu'une seule fois par mount.
  const checkTriggeredRef = useRef(false);

  // Au mount : check si au moins un AMO existe pour le territoire ; sinon skip auto.
  useEffect(() => {
    if (checkTriggeredRef.current) return;
    checkTriggeredRef.current = true;

    (async () => {
      const result = await getAmosDisponibles();
      const hasAmo = result.success && result.data.length > 0;
      if (hasAmo) {
        setIsCheckingAmoAvailability(false);
        return;
      }
      // Pas d'AMO seedé → on skip directement vers ELIGIBILITE
      const skipResult = await skipAmoStep();
      if (!skipResult.success) {
        setError(skipResult.error || "Erreur lors du saut de l'étape AMO");
        setIsCheckingAmoAvailability(false);
        return;
      }
      if (refresh) await refresh();
      // Pas besoin de mettre `isCheckingAmoAvailability` à false : le refresh va re-router
      // le `CalloutManager` vers l'étape ELIGIBILITE et démonter ce composant.
    })();
  }, [refresh]);

  const doSkip = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await skipAmoStep();
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Erreur lors de l'enregistrement de votre choix");
      return;
    }
    if (refresh) await refresh();
  };

  const handleSubmit = async () => {
    if (!choix) {
      setError("Merci de sélectionner une option");
      return;
    }
    setError(null);

    if (choix === "non") {
      await doSkip();
      return;
    }

    setIsSubmitting(true);
    const result = await assignAmoAutomatique();
    setIsSubmitting(false);

    if (result.success) {
      onSuccess?.();
      if (refresh) await refresh();
      return;
    }

    setError(result.error || "Erreur lors de l'attribution de l'AMO");
  };

  // Loader pendant le fetch initial / éventuel skip auto
  if (isCheckingAmoAvailability) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Préparation de votre dossier...</p>
      </div>
    );
  }

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
