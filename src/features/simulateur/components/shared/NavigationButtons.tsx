"use client";

import { createContext, useContext } from "react";
import { useSimulateurContext } from "./SimulateurContext";

/** Posé par SimulateurLayout : les boutons y forment une barre collée au bas de l'écran. */
export const BarreCollanteContext = createContext(false);

interface NavigationButtonsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack: boolean;
  nextLabel?: string;
  previousLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  /** Explique pourquoi « Suivant » est désactivé (affiché seulement dans ce cas) */
  aideDesactive?: string;
}

/**
 * Boutons de navigation Précédent / Suivant.
 *
 * Si le simulateur est utilisé en mode embarqué dans un wizard parent
 * (ex: invitation AMO/AV) et qu'on ne peut pas reculer dans le simulateur
 * lui-même (1ère étape), le bouton "Précédent" appelle le fallback fourni
 * via `SimulateurContext.onBackBeyondFirstStep` (typiquement `router.back()`).
 */
export function NavigationButtons({
  onPrevious,
  onNext,
  canGoBack,
  nextLabel = "Suivant",
  previousLabel = "Précédent",
  isNextDisabled = false,
  isLoading = false,
  aideDesactive,
}: NavigationButtonsProps) {
  const { onBackBeyondFirstStep } = useSimulateurContext();
  const barreCollante = useContext(BarreCollanteContext);
  const effectiveOnPrevious = canGoBack ? onPrevious : onBackBeyondFirstStep;
  const showPreviousButton = !!effectiveOnPrevious;
  const afficherAide = barreCollante && !!aideDesactive && isNextDisabled && !isLoading;

  const boutons = (
    <>
      {showPreviousButton && (
        <button
          type="button"
          className={`fr-btn fr-btn--secondary justify-center ${barreCollante ? "flex-1 md:flex-none" : "!w-full md:!w-auto"}`}
          onClick={effectiveOnPrevious}
          disabled={isLoading}>
          {previousLabel}
        </button>
      )}
      {onNext && (
        <button
          type="button"
          className={`fr-btn justify-center ${barreCollante ? "flex-1 md:flex-none" : "!w-full md:!w-auto"}`}
          onClick={onNext}
          disabled={isNextDisabled || isLoading}>
          {isLoading ? "Chargement..." : nextLabel}
        </button>
      )}
    </>
  );

  if (barreCollante) {
    // Sticky : sans effet quand les boutons tiennent dans l'écran, les garde visibles sinon (mobile, iframe).
    // Pas de marge haute : transparente une fois la barre collée, elle laisserait voir le contenu dessous.
    return (
      <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-10 md:px-10 bg-(--background-alt-grey) border-t border-(--border-default-grey) md:border-t-0">
        {afficherAide && <p className="fr-text--sm fr-mb-1w text-(--text-mention-grey)">{aideDesactive}</p>}
        {/* Côte à côte même sur mobile : empilés, ils doubleraient la hauteur de la barre. */}
        <div className="flex flex-row md:justify-end gap-2">{boutons}</div>
      </div>
    );
  }

  return <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">{boutons}</div>;
}
