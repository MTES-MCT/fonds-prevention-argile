export const MOTIF_SANS_MOTIF = "Sans motif";

/** Un archivage sans raison a sa propre ligne, pour que la somme des motifs rejoigne « Dossiers archivés ». */
export function libelleMotifArchivage(raison: string | null | undefined): string {
  return raison?.trim() ? raison : MOTIF_SANS_MOTIF;
}
