import { describe, it, expect, vi } from "vitest";

vi.mock(
  "@/features/backoffice",
  async () => import("@/features/backoffice/administration/structures/domain/regles-structures")
);

import { CRITERES_HABILITATION, ecrireCriteresHabilitation, lireCriteresHabilitation } from "./filtre-habilitation";

describe("critères d'habilitation dans l'adresse", () => {
  it("lit le critère d'une ancienne page, et plusieurs critères séparés par des virgules", () => {
    expect(lireCriteresHabilitation("allersVers")).toEqual(["allersVers"]);
    expect(lireCriteresHabilitation("expert, amo")).toEqual(["amo", "expert"]);
    expect(lireCriteresHabilitation(["expert", "amo"])).toEqual(["amo", "expert"]);
  });

  it("ignore une valeur inconnue ou absente, dont l'ancien critère « sans habilitation »", () => {
    expect(lireCriteresHabilitation("allers-vers,toto,aucune")).toEqual([]);
    expect(lireCriteresHabilitation(undefined)).toEqual([]);
    expect(CRITERES_HABILITATION.map(({ libelle }) => libelle)).toEqual(["AMO", "Aller-vers", "Expert"]);
  });

  it("retire le paramètre quand rien n'est coché", () => {
    expect(ecrireCriteresHabilitation(["amo", "expert"])).toBe("amo,expert");
    expect(ecrireCriteresHabilitation([])).toBeNull();
  });
});
