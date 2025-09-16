import Link from "next/link";

export default function StepDetailAccountCard() {
  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
          En construction
        </span>

        <h5 className="text-left fr-text-label--blue-france">1. Eligibilité</h5>
        <p>Ce formulaire permet de valider votre éligibilité</p>
        <Link
          href="#"
          rel="noopener noreferrer"
          target="_blank"
          className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
        >
          Remplir le formulaire
        </Link>
      </div>
    </div>
  );
}
