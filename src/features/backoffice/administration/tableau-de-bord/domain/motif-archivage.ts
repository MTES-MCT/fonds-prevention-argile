export const MOTIF_SANS_MOTIF = "Sans motif";

/** Un archivage sans raison a sa propre ligne, pour que la somme des motifs rejoigne « Dossiers archivés ». */
export function libelleMotifArchivage(raison: string | null | undefined): string {
  return raison?.trim() ? raison : MOTIF_SANS_MOTIF;
}

/** Comptage et détail passent par le même libellé : un motif listé dans « Autres » retrouve toutes ses demandes. */
export function repartirParMotif(
  lignes: { reason: string | null; count: number }[],
  inclureSansMotif: boolean
): Map<string, number> {
  const repartition = new Map<string, number>();
  for (const { reason, count } of lignes) {
    const motif = libelleMotifArchivage(reason);
    if (motif === MOTIF_SANS_MOTIF && !inclureSansMotif) continue;
    repartition.set(motif, (repartition.get(motif) ?? 0) + count);
  }
  return repartition;
}

export function appartientAuxMotifs(raison: string | null | undefined, motifs: string[]): boolean {
  return motifs.includes(libelleMotifArchivage(raison));
}
