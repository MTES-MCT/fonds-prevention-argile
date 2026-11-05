import { MENTION_LIBRE_CHOIX, MESSAGE_AUCUN_EXPERT, type ExpertAnnuaire } from "@/features/backoffice";

interface ListeExpertsProps {
  experts: ExpertAnnuaire[];
  /** Le contact affiché est celui de ce département. */
  codeDepartement: string;
}

function formaterDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;
}

/** Experts d'un département, dans l'ordre neutre du serveur, toujours accompagnés de la mention de libre choix. */
export function ListeExperts({ experts, codeDepartement }: ListeExpertsProps) {
  return (
    <div>
      <p className="fr-text--sm text-(--text-mention-grey)">{MENTION_LIBRE_CHOIX}</p>
      {experts.length === 0 ? (
        <p className="fr-text--sm mb-0">{MESSAGE_AUCUN_EXPERT}.</p>
      ) : (
        <ul className="fr-raw-list flex flex-col gap-3">
          {experts.map((expert) => {
            const contact = expert.departements.find((d) => d.code === codeDepartement);
            const validation = formaterDate(expert.dateValidationDhup);
            return (
              <li key={expert.id} className="border-l-2 border-(--border-default-grey) pl-3">
                <span className="font-medium block">{expert.nom}</span>
                <span className="fr-text--xs text-(--text-mention-grey) block mb-1">
                  SIRET {expert.siret}
                  {validation && ` · validé par la DHUP le ${validation}`}
                </span>
                {contact?.email && (
                  <a className="fr-link fr-link--sm block" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                )}
                {contact?.telephone && (
                  <a className="fr-link fr-link--sm block" href={`tel:${contact.telephone.replace(/\s/g, "")}`}>
                    {contact.telephone}
                  </a>
                )}
                {!contact?.email && !contact?.telephone && (
                  <span className="fr-text--sm text-(--text-mention-grey)">Contact non renseigné</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
