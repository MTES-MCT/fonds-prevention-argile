import { describe, it, expect } from "vitest";
import {
  RAISONS_ARCHIVAGE,
  RAISON_POURSUITE_AUTONOME,
  estRaisonPoursuiteAutonome,
  getGroupesRaisonsSansAccompagnement,
} from "./raisons-fin-suivi";

describe("estRaisonPoursuiteAutonome", () => {
  it("reconnaît la seule raison qui n'archive pas", () => {
    expect(estRaisonPoursuiteAutonome(RAISON_POURSUITE_AUTONOME)).toBe(true);
  });

  it("tolère les espaces autour, comme la server action qui nettoie la saisie", () => {
    expect(estRaisonPoursuiteAutonome(`  ${RAISON_POURSUITE_AUTONOME} `)).toBe(true);
  });

  it.each(RAISONS_ARCHIVAGE)("archive toujours sur « %s »", (raison) => {
    expect(estRaisonPoursuiteAutonome(raison)).toBe(false);
  });

  it("n'accorde l'autonomie à aucune formulation approchante", () => {
    expect(estRaisonPoursuiteAutonome("Le demandeur souhaite poursuivre")).toBe(false);
    expect(estRaisonPoursuiteAutonome("")).toBe(false);
  });
});

describe("getGroupesRaisonsSansAccompagnement", () => {
  it("propose l'autonomie avant l'archivage là où l'AMO n'est pas imposé", () => {
    const groupes = getGroupesRaisonsSansAccompagnement(true);

    expect(groupes).toHaveLength(2);
    expect(groupes[0].raisons).toContain(RAISON_POURSUITE_AUTONOME);
  });

  it("retire l'autonomie là où l'AMO est imposé, personne ne reprendrait le dossier", () => {
    const groupes = getGroupesRaisonsSansAccompagnement(false);

    expect(groupes).toHaveLength(1);
    expect(groupes.flatMap((g) => g.raisons)).not.toContain(RAISON_POURSUITE_AUTONOME);
  });

  it("garde les six raisons d'archivage dans les deux cas", () => {
    for (const autonomie of [true, false]) {
      const raisons = getGroupesRaisonsSansAccompagnement(autonomie).flatMap((g) => g.raisons);
      expect(raisons).toEqual(expect.arrayContaining([...RAISONS_ARCHIVAGE]));
    }
  });
});
