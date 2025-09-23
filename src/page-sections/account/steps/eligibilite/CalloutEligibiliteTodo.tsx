"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRGAContext } from "@/lib/form-rga/session";
import { envoyerDossierEligibiliteAvecDonnees } from "@/lib/actions/parcours/eligibilite.actions";

export default function CalloutEligibiliteTodo() {
  const router = useRouter();
  const { data: rgaData, clearRGA } = useRGAContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async () => {
    // Réinitialiser l'erreur
    setError(null);

    // Vérifier qu'on a des données RGA
    if (!rgaData || Object.keys(rgaData).length === 0) {
      setError(
        "Aucune donnée de simulation trouvée. Veuillez d'abord compléter le simulateur."
      );
      return;
    }

    // Demander confirmation si pas déjà fait
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsLoading(true);

    try {
      // Envoyer les données vers DS avec les données RGA passées en paramètre
      const result = await envoyerDossierEligibiliteAvecDonnees(rgaData);

      if (result.success && result.data) {
        // Nettoyer les données RGA du storage local
        clearRGA();

        // Redirection vers le formulaire DS prérempli
        window.open(result.data.dossierUrl, "_blank", "noopener,noreferrer");

        // Redirection interne vers le tableau de bord après un délai
        setTimeout(() => {
          router.push("/mon-compte");
        }, 2000);
      } else if (!result.success) {
        setError(
          result.error || "Une erreur est survenue lors de l'envoi du dossier"
        );
        setShowConfirmation(false);
      } else {
        setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
        setShowConfirmation(false);
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
      setShowConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setError(null);
  };

  // Si pas de données RGA, afficher un message différent
  if (!rgaData || Object.keys(rgaData).length === 0) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">Simulation requise</p>
        <p className="fr-callout__text">
          Vous devez d'abord compléter le simulateur pour déterminer votre
          éligibilité avant de pouvoir soumettre votre dossier.
        </p>
        <button
          onClick={() => router.push("/simulateur")}
          className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
        >
          Accéder au simulateur
        </button>
      </div>
    );
  }

  // Affichage de la confirmation
  if (showConfirmation && !isLoading) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-warning-line">
        <p className="fr-callout__title">Confirmation</p>
        <div className="fr-callout__text">
          <p className="fr-mb-2w">
            Vous êtes sur le point d'envoyer votre dossier d'éligibilité avec
            les informations suivantes :
          </p>
          <ul className="fr-text--sm fr-mb-2w">
            {rgaData.logement?.adresse && (
              <li>Adresse : {rgaData.logement.adresse}</li>
            )}
            {rgaData.logement?.type && (
              <li>Type de logement : {rgaData.logement.type}</li>
            )}
            {rgaData.menage?.personnes && (
              <li>Nombre de personnes : {rgaData.menage.personnes}</li>
            )}
            {rgaData.menage?.revenu && (
              <li>Revenu fiscal : {rgaData.menage.revenu}€</li>
            )}
            {rgaData.logement?.zone_dexposition && (
              <li>Zone d'exposition : {rgaData.logement.zone_dexposition}</li>
            )}
          </ul>
          <p className="fr-text--sm">
            Après validation, vous serez redirigé vers le formulaire Démarches
            Simplifiées pour compléter votre dossier.
          </p>
        </div>
        <div className="fr-btns-group fr-btns-group--inline-sm">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="fr-btn fr-btn--icon-right fr-icon-check-line"
          >
            Confirmer et envoyer
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="fr-btn fr-btn--secondary"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde">
        <p className="fr-callout__title">Envoi en cours...</p>
        <p className="fr-callout__text">
          Création de votre dossier en cours. Veuillez patienter...
        </p>
        <div className="fr-mt-2w">
          <span className="fr-loader" aria-label="Chargement"></span>
        </div>
      </div>
    );
  }

  // Affichage par défaut
  return (
    <>
      {error && (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p className="fr-alert__title">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
        <p className="fr-callout__title">À FAIRE</p>
        <p className="fr-callout__text">
          Il est essentiel de compléter et de soumettre le premier formulaire
          pour que votre dossier soit examiné par les autorités compétentes. Par
          la suite, vous recevrez une notification concernant les étapes à
          suivre.
        </p>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line"
        >
          Remplir le formulaire d'éligibilité
        </button>
      </div>
    </>
  );
}
