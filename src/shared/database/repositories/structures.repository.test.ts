import { describe, it, expect, vi } from "vitest";
import { allersVers, entreprisesAmo, experts, structures } from "../schema";
import { StructuresRepository, type IdentiteStructure, type StructuresExecutor } from "./structures.repository";

vi.mock("../client", () => ({ db: {} }));

const IDENTITE: IdentiteStructure = {
  nom: "Soliha Indre",
  siret: "39248872200027",
  adresse: "1 rue de la Gare, 36000 Châteauroux",
  telephone: "0254000000",
  horaires: "Du lundi au vendredi",
};

function executeur(identiteRelue: IdentiteStructure) {
  const ecritures: { table: unknown; valeurs: Record<string, unknown> }[] = [];
  const executor = {
    update: (table: unknown) => ({
      set: (valeurs: Record<string, unknown>) => {
        ecritures.push({ table, valeurs });
        return { where: async () => undefined };
      },
    }),
    select: () => ({ from: () => ({ where: async () => [identiteRelue] }) }),
  };
  return { executor: executor as unknown as StructuresExecutor, ecritures };
}

describe("StructuresRepository.mettreAJourIdentite", () => {
  it("écrit la structure, puis recopie son identité sur chacune de ses lignes", async () => {
    const { executor, ecritures } = executeur(IDENTITE);

    await new StructuresRepository().mettreAJourIdentite("s-1", IDENTITE, executor);

    expect(ecritures.map((ecriture) => ecriture.table)).toEqual([structures, entreprisesAmo, allersVers, experts]);
    expect(ecritures[1].valeurs).toEqual({
      nom: IDENTITE.nom,
      adresse: IDENTITE.adresse,
      telephone: IDENTITE.telephone,
      horaires: IDENTITE.horaires,
      siret: IDENTITE.siret,
    });
    // L'Aller-vers n'a pas de SIRET ; l'expert ne garde que nom et SIRET, ses contacts étant par département.
    expect(ecritures[2].valeurs).not.toHaveProperty("siret");
    expect(ecritures[3].valeurs).toMatchObject({ nom: IDENTITE.nom, siret: IDENTITE.siret });
    expect(ecritures[3].valeurs).not.toHaveProperty("telephone");
  });

  it("n'efface pas le SIRET d'une ligne quand la structure n'en a pas", async () => {
    const { executor, ecritures } = executeur({ ...IDENTITE, siret: null });

    await new StructuresRepository().propagerIdentite("s-1", executor);

    expect(ecritures.find((ecriture) => ecriture.table === entreprisesAmo)?.valeurs).not.toHaveProperty("siret");
    expect(ecritures.find((ecriture) => ecriture.table === experts)?.valeurs).not.toHaveProperty("siret");
  });
});
