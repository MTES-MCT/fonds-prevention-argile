"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParcours } from "../../../context/useParcours";
import { envoyerDossierEligibiliteAvecDonnees } from "../../../actions";
import { regenererLienPrefillAction } from "@/features/parcours/dossiers-ds/actions";
import { Step } from "../../../domain";
import { useSimulateurRga } from "@/features/simulateur";
import { ROUTES } from "@/features/auth/client";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";

export default function CalloutEligibiliteTodo() {
  const router = useRouter();
  const { data: rgaData, clearRGA } = useSimulateurRga();
  const { refresh, statutAmo, getDossierUrl } = useParcours(); // Pour rafraîchir après envoi

  // Quand l'AMO a validé l'accompagnement, on met en avant la confirmation dans le titre.
  const isAmoConfirmed = statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE;

  // Un lien existe déjà : c'est le seul cas où « régénérer » a un sens.
  const aDejaUnLien = !!getDossierUrl(Step.ELIGIBILITE);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationMessage, setRegenerationMessage] = useState<string | null>(null);

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
        setError((!result.success && result.error) || "Une erreur est survenue lors de l'envoi du dossier");
      }
    } catch (err) {
      dsWindow?.close();
      console.error("Erreur lors de l'envoi:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Secours : le lien ne fonctionne plus (mauvais compte DN, brouillon expiré…). On ne sait
  // pas diagnostiquer côté DN, alors on vérifie d'abord si un ancien numéro a été déposé
  // entre-temps, sinon on repart d'un formulaire neuf. Cf. ADR-0027.
  const handleRegenerer = async () => {
    setError(null);
    setRegenerationMessage(null);
    setIsRegenerating(true);

    try {
      const result = await regenererLienPrefillAction();

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.statut === "rattache") {
        setRegenerationMessage(
          "Bonne nouvelle : votre dossier a bien été transmis à Démarches Numériques. Nous l'avons retrouvé."
        );
        await refresh();
        return;
      }

      await handleSubmit();
    } catch (err) {
      console.error("Erreur lors de la régénération:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsRegenerating(false);
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
          {isAmoConfirmed
            ? "Votre AMO a confirmé votre accompagnement ! Vous pouvez remplir votre formulaire d'éligibilité"
            : "Vous pouvez remplir votre formulaire d'éligibilité"}
        </p>
        <p className="fr-callout__text">
          Une fois votre formulaire rempli et soumis, un instructeur l'analysera. Vous recevrez une notification
          lorsqu'il aura pris sa décision.
        </p>
        <button
          onClick={handleSubmit}
          disabled={isLoading || isRegenerating}
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          Remplir le formulaire d'éligibilité
        </button>

        {aDejaUnLien && (
          <details className="fr-mt-3w">
            <summary className="fr-text--sm">Ce lien ne fonctionne plus ?</summary>
            <div className="fr-mt-1w fr-text--sm">
              <p>
                Cela arrive quand le formulaire a été ouvert avec un autre compte Démarches Numériques, ou lorsqu'il est
                resté trop longtemps sans être complété.
              </p>
              <p>Avant de recommencer, deux vérifications qui vous feront peut-être gagner du temps :</p>
              <ul>
                <li>
                  connectez-vous à Démarches Numériques <strong>avec l'adresse e-mail que vous utilisez ici</strong> ;
                </li>
                <li>regardez vos dossiers en cours : votre formulaire s'y trouve peut-être déjà.</li>
              </ul>
              <p>
                Sinon, nous pouvons vous en créer un nouveau. Attention : ce que vous auriez déjà saisi dans l'ancien
                formulaire ne sera pas repris.
              </p>
              <button
                onClick={handleRegenerer}
                disabled={isLoading || isRegenerating}
                className="fr-btn fr-btn--secondary fr-btn--sm">
                {isRegenerating ? "Vérification en cours…" : "Créer un nouveau formulaire"}
              </button>
            </div>
          </details>
        )}

        {regenerationMessage && (
          <div className="fr-alert fr-alert--success fr-alert--sm fr-mt-2w">
            <p>{regenerationMessage}</p>
          </div>
        )}
      </div>
    </>
  );
}
