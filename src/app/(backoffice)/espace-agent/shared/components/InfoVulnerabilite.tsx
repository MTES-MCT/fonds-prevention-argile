import { VulnerabiliteGauge } from "@/features/vulnerabilite-rga/components/results/VulnerabiliteGauge";
import { formatDate } from "@/shared/utils";
import type { InfoVulnerabiliteData } from "@/features/backoffice/espace-agent/shared/services/build-info-vulnerabilite.service";

interface InfoVulnerabiliteProps {
  data: InfoVulnerabiliteData;
}

/**
 * Carte « Vulnérabilité au RGA » — résultat du simulateur public rattaché au compte du demandeur.
 * Une seule carte compacte (score + réponses), pas de découpage par catégorie comme dans
 * l'onglet admin.
 */
export function InfoVulnerabilite({ data }: InfoVulnerabiliteProps) {
  return (
    <div
      className="bg-white p-6"
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

      <div className="flex justify-center fr-my-2w">
        <VulnerabiliteGauge score={data.scoreGlobal} size={160} />
      </div>

      {data.reponses.length > 0 && (
        <ul className="fr-ml-3w fr-text--sm">
          {data.reponses.map((reponse) => (
            <li key={reponse.label} className="fr-mb-2v">
              {reponse.label}{" "}
              <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">{reponse.valeur}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
