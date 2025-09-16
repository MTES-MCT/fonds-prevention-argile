import Link from "next/link";

export default function MaListe() {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h2 className="fr-card__title">Ma liste</h2>
        <div className="fr-card__desc">
          <ol type="1" className="fr-list space-y-2">
            <li>
              <Link
                target="_blank"
                rel="noopener external"
                className="fr-link"
                href="#"
              >
                Remplir le formulaire d’éligibilité et avoir une réponse
              </Link>
            </li>
            <li>
              <a
                id="link-8"
                target="_self"
                aria-disabled="true"
                role="link"
                className="fr-link"
              >
                Soumettre le diagnostic
              </a>
            </li>
            <li>
              <a
                id="link-8"
                target="_self"
                aria-disabled="true"
                role="link"
                className="fr-link"
              >
                Soumettre les devis
              </a>
            </li>
            <li>
              <a
                id="link-8"
                target="_self"
                aria-disabled="true"
                role="link"
                className="fr-link"
              >
                Transmettre les factures
              </a>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
