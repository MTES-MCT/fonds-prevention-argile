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
  const { titre, bullets, illustrationId } = recommandation.def;
  const illustration = illustrationId ? ILLUSTRATIONS[illustrationId] : undefined;

  return (
    <div className="fr-card fr-card--no-arrow fr-mb-3w">
      <div className="fr-card__body">
        <div className="fr-card__content" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {illustration && (
            <div style={{ flexShrink: 0, width: "100px" }}>
              <Image src={illustration} alt="" className="w-full h-auto" />
            </div>
          )}
          <div>
            <h4 className="fr-card__title fr-text--md fr-mb-1v">
              {titre}
              <ImpactBadge score={recommandation.score} context="solution" />
            </h4>
            <ul className="fr-text--sm fr-mb-0">
              {bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
