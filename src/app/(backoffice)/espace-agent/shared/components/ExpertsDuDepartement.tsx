import Link from "next/link";
import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import { CarteExpert } from "./CarteExpert";

interface ExpertsDuDepartementProps {
  departement: { code: string; nom: string; experts: ExpertAnnuaire[] };
}

/** Carte du détail d'un dossier : les experts du département de la maison, une petite carte chacun. */
export function ExpertsDuDepartement({ departement }: ExpertsDuDepartementProps) {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-team-line fr-mr-2v" aria-hidden="true"></span>
            Experts du département
          </h3>
          <div className="fr-card__desc">
            <p className="fr-text--sm fr-text-mention--grey fr-mt-1w fr-mb-2w">
              {departement.nom} ({departement.code}). {MENTION_LIBRE_CHOIX}
            </p>
            {departement.experts.length === 0 ? (
              <div className="fr-alert fr-alert--info fr-alert--sm">
                <p>{MESSAGE_AUCUN_EXPERT}.</p>
              </div>
            ) : (
              <ul className="fr-raw-list flex flex-col gap-3">
                {departement.experts.map((expert) => (
                  <li key={expert.id}>
                    <CarteExpert expert={expert} codeDepartement={departement.code} compacte />
                  </li>
                ))}
              </ul>
            )}
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
