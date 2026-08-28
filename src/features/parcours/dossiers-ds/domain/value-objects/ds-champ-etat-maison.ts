import { EtatSinistre } from "@/features/simulateur/domain/value-objects";

/**
 * Champ « État de la maison » (démarche d'éligibilité), ajouté à la main APRÈS le clonage
 * de la démarche : son id diffère entre prod et préprod, comme l'annotation « lien FPA »
 * (cf. `ds-annotations.ts`). Remplace les 2 anciennes questions checkbox « Désordres
 * architecturaux identifiés » / « Micro-fissures d'1mm max identitées », retirées du
 * formulaire DN au profit d'une unique question à 4 choix.
 *
 * Ids à relever avec `pnpm ds:fetch-schema <numero>` — DN ignore silencieusement un
 * `champ_` inexistant, donc un id encore en TODO ne fait planter ni avertir DN, seulement
 * nos propres logs (cf. `getChampEtatMaisonEligibilite`).
 */
export const DS_CHAMP_ETAT_MAISON_ELIGIBILITE: Record<number, string> = {
  126061: "TODO-PROD",
  146377: "TODO-PREPROD",
};

/**
 * Id du champ « État de la maison » pour la démarche d'éligibilité courante, ou `null` si
 * la démarche est inconnue ou son id pas encore relevé (`TODO-*`).
 */
export function getChampEtatMaisonEligibilite(demarcheNumber: number): string | null {
  const champId = DS_CHAMP_ETAT_MAISON_ELIGIBILITE[demarcheNumber];
  if (!champId) {
    console.warn(
      `Éligibilité: démarche ${demarcheNumber} inconnue, champ « état de la maison » non préremplie. ` +
        `Relever son id avec \`pnpm ds:fetch-schema ${demarcheNumber}\` et l'ajouter à DS_CHAMP_ETAT_MAISON_ELIGIBILITE.`
    );
    return null;
  }
  if (champId.startsWith("TODO-")) {
    console.warn(
      `Éligibilité: id du champ « état de la maison » pas encore relevé pour la démarche ${demarcheNumber} ` +
        `(placeholder "${champId}"). Relever avec \`pnpm ds:fetch-schema ${demarcheNumber}\` et corriger DS_CHAMP_ETAT_MAISON_ELIGIBILITE.`
    );
    return null;
  }
  return champId;
}

/**
 * Libellés DN attendus par le champ liste déroulante « État de la maison » — toute
 * divergence de libellé fait rejeter la valeur au préremplissage (liste fermée, pas un id
 * stable). À revérifier avec `pnpm ds:fetch-schema <numero>` si le formulaire DN change.
 */
export const DS_LABELS_ETAT_MAISON: Record<EtatSinistre, string> = {
  saine: "Saine",
  "très peu endommagée": "Très peu endommagée (micro fissure de moins de 5mm)",
  endommagée: "Endommagée (micro fissure de plus de 5mm mais sans désordres structuraux)",
  "très endommagée": "Très endommagée (désordres structuraux empêchant l'usage normal de la maison)",
};
