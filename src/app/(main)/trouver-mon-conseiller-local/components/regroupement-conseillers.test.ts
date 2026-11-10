import { describe, it, expect } from "vitest";
import { departementsDuConseiller, LIBELLE_AUTRES_LOCALISATIONS, regrouperParZone } from "./regroupement-conseillers";

const conseiller = (nom: string, libelleZone: string | null = null) => ({ nom, libelleZone });

describe("regrouperParZone", () => {
  it("ne fait qu'un groupe, sans titre, quand aucun Aller-vers du département n'a de zone", () => {
    expect(regrouperParZone([conseiller("Adil 36"), conseiller("Caue 36")])).toEqual([
      { libelle: null, conseillers: [conseiller("Adil 36"), conseiller("Caue 36")] },
    ]);
  });

  it("met chaque zone à part, puis les autres sous « toute autre localisation », quel que soit le nom", () => {
    // Le cas de staging : l'Aller-vers renommé « Alohé 54 » gardait le même périmètre.
    const groupes = regrouperParZone([conseiller("Alohé 54", "Pour la métropole de Nancy"), conseiller("Soliha 54")]);
    expect(groupes.map((g) => [g.libelle, g.conseillers.map((c) => c.nom)])).toEqual([
      ["Pour la métropole de Nancy", ["Alohé 54"]],
      [LIBELLE_AUTRES_LOCALISATIONS, ["Soliha 54"]],
    ]);
  });

  it("n'ajoute pas de groupe « autres » quand tous les Aller-vers ont une zone", () => {
    const groupes = regrouperParZone([conseiller("A", "Pour Lille"), conseiller("B", "  Pour Dunkerque  ")]);
    expect(groupes.map((g) => g.libelle)).toEqual(["Pour Lille", "Pour Dunkerque"]);
  });
});

describe("departementsDuConseiller", () => {
  it("ajoute aux départements déclarés ceux des EPCI, au format officiel et sans doublon", () => {
    const departementsDe = (code: string) => (code === "245400676" ? ["54"] : code === "200071082" ? ["03"] : []);
    expect(departementsDuConseiller(["54"], ["245400676"], departementsDe)).toEqual(["54"]);
    // Un Aller-vers déclaré seulement par EPCI n'apparaissait dans aucun département.
    expect(departementsDuConseiller([], ["200071082"], departementsDe)).toEqual(["03"]);
    expect(departementsDuConseiller(["3"], [], departementsDe)).toEqual(["03"]);
  });
});
