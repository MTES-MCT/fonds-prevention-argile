/**
 * Composant affichant les pièces justificatives nécessaires pour la prochaine étape
 * Permet à l'AMO d'informer le demandeur des documents à préparer
 */
export function GagnezDuTemps() {
  return (
    <div className="fr-card fr-background-contrast--info">
      <div className="fr-p-4w">
        <div className="fr-mb-2w">
          <h3 className="fr-h5 fr-mb-1v">
            <span className="fr-icon-time-line fr-mr-2v" aria-hidden="true"></span>
            Gagnez du temps pour la prochaine étape !
          </h3>
          <p className="fr-text--sm fr-mb-0">
            Conseillez votre demandeur de regrouper les pièces justificatifs nécessaires.
          </p>
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
                  href="https://www.formulaires.service-public.gouv.fr/gf/cerfa_17596.do"
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
  );
}
