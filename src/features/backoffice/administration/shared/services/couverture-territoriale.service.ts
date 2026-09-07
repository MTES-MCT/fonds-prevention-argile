import { db } from "@/shared/database/client";
import { entreprisesAmo, entreprisesAmoCommunes, allersVersDepartements } from "@/shared/database/schema";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/shared/constants/rga.constants";
import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { getCodeDepartementFromCodeInsee } from "@/features/parcours/amo/utils/amo.utils";

/**
 * Départements éligibles au dispositif qui n'ont, à ce jour, **ni AMO ni Aller-vers**.
 * Un demandeur qui y dépose une demande n'est adressé à personne : le back-office
 * doit pouvoir les repérer dans le listing des demandeurs.
 *
 * Un département est couvert dès qu'une structure le déclare, par l'un des trois
 * rattachements existants : le champ libre `entreprises_amo.departements`, une commune
 * d'AMO, ou un département d'Aller-vers.
 */
export async function getDepartementsNonCouverts(): Promise<string[]> {
  const [amos, communesAmo, deptsAv] = await Promise.all([
    db.select({ departements: entreprisesAmo.departements }).from(entreprisesAmo),
    db.select({ codeInsee: entreprisesAmoCommunes.codeInsee }).from(entreprisesAmoCommunes),
    db.select({ codeDepartement: allersVersDepartements.codeDepartement }).from(allersVersDepartements),
  ]);

  const couverts = new Set<string>();

  for (const { codeDepartement } of deptsAv) {
    couverts.add(normalizeCodeDepartement(codeDepartement));
  }

  for (const { codeInsee } of communesAmo) {
    // Codes INSEE malformés en base : ignorés plutôt que de faire échouer l'inventaire.
    try {
      couverts.add(normalizeCodeDepartement(getCodeDepartementFromCodeInsee(codeInsee)));
    } catch {
      continue;
    }
  }

  // `departements` est un champ libre (« Allier 03, Indre 36 ») : même recherche par
  // inclusion que l'auto-attribution AMO (`findFirstAmoForTerritory`), pour que le
  // signalement colle exactement à ce que le demandeur obtiendra.
  const departementsLibres = amos.map((a) => a.departements ?? "").join(" | ");

  return DEPARTEMENTS_ELIGIBLES_RGA.filter((code) => {
    if (couverts.has(normalizeCodeDepartement(code))) return false;
    return !departementsLibres.includes(code);
  });
}
