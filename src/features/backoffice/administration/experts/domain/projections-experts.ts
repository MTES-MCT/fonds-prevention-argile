import { getDepartementName } from "@/shared/constants/departements.constants";
import { trierExperts } from "./regles-experts";
import type { ExpertAnnuaire, ExpertComplet, ExpertGestion } from "./experts.types";

// Champ par champ, jamais par décomposition : un champ ajouté à ExpertComplet ne doit pas sortir par mégarde.
export function versAnnuaire(expert: ExpertComplet): ExpertAnnuaire {
  return {
    id: expert.id,
    nom: expert.nom,
    siret: expert.siret,
    dateValidationDhup: expert.dateValidationDhup,
    departements: [...expert.departements]
      .sort((a, b) => a.codeDepartement.localeCompare(b.codeDepartement))
      .map((departement) => ({
        code: departement.codeDepartement,
        nom: getDepartementName(departement.codeDepartement),
        email: departement.email,
        telephone: departement.telephone,
        expertNom: departement.expertNom,
        expertEmail: departement.expertEmail,
        expertTelephone: departement.expertTelephone,
      })),
  };
}

export function versGestion(expert: ExpertComplet): ExpertGestion {
  return {
    ...versAnnuaire(expert),
    contactInterne: {
      nom: expert.contactInterneNom,
      email: expert.contactInterneEmail,
      telephone: expert.contactInterneTelephone,
    },
    desactivation: expert.desactiveAt
      ? { le: expert.desactiveAt.toISOString(), par: expert.desactiveParNom, raison: expert.desactiveRaison }
      : null,
  };
}

/** Annuaire d'un département : experts actifs qui l'ont déclaré, seul ce département gardé, ordre neutre. */
export function annuaireDuDepartement(experts: ExpertComplet[], code: string): ExpertAnnuaire[] {
  return trierExperts(
    experts
      .filter((expert) => !expert.desactiveAt)
      .map(versAnnuaire)
      .map((expert) => ({ ...expert, departements: expert.departements.filter((d) => d.code === code) }))
      .filter((expert) => expert.departements.length > 0)
  );
}
