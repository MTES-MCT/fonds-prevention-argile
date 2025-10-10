"use client";

import { useState } from "react";
import {
  validerLogementEligible,
  refuserLogementNonEligible,
  refuserAccompagnement,
} from "@/lib/actions/parcours/amo/amo.actions";
import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";
import Image from "next/image";

interface ValidationAmoFormProps {
  validationId: string;
  token: string;
}

export default function ValidationAmoForm({
  validationId,
}: ValidationAmoFormProps) {
  const [choix, setChoix] = useState<StatutValidationAmo | undefined>(
    undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion de la soumission du formulaire
  const handleSubmit = async () => {
    if (!choix) {
      setError("Veuillez sélectionner une option");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result;

      switch (choix) {
        case StatutValidationAmo.LOGEMENT_ELIGIBLE:
          result = await validerLogementEligible(validationId);
          break;
        case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
          result = await refuserLogementNonEligible(
            validationId,
            "Le logement n'est pas éligible selon les critères du Fonds Prévention Argile"
          );
          break;
        case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
          result = await refuserAccompagnement(
            validationId,
            "Accompagnement refusé"
          );
          break;
      }

      if (result?.success) {
        setSuccess(true);
      } else {
        setError(result?.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Erreur lors de la validation:", err);
      setError("Une erreur est survenue lors de la validation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    switch (choix) {
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        return (
          <div className="fr-alert fr-alert--success">
            <p className="fr-alert__title">
              Vous avez validé l'éligibilité du logement
            </p>
            <p className="fr-alert__description">
              Le demandeur a été notifié de votre décision.
            </p>
          </div>
        );
      case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
        return (
          <div className="fr-alert fr-alert--success">
            <p className="fr-alert__title">
              Vous avez indiqué que le logement n'est pas éligible
            </p>
            <p className="fr-alert__description">
              Le demandeur a été notifié de votre décision.
            </p>
          </div>
        );
      case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
        return (
          <div className="fr-alert fr-alert--success">
            <p className="fr-alert__title">
              Vous avez refusé d'accompagner ce demandeur
            </p>
            <p className="fr-alert__description">
              Le demandeur a été notifié de votre décision.
            </p>
          </div>
        );
    }
  }

  return (
    <div>
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      <fieldset
        className="fr-fieldset"
        id="choix-validation-fieldset"
        aria-labelledby="choix-validation-legend choix-validation-messages"
      >
        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="radio-eligible"
              name="choix-validation"
              checked={choix === StatutValidationAmo.LOGEMENT_ELIGIBLE}
              onChange={() => setChoix(StatutValidationAmo.LOGEMENT_ELIGIBLE)}
              disabled={isSubmitting}
            />
            <label className="fr-label" htmlFor="radio-eligible">
              J'accompagne ce demandeur et j'atteste qu'il est éligible
            </label>
            <div className="fr-radio-rich__pictogram">
              <Image
                alt="Erreur technique"
                className="shrink-0"
                height={150}
                src="/illustrations/success.svg"
                width={150}
              />
            </div>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="radio-non-eligible"
              name="choix-validation"
              checked={choix === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE}
              onChange={() =>
                setChoix(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE)
              }
              disabled={isSubmitting}
            />
            <label className="fr-label" htmlFor="radio-non-eligible">
              J'ai pris contact avec ce demandeur, mais il n'est pas éligible
            </label>
            <div className="fr-radio-rich__pictogram">
              <Image
                alt="Erreur technique"
                className="shrink-0"
                height={150}
                src="/illustrations/warning.svg"
                width={150}
              />
            </div>
          </div>
        </div>

        <div className="fr-fieldset__element">
          <div className="fr-radio-group fr-radio-rich">
            <input
              type="radio"
              id="radio-refuse"
              name="choix-validation"
              checked={choix === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE}
              onChange={() =>
                setChoix(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE)
              }
              disabled={isSubmitting}
            />
            <label className="fr-label" htmlFor="radio-refuse">
              Je n'accompagne pas ce demandeur
            </label>
            <div className="fr-radio-rich__pictogram">
              <Image
                alt="Erreur technique"
                className="shrink-0"
                height={150}
                src="/illustrations/error.svg"
                width={150}
              />
            </div>
          </div>
        </div>

        <div
          className="fr-messages-group"
          id="choix-validation-messages"
          aria-live="polite"
        ></div>
      </fieldset>

      <p className="fr-text--sm fr-mt-4w text-gray-500">
        Attention, en confirmant votre accompagnement, vous attestez que le
        demandeur est éligible selon les critères définis par l'arrêté du 6
        septembre 2025 (
        <a
          href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052201370"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052201370
        </a>
        ). En cas de non éligibilité du dossier, vous ne pourrez pas faire
        avancer son dossier.
      </p>

      <div className="fr-mt-4w">
        <button
          type="button"
          className="fr-btn"
          onClick={handleSubmit}
          disabled={!choix || isSubmitting}
        >
          {isSubmitting ? "Envoi en cours..." : "Choix confirmé"}
        </button>
      </div>
    </div>
  );
}
