"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRGAContext } from "@/lib/form-rga/session";
import { envoyerDossierEligibiliteAvecDonnees } from "@/lib/actions/parcours/eligibilite.actions";
import { useParcours } from "@/lib/parcours/hooks/useParcours";

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
