"use client";

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
 * Boutons de navigation Précédent / Suivant
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
  return (
    <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
      {canGoBack && onPrevious && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
          onClick={onPrevious}
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
