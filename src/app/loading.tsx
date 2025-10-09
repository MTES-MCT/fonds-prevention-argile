export default function Loading() {
  return (
    <div className="fr-container fr-py-6w">
      {/* En-tête skeleton */}
      <div className="fr-mb-4w">
        <div className="skeleton skeleton-title fr-mb-2w"></div>
        <div className="skeleton skeleton-text skeleton-text-60"></div>
      </div>

      {/* Callout skeleton */}
      <div className="fr-callout fr-mb-4w">
        <div className="skeleton skeleton-subtitle fr-mb-2w"></div>
        <div className="skeleton skeleton-text fr-mb-1w"></div>
        <div className="skeleton skeleton-text skeleton-text-80"></div>
      </div>

      {/* Formulaire skeleton */}
      <div className="fr-mb-4w">
        <div className="skeleton skeleton-box skeleton-box-large fr-mb-2w"></div>
        <div className="skeleton skeleton-text skeleton-text-40 fr-mb-2w"></div>
        <div className="skeleton skeleton-button"></div>
      </div>

      {/* Callout skeleton */}
      <div className="fr-callout fr-mb-4w">
        <div className="skeleton skeleton-subtitle fr-mb-2w"></div>
        <div className="skeleton skeleton-text fr-mb-1w"></div>
        <div className="skeleton skeleton-text skeleton-text-80"></div>
      </div>
    </div>
  );
}
