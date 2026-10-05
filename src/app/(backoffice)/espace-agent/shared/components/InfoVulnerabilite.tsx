import { CategorieBadge } from "@/features/vulnerabilite-rga/components/shared/CategorieBadge";
import {
  CATEGORIES_AFFICHAGE,
  CATEGORIES_A_TRAITER,
} from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { formatDate } from "@/shared/utils";
import type { InfoVulnerabiliteData } from "@/features/backoffice/espace-agent/shared/services/build-info-vulnerabilite.service";

interface InfoVulnerabiliteProps {
  data: InfoVulnerabiliteData;
}

/**
 * Carte « Vulnérabilité au RGA » — résultat du simulateur public rattaché au compte du demandeur.
 * Une seule carte compacte : le décompte des points, puis chaque réponse avec sa catégorie.
 */
export function InfoVulnerabilite({ data }: InfoVulnerabiliteProps) {
  return (
    <div
      className="bg-(--background-default-grey) p-6"
      style={{ background: "var(--background-default-grey)", border: "1px solid var(--border-default-grey)" }}>
      <div className="fr-mb-1w">
        <h3 className="fr-h5 fr-mb-1v">
          <span className="fr-icon-alert-line fr-mr-2v" aria-hidden="true"></span>
          Vulnérabilité au RGA
        </h3>
        <p className="fr-text--sm fr-text-mention--grey fr-mb-0 fr-ml-4w">
          Simulation réalisée le {formatDate(data.completedAt.toISOString())}
        </p>
      </div>

      <p className="fr-text--sm fr-my-2w fr-ml-4w">
        {CATEGORIES_A_TRAITER.map(
          (categorie) => `${CATEGORIES_AFFICHAGE[categorie].pluriel} : ${data.compte[categorie]}`
        ).join(" · ")}
      </p>

      {data.reponses.length > 0 && (
        <ul className="fr-ml-3w fr-text--sm">
          {data.reponses.map((reponse) => (
            <li key={reponse.label} className="fr-mb-2v">
              {reponse.label} — {reponse.valeur}
              <CategorieBadge categorie={reponse.categorie} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
