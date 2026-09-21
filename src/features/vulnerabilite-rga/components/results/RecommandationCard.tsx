import Image, { type StaticImageData } from "next/image";
import schemaPenteTerrain from "../illustrations/SchemaPenteTerrain.svg";
import schemaReseauxEnterres from "../illustrations/SchemaReseauxEnterres.svg";
import schemaGravierProprete from "../illustrations/SchemaGravierProprete.svg";
import schemaGouttieres from "../illustrations/SchemaGouttieres.svg";
import schemaArbreProximite from "../illustrations/SchemaArbreProximite.svg";
import schemaHaies from "../illustrations/SchemaHaies.svg";
import schemaVegetationPiedFacade from "../illustrations/SchemaVegetationPiedFacade.svg";
import schemaEnsoleillement from "../illustrations/SchemaEnsoleillement.svg";
import { ImpactBadge } from "../shared/ImpactBadge";
import type { RecommandationPrioritaire } from "../../domain/services/recommandations.service";

const ILLUSTRATIONS: Record<string, StaticImageData> = {
  pente: schemaPenteTerrain,
  reseaux: schemaReseauxEnterres,
  gravier: schemaGravierProprete,
  gouttieres: schemaGouttieres,
  arbre: schemaArbreProximite,
  haies: schemaHaies,
  "pied-facade": schemaVegetationPiedFacade,
  ensoleillement: schemaEnsoleillement,
};

interface RecommandationCardProps {
  recommandation: RecommandationPrioritaire;
}

export function RecommandationCard({ recommandation }: RecommandationCardProps) {
  const { titre, problemes, ameliorations, illustrationId } = recommandation.def;
  const illustration = illustrationId ? ILLUSTRATIONS[illustrationId] : undefined;

  return (
    <div className="fr-card fr-card--no-arrow fr-mb-3w">
      <div className="fr-card__body">
        <div className="fr-card__content fr-pb-0">
          <h3 className="fr-card__title fr-text--md fr-mb-1v">{titre}</h3>
          {/* .fr-card__content est en flex-column et .fr-card__title a order:2 (DSFR) : un
              simple <div> (order:0 par défaut) passerait avant le titre. fr-card__desc (order:3)
              garantit sa position après le titre sans dépendre de l'ordre dans le DOM. */}
          <div className="fr-card__desc">
            <div className="fr-mb-3w">
              <ImpactBadge score={recommandation.score} context="solution" inline={false} />
            </div>
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

          {/* Callout info DSFR standard, sans modificateur de couleur (--blue-ecume) : seul le
              texte est recoloré en bleu info (--text-default-info, #0063CB). color sur le
              conteneur pour que l'icône fr-icon-* (::before, currentColor) suive aussi ;
              .fr-callout__title fixe sa propre couleur, d'où l'override explicite en plus. */}
          <div className="fr-callout fr-icon-info-line fr-mb-0" style={{ color: "var(--text-default-info)" }}>
            <p className="fr-callout__title" style={{ color: "var(--text-default-info)" }}>
              Amélioration conseillée :
            </p>
            <ul className="fr-callout__text fr-text--sm fr-mb-0">
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
