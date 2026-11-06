import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import { ContactExpert, detailExpert } from "../../shared";

interface GrilleExpertsProps {
  experts: ExpertAnnuaire[];
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
}

/** Une carte par expert, dans l'ordre neutre du serveur : aucune ne doit se distinguer des autres. */
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
              <div className="fr-card fr-card--no-arrow">
                <div className="fr-card__body">
                  <div className="fr-card__content">
                    <h3 className="fr-card__title">{expert.nom}</h3>
                    <div className="fr-card__desc">
                      <ContactExpert contact={expert.departements.find((d) => d.code === codeDepartement)} />
                    </div>
                    <div className="fr-card__start">
                      <p className="fr-card__detail">{detailExpert(expert)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
