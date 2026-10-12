"use client";

import type { ReactNode } from "react";
import { VulnerabiliteLayout } from "./VulnerabiliteLayout";
import { NavigationButtons } from "./NavigationButtons";
import { CategorieBadge } from "./CategorieBadge";
import { getCategorieReponse } from "../../domain/services/categorisation.service";
import { getCategorieAffichage } from "../../domain/value-objects/grille-categorisation";

export interface QuestionOption<TValue extends string> {
  value: TValue;
  label: string;
  /** Précision sous le libellé, en bleu, comme l'étape « état de la maison » du simulateur d'éligibilité. */
  precision?: string;
}

interface ChoixRadiosProps<TValue extends string> {
  fieldsetName: string;
  critereId: string;
  legend: string;
  /** false : légende masquée, la question étant déjà le titre de l'écran. */
  legendVisible?: boolean;
  hint?: string;
  options: QuestionOption<TValue>[];
  selected: TValue | undefined;
  onSelect: (value: TValue) => void;
}

/** Liste de choix (fr-radio-rich) d'une question, catégorie affichée sur l'option sélectionnée. */
export function ChoixRadios<TValue extends string>({
  fieldsetName,
  critereId,
  legend,
  legendVisible = false,
  hint,
  options,
  selected,
  onSelect,
}: ChoixRadiosProps<TValue>) {
  return (
    <fieldset className="fr-fieldset" id={`${fieldsetName}-fieldset`}>
      <legend className={`fr-fieldset__legend${legendVisible ? "" : " fr-sr-only"}`}>
        {legend}
        {hint && <span className="fr-hint-text">{hint}</span>}
      </legend>
      {options.map((option) => {
        const isSelected = selected === option.value;
        // Catégorie affichée UNIQUEMENT sur l'option sélectionnée : montrer un badge sur
        // chaque option alourdirait l'écran et casserait la simplicité recherchée.
        const categorie = isSelected ? getCategorieReponse(critereId, option.value) : null;
        const explication = getCategorieAffichage(categorie)?.explication;

        return (
          <div className="fr-fieldset__element" key={option.value}>
            <div className="fr-radio-group fr-radio-rich">
              <input
                type="radio"
                id={`${fieldsetName}-${option.value}`}
                name={fieldsetName}
                checked={isSelected}
                onChange={() => onSelect(option.value)}
              />
              <label className="fr-label" htmlFor={`${fieldsetName}-${option.value}`}>
                {option.label}
                <CategorieBadge categorie={categorie} />
                {option.precision && <span className="fr-hint-text fr-text-default--info">{option.precision}</span>}
                {explication && <span className="fr-hint-text">{explication}</span>}
              </label>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

interface QuestionStepProps<TValue extends string> {
  /** Identifiant unique de la question (préfixe des id/name DOM, ex: "pente-terrain"). */
  fieldsetName: string;
  /** Id du critère dans la grille de catégorisation (ex: "pente_terrain") — sert à afficher la catégorie de la réponse sélectionnée. */
  critereId: string;
  title: string;
  illustration: ReactNode;
  /** Explication pédagogique en un paragraphe : de quoi il s'agit + impact sur le RGA. */
  description: string;
  options: QuestionOption<TValue>[];
  selected: TValue | undefined;
  onSelect: (value: TValue) => void;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  /** Sous-question affichée sous les choix (ex : essence de l'arbre). */
  complement?: ReactNode;
  /** Par défaut, « Suivant » attend seulement une réponse à la question principale. */
  isNextDisabled?: boolean;
}

/**
 * Squelette commun à toutes les questions du simulateur de vulnérabilité :
 * illustration + paragraphe pédagogique + choix (fr-radio-rich) + sous-question éventuelle + navigation.
 * Un composant `Step*` par question ne fait donc que fournir son contenu.
 */
export function QuestionStep<TValue extends string>({
  fieldsetName,
  critereId,
  title,
  illustration,
  description,
  options,
  selected,
  onSelect,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onNext,
  onBack,
  complement,
  isNextDisabled = selected === undefined,
}: QuestionStepProps<TValue>) {
  return (
    <VulnerabiliteLayout title={title} currentStep={numeroEtape} totalSteps={totalEtapes}>
      <div className="fr-mb-3w flex justify-center">{illustration}</div>

      <p className="fr-mb-3w">{description}</p>

      <ChoixRadios
        fieldsetName={fieldsetName}
        critereId={critereId}
        legend={title}
        options={options}
        selected={selected}
        onSelect={onSelect}
      />

      {complement}

      <NavigationButtons onPrevious={onBack} onNext={onNext} canGoBack={canGoBack} isNextDisabled={isNextDisabled} />
    </VulnerabiliteLayout>
  );
}
