import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

interface PiecesAPrevoirProps {
  pieces?: PieceJustificative[];
}

/**
 * Liste repliable « pièces à prévoir » affichée sur les cartes d'étapes à venir du
 * parcours demandeur. Aide le ménage à anticiper : libellé, modèle téléchargeable et
 * « où l'obtenir ». Élément natif <details> (pas de JS DSFR requis).
 */
export default function PiecesAPrevoir({ pieces }: PiecesAPrevoirProps) {
  if (!pieces || pieces.length === 0) return null;

  return (
    <details className="fr-mt-1v">
      <summary className="fr-text--xs" style={{ cursor: "pointer" }}>
        Préparez les pièces nécessaires ({pieces.length})
      </summary>
      <ul className="fr-raw-list fr-mt-1w">
        {pieces.map((piece) => (
          <li className="fr-mb-2v" key={piece.id}>
            <span className="fr-text--xs fr-text--bold">
              {piece.label}
              {piece.required && " *"}
            </span>
            {piece.aide?.texte && <p className="fr-text--xs fr-mb-0">{piece.aide.texte}</p>}
            {piece.modele && (
              <a
                href={piece.modele.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-link fr-link--sm fr-icon-download-line fr-link--icon-left">
                Télécharger le modèle
              </a>
            )}
            {piece.aide?.liens?.map((lien) => (
              <a
                href={lien.href}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-link fr-link--sm fr-ml-2v"
                key={lien.href}>
                {lien.label}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}
