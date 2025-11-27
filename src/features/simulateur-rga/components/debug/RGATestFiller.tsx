"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { PartialRGAFormData } from "../../domain/entities";
import { useSimulateurRga } from "../../hooks";
import { isProduction } from "@/shared/config/env.config";
import { ROUTES } from "@/features/auth";

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
    commune_denormandie: false,
    annee_de_construction: "1994",
    rnb: "JCRJ2AXH481J",
    niveaux: 1,
    zone_dexposition: "fort",
    type: "maison",
    mitoyen: false,
    proprietaire_occupant: true,
  },
  taxeFonciere: {
    commune_eligible: false,
  },
  rga: {
    assure: true,
    indemnise_indemnise_rga: false,
    sinistres: "saine",
  },
  menage: {
    revenu_rga: 50576,
    personnes: 7,
  },
  vous: {
    proprietaire_condition: true,
    proprietaire_occupant_rga: true,
  },
};

const RGA_SESSION_KEY = "fonds-argile-rga-data";

export default function RGATestFiller(): JSX.Element | null {
  const router = useRouter();
  const { saveRGA, validateRGAData } = useSimulateurRga();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // État pour le bouton sessionStorage
  const [isSessionSuccess, setIsSessionSuccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

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

      // Sauvegarder les données de test dans le store
      saveRGA(TEST_RGA_DATA);

      setIsSuccess(true);
      setIsRedirecting(true);

      // Petit délai pour afficher le message de succès
      setTimeout(() => {
        router.push(ROUTES.connexion.particulier);
      }, 1500);
    } catch (error) {
      console.error("Erreur lors du remplissage des données de test:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillSessionStorage = () => {
    setIsSessionLoading(true);

    try {
      // Créer la structure StoredRGAData
      const payload = {
        data: TEST_RGA_DATA,
        timestamp: Date.now(),
        version: "1.0",
      };

      // Sauvegarder dans sessionStorage (ancien système)
      sessionStorage.setItem(RGA_SESSION_KEY, JSON.stringify(payload));

      setIsSessionSuccess(true);

      // Réinitialiser le message après 3 secondes
      setTimeout(() => {
        setIsSessionSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Erreur lors du remplissage sessionStorage:", error);
    } finally {
      setIsSessionLoading(false);
    }
  };

  return (
    <div className="fr-container fr-mt-2w">
      <div className="fr-callout fr-callout--pink-tuile">
        <h3 className="fr-callout__title">Mode DEBUG</h3>
        <p className="fr-callout__text">
          Remplir automatiquement le formulaire avec des données de test (Saint-Maur, maison 1994, 7 personnes, 50k€
          revenus)
        </p>

        <div className="fr-btns-group fr-btns-group--inline">
          {/* Bouton localStorage (nouveau système) */}
          <button className="fr-btn" onClick={handleFillTestData} disabled={isLoading || isRedirecting} type="button">
            {isLoading ? (
              <>
                <span className="fr-loader fr-loader--sm" aria-hidden="true"></span>
                <span className="fr-ml-1w">Chargement...</span>
              </>
            ) : isRedirecting ? (
              "Redirection..."
            ) : (
              "Nouveau système (localStorage)"
            )}
          </button>

          {/* Bouton sessionStorage (ancien système) */}
          <button
            className="fr-btn fr-btn--secondary"
            onClick={handleFillSessionStorage}
            disabled={isSessionLoading}
            type="button">
            {isSessionLoading ? (
              <>
                <span className="fr-loader fr-loader--sm" aria-hidden="true"></span>
                <span className="fr-ml-1w">Chargement...</span>
              </>
            ) : (
              "Ancien système (sessionStorage)"
            )}
          </button>
        </div>

        {/* Message de succès localStorage */}
        {isSuccess && (
          <div className="fr-alert fr-alert--success fr-mt-2w fr-alert--sm">
            <p className="fr-text--sm fr-mb-0">
              <strong>localStorage</strong> - Données sauvegardées
              {isRedirecting && " - Redirection vers la connexion..."}
            </p>
            {validationErrors.length > 0 && (
              <p className="fr-text--xs fr-mt-1w fr-mb-0" style={{ color: "#ce0600" }}>
                Attention : quelques erreurs de validation (données partielles sauvegardées)
              </p>
            )}
          </div>
        )}

        {/* Message de succès sessionStorage */}
        {isSessionSuccess && (
          <div className="fr-alert fr-alert--info fr-mt-2w fr-alert--sm">
            <p className="fr-text--sm fr-mb-0">
              <strong> sessionStorage (ancien système)</strong> - Données de test enregistrées
            </p>
            <p className="fr-text--xs fr-mt-1w fr-mb-0">
              💡 Connectez-vous maintenant pour tester la migration automatique vers la BDD
            </p>
          </div>
        )}

        {/* Affichage des erreurs de validation */}
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

        {/* Instructions de test */}
        <details className="fr-mt-2w">
          <summary className="fr-text--sm" style={{ cursor: "pointer" }}>
            📖 Comment tester la migration ?
          </summary>
          <div className="fr-text--xs fr-mt-1w" style={{ paddingLeft: "1rem" }}>
            <ol>
              <li>
                <strong>Cliquer sur "Ancien système (sessionStorage)"</strong> pour simuler l'ancien comportement
              </li>
              <li>
                <strong>Se connecter avec FranceConnect</strong>
              </li>
              <li>
                <strong>Observer les logs console</strong> pour voir la migration automatique
              </li>
              <li>
                <strong>Vérifier en BDD</strong> que les données sont bien migrées (via Drizzle Studio)
              </li>
              <li>
                <strong>Vérifier que sessionStorage est vide</strong> après migration (console :{" "}
                <code>sessionStorage.getItem('fonds-argile-rga-data')</code>)
              </li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
}
