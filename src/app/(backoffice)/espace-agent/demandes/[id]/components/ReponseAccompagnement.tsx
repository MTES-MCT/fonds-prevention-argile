"use client";

import { useRef, useState } from "react";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { RAISONS_INELIGIBILITE } from "@/features/backoffice/espace-agent/prospects/domain/types";
import {
  accepterAccompagnement,
  refuserDemandeNonEligible,
  getNextDemandeurEnAttente,
} from "@/features/backoffice/espace-agent/demandes/actions";
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
  const [precisionAutre, setPrecisionAutre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Garde synchrone contre le double-clic : `disabled` lié à `isSubmitting`
  // n'est appliqué qu'au re-render suivant. Cette ref bloque les clics arrivés
  // avant que React n'ait re-rendu, source de la race observée en prod
  // (deux approveValidation concurrents → saut de 2 étapes).
  const submitLockRef = useRef(false);

  // États pour la modale de confirmation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmedChoix, setConfirmedChoix] = useState<StatutValidationAmo | null>(null);
  const [nextDemandeId, setNextDemandeId] = useState<string | null>(null);

  const alreadyProcessed = statutActuel !== StatutValidationAmo.EN_ATTENTE;

  const handleSubmit = async () => {
    // Garde synchrone : si une soumission est déjà en vol, ignorer le clic.
    if (submitLockRef.current) return;

    if (!choix) {
      setError("Veuillez sélectionner une réponse");
      return;
    }

    // Validation de la raison pour le cas "non éligible"
    let commentairePayload = commentaire.trim();
    if (choix === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
      if (!commentaire) {
        setError("Veuillez sélectionner une raison d'inéligibilité");
        return;
      }
      if (commentaire === "autre") {
        if (precisionAutre.trim().length < 10) {
          setError("Veuillez préciser la raison en au moins 10 caractères");
          return;
        }
        commentairePayload = `Autre : ${precisionAutre.trim()}`;
      }
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      let result;

      switch (choix) {
        case StatutValidationAmo.LOGEMENT_ELIGIBLE:
          result = await accepterAccompagnement(demandeId);
          break;
        case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
          result = await refuserDemandeNonEligible(demandeId, commentairePayload);
          break;
      }

      if (result?.success) {
        // Si la demande était déjà traitée (race serveur), on n'ouvre pas la modale
        // de confirmation classique : on affiche un message d'info à la place.
        if (result.data?.alreadyProcessed) {
          setError(
            "Cette demande a déjà été traitée. Rafraîchissez la page pour voir l'état à jour."
          );
          return;
        }

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
      submitLockRef.current = false;
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
          <a
            href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000052201370"
            target="_blank"
            rel="noopener noreferrer">
            l&apos;arrêté du 23 avril 2026
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
          </select>
        </div>

        {choix === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE && (
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="commentaire-input">
              Merci de préciser les raisons de l&apos;inéligibilité du demandeur
              <span className="fr-hint-text">Ceci nous permet de comprendre ce qui a pu bloquer</span>
            </label>
            <select
              className="fr-select"
              id="commentaire-input"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={isSubmitting || alreadyProcessed}>
              <option value="">Sélectionner les raisons</option>
              {RAISONS_INELIGIBILITE.map((raison) => (
                <option key={raison.value} value={raison.value}>
                  {raison.label}
                </option>
              ))}
            </select>
            {commentaire === "autre" && (
              <div className="fr-input-group fr-mt-2w">
                <label className="fr-label" htmlFor="precision-autre-input">
                  Précisez la raison
                  <span className="fr-hint-text">Minimum 10 caractères</span>
                </label>
                <input
                  className="fr-input"
                  type="text"
                  id="precision-autre-input"
                  value={precisionAutre}
                  onChange={(e) => setPrecisionAutre(e.target.value)}
                  disabled={isSubmitting || alreadyProcessed}
                  placeholder="Précisez la raison"
                />
              </div>
            )}
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
