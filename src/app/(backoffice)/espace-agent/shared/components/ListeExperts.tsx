import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";
import { ContactExpert, detailExpert } from "./ContactExpert";

interface ListeExpertsProps {
  experts: ExpertAnnuaire[];
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
}

/** Liste compacte pour une colonne étroite, dans l'ordre neutre du serveur et avec la mention de libre choix. */
export function ListeExperts({ experts, codeDepartement }: ListeExpertsProps) {
  return (
    <div>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">{MENTION_LIBRE_CHOIX}</p>
      {experts.length === 0 ? (
        <p className="fr-text--sm fr-mb-0">{MESSAGE_AUCUN_EXPERT}.</p>
      ) : (
        <ul className="fr-raw-list flex flex-col gap-4">
          {experts.map((expert) => (
            <li key={expert.id} className="border-l-2 border-(--border-default-grey) pl-3">
              <p className="fr-text--md font-medium fr-mb-0">{expert.nom}</p>
              <p className="fr-text--xs fr-text-mention--grey fr-mb-1v">{detailExpert(expert)}</p>
              <ContactExpert contact={expert.departements.find((d) => d.code === codeDepartement)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
