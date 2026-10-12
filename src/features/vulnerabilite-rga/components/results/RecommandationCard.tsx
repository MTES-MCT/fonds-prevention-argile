import Image from "next/image";
import { ILLUSTRATIONS_RECOMMANDATIONS } from "../illustrations/illustrations-recommandations";
import { CategorieBadge } from "../shared/CategorieBadge";
import { CATEGORIES_AFFICHAGE, type CategorieATraiter } from "../../domain/value-objects/grille-categorisation";
import type { RecommandationDef } from "../../domain/catalogues/recommandations.catalogue";

interface RecommandationCardProps {
  recommandation: RecommandationDef;
  categorie: CategorieATraiter;
}

export function RecommandationCard({ recommandation, categorie }: RecommandationCardProps) {
  const { titre, problemes, ameliorations, illustrationId } = recommandation;
  const illustration = illustrationId ? ILLUSTRATIONS_RECOMMANDATIONS[illustrationId] : undefined;

  return (
    // Le liseré situe la fiche dans sa section même au milieu d'une longue liste ; le badge en porte le nom.
    <div
      className="fr-card fr-card--no-arrow fr-mb-3w"
      style={{ borderLeft: `4px solid ${CATEGORIES_AFFICHAGE[categorie].accent.token}` }}>
      <div className="fr-card__body">
        <div className="fr-card__content fr-pb-0">
          <h3 className="fr-card__title fr-h6 fr-mb-1v">{titre}</h3>
          {/* fr-card__start (order:1) place le badge au-dessus du titre, comme le prévoit le DSFR. */}
          <div className="fr-card__start fr-mb-1w">
            <CategorieBadge categorie={categorie} inline={false} />
          </div>
          {/* .fr-card__content est en flex-column et .fr-card__title a order:2 (DSFR) : un
              simple <div> (order:0 par défaut) passerait avant le titre. fr-card__desc (order:3)
              garantit sa position après le titre sans dépendre de l'ordre dans le DOM. */}
          <div className="fr-card__desc">
            {illustration && (
              <div style={{ maxWidth: "260px", marginInline: "auto" }}>
                <Image src={illustration} alt="" className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>

        <div className="fr-card__content fr-pt-0">
          <h4 className="fr-text--md fr-mb-1w">
            <span
              className="fr-icon-warning-fill fr-mr-1w"
              aria-hidden="true"
              style={{ color: "var(--text-default-error)" }}
            />
            Problème
          </h4>
          <ul className="fr-text--sm fr-mb-3w">
            {problemes.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>

          {/* Même encadré que le PDF (bleu écume) : le callout DSFR imposait un fond gris. */}
          <div
            className="fr-p-2w"
            style={{
              backgroundColor: "var(--background-contrast-blue-ecume)",
              color: "var(--text-label-blue-ecume)",
              borderRadius: "0.25rem",
            }}>
            <p className="fr-text--md fr-text--bold fr-mb-1w">Amélioration conseillée :</p>
            <ul className="fr-text--sm fr-mb-0">
              {ameliorations.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
