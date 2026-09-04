import {
  SchemaPenteTerrain,
  SchemaReseauxEnterres,
  SchemaGravierProprete,
  SchemaGouttieres,
  SchemaArbreProximite,
  SchemaHaies,
  SchemaVegetationPiedFacade,
  SchemaEnsoleillement,
} from "../illustrations";
import { ImpactBadge } from "../shared/ImpactBadge";
import type { RecommandationPrioritaire } from "../../domain/services/recommandations.service";

const ILLUSTRATIONS: Record<string, () => React.JSX.Element> = {
  pente: SchemaPenteTerrain,
  reseaux: SchemaReseauxEnterres,
  gravier: SchemaGravierProprete,
  gouttieres: SchemaGouttieres,
  arbre: SchemaArbreProximite,
  haies: SchemaHaies,
  "pied-facade": SchemaVegetationPiedFacade,
  ensoleillement: SchemaEnsoleillement,
};

interface RecommandationCardProps {
  recommandation: RecommandationPrioritaire;
}

export function RecommandationCard({ recommandation }: RecommandationCardProps) {
  const { titre, bullets, illustrationId } = recommandation.def;
  const Illustration = illustrationId ? ILLUSTRATIONS[illustrationId] : undefined;

  return (
    <div className="fr-card fr-card--no-arrow fr-mb-3w">
      <div className="fr-card__body">
        <div className="fr-card__content" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {Illustration && (
            <div style={{ flexShrink: 0, width: "100px" }}>
              <Illustration />
            </div>
          )}
          <div>
            <h4 className="fr-card__title fr-text--md fr-mb-1v">
              {titre}
              <ImpactBadge score={recommandation.score} />
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
