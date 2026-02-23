"use client";

import { useState, useMemo } from "react";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { SimulateurLayout } from "../shared/SimulateurLayout";
import { NavigationButtons } from "../shared/NavigationButtons";
import { getSeuilsRevenu, type SeuilsRevenuRga } from "../../domain/types/rga-revenus.types";

interface StepRevenusProps {
  initialValue?: {
    nombrePersonnes?: number;
    revenuFiscalReference?: number;
  };
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onSubmit: (data: PartialRGASimulationData) => void;
  onBack: () => void;
}

/**
 * Génère les options de tranches de revenus à partir des seuils
 * Retourne un tableau avec label et valeur représentative
 */
function generateTrancheOptions(seuils: SeuilsRevenuRga): Array<{ label: string; value: number }> {
  const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(montant);

  return [
    {
      label: `Inférieur à ${formatMontant(seuils.tresModeste + 1)}`,
      value: Math.floor(seuils.tresModeste / 2), // Valeur représentative pour "très modeste" (milieu de la tranche)
    },
    {
      label: `Inférieur à ${formatMontant(seuils.modeste + 1)}`,
      value: seuils.tresModeste + 1, // Valeur représentative pour "modeste"
    },
    {
      label: `Inférieur à ${formatMontant(seuils.intermediaire + 1)}`,
      value: seuils.modeste + 1, // Valeur représentative pour "intermédiaire"
    },
    {
      label: `Supérieur ou égal à ${formatMontant(seuils.intermediaire + 1)}`,
      value: seuils.intermediaire + 1, // Valeur représentative pour "supérieure"
    },
  ];
}

/**
 * Retrouve la valeur d'option correspondante à un revenu stocké.
 * Le revenu stocké peut ne pas correspondre exactement aux valeurs représentatives
 * des options (ex: données pré-remplies en mode édition), on détermine la tranche
 * par les seuils puis retourne la valeur représentative correspondante.
 */
function findMatchingOptionValue(revenu: number, seuils: SeuilsRevenuRga): number {
  const options = generateTrancheOptions(seuils);
  // Correspondance exacte (cas normal après sélection)
  const exact = options.find((o) => o.value === revenu);
  if (exact) return exact.value;

  // Déterminer la tranche par les seuils et retourner la valeur représentative
  if (revenu < seuils.tresModeste + 1) return options[0].value;
  if (revenu < seuils.modeste + 1) return options[1].value;
  if (revenu < seuils.intermediaire + 1) return options[2].value;
  return options[3].value;
}

/**
 * Étape 8 : Revenus du ménage
 *
 * Flux :
 * 1. L'utilisateur sélectionne le nombre de personnes
 * 2. Les tranches de revenus s'affichent dynamiquement
 * 3. L'utilisateur sélectionne sa tranche
 */
export function StepRevenus({ initialValue, numeroEtape, totalEtapes, canGoBack, onSubmit, onBack }: StepRevenusProps) {
  const [nombrePersonnes, setNombrePersonnes] = useState<number | null>(initialValue?.nombrePersonnes ?? null);
  const [selectedTranche, setSelectedTranche] = useState<number | null>(() => {
    const revenu = initialValue?.revenuFiscalReference;
    const personnes = initialValue?.nombrePersonnes;
    if (revenu == null || !personnes) return revenu ?? null;
    // Résoudre la valeur représentative correspondant à la tranche du revenu stocké
    const seuils = getSeuilsRevenu(personnes, false);
    return findMatchingOptionValue(revenu, seuils);
  });

  const isLastStep = numeroEtape === totalEtapes;

  // Calcul des seuils et options de tranches (hors IDF car départements éligibles pas en IDF)
  const trancheOptions = useMemo(() => {
    if (!nombrePersonnes) return null;
    const seuils = getSeuilsRevenu(nombrePersonnes, false); // false = hors IDF
    return generateTrancheOptions(seuils);
  }, [nombrePersonnes]);

  const isValid = nombrePersonnes !== null && selectedTranche !== null;

  const handleSubmit = () => {
    if (!isValid || nombrePersonnes === null || selectedTranche === null) return;
    onSubmit({
      menage: {
        personnes: nombrePersonnes,
        revenu_rga: selectedTranche,
      },
    });
  };

  return (
    <SimulateurLayout
      title="Combien de personne y'a-t-il dans votre foyer ?"
      currentStep={numeroEtape}
      totalSteps={totalEtapes}>
      {/* Nombre de personnes */}
      <div className="md:w-1/2">
        <div className="fr-input-wrap fr-input-wrap--addon">
          <input
            className="fr-input md:w-1/2"
            type="number"
            id="montant-indemnisation"
            min="0"
            max={20}
            value={nombrePersonnes ?? ""}
            onChange={(e) => setNombrePersonnes(parseInt(e.target.value, 10))}
          />
          <span className="fr-addon fr-ml-2w"> personnes</span>
        </div>
      </div>

      {/* Tranches de revenus (affiché après sélection du nombre de personnes) */}
      {nombrePersonnes && trancheOptions && (
        <fieldset className="fr-fieldset fr-mt-4w" id="tranche-fieldset">
          <legend className="fr-fieldset__legend">
            <h2 className="fr-h6">
              Quel est votre revenu fiscal de référence ?
            </h2>
            <span className="fr-hint-text">
              Si vous avez plusieurs déclarations, additionnez les revenus. Le revenu fiscal de référence se trouve sur
              la première page de{" "}
              <a href="https://cfspart-idp.impots.gouv.fr/" target="_blank" rel="noopener noreferrer">
                votre dernier avis d'impôt sur le revenu
              </a>
            </span>
          </legend>

          {trancheOptions.map((option, index) => (
            <div className="fr-fieldset__element" key={index}>
              <div className="fr-radio-group fr-radio-rich">
                <input
                  type="radio"
                  id={`tranche-${index}`}
                  name="tranche-revenu"
                  checked={selectedTranche === option.value}
                  onChange={() => setSelectedTranche(option.value)}
                />
                <label className="fr-label" htmlFor={`tranche-${index}`}>
                  {option.label}
                </label>
              </div>
            </div>
          ))}
        </fieldset>
      )}

      <NavigationButtons
        onPrevious={onBack}
        onNext={handleSubmit}
        canGoBack={canGoBack}
        isNextDisabled={!isValid}
        nextLabel={isLastStep ? "Voir le résultat" : "Suivant"}
      />
    </SimulateurLayout>
  );
}
