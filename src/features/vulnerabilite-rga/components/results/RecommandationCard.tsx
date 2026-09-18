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
          <h4 className="fr-card__title fr-text--md fr-mb-1v">{titre}</h4>
          <div style={{ textAlign: "center" }}>
            <ImpactBadge score={recommandation.score} context="solution" inline={false} />
            {illustration && (
              <div className="fr-mt-3w" style={{ maxWidth: "260px", marginInline: "auto" }}>
                <Image src={illustration} alt="" className="w-full h-auto" />
              </div>
            )}
          </div>
        </div>

        <div className="fr-card__content fr-pt-0">
          <h5 className="fr-text--md fr-mb-1w">
            <span
              className="fr-icon-warning-fill fr-mr-1w"
              aria-hidden="true"
              style={{ color: "var(--text-default-error)" }}
            />
            Problème
          </h5>
          <ul className="fr-text--sm fr-mb-3w">
            {problemes.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>

          {/* color sur le conteneur : l'icône fr-icon-* (::before) utilise currentColor, et
              .fr-callout__title fixe sa propre couleur, d'où l'override explicite en plus. */}
          <div
            className="fr-callout fr-icon-info-line fr-callout--blue-ecume fr-mb-0"
            style={{ color: "var(--text-label-blue-ecume)" }}>
            <p className="fr-callout__title" style={{ color: "var(--text-label-blue-ecume)" }}>
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
