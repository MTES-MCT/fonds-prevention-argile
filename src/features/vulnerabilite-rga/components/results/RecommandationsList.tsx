import { CalloutExpertRga } from "./CalloutExpertRga";
import { RecommandationCard } from "./RecommandationCard";
import type { RecommandationPrioritaire } from "../../domain/services/recommandations.service";

interface RecommandationsListProps {
  recommandations: RecommandationPrioritaire[];
}

export function RecommandationsList({ recommandations }: RecommandationsListProps) {
  return (
    <div className="fr-mt-4w">
      <h3 className="fr-h5 fr-mb-2w">Comment réduire cette vulnérabilité ?</h3>
      <CalloutExpertRga />
      {recommandations.length === 0 ? (
        <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Aucune vulnérabilité marquée n&apos;a été identifiée sur l&apos;environnement proche de votre logement.
        </p>
      ) : (
        <>
          <p className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
            Classées de la plus impactante à la moins impactante sur votre score.
          </p>
          {recommandations.map((recommandation) => (
            <RecommandationCard key={recommandation.def.id} recommandation={recommandation} />
          ))}
        </>
      )}
    </div>
  );
}
