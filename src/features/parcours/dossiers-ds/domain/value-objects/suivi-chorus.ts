/** Valeur lue dans une annotation DN, avec la date où la synchro l'a vue pour la première fois. */
export interface ValeurChorus<T> {
  valeur: T;
  renseigneAt: Date;
}

export interface SuiviChorus {
  tiersFournisseur: ValeurChorus<string> | null;
  numeroEj: ValeurChorus<string> | null;
  montantSubvention: ValeurChorus<number> | null;
}

export interface ReferenceChorus {
  type: "EJ" | "Tiers";
  valeur: string;
}

// L'EJ vient après le tiers fournisseur dans le process : s'il existe, c'est la référence la plus avancée.
export function getReferenceChorus(suivi: SuiviChorus | null | undefined): ReferenceChorus | null {
  if (suivi?.numeroEj) return { type: "EJ", valeur: suivi.numeroEj.valeur };
  if (suivi?.tiersFournisseur) return { type: "Tiers", valeur: suivi.tiersFournisseur.valeur };
  return null;
}

export function formatMontantEuros(montant: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montant);
}
