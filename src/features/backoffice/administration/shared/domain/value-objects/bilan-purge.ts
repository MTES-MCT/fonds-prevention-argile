export interface BilanPurgeStructures {
  supprimees: string[];
  conservees: string[];
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

// Nomme les structures conservées : sans elles, « tout supprimer » semble n'avoir rien fait.
export function decrireBilanPurge(bilan: BilanPurgeStructures, motifConservation: string): string {
  const supprimees = `Suppression préalable : ${pluriel(bilan.supprimees.length, "structure")} ${bilan.supprimees.length > 1 ? "supprimées" : "supprimée"}`;
  if (bilan.conservees.length === 0) return `${supprimees}.`;

  const conservees = bilan.conservees.length > 1 ? "conservées" : "conservée";
  return `${supprimees}, ${bilan.conservees.length} ${conservees} car ${motifConservation} (mises à jour par l'import si elles figurent dans le fichier) : ${bilan.conservees.join(", ")}.`;
}
