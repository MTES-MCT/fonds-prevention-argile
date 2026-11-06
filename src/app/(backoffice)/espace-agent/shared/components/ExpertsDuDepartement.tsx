import Link from "next/link";
import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import { CarteExpert } from "./CarteExpert";

interface ExpertsDuDepartementProps {
  departement: { code: string; nom: string; experts: ExpertAnnuaire[] };
}

/** Section du détail d'un dossier : les experts du département de la maison, une carte chacun. */
export function ExpertsDuDepartement({ departement }: ExpertsDuDepartementProps) {
  return (
    <section aria-labelledby="experts-du-departement">
      <h3 id="experts-du-departement" className="fr-h6 fr-mb-1v">
        <span className="fr-icon-team-line fr-mr-2v" aria-hidden="true"></span>
        Experts intervenant dans ce département
      </h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">
        {departement.nom} ({departement.code}). {MENTION_LIBRE_CHOIX}
      </p>
      {departement.experts.length === 0 ? (
        <div className="fr-alert fr-alert--info fr-alert--sm">
          <p>{MESSAGE_AUCUN_EXPERT}.</p>
        </div>
      ) : (
        <ul className="fr-raw-list flex flex-col gap-4">
          {departement.experts.map((expert) => (
            <li key={expert.id}>
              <CarteExpert expert={expert} codeDepartement={departement.code} compacte />
            </li>
          ))}
        </ul>
      )}
      <p className="fr-mt-2w fr-mb-0">
        <Link
          className="fr-link fr-link--sm fr-icon-arrow-right-line fr-link--icon-right"
          href={`/espace-agent/experts?departement=${departement.code}`}>
          Voir l&apos;annuaire des experts
        </Link>
      </p>
    </section>
  );
}
