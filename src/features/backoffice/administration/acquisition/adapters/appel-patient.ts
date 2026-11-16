/**
 * Appel lent dont l'appelant n'attend pas la fin : il rend la main après `attenteMs`, l'appel
 * continue et son résultat sert les demandes suivantes (ADR-0033).
 */

/** Résultat et instant où l'appel l'a rendu : il peut être servi bien après. */
export interface ResultatDate<T> {
  valeur: T;
  calculeLe: number;
}

interface ResultatGarde extends ResultatDate<unknown> {
  fraisJusqua: number;
  gardeJusqua: number;
}

interface AppelEnVol {
  promesse: Promise<ResultatDate<unknown>>;
  debut: number;
}

interface EtatAppelsPatients {
  resultats: Map<string, ResultatGarde>;
  enVol: Map<string, AppelEnVol>;
}

// Une valeur périmée reste servie ce temps-là pendant qu'un nouvel appel la remplace.
const DUREE_GARDE_PERIMEE_MS = 24 * 3600 * 1000;

// Sur globalThis : pages et server actions sont compilées à part, chacune avec ses modules.
const porteur = globalThis as typeof globalThis & { __appelsPatientsMatomo?: EtatAppelsPatients };
const etat: EtatAppelsPatients = (porteur.__appelsPatientsMatomo ??= { resultats: new Map(), enVol: new Map() });

export class AttenteDepassee extends Error {
  constructor(attenteMs: number) {
    super(`Pas de reponse en ${attenteMs} ms, l'appel se poursuit en arriere-plan`);
    this.name = "AttenteDepassee";
  }
}

export interface OptionsAppelPatient {
  /** Temps que l'appelant accepte d'attendre, compté depuis le début de l'appel. */
  attenteMs: number;
  /** Durée pendant laquelle un résultat est rendu sans nouvel appel. */
  fraicheurMs: number;
}

function purgerResultats(maintenant: number): void {
  for (const [cle, resultat] of etat.resultats) {
    if (maintenant >= resultat.gardeJusqua) etat.resultats.delete(cle);
  }
}

function demarrer(cle: string, lancer: () => Promise<unknown>, fraicheurMs: number): AppelEnVol {
  const promesse = lancer()
    .then((valeur) => {
      const maintenant = Date.now();
      purgerResultats(maintenant);
      etat.resultats.set(cle, {
        valeur,
        calculeLe: maintenant,
        fraisJusqua: maintenant + fraicheurMs,
        gardeJusqua: maintenant + fraicheurMs + DUREE_GARDE_PERIMEE_MS,
      });
      return { valeur, calculeLe: maintenant };
    })
    .finally(() => etat.enVol.delete(cle));
  // Un échec sans appelant à l'écoute ne doit pas devenir un rejet non géré.
  promesse.catch(() => {});

  const enVol = { promesse, debut: Date.now() };
  etat.enVol.set(cle, enVol);
  return enVol;
}

async function attendre(enVol: AppelEnVol, attenteMs: number): Promise<ResultatDate<unknown>> {
  const reste = attenteMs - (Date.now() - enVol.debut);
  if (reste <= 0) throw new AttenteDepassee(attenteMs);

  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new AttenteDepassee(attenteMs)), reste);
  });
  try {
    return await Promise.race([enVol.promesse, delai]);
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Rend le résultat gardé s'il est frais ; sinon lance l'appel (ou rejoint celui en cours) et
 * rend la valeur périmée s'il y en a une, ou attend au plus `attenteMs`. Un échec n'est pas gardé.
 */
export async function appelerAvecPatience<T>(
  cle: string,
  lancer: () => Promise<T>,
  { attenteMs, fraicheurMs }: OptionsAppelPatient
): Promise<ResultatDate<T>> {
  const maintenant = Date.now();
  const garde = etat.resultats.get(cle);
  const rendreGarde = (): ResultatDate<T> => ({ valeur: garde!.valeur as T, calculeLe: garde!.calculeLe });
  if (garde && maintenant < garde.fraisJusqua) return rendreGarde();

  const enVol = etat.enVol.get(cle) ?? demarrer(cle, lancer, fraicheurMs);
  if (garde && maintenant < garde.gardeJusqua) return rendreGarde();

  return (await attendre(enVol, attenteMs)) as ResultatDate<T>;
}

/** Réservé aux tests : l'état survit sinon d'un test à l'autre. */
export function reinitialiserAppelsPatients(): void {
  etat.resultats.clear();
  etat.enVol.clear();
}
