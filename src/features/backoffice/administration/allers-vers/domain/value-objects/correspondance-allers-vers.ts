export interface StructureAllersVersConnue {
  id: string;
  nom: string;
  departements: string[];
}

export type CorrespondanceAllersVers =
  | { type: "creation" }
  | { type: "mise_a_jour"; id: string }
  | { type: "ambigue"; structures: StructureAllersVersConnue[] };

// Insensible à la casse, aux accents et à la ponctuation : « Allers-Vers » == « allers vers ».
export function normaliserNomStructure(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Clé naturelle = nom normalisé + au moins un département commun : deux « Soliha » de départements
// différents sont deux structures, et une structure qui gagne un département reste la même.
export function trouverCorrespondanceAllersVers(
  nom: string,
  departements: string[],
  connues: StructureAllersVersConnue[]
): CorrespondanceAllersVers {
  const cle = normaliserNomStructure(nom);
  const candidates = connues.filter(
    (structure) =>
      normaliserNomStructure(structure.nom) === cle && structure.departements.some((d) => departements.includes(d))
  );

  if (candidates.length === 0) return { type: "creation" };
  if (candidates.length === 1) return { type: "mise_a_jour", id: candidates[0].id };
  return { type: "ambigue", structures: candidates };
}
