import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { doitControlerAvisImpot, type EtatDeclenchementControle } from "./declenchement-controle";

const MODIFIE_LE = "2026-09-29T15:41:02+02:00";

function etat(valeurs: Partial<EtatDeclenchementControle> = {}): EtatDeclenchementControle {
  return {
    step: Step.ELIGIBILITE,
    dsStatus: DSStatus.EN_CONSTRUCTION,
    controleAt: null,
    champsModifiesAtControle: null,
    champsModifiesAtDn: MODIFIE_LE,
    ...valeurs,
  };
}

const dejaControle = { controleAt: new Date("2026-09-29T14:00:00Z"), champsModifiesAtControle: new Date(MODIFIE_LE) };

describe("doitControlerAvisImpot", () => {
  it.each([
    ["dossier déposé jamais contrôlé", etat(), true],
    ["dossier en instruction jamais contrôlé", etat({ dsStatus: DSStatus.EN_INSTRUCTION }), true],
    ["champs inchangés depuis le contrôle", etat(dejaControle), false],
    [
      "champs modifiés depuis le contrôle",
      etat({ ...dejaControle, champsModifiesAtDn: "2026-09-30T09:00:00+02:00" }),
      true,
    ],
    [
      "même instant écrit dans un autre fuseau",
      etat({ ...dejaControle, champsModifiesAtDn: "2026-09-29T13:41:02Z" }),
      false,
    ],
    ["date DN absente sur un dossier déjà contrôlé", etat({ ...dejaControle, champsModifiesAtDn: null }), false],
    ["date DN absente sur un dossier jamais contrôlé", etat({ champsModifiesAtDn: undefined }), true],
    ["contrôle sans date de champs enregistrée", etat({ ...dejaControle, champsModifiesAtControle: null }), true],
    ["prérempli non déposé", etat({ dsStatus: null }), false],
    ["dossier accepté", etat({ dsStatus: DSStatus.ACCEPTE }), false],
    ["dossier refusé", etat({ dsStatus: DSStatus.REFUSE }), false],
    ["dossier classé sans suite", etat({ dsStatus: DSStatus.CLASSE_SANS_SUITE }), false],
    ["dossier de diagnostic", etat({ step: Step.DIAGNOSTIC }), false],
  ] as const)("%s → %s", (_cas, valeurs, attendu) => {
    expect(doitControlerAvisImpot(valeurs)).toBe(attendu);
  });
});
