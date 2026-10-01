import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const env = vi.hoisted(() => ({ DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID: "SW5zdHJ1Y3RldXItMQ==" }));
vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn(() => env) }));

const client = vi.hoisted(() => ({ getDossierAvisImpot: vi.fn(), modifierAnnotations: vi.fn() }));
vi.mock("../adapters/graphql/client", () => ({ graphqlClient: client }));

const enregistrerControleAvisImpot = vi.hoisted(() => vi.fn());
vi.mock("./dossier-ds.service", () => ({ enregistrerControleAvisImpot }));

import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  controlerAvisImpotApresSync,
  controlerEtAnnoterAvisImpot,
  controlerEtEnregistrerAvisImpot,
  type DossierApresSync,
} from "./controle-avis-impot.service";
import { FIXTURES_AVIS_IMPOT, dossierAvisFictif } from "../mappers/avis-impot.fixtures";
import {
  DS_ANNOTATION_CONTROLE_AVIS_IMPOT_ELIGIBILITE,
  DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE,
} from "../domain/value-objects/ds-annotations";
import { STATUTS_CONTROLE } from "../domain/avis-impot";

const ANNOTATION_PREPROD = "Q2hhbXAtNzAyMDIwNw==";
const MAINTENANT = new Date("2026-09-29T12:00:00Z");
const options = { appliquer: true, maintenant: MAINTENANT };

describe("controlerEtAnnoterAvisImpot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getDossierAvisImpot.mockResolvedValue(FIXTURES_AVIS_IMPOT.lu);
  });

  it("écrit le verdict dans l'annotation texte long, au nom de l'instructeur configuré", async () => {
    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle).toMatchObject({ issue: "ecrite", resultat: { statut: STATUTS_CONTROLE.COHERENT } });
    expect(client.modifierAnnotations).toHaveBeenCalledWith({
      dossierId: FIXTURES_AVIS_IMPOT.lu.id,
      instructeurId: "SW5zdHJ1Y3RldXItMQ==",
      annotations: expect.arrayContaining([
        {
          id: ANNOTATION_PREPROD,
          value: {
            textarea: "Les informations renseignées par le demandeur sont cohérentes avec l'avis d'imposition.",
          },
        },
      ]),
    });
  });

  it("n'écrit rien en dry-run", async () => {
    const controle = await controlerEtAnnoterAvisImpot(1, { ...options, appliquer: false });

    expect(controle?.issue).toBe("simulation");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("ne réécrit pas une annotation déjà à jour", async () => {
    const premier = await controlerEtAnnoterAvisImpot(1, { ...options, appliquer: false });
    client.getDossierAvisImpot.mockResolvedValue({
      ...FIXTURES_AVIS_IMPOT.lu,
      annotations: (premier?.annotations ?? []).map((a) => ({ champDescriptorId: a.id, stringValue: a.valeur })),
    });
    client.modifierAnnotations.mockClear();

    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle?.issue).toBe("inchangee");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("n'écrit pas sur une démarche dont l'annotation n'est pas répertoriée", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    client.getDossierAvisImpot.mockResolvedValue({ ...FIXTURES_AVIS_IMPOT.lu, demarche: { number: 999 } });

    expect((await controlerEtAnnoterAvisImpot(1, options))?.issue).toBe("annotation_non_configuree");
    expect(client.modifierAnnotations).not.toHaveBeenCalled();
  });

  it("renvoie null pour un dossier invisible", async () => {
    client.getDossierAvisImpot.mockResolvedValue(null);

    await expect(controlerEtAnnoterAvisImpot(1, options)).resolves.toBeNull();
  });

  it("laisse remonter un refus de DN", async () => {
    client.modifierAnnotations.mockRejectedValue(new Error("Annotations refusées : non autorisé"));

    await expect(controlerEtAnnoterAvisImpot(1, options)).rejects.toThrow("non autorisé");
  });
});

describe("controlerAvisImpotApresSync", () => {
  const CHAMPS_MODIFIES_AT = "2026-09-29T15:41:02+02:00";

  function dossier(valeurs: Partial<DossierApresSync> = {}): DossierApresSync {
    return {
      id: "d1",
      step: Step.ELIGIBILITE,
      dsNumber: "33301642",
      dsDemarcheId: "146377",
      avisImpotControleAt: null,
      avisImpotChampsModifiesAt: null,
      ...valeurs,
    };
  }

  const appeler = (valeurs: Partial<DossierApresSync> = {}, dsStatus: DSStatus | null = DSStatus.EN_CONSTRUCTION) =>
    controlerAvisImpotApresSync({
      dossier: dossier(valeurs),
      dsStatus,
      champsModifiesAt: CHAMPS_MODIFIES_AT,
      maintenant: MAINTENANT,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    client.getDossierAvisImpot.mockResolvedValue(FIXTURES_AVIS_IMPOT["ecart-revenu"]);
    client.modifierAnnotations.mockResolvedValue(undefined);
  });

  it("contrôle un dossier déposé jamais contrôlé, écrit l'annotation et enregistre le verdict", async () => {
    await expect(appeler()).resolves.toBe("ecrite");

    expect(client.getDossierAvisImpot).toHaveBeenCalledWith(33301642);
    expect(enregistrerControleAvisImpot).toHaveBeenCalledWith("d1", {
      statut: STATUTS_CONTROLE.A_VERIFIER,
      controleAt: MAINTENANT,
      champsModifiesAt: new Date(CHAMPS_MODIFIES_AT),
    });
  });

  it("écrit l'alerte d'incohérence quand le RFR déclaré diffère de l'avis", async () => {
    await appeler();

    expect(client.modifierAnnotations.mock.calls[0][0].annotations[0].value.textarea).toBe(
      "Attention, il semble y avoir une incohérence entre les informations renseignées par le demandeur et l'avis d'imposition."
    );
  });

  it("enregistre le statut affiché dans l'annotation, celui du RFR", async () => {
    client.getDossierAvisImpot.mockResolvedValue({
      ...FIXTURES_AVIS_IMPOT.lu,
      champs: FIXTURES_AVIS_IMPOT.lu.champs.map((c) =>
        c.label === "Nombre de personnes composant le ménage" ? { ...c, valeurEntiere: "6" } : c
      ),
    });

    await appeler();

    expect(enregistrerControleAvisImpot).toHaveBeenCalledWith(
      "d1",
      expect.objectContaining({ statut: STATUTS_CONTROLE.COHERENT })
    );
  });

  it("ne relit pas DN quand les champs n'ont pas bougé depuis le dernier contrôle", async () => {
    const resultat = await appeler({
      avisImpotControleAt: new Date("2026-09-29T14:00:00Z"),
      avisImpotChampsModifiesAt: new Date(CHAMPS_MODIFIES_AT),
    });

    expect(resultat).toBeNull();
    expect(client.getDossierAvisImpot).not.toHaveBeenCalled();
  });

  it("ne touche pas un dossier dont la décision est rendue", async () => {
    await expect(appeler({}, DSStatus.ACCEPTE)).resolves.toBeNull();
    expect(client.getDossierAvisImpot).not.toHaveBeenCalled();
  });

  it("ne fait rien, sans bruit, sur une démarche où le contrôle n'est pas activé", async () => {
    const warn = vi.spyOn(console, "warn");

    await expect(appeler({ dsDemarcheId: "126061" })).resolves.toBeNull();
    expect(client.getDossierAvisImpot).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("n'enregistre rien pour un dossier devenu invisible", async () => {
    client.getDossierAvisImpot.mockResolvedValue(null);

    await expect(appeler()).resolves.toBeNull();
    expect(enregistrerControleAvisImpot).not.toHaveBeenCalled();
  });

  it("laisse remonter un refus de DN sans enregistrer, pour retenter au prochain run", async () => {
    client.modifierAnnotations.mockRejectedValue(new Error("L'instructeur n'a pas les droits d'accès à ce dossier"));

    await expect(appeler()).rejects.toThrow("droits d'accès");
    expect(enregistrerControleAvisImpot).not.toHaveBeenCalled();
  });

  it("n'enregistre rien quand l'annotation n'est pas écrite (dry-run)", async () => {
    await controlerEtEnregistrerAvisImpot({ dossierId: "d1", dsNumber: "1", appliquer: false });

    expect(client.modifierAnnotations).not.toHaveBeenCalled();
    expect(enregistrerControleAvisImpot).not.toHaveBeenCalled();
  });

  it("enregistre aussi un contrôle dont l'annotation était déjà à jour", async () => {
    const premier = await controlerEtAnnoterAvisImpot(1, {
      appliquer: false,
      maintenant: MAINTENANT,
    });
    client.getDossierAvisImpot.mockResolvedValue({
      ...FIXTURES_AVIS_IMPOT["ecart-revenu"],
      annotations: (premier?.annotations ?? []).map((a) => ({ champDescriptorId: a.id, stringValue: a.valeur })),
    });

    await expect(appeler()).resolves.toBe("inchangee");
    expect(enregistrerControleAvisImpot).toHaveBeenCalledOnce();
  });
});

describe("annotations de tranche de revenu", () => {
  const TYPE_MENAGE = "Q2hhbXAtNzAzMDU1Mw==";
  const TAUX = "Q2hhbXAtNzAzMDU1NQ==";
  const COHERENT = "Les informations renseignées par le demandeur sont cohérentes avec l'avis d'imposition.";

  const ecrites = () =>
    client.modifierAnnotations.mock.calls[0][0].annotations as Array<{ id: string; value: Record<string, string> }>;

  beforeEach(() => {
    vi.clearAllMocks();
    client.modifierAnnotations.mockResolvedValue(undefined);
    client.getDossierAvisImpot.mockResolvedValue(FIXTURES_AVIS_IMPOT.lu);
  });

  afterEach(() => {
    delete DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[999];
  });

  it("écrit les trois annotations dans une seule mutation, d'après le RFR déclaré", async () => {
    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle?.tranche).toEqual({ typeMenage: "TMO", tauxSubvention: 90 });
    expect(client.modifierAnnotations).toHaveBeenCalledOnce();
    expect(ecrites()).toEqual([
      { id: ANNOTATION_PREPROD, value: { textarea: COHERENT } },
      { id: TYPE_MENAGE, value: { dropDownList: "TMO" } },
      { id: TAUX, value: { text: "90 %" } },
    ]);
  });

  it("n'envoie que les annotations dont la valeur change", async () => {
    client.getDossierAvisImpot.mockResolvedValue({
      ...FIXTURES_AVIS_IMPOT.lu,
      annotations: [
        { champDescriptorId: ANNOTATION_PREPROD, stringValue: COHERENT },
        { champDescriptorId: TYPE_MENAGE, stringValue: "TMO" },
        { champDescriptorId: TAUX, stringValue: "85 %" },
      ],
    });

    await expect(controlerEtAnnoterAvisImpot(1, options)).resolves.toMatchObject({ issue: "ecrite" });
    expect(ecrites()).toEqual([{ id: TAUX, value: { text: "90 %" } }]);
  });

  it("calcule la tranche sur le RFR déclaré même quand l'avis en indique un autre", async () => {
    client.getDossierAvisImpot.mockResolvedValue(FIXTURES_AVIS_IMPOT["ecart-revenu"]);

    const controle = await controlerEtAnnoterAvisImpot(1, options);

    expect(controle?.tranche.typeMenage).toBe("TMO");
    expect(ecrites()).toContainEqual({ id: TYPE_MENAGE, value: { dropDownList: "TMO" } });
  });

  it("écrit « Non calculable » sans commune dans le dossier", async () => {
    client.getDossierAvisImpot.mockResolvedValue(
      dossierAvisFictif({ nombrePersonnes: 3, revenuFiscalReference: 18500, codeDepartement: null })
    );

    await controlerEtAnnoterAvisImpot(1, options);

    expect(ecrites()).toEqual(
      expect.arrayContaining([
        { id: TYPE_MENAGE, value: { dropDownList: "Non calculable" } },
        { id: TAUX, value: { text: "Non calculable" } },
      ])
    );
  });

  it("écrit « Hors plafond » et « Non éligible » au-delà du plafond intermédiaire", async () => {
    client.getDossierAvisImpot.mockResolvedValue(
      dossierAvisFictif({ nombrePersonnes: 1, revenuFiscalReference: 90000 })
    );

    await controlerEtAnnoterAvisImpot(1, options);

    expect(ecrites()).toEqual(
      expect.arrayContaining([
        { id: TYPE_MENAGE, value: { dropDownList: "Hors plafond" } },
        { id: TAUX, value: { text: "Non éligible" } },
      ])
    );
  });

  it("fonctionne sur une démarche où seule l'annotation de tranche est répertoriée", async () => {
    DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[999] = TYPE_MENAGE;
    client.getDossierAvisImpot.mockResolvedValue({ ...FIXTURES_AVIS_IMPOT.lu, demarche: { number: 999 } });

    await controlerEtAnnoterAvisImpot(1, options);

    expect(DS_ANNOTATION_CONTROLE_AVIS_IMPOT_ELIGIBILITE[999]).toBeUndefined();
    expect(ecrites()).toEqual([{ id: TYPE_MENAGE, value: { dropDownList: "TMO" } }]);
  });
});
