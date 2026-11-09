import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import type { SectionAnnuaire } from "@/features/backoffice/espace-agent/experts/services/annuaire-experts.service";
import { CarteExpert } from "../../shared";

interface ListeExpertsProps {
  experts: ExpertAnnuaire[];
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
  niveauTitre?: "h3" | "h4";
}

function ListeExperts({ experts, codeDepartement, niveauTitre }: ListeExpertsProps) {
  if (experts.length === 0) {
    return (
      <div className="fr-alert fr-alert--info fr-alert--sm">
        <p>{MESSAGE_AUCUN_EXPERT}.</p>
      </div>
    );
  }
  return (
    <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
      {experts.map((expert) => (
        <li key={expert.id} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
          <CarteExpert expert={expert} codeDepartement={codeDepartement} niveauTitre={niveauTitre} />
        </li>
      ))}
    </ul>
  );
}

/** Une carte par expert, dans l'ordre neutre du serveur, avec la mention de libre choix. */
export function GrilleExperts({ experts, codeDepartement }: Omit<ListeExpertsProps, "niveauTitre">) {
  return (
    <>
      <p className="fr-text-mention--grey fr-mb-3w">{MENTION_LIBRE_CHOIX}</p>
      <ListeExperts experts={experts} codeDepartement={codeDepartement} />
    </>
  );
}

/** Plusieurs départements à la suite, chacun sous son titre ; la mention de libre choix vaut pour tous. */
export function ExpertsParDepartement({ sections }: { sections: SectionAnnuaire[] }) {
  return (
    <>
      <p className="fr-text-mention--grey fr-mb-3w">{MENTION_LIBRE_CHOIX}</p>
      {sections.length === 0 ? (
        <div className="fr-alert fr-alert--info fr-alert--sm">
          <p>Aucun expert validé pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.code} aria-labelledby={`experts-departement-${section.code}`}>
              <div className="flex flex-wrap items-center gap-2 fr-mb-2w">
                <h3 id={`experts-departement-${section.code}`} className="fr-h5 fr-mb-0">
                  {section.nom} ({section.code})
                </h3>
                <p className="fr-badge fr-badge--sm fr-badge--no-icon fr-mb-0">
                  {section.experts.length} expert{section.experts.length > 1 ? "s" : ""}
                </p>
              </div>
              <ListeExperts experts={section.experts} codeDepartement={section.code} niveauTitre="h4" />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
