import type { DepartementExpert, ExpertAnnuaire } from "@/features/backoffice";
import { formatMontantExact } from "@/shared/utils";

export function detailExpert(expert: Pick<ExpertAnnuaire, "dateValidationDhup">): string | null {
  if (!expert.dateValidationDhup) return null;
  const validation = new Date(expert.dateValidationDhup).toLocaleDateString("fr-FR", { timeZone: "UTC" });
  return `Validé par la DHUP le ${validation}`;
}

interface ContactExpertProps {
  contact: DepartementExpert | undefined;
}

/** Contact de réservation d'un expert pour un département, puis l'expert qui se déplace s'il est connu. */
export function ContactExpert({ contact }: ContactExpertProps) {
  const reservation = Boolean(contact?.email || contact?.telephone);
  const surPlace = Boolean(contact?.expertNom || contact?.expertEmail || contact?.expertTelephone);
  if (!contact || (!reservation && !surPlace)) {
    return <p className="fr-text--sm fr-text-mention--grey fr-mb-0">Contact non renseigné</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {reservation && (
        <div>
          <p className="fr-text--xs fr-text-mention--grey fr-mb-1v">Réservation</p>
          <LiensContact email={contact.email} telephone={contact.telephone} />
        </div>
      )}
      {surPlace && (
        <div>
          <p className="fr-text--xs fr-text-mention--grey fr-mb-1v">
            Expert sur place{contact.expertNom && ` : ${contact.expertNom}`}
          </p>
          <LiensContact email={contact.expertEmail} telephone={contact.expertTelephone} />
        </div>
      )}
    </div>
  );
}

/** Montants HT de la prestation dans le département ; rien tant qu'aucun n'est connu. */
export function ForfaitsExpert({ departement }: { departement: DepartementExpert | undefined }) {
  const forfaits = [
    { libelle: "Diagnostic", montant: departement?.forfaitDiagnosticHt ?? null },
    { libelle: "Réseaux", montant: departement?.forfaitReseauHt ?? null },
  ].filter((forfait): forfait is { libelle: string; montant: number } => forfait.montant !== null);
  if (forfaits.length === 0) return null;

  return (
    <div>
      <p className="fr-text--xs fr-text-mention--grey fr-mb-1v">Forfaits HT</p>
      <ul className="fr-raw-list flex flex-col gap-1">
        {forfaits.map((forfait) => (
          <li key={forfait.libelle} className="fr-text--sm fr-mb-0">
            {forfait.libelle} : {formatMontantExact(forfait.montant)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiensContact({ email, telephone }: { email: string | null; telephone: string | null }) {
  if (!email && !telephone) return null;
  // `.fr-link` impose `display: inline` : chaque lien a son propre `li` pour passer à la ligne.
  return (
    <ul className="fr-raw-list flex flex-col gap-1">
      {email && (
        <li>
          <a className="fr-link fr-link--sm fr-icon-mail-line fr-link--icon-left" href={`mailto:${email}`}>
            {email}
          </a>
        </li>
      )}
      {telephone && (
        <li>
          <a
            className="fr-link fr-link--sm fr-icon-phone-line fr-link--icon-left"
            href={`tel:${telephone.replace(/\s/g, "")}`}>
            {telephone}
          </a>
        </li>
      )}
    </ul>
  );
}
