import { RecommandationCard } from "./RecommandationCard";
import { CategorieBadge } from "../shared/CategorieBadge";
import { CATEGORIES_AFFICHAGE } from "../../domain/value-objects/grille-categorisation";
import { compterPointsSection, type SectionRecommandations } from "../../domain/services/recommandations.service";

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
      {sections.map((section) => {
        const accent = CATEGORIES_AFFICHAGE[section.categorie].accent.token;
        const nombre = compterPointsSection(section);

        return (
          <section key={section.categorie} className="fr-mb-6w">
            <div className="fr-pt-2w fr-mb-2w" style={{ borderTop: `4px solid ${accent}` }}>
              <h2 className="fr-h4 fr-mb-1v">{section.titre}</h2>
              <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
                {nombre} {nombre > 1 ? "points identifiés" : "point identifié"}
              </p>
            </div>
            {section.explication && <p className="fr-text--sm fr-mb-2w">{section.explication}</p>}
            {section.recommandations.map((recommandation) => (
              <RecommandationCard
                key={recommandation.id}
                recommandation={recommandation}
                categorie={section.categorie}
              />
            ))}
            {section.pointsSansCarte.length > 0 && (
              <ul className="fr-mb-0 fr-pl-2w" style={{ borderLeft: `4px solid ${accent}` }}>
                {section.pointsSansCarte.map((point) => (
                  <li key={point.critereId}>
                    <strong>{point.question}</strong> : {point.reponse} <CategorieBadge categorie={section.categorie} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
