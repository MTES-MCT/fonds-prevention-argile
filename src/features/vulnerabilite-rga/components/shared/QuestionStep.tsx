"use client";

import type { ReactNode } from "react";
import { VulnerabiliteLayout } from "./VulnerabiliteLayout";
import { NavigationButtons } from "./NavigationButtons";

export interface QuestionOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface QuestionStepProps<TValue extends string> {
  /** Identifiant unique de la question (préfixe des id/name DOM, ex: "pente-terrain"). */
  fieldsetName: string;
  title: string;
  subtitle?: string;
  illustration: ReactNode;
  /** Explication vulgarisée en bullet points : de quoi il s'agit + impact sur le RGA. */
  bullets: string[];
  options: QuestionOption<TValue>[];
  selected: TValue | undefined;
  onSelect: (value: TValue) => void;
  numeroEtape: number;
  totalEtapes: number;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Squelette commun à toutes les questions du simulateur de vulnérabilité :
 * illustration + bullet points pédagogiques + choix (fr-radio-rich) + navigation.
 * Un composant `Step*` par question ne fait donc que fournir son contenu.
 */
export function QuestionStep<TValue extends string>({
  fieldsetName,
  title,
  subtitle,
  illustration,
  bullets,
  options,
  selected,
  onSelect,
  numeroEtape,
  totalEtapes,
  canGoBack,
  onNext,
  onBack,
}: QuestionStepProps<TValue>) {
  return (
    <VulnerabiliteLayout title={title} subtitle={subtitle} currentStep={numeroEtape} totalSteps={totalEtapes}>
      <div className="fr-mb-3w flex justify-center">{illustration}</div>

      <ul className="fr-mb-3w fr-text--sm" style={{ paddingLeft: "1.25rem" }}>
        {bullets.map((bullet, index) => (
          <li key={index} className="fr-mb-1v">
            {bullet}
          </li>
        ))}
      </ul>

      <fieldset className="fr-fieldset" id={`${fieldsetName}-fieldset`}>
        <legend className="fr-fieldset__legend fr-sr-only">{title}</legend>
        {options.map((option) => (
          <div className="fr-fieldset__element" key={option.value}>
            <div className="fr-radio-group fr-radio-rich">
              <input
                type="radio"
                id={`${fieldsetName}-${option.value}`}
                name={fieldsetName}
                checked={selected === option.value}
                onChange={() => onSelect(option.value)}
              />
              <label className="fr-label" htmlFor={`${fieldsetName}-${option.value}`}>
                {option.label}
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <NavigationButtons
        onPrevious={onBack}
        onNext={onNext}
        canGoBack={canGoBack}
        isNextDisabled={selected === undefined}
      />
    </VulnerabiliteLayout>
  );
}
