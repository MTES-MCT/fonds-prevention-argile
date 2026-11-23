import { describe, expect, it } from "vitest";
import { parserCsv, parserCsvAvecEntetes } from "./csv.utils";

describe("parserCsv", () => {
  it("lit des champs simples, ligne par ligne", () => {
    expect(parserCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("garde virgules, guillemets doublés et retours à la ligne d'un champ entre guillemets", () => {
    expect(parserCsv('motif,texte\n"a, b","dit ""non""\nsur deux lignes"')).toEqual([
      ["motif", "texte"],
      ["a, b", 'dit "non"\nsur deux lignes'],
    ]);
  });

  it("accepte les fins de ligne Windows et une dernière ligne sans retour", () => {
    expect(parserCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("garde un champ vide en fin de ligne", () => {
    expect(parserCsv("a,b,c\n1,,\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });
});

describe("parserCsvAvecEntetes", () => {
  it("rend un objet par ligne, sans le BOM ni les lignes vides", () => {
    const { colonnes, lignes } = parserCsvAvecEntetes("﻿code,commune\n36044,Châteauroux\n\n54395,Nancy\n");

    expect(colonnes).toEqual(["code", "commune"]);
    expect(lignes).toEqual([
      { code: "36044", commune: "Châteauroux" },
      { code: "54395", commune: "Nancy" },
    ]);
  });

  it("une cellule manquante vaut une chaîne vide", () => {
    expect(parserCsvAvecEntetes("code,commune\n36044").lignes).toEqual([{ code: "36044", commune: "" }]);
  });
});
