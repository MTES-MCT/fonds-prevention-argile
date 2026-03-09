"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParcours } from "../../../context/useParcours";
import { envoyerDossierEligibiliteAvecDonnees } from "../../../actions";
import { useSimulateurRga } from "@/features/simulateur";
import { ROUTES } from "@/features/auth/client";

export default function CalloutEligibiliteTodo() {
  const router = useRouter();
  const { data: rgaData, clearRGA } = useSimulateurRga();
  const { refresh } = useParcours(); // Pour rafraîchir après envoi

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Vérifier la présence des données RGA
    if (!rgaData || Object.keys(rgaData).length === 0) {
      setError("Aucune donnée de simulation trouvée. Veuillez d'abord compléter le simulateur.");
      return;
    }

    setIsLoading(true);

    // Ouvrir la fenêtre AVANT l'appel async pour éviter le blocage popup Safari.
    // Safari n'autorise window.open() qu'en contexte synchrone d'un geste utilisateur.
    const dsWindow = window.open("about:blank", "_blank");
    if (dsWindow) {
      dsWindow.document.title = "Chargement…";
      dsWindow.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;text-align:center;margin-top:40vh;font-size:1.2rem">' +
        "Création de votre dossier en cours…</p>";
    }

    try {
      const result = await envoyerDossierEligibiliteAvecDonnees(rgaData);

      if (result.success && result.data) {
        // Nettoyer les données RGA
        clearRGA();

        // Rafraîchir le parcours dans le context
        await refresh();

        // Rediriger la fenêtre pré-ouverte vers le dossier DS
        if (dsWindow && !dsWindow.closed) {
          dsWindow.location.href = result.data.dossierUrl;
        }

        // Redirection après délai
        setTimeout(() => {
          router.push(ROUTES.particulier.monCompte);
        }, 5000);
      } else {
        dsWindow?.close();
        setError(
          (!result.success && result.error) || "Une erreur est survenue lors de l'envoi du dossier",
        );
      }
    } catch (err) {
      dsWindow?.close();
      console.error("Erreur lors de l'envoi:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="fr-callout fr-callout--yellow-moutarde">
        <p className="fr-callout__title">Envoi en cours...</p>
        <p className="fr-callout__text">Création de votre dossier en cours. Veuillez patienter...</p>
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
        <p className="fr-callout__title">
          Vous avez vu votre AMO et vous avez vérifié votre éligibilité ? Remplissez votre formulaire d’éligibilité
        </p>
        <p className="fr-callout__text">
          Après avoir choisi votre AMO (Assistant à Maîtrise d’Ouvrage, obligatoire), complétez le formulaire
          d’éligibilité et soumettez-le pour examen. Vous recevrez une notification lorsque l’instructeur aura pris sa
          décision.
        </p>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          Remplir le formulaire d'éligibilité
        </button>
      </div>
    </>
  );
}
