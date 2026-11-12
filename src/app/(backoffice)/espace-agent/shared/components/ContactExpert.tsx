import type { DepartementExpert, ExpertAnnuaire } from "@/features/backoffice";

export function detailExpert(expert: Pick<ExpertAnnuaire, "siret" | "dateValidationDhup">): string {
  if (!expert.dateValidationDhup) return `SIRET ${expert.siret}`;
  const validation = new Date(expert.dateValidationDhup).toLocaleDateString("fr-FR", { timeZone: "UTC" });
  return `SIRET ${expert.siret} · validé par la DHUP le ${validation}`;
}

interface ContactExpertProps {
  contact: DepartementExpert | undefined;
}

/** Contact de réservation d'un expert pour un département, un lien par ligne. */
export function ContactExpert({ contact }: ContactExpertProps) {
  if (!contact?.email && !contact?.telephone) {
    return <p className="fr-text--sm fr-text-mention--grey fr-mb-0">Contact non renseigné</p>;
  }

  // `.fr-link` impose `display: inline` : chaque lien a son propre `li` pour passer à la ligne.
  return (
    <ul className="fr-raw-list flex flex-col gap-1">
      {contact.email && (
        <li>
          <a className="fr-link fr-link--sm fr-icon-mail-line fr-link--icon-left" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </li>
      )}
      {contact.telephone && (
        <li>
          <a
            className="fr-link fr-link--sm fr-icon-phone-line fr-link--icon-left"
            href={`tel:${contact.telephone.replace(/\s/g, "")}`}>
            {contact.telephone}
          </a>
        </li>
      )}
    </ul>
  );
}
