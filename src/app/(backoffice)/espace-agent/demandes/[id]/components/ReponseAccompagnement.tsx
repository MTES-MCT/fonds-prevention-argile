"use client";

import { useRef, useState } from "react";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { RAISONS_INELIGIBILITE } from "@/features/backoffice/espace-agent/prospects/domain/types";
import {
  accepterAccompagnement,
  refuserDemandeNonEligible,
  refuserAccompagnementEligible,
  getNextDemandeurEnAttente,
} from "@/features/backoffice/espace-agent/demandes/actions";
import { ArchiveModal } from "../../../shared/components/ArchiveModal";
import { ConfirmationReponseModal } from "./ConfirmationReponseModal";

interface ReponseAccompagnementProps {
  demandeId: string;
  statutActuel: string;
  /** Réponse déjà enregistrée (demande traitée) : l'AMO est-elle mandataire financier ? */
  estMandataireFinancier?: boolean | null;
  /** Note complémentaire déjà enregistrée (champ commentaire) */
  noteAmo?: string | null;
}

/**
 * Composant de sélection de la réponse à une demande d'accompagnement
 * Affichage sous forme de mise en avant DSFR avec un select
 */
export function ReponseAccompagnement({
  demandeId,
  statutActuel,
  estMandataireFinancier,
  noteAmo,
}: ReponseAccompagnementProps) {
  const [choix, setChoix] = useState<StatutValidationAmo | "">(
    statutActuel !== StatutValidationAmo.EN_ATTENTE ? (statutActuel as StatutValidationAmo) : ""
  );
  const [commentaire, setCommentaire] = useState("");
  const [precisionAutre, setPrecisionAutre] = useState("");
  // Réponses spécifiques au chemin "éligible et j'accompagne" (LOGEMENT_ELIGIBLE).
  const [mandataireFinancier, setMandataireFinancier] = useState<boolean | null>(null);
  const [noteComplementaire, setNoteComplementaire] = useState("");
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
  // Modale d'archivage (chemin "éligible mais je n'accompagne pas").
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const alreadyProcessed = statutActuel !== StatutValidationAmo.EN_ATTENTE;

  const handleSubmit = async () => {
    // Garde synchrone : si une soumission est déjà en vol, ignorer le clic.
    if (submitLockRef.current) return;

    if (!choix) {
      setError("Veuillez sélectionner une réponse");
      return;
    }

    // Éligible mais pas d'accompagnement : on délègue à la modale d'archivage
    // (raison obligatoire), qui appelle refuserAccompagnementEligible.
    if (choix === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
      setError(null);
      setIsArchiveOpen(true);
      return;
    }

    // Le cas "éligible et j'accompagne" exige une réponse mandataire financier.
    if (choix === StatutValidationAmo.LOGEMENT_ELIGIBLE && mandataireFinancier === null) {
      setError("Veuillez indiquer si votre structure est le mandataire financier");
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
          result = await accepterAccompagnement(
            demandeId,
            noteComplementaire.trim() || undefined,
            mandataireFinancier ?? undefined
          );
          break;
        case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
          result = await refuserDemandeNonEligible(demandeId, commentairePayload);
          break;
      }

      if (result?.success) {
        // Si la demande était déjà traitée (race serveur), on n'ouvre pas la modale
        // de confirmation classique : on affiche un message d'info à la place.
        if (result.data?.alreadyProcessed) {
          setError("Cette demande a déjà été traitée. Rafraîchissez la page pour voir l'état à jour.");
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
              &#9989; J&apos;accompagne ce demandeur et j&apos;atteste qu&apos;il est éligible
            </option>
            <option value={StatutValidationAmo.ACCOMPAGNEMENT_REFUSE}>
              &#9888;&#65039; Le demandeur est peut-être éligible, mais ma structure ne va pas l&apos;accompagner
            </option>
            <option value={StatutValidationAmo.LOGEMENT_NON_ELIGIBLE}>
              &#10060; J&apos;ai pris contact avec ce demandeur, mais il n&apos;est pas éligible
            </option>
          </select>
        </div>

        {choix === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE && !alreadyProcessed && (
          <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w">
            <p>
              Le demandeur reste éligible, mais votre structure ne l&apos;accompagne pas. En confirmant, le dossier sera
              archivé : une raison vous sera demandée.
            </p>
          </div>
        )}

        {choix === StatutValidationAmo.LOGEMENT_ELIGIBLE && !alreadyProcessed && (
          <>
            <fieldset className="fr-fieldset fr-mt-2w" aria-labelledby="mandataire-legend">
              <legend className="fr-fieldset__legend fr-text--bold" id="mandataire-legend">
                Votre structure est-elle le mandataire financier ?
              </legend>
              <div className="fr-fieldset__element">
                <div className="fr-radio-group">
                  <input
                    type="radio"
                    id="mandataire-oui"
                    name="mandataire-financier"
                    checked={mandataireFinancier === true}
                    onChange={() => setMandataireFinancier(true)}
                    disabled={isSubmitting}
                  />
                  <label className="fr-label" htmlFor="mandataire-oui">
                    Oui, ma structure est le mandataire financier
                  </label>
                </div>
              </div>
              <div className="fr-fieldset__element">
                <div className="fr-radio-group">
                  <input
                    type="radio"
                    id="mandataire-non"
                    name="mandataire-financier"
                    checked={mandataireFinancier === false}
                    onChange={() => setMandataireFinancier(false)}
                    disabled={isSubmitting}
                  />
                  <label className="fr-label" htmlFor="mandataire-non">
                    Non
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Note affichée seulement une fois la question mandataire répondue (cf. maquette). */}
            {mandataireFinancier !== null && (
              <div className="fr-input-group">
                <label className="fr-label" htmlFor="note-complementaire-input">
                  Note complémentaire
                  <span className="fr-hint-text">Optionnelle</span>
                </label>
                <textarea
                  className="fr-input"
                  id="note-complementaire-input"
                  rows={3}
                  value={noteComplementaire}
                  onChange={(e) => setNoteComplementaire(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </>
        )}

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

        {alreadyProcessed && statutActuel === StatutValidationAmo.LOGEMENT_ELIGIBLE && (
          <div className="fr-mt-4w">
            <p className="fr-mb-1w">
              Mandataire financier :{" "}
              <strong>
                {estMandataireFinancier === null ? "Non renseigné" : estMandataireFinancier ? "Oui" : "Non"}
              </strong>
            </p>
            {noteAmo && (
              <div className="fr-mt-1w">
                <p className="fr-mb-1w">Note complémentaire</p>
                <div
                  style={{
                    backgroundColor: "var(--background-contrast-grey)",
                    padding: "1rem",
                    borderRadius: "4px",
                  }}>
                  <p className="fr-mb-0">&ldquo;{noteAmo}&rdquo;</p>
                </div>
              </div>
            )}
          </div>
        )}

        {alreadyProcessed && (
          <div className="fr-alert fr-alert--info fr-mt-4w">
            <p className="fr-alert__title">Demande déjà traitée</p>
            <p>Vous avez déjà traité cette demande. La réponse ne peut plus être modifiée.</p>
          </div>
        )}
      </div>

      {/* Modale d'archivage : chemin "éligible mais je n'accompagne pas" */}
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        parcoursId={demandeId}
        archiveAction={async (id, reason) => {
          const r = await refuserAccompagnementEligible(id, reason);
          return r.success ? { success: true, data: undefined } : r;
        }}
        description="Le demandeur reste éligible, mais votre structure ne l'accompagne pas : le dossier sera archivé. L'aller-vers de son territoire pourra le reprendre."
        onSuccess={async () => {
          setIsArchiveOpen(false);
          const nextResult = await getNextDemandeurEnAttente(demandeId);
          if (nextResult.success && nextResult.data) {
            setNextDemandeId(nextResult.data.nextDemandeId);
          }
          setConfirmedChoix(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE);
          setIsModalOpen(true);
        }}
      />

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
