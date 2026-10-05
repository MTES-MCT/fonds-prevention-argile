import { RecommandationCard } from "./RecommandationCard";
import type { SectionRecommandations } from "../../domain/services/recommandations.service";

interface RecommandationsListProps {
  sections: SectionRecommandations[];
}

export function RecommandationsList({ sections }: RecommandationsListProps) {
  if (sections.length === 0) {
    return (
      <p className="fr-text--sm fr-mt-4w" style={{ color: "var(--text-mention-grey)" }}>
        Aucun point critique, de vigilance ou à surveiller n&apos;a été identifié sur l&apos;environnement proche de
        votre logement.
      </p>
    );
  }

  return (
    <div className="fr-mt-4w">
      {sections.map((section) => (
        <section key={section.categorie} className="fr-mb-5w">
          <h2 className="fr-h4 fr-mb-2w">{section.titre}</h2>
          {section.explication && <p className="fr-text--sm fr-mb-2w">{section.explication}</p>}
          {section.recommandations.map((recommandation) => (
            <RecommandationCard key={recommandation.id} recommandation={recommandation} />
          ))}
          {section.pointsSansCarte.length > 0 && (
            <ul className="fr-mb-0">
              {section.pointsSansCarte.map((point) => (
                <li key={point.critereId}>
                  <strong>{point.question}</strong> : {point.reponse}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
