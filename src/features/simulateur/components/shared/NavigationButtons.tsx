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
  nextLabel = "Continuer",
  previousLabel = "Précédent",
  isNextDisabled = false,
  isLoading = false,
}: NavigationButtonsProps) {
  return (
    <div className="fr-btns-group fr-btns-group--inline fr-mt-4w">
      {canGoBack && onPrevious && (
        <button type="button" className="fr-btn fr-btn--secondary" onClick={onPrevious} disabled={isLoading}>
          {previousLabel}
        </button>
      )}
      {onNext && (
        <button type="button" className="fr-btn" onClick={onNext} disabled={isNextDisabled || isLoading}>
          {isLoading ? "Chargement..." : nextLabel}
        </button>
      )}
    </div>
  );
}
