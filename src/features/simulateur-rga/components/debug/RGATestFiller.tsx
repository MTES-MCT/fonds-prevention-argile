"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { PartialRGAFormData } from "../../domain/entities";
import { useRGAContext } from "../../context";
import { isProduction } from "@/shared/config/env.config";

// Données de test adaptées au type RGAFormData avec structure imbriquée
const TEST_RGA_DATA: PartialRGAFormData = {
  logement: {
    adresse: "19B Rue des Clefs Moreaux 36250 Saint-Maur",
    code_region: "24",
    code_departement: "36",
    epci: "243600327",
    commune: "36202",
    commune_nom: "Saint-Maur",
    coordonnees: "46.79937275370108,1.6307522502094969",
    clef_ban: "36202_0180_00019_bis",
    commune_denormandie: "non",
    annee_de_construction: "1994",
    rnb: "JCRJ2AXH481J",
    niveaux: 1,
    zone_dexposition: "fort",
    type: "maison",
    mitoyen: "non",
    proprietaire_occupant: "oui",
  },

  taxeFonciere: {
    commune_eligible: "non",
  },

  rga: {
    assure: "oui",
    indemnise_rga: "non",
    sinistres: "saine",
  },

  menage: {
    revenu_rga: 50576,
    personnes: 7,
  },

  vous: {
    proprietaire_condition: "oui",
    proprietaire_occupant_rga: "oui",
  },
};

export default function RGATestFiller(): JSX.Element | null {
  const router = useRouter();
  const { saveRGA, validateRGAData } = useRGAContext();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Ne pas afficher en production
  if (isProduction()) {
    return null;
  }

  const handleFillTestData = async () => {
    setIsLoading(true);
    setValidationErrors([]);

    try {
      // Valider les données avant de sauvegarder
      const errors = validateRGAData(TEST_RGA_DATA);

      if (errors.length > 0) {
        setValidationErrors(errors);
        console.warn("Données de test avec erreurs de validation:", errors);
      }

      // Sauvegarder les données de test en session
      const success = saveRGA(TEST_RGA_DATA);

      if (success) {
        setIsSuccess(true);
        setIsRedirecting(true);

        // Petit délai pour afficher le message de succès
        setTimeout(() => {
          router.push("/connexion");
        }, 1500);
      }
    } catch (error) {
      console.error("Erreur lors du remplissage des données de test:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fr-container fr-mt-2w">
      <div className="fr-callout fr-callout--pink-tuile">
        <h3 className="fr-callout__title">Mode DEBUG</h3>
        <p className="fr-callout__text">
          Remplir automatiquement le formulaire avec des données de test
          (Saint-Maur, maison 1994, 7 personnes, 50k€ revenus)
        </p>
        <button
          className="fr-btn"
          onClick={handleFillTestData}
          disabled={isLoading || isRedirecting}
          type="button"
        >
          {isLoading ? (
            <>
              <span
                className="fr-loader fr-loader--sm"
                aria-hidden="true"
              ></span>
              <span className="fr-ml-1w">Chargement...</span>
            </>
          ) : isRedirecting ? (
            "Redirection..."
          ) : (
            "Remplir avec des données de test"
          )}
        </button>

        {/* Message de succès */}
        {isSuccess && (
          <div className="fr-alert fr-alert--success fr-mt-2w fr-alert--sm">
            <p className="fr-text--sm fr-mb-0">
              <strong>Simulation remplie en dur pour tests</strong> - Données
              sauvegardées en session
              {isRedirecting && " - Redirection vers la connexion..."}
            </p>
            {validationErrors.length > 0 && (
              <p
                className="fr-text--xs fr-mt-1w fr-mb-0"
                style={{ color: "#ce0600" }}
              >
                Attention : quelques erreurs de validation (données partielles
                sauvegardées)
              </p>
            )}
          </div>
        )}

        {/* Affichage des erreurs de validation si présentes et pas de succès */}
        {!isSuccess && validationErrors.length > 0 && (
          <div className="fr-alert fr-alert--error fr-mt-2w fr-alert--sm">
            <p className="fr-text--sm fr-mb-1w">Erreurs de validation :</p>
            <ul className="fr-text--xs fr-mb-0">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
