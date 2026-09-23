import { useId } from "react";
import {
  grouperPiecesParCategorie,
  mentionObligation,
  type PieceJustificative,
} from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

interface PiecesJustificativesProps {
  pieces?: PieceJustificative[];
  /** Libellé de l'étape concernée, affiché en sous-titre. */
  stepLabel?: string;
  /** Titre de la carte, à adapter selon la surface (agent ou demandeur). */
  titre?: string;
}

/**
 * Pièces justificatives à prévoir pour l'étape en cours, tirées dynamiquement de DN
 * et regroupées par catégorie (qui fournit la pièce). La source de vérité est la
 * démarche DN ; voir pieces-justificatives.service et pieces-regles.
 */
export function PiecesJustificatives({
  pieces,
  stepLabel,
  titre = "Pièces justificatives à prévoir",
}: PiecesJustificativesProps) {
  const idAccordeons = useId();
  if (!pieces || pieces.length === 0) return null;

  const groupes = grouperPiecesParCategorie(pieces);

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="fr-mb-3w">
            <h3 className="fr-card__title fr-mb-1v">
              <span className="fr-icon-profil-line fr-mr-2v" aria-hidden="true"></span>
              {titre}
            </h3>
            <p className="fr-text--sm fr-mb-0 text-(--text-mention-grey)">
              Sauf mention contraire, toutes les pièces sont obligatoires
            </p>
            {stepLabel && <p className="fr-text--sm fr-mb-0">Pour l&apos;étape : {stepLabel}</p>}
          </div>

          {groupes.length === 1 ? (
            <ColonnesPieces pieces={groupes[0].pieces} />
          ) : (
            // `data-fr-group="false"` : sans lui, DSFR referme les autres accordéons à chaque ouverture.
            <div className="fr-accordions-group" data-fr-group="false">
              {groupes.map((groupe) => {
                const collapseId = `${idAccordeons}-${groupe.categorie}`;
                return (
                  <section className="fr-accordion" key={groupe.categorie}>
                    <h4 className="fr-accordion__title">
                      <button
                        type="button"
                        className="fr-accordion__btn"
                        aria-expanded="true"
                        aria-controls={collapseId}>
                        {groupe.libelle}
                      </button>
                    </h4>
                    <div className="fr-collapse" id={collapseId}>
                      <ColonnesPieces pieces={groupe.pieces} />
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColonnesPieces({ pieces }: { pieces: PieceJustificative[] }) {
  const middle = Math.ceil(pieces.length / 2);
  const colonnes = [pieces.slice(0, middle), pieces.slice(middle)].filter((colonne) => colonne.length > 0);

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {colonnes.map((colonne, index) => (
        <div className="fr-col-12 fr-col-md-6" key={index}>
          <ul className="fr-mb-0">
            {colonne.map((piece) => (
              <li className="fr-mb-3v" key={piece.id}>
                <PieceItem piece={piece} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PieceItem({ piece }: { piece: PieceJustificative }) {
  const mention = mentionObligation(piece);

  return (
    <>
      <p className="fr-text--bold fr-mb-1v">{piece.label}</p>
      {mention && (
        <p className="fr-mb-1v">
          <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">{mention}</span>
        </p>
      )}
      {piece.description && <p className="fr-text--xs fr-mb-1v text-(--text-mention-grey)">{piece.description}</p>}
      {piece.aide?.texte && <p className="fr-text--xs fr-mb-1v text-(--text-mention-grey)">{piece.aide.texte}</p>}
      {piece.modele && (
        <p className="fr-mb-1v">
          <a
            href={piece.modele.url}
            target="_blank"
            rel="noopener noreferrer"
            className="fr-link fr-link--sm fr-icon-download-line fr-link--icon-left">
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
