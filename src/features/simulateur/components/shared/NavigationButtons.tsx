"use client";

import { useSimulateurContext } from "./SimulateurContext";

interface NavigationButtonsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack: boolean;
  nextLabel?: string;
  previousLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
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
}: NavigationButtonsProps) {
  const { onBackBeyondFirstStep } = useSimulateurContext();
  const effectiveOnPrevious = canGoBack ? onPrevious : onBackBeyondFirstStep;
  const showPreviousButton = !!effectiveOnPrevious;

  return (
    <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
      {showPreviousButton && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
          onClick={effectiveOnPrevious}
          disabled={isLoading}>
          {previousLabel}
        </button>
      )}
      {onNext && (
        <button
          type="button"
          className="fr-btn !w-full md:!w-auto justify-center"
          onClick={onNext}
          disabled={isNextDisabled || isLoading}>
          {isLoading ? "Chargement..." : nextLabel}
        </button>
      )}
    </div>
  );
}
