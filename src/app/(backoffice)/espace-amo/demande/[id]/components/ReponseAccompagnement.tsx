"use client";

import { useState } from "react";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import {
  accepterAccompagnement,
  refuserDemandeNonEligible,
  refuserDemandeAccompagnement,
  getNextDemandeurEnAttente,
} from "@/features/backoffice/espace-amo/demande/actions";
import { ConfirmationReponseModal } from "./ConfirmationReponseModal";

interface ReponseAccompagnementProps {
  demandeId: string;
  statutActuel: string;
}

/**
 * Composant de sélection de la réponse à une demande d'accompagnement
 * Affichage sous forme de mise en avant DSFR avec un select
 */
export function ReponseAccompagnement({ demandeId, statutActuel }: ReponseAccompagnementProps) {
  const [choix, setChoix] = useState<StatutValidationAmo | "">(
    statutActuel !== StatutValidationAmo.EN_ATTENTE ? (statutActuel as StatutValidationAmo) : ""
  );
  const [commentaire, setCommentaire] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour la modale de confirmation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmedChoix, setConfirmedChoix] = useState<StatutValidationAmo | null>(null);
  const [nextDemandeId, setNextDemandeId] = useState<string | null>(null);

  const alreadyProcessed = statutActuel !== StatutValidationAmo.EN_ATTENTE;

  const handleSubmit = async () => {
    if (!choix) {
      setError("Veuillez sélectionner une réponse");
      return;
    }

    // Validation du commentaire pour le cas "non éligible"
    if (choix === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
      if (!commentaire.trim()) {
        setError("Veuillez préciser la raison de l'inéligibilité");
        return;
      }
      if (commentaire.trim().length < 10) {
        setError("Veuillez fournir une raison détaillée (minimum 10 caractères)");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result;

      switch (choix) {
        case StatutValidationAmo.LOGEMENT_ELIGIBLE:
          result = await accepterAccompagnement(demandeId);
          break;
        case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
          result = await refuserDemandeNonEligible(demandeId, commentaire.trim());
          break;
        case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
          result = await refuserDemandeAccompagnement(demandeId, "Accompagnement refusé");
          break;
      }

      if (result?.success) {
        // Récupérer le prochain demandeur en attente
        const nextResult = await getNextDemandeurEnAttente(demandeId);
        if (nextResult.success && nextResult.data) {
          setNextDemandeId(nextResult.data.nextDemandeId);
        }

        // Ouvrir la modale de confirmation
        setConfirmedChoix(choix);
        setIsModalOpen(true);
      } else {
        setError(result?.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Erreur lors de la réponse:", err);
      setError("Une erreur est survenue lors de la réponse");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="fr-callout fr-callout--yellow-moutarde">
        <h3 className="fr-callout__title">Souhaitez-vous accompagner ce demandeur ?</h3>
        <p className="fr-callout__text">
          Attention, en confirmant votre accompagnement, vous attestez que le demandeur est éligible selon les critères
          définis par{" "}
          <a href="https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052201370" target="_blank" rel="noopener noreferrer">
            l&apos;arrêté du 6 septembre 2025
          </a>
          .
        </p>

        {error && (
          <div className="fr-alert fr-alert--error fr-mt-4w">
            <p className="fr-alert__title">Erreur</p>
            <p>{error}</p>
          </div>
        )}

        <div className="fr-select-group fr-mt-4w">
          <select
            className="fr-select"
            id="select-reponse"
            value={choix}
            onChange={(e) => setChoix(e.target.value as StatutValidationAmo)}
            disabled={isSubmitting || alreadyProcessed}>
            <option value="">Votre réponse</option>
            <option value={StatutValidationAmo.LOGEMENT_ELIGIBLE}>
              J&apos;accompagne ce demandeur et j&apos;atteste qu&apos;il est éligible
            </option>
            <option value={StatutValidationAmo.LOGEMENT_NON_ELIGIBLE}>
              J&apos;ai pris contact avec ce demandeur, mais il n&apos;est pas éligible
            </option>
            <option value={StatutValidationAmo.ACCOMPAGNEMENT_REFUSE}>Je n&apos;accompagne pas ce demandeur</option>
          </select>
        </div>

        {choix === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE && (
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="commentaire-input">
              Merci de préciser les raisons de l&apos;inéligibilité du demandeur
              <span className="fr-hint-text">Ceci nous permet de comprendre ce qui a pu bloquer</span>
            </label>
            <textarea
              className="fr-input"
              id="commentaire-input"
              name="commentaire"
              rows={4}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={isSubmitting || alreadyProcessed}
            />
          </div>
        )}

        {!alreadyProcessed && (
          <button type="button" className="fr-btn" onClick={handleSubmit} disabled={!choix || isSubmitting}>
            {isSubmitting ? "Envoi en cours..." : "Confirmer ma réponse"}
          </button>
        )}

        {alreadyProcessed && (
          <div className="fr-alert fr-alert--info fr-mt-4w">
            <p className="fr-alert__title">Demande déjà traitée</p>
            <p>Vous avez déjà traité cette demande. La réponse ne peut plus être modifiée.</p>
          </div>
        )}
      </div>

      {/* Modale de confirmation */}
      {confirmedChoix && (
        <ConfirmationReponseModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          choix={confirmedChoix}
          demandeId={demandeId}
          nextDemandeId={nextDemandeId}
        />
      )}
    </>
  );
}
