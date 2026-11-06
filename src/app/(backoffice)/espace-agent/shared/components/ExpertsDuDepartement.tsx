import Link from "next/link";
import type { ExpertAnnuaire } from "@/features/backoffice";
import { ListeExperts } from "./ListeExperts";

interface ExpertsDuDepartementProps {
  departement: { code: string; nom: string; experts: ExpertAnnuaire[] };
}

/** Encart du détail d'un dossier : les experts du département de la maison. */
export function ExpertsDuDepartement({ departement }: ExpertsDuDepartementProps) {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-team-line fr-mr-2v" aria-hidden="true"></span>
            Experts intervenant dans ce département
          </h3>
          <div className="fr-card__desc">
            <p className="fr-text--sm font-medium fr-mt-2w fr-mb-1w">
              {departement.nom} ({departement.code})
            </p>
            <ListeExperts experts={departement.experts} codeDepartement={departement.code} />
            <p className="fr-mt-3w fr-mb-0">
              <Link
                className="fr-link fr-link--sm fr-icon-arrow-right-line fr-link--icon-right"
                href={`/espace-agent/experts?departement=${departement.code}`}>
                Voir l&apos;annuaire des experts
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
