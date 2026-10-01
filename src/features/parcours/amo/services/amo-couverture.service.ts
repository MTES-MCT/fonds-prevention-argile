import { db } from "@/shared/database/client";
import { entreprisesAmo, entreprisesAmoCommunes, entreprisesAmoEpci } from "@/shared/database/schema";
import type { Amo } from "../domain/entities";
import {
  amosDuTerritoire,
  resoudreAmo,
  type ResolutionAmo,
  type TerritoireAmo,
} from "../domain/value-objects/couverture-amo";

/**
 * Source unique de la couverture territoriale des AMO : liste proposée au demandeur et à
 * l'Aller-vers, attribution automatique, garde de sélection et rattachement la lisent toutes.
 */
export async function listerAmosDuTerritoire(territoire: TerritoireAmo): Promise<Amo[]> {
  // Table de quelques dizaines de lignes : lue en entier, filtrée côté JS (cf. CLAUDE.md).
  const [amos, communes, epcis] = await Promise.all([
    db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        horaires: entreprisesAmo.horaires,
      })
      .from(entreprisesAmo),
    db
      .select({ id: entreprisesAmoCommunes.entrepriseAmoId, code: entreprisesAmoCommunes.codeInsee })
      .from(entreprisesAmoCommunes),
    db.select({ id: entreprisesAmoEpci.entrepriseAmoId, code: entreprisesAmoEpci.codeEpci }).from(entreprisesAmoEpci),
  ]);

  const grouper = (rows: { id: string; code: string }[]) => {
    const parAmo = new Map<string, string[]>();
    for (const { id, code } of rows) {
      const codes = parAmo.get(id);
      if (codes) codes.push(code);
      else parAmo.set(id, [code]);
    }
    return parAmo;
  };
  const communesParAmo = grouper(communes);
  const epcisParAmo = grouper(epcis);

  const candidates = amos.map((amo) => ({
    id: amo.id,
    nom: amo.nom,
    departements: amo.departements,
    communes: communesParAmo.get(amo.id) ?? [],
    epcis: epcisParAmo.get(amo.id) ?? [],
    amo,
  }));

  return amosDuTerritoire(candidates, territoire).map((candidate) => candidate.amo);
}

/** Aucune, une seule, ou plusieurs AMO : dans ce dernier cas, personne ne choisit à la place du demandeur. */
export async function resoudreAmoDuTerritoire(territoire: TerritoireAmo): Promise<ResolutionAmo<Amo>> {
  return resoudreAmo(await listerAmosDuTerritoire(territoire));
}

/** L'AMO fait-elle partie de celles proposées pour ce territoire ? */
export async function amoCouvreTerritoire(entrepriseAmoId: string, territoire: TerritoireAmo): Promise<boolean> {
  const amos = await listerAmosDuTerritoire(territoire);
  return amos.some((amo) => amo.id === entrepriseAmoId);
}
