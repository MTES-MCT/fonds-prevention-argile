"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRGAContext } from "@/lib/form-rga/session";
import { envoyerDossierEligibiliteAvecDonnees } from "@/lib/actions/parcours/eligibilite.actions";
import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { RGAFormData } from "@/lib/form-rga";

export default function CalloutEligibiliteTodo() {
  const router = useRouter();
  const { data: rgaData, clearRGA } = useRGAContext();
  const { refresh } = useParcours(); // Pour rafraîchir après envoi

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!rgaData || Object.keys(rgaData).length === 0) {
      setError(
        "Aucune donnée de simulation trouvée. Veuillez d'abord compléter le simulateur."
      );
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsLoading(true);

    try {
      const result = await envoyerDossierEligibiliteAvecDonnees(rgaData);

      if (result.success && result.data) {
        // Nettoyer les données RGA
        clearRGA();

        // Rafraîchir le parcours dans le context
        await refresh();

        // Ouvrir le formulaire DS
        window.open(result.data.dossierUrl, "_blank", "noopener,noreferrer");

        // Redirection après délai
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

  // Affichage de confirmation
  if (rgaData && showConfirmation && !isLoading) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde fr-icon-warning-line">
        <p className="fr-callout__title">Confirmation</p>
        <div className="fr-callout__text">
          <p className="fr-mb-2w">
            Vous êtes sur le point d'envoyer votre dossier d'éligibilité avec
            les informations suivantes :
          </p>
          <RGADataSummary data={rgaData} />
          <p className="fr-text--sm">
            Après validation, vous serez redirigé vers le formulaire Démarches
            Simplifiées pour compléter votre dossier.
          </p>
        </div>
        <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--icon-right">
          <li>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="fr-btn fr-btn--icon-right fr-icon-check-line"
            >
              Confirmer et envoyer
            </button>
          </li>
          <li>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="fr-btn fr-btn--secondary"
            >
              Annuler
            </button>
          </li>
        </ul>
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

// Composant pour afficher le résumé des données RGA
function RGADataSummary({ data }: { data: Partial<RGAFormData> }) {
  return (
    <ul className="fr-text--sm fr-mb-2w">
      {data.logement?.adresse && <li>Adresse : {data.logement.adresse}</li>}
      {data.logement?.type && <li>Type de logement : {data.logement.type}</li>}
      {data.menage?.personnes && (
        <li>Nombre de personnes : {data.menage.personnes}</li>
      )}
      {data.menage?.revenu && <li>Revenu fiscal : {data.menage.revenu}€</li>}
      {data.logement?.zone_dexposition && (
        <li>Zone d'exposition : {data.logement.zone_dexposition}</li>
      )}
    </ul>
  );
}
