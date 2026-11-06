import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import { CarteExpert } from "../../shared";

interface GrilleExpertsProps {
  experts: ExpertAnnuaire[];
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
}

/** Une carte par expert, dans l'ordre neutre du serveur, avec la mention de libre choix. */
export function GrilleExperts({ experts, codeDepartement }: GrilleExpertsProps) {
  return (
    <>
      <p className="fr-text-mention--grey fr-mb-3w">{MENTION_LIBRE_CHOIX}</p>
      {experts.length === 0 ? (
        <div className="fr-alert fr-alert--info fr-alert--sm">
          <p>{MESSAGE_AUCUN_EXPERT}.</p>
        </div>
      ) : (
        <ul className="fr-raw-list fr-grid-row fr-grid-row--gutters">
          {experts.map((expert) => (
            <li key={expert.id} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
              <CarteExpert expert={expert} codeDepartement={codeDepartement} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
