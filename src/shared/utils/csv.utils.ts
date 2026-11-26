/**
 * Lit un CSV (RFC 4180) : champs entre guillemets, guillemets doublés, virgules et retours à la ligne dans un champ.
 */
export function parserCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let entreGuillemets = false;

  // Un BOM en tête collerait au nom de la première colonne.
  const source = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;

  for (let i = 0; i < source.length; i++) {
    const caractere = source[i];

    if (entreGuillemets) {
      if (caractere !== '"') champ += caractere;
      else if (source[i + 1] === '"') {
        champ += '"';
        i++;
      } else entreGuillemets = false;
      continue;
    }

    if (caractere === '"') entreGuillemets = true;
    else if (caractere === ",") {
      ligne.push(champ);
      champ = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && source[i + 1] === "\n") i++;
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else champ += caractere;
  }

  // Un guillemet jamais refermé avale toute la suite du fichier dans un seul champ.
  if (entreGuillemets) throw new Error("CSV mal formé : guillemet non refermé");

  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }

  return lignes;
}

/**
 * Lit un CSV dont la première ligne nomme les colonnes : un objet par ligne, les lignes vides ignorées.
 * Une ligne qui n'a pas autant de cellules que l'en-tête fait échouer la lecture.
 */
export function parserCsvAvecEntetes(texte: string): { colonnes: string[]; lignes: Record<string, string>[] } {
  const [colonnes = [], ...donnees] = parserCsv(texte);

  const remplies = donnees.filter((cellules) => cellules.some((cellule) => cellule !== ""));

  const decalee = remplies.findIndex((cellules) => cellules.length !== colonnes.length);
  if (decalee !== -1) {
    throw new Error(
      `CSV mal formé : ${remplies[decalee].length} cellules au lieu de ${colonnes.length} (ligne de données ${decalee + 1})`
    );
  }

  return {
    colonnes,
    lignes: remplies.map((cellules) =>
      Object.fromEntries(colonnes.map((colonne, index) => [colonne, cellules[index]]))
    ),
  };
}
