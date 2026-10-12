import { describe, expect, it } from "vitest";
import { calculerMajChorus } from "./chorus-annotations";
import { getReferenceChorus, toSuiviChorus, type ColonnesChorus } from "./value-objects/suivi-chorus";

const PROD = 126061;
const TIERS = "Q2hhbXAtNzAzNTkzOQ==";
const EJ = "Q2hhbXAtNzAzNTk0MA==";
const MONTANT = "Q2hhbXAtNzAzNTkzNg==";
const maintenant = new Date("2026-10-12T08:00:00Z");

const vide: ColonnesChorus = {
  chorusTiersFournisseur: null,
  chorusTiersFournisseurAt: null,
  chorusNumeroEj: null,
  chorusNumeroEjAt: null,
  chorusMontantSubvention: null,
  chorusMontantSubventionAt: null,
};

const lue = (id: string, stringValue: string | null) => ({ champDescriptorId: id, stringValue });

describe("calculerMajChorus", () => {
  it("enregistre les valeurs nouvelles avec la date du jour", () => {
    const maj = calculerMajChorus(
      vide,
      [lue(TIERS, "4521"), lue(EJ, "2100456789"), lue(MONTANT, "1250.5")],
      PROD,
      maintenant
    );
    expect(maj).toEqual({
      chorusTiersFournisseur: "4521",
      chorusTiersFournisseurAt: maintenant,
      chorusNumeroEj: "2100456789",
      chorusNumeroEjAt: maintenant,
      chorusMontantSubvention: 1250.5,
      chorusMontantSubventionAt: maintenant,
    });
  });

  it("garde la date de première détection quand la valeur ne change pas", () => {
    const avant = new Date("2026-09-15T00:00:00Z");
    const actuel = { ...vide, chorusNumeroEj: "2100456789", chorusNumeroEjAt: avant };
    expect(calculerMajChorus(actuel, [lue(EJ, "2100456789")], PROD, maintenant)).toEqual({});
  });

  it("met à jour la valeur et la date quand la DDT corrige", () => {
    const actuel = { ...vide, chorusNumeroEj: "2100456789", chorusNumeroEjAt: new Date("2026-09-15") };
    expect(calculerMajChorus(actuel, [lue(EJ, "2100456790")], PROD, maintenant)).toEqual({
      chorusNumeroEj: "2100456790",
      chorusNumeroEjAt: maintenant,
    });
  });

  it("n'efface rien quand l'annotation est vidée dans DN", () => {
    const actuel = { ...vide, chorusNumeroEj: "2100456789", chorusNumeroEjAt: new Date("2026-09-15") };
    expect(calculerMajChorus(actuel, [lue(EJ, null), lue(TIERS, "  ")], PROD, maintenant)).toEqual({});
  });

  it("ignore une valeur qui n'est pas un nombre", () => {
    expect(calculerMajChorus(vide, [lue(EJ, "EJ-12"), lue(MONTANT, "abc")], PROD, maintenant)).toEqual({});
  });

  it("accepte une virgule décimale", () => {
    expect(calculerMajChorus(vide, [lue(MONTANT, "1 250,75")], PROD, maintenant)).toMatchObject({
      chorusMontantSubvention: 1250.75,
    });
  });

  it("ne fait rien sur une démarche sans annotations Chorus répertoriées", () => {
    expect(calculerMajChorus(vide, [lue(EJ, "2100456789")], 129894, maintenant)).toEqual({});
  });
});

describe("toSuiviChorus / getReferenceChorus", () => {
  it("renvoie null sans aucune valeur", () => {
    expect(toSuiviChorus(vide)).toBeNull();
  });

  it("préfère l'EJ au tiers fournisseur", () => {
    const suivi = toSuiviChorus({
      ...vide,
      chorusTiersFournisseur: "4521",
      chorusTiersFournisseurAt: maintenant,
      chorusNumeroEj: "2100456789",
      chorusNumeroEjAt: maintenant,
    });
    expect(getReferenceChorus(suivi)).toEqual({ type: "EJ", valeur: "2100456789" });
  });

  it("retombe sur le tiers fournisseur sans EJ", () => {
    const suivi = toSuiviChorus({ ...vide, chorusTiersFournisseur: "4521", chorusTiersFournisseurAt: maintenant });
    expect(getReferenceChorus(suivi)).toEqual({ type: "Tiers", valeur: "4521" });
  });
});
