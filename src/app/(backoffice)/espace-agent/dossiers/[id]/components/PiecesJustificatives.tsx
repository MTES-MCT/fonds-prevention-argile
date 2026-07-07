import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

interface PiecesJustificativesProps {
  pieces: PieceJustificative[];
  /** Libellé de l'étape concernée, affiché en sous-titre. */
  stepLabel?: string;
}

/**
 * Pièces justificatives à prévoir pour l'étape en cours, tirées dynamiquement de DN
 * (libellé, obligatoire, description, modèle téléchargeable) + aide éditoriale.
 * La source de vérité est la démarche DN ; voir pieces-justificatives.service.
 */
export function PiecesJustificatives({ pieces, stepLabel }: PiecesJustificativesProps) {
  const middle = Math.ceil(pieces.length / 2);
  const colonnes = [pieces.slice(0, middle), pieces.slice(middle)];

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="fr-mb-2w">
            <h3 className="fr-card__title fr-mb-1v">
              <span className="fr-icon-file-text-line fr-mr-2v" aria-hidden="true"></span>
              Pièces justificatives à prévoir
            </h3>
            {stepLabel && <p className="fr-text--sm fr-mb-0">Pour l&apos;étape : {stepLabel}</p>}
          </div>

          <div className="fr-grid-row fr-grid-row--gutters">
            {colonnes.map((colonne, index) => (
              <div className="fr-col-12 fr-col-md-6" key={index}>
                <ul className="fr-raw-list">
                  {colonne.map((piece) => (
                    <li className="fr-mb-3v" key={piece.id}>
                      <PieceItem piece={piece} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PieceItem({ piece }: { piece: PieceJustificative }) {
  return (
    <>
      <p className="fr-text--bold fr-mb-1v">
        {piece.label}
        {piece.required && <span className="fr-badge fr-badge--sm fr-badge--info fr-ml-1w">Obligatoire</span>}
      </p>
      {piece.description && <p className="fr-text--xs fr-mb-1v">{piece.description}</p>}
      {piece.aide?.texte && <p className="fr-text--xs fr-mb-1v">{piece.aide.texte}</p>}
      {piece.modele && (
        <p className="fr-mb-1v">
          <a
            href={piece.modele.url}
            target="_blank"
            rel="noopener noreferrer"
            className="fr-link fr-link--sm fr-icon-download-line fr-link--icon-left"
            download>
            Télécharger le modèle
          </a>
        </p>
      )}
      {piece.aide?.liens?.map((lien) => (
        <p className="fr-mb-0" key={lien.href}>
          <a href={lien.href} target="_blank" rel="noopener noreferrer" className="fr-link fr-link--sm">
            {lien.label}
          </a>
        </p>
      ))}
    </>
  );
}
