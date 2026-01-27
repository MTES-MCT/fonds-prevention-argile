/**
 * Composant affichant les pièces justificatives nécessaires pour le dossier
 * Fond blanc avec liste en deux colonnes
 */
export function PiecesJustificatives() {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="fr-mb-2w">
            <h3 className="fr-card__title fr-mb-1v">
              <span className="fr-icon-file-text-line fr-mr-2v" aria-hidden="true"></span>
              Pièces justificatives nécessaires
            </h3>
          </div>

          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche */}
            <div className="fr-col-12 fr-col-md-6">
              <ul className="fr-pl-3w fr-mb-0">
                <li className="fr-mb-2v">Pièce d&apos;identité</li>
                <li className="fr-mb-2v">
                  Dernier avis d&apos;imposition de TOUS les foyers fiscaux de l&apos;habitation
                </li>
                <li className="fr-mb-2v">RIB du demandeur</li>
                <li className="fr-mb-2v">Devis de l&apos;AMO</li>
                <li className="fr-mb-2v">Devis de l&apos;Expert</li>
                <li className="fr-mb-2v">Attestation Assurance habitation</li>
                <li className="fr-mb-0">
                  Attestation d&apos;indemnisation de l&apos;assureur au titre de la garantie Catastrophe Naturelle (si
                  indemnisation précédente)
                </li>
              </ul>
            </div>

            {/* Colonne droite */}
            <div className="fr-col-12 fr-col-md-6">
              <ul className="fr-pl-3w fr-mb-0">
                <li className="fr-mb-2v">
                  Attestation de non indemnisation de l&apos;assureur au titre de la garantie Catastrophe Naturelle (si
                  aucune indemnisation précédente)
                </li>
                <li className="fr-mb-0">
                  Si mandataire : sa pièce d&apos;identité ET le{" "}
                  <a
                    href="https://www.service-public.fr/particuliers/vosdroits/R46121"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fr-link">
                    CERFA MANDAT RGA
                  </a>{" "}
                  dûment rempli
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
