import { describe, it, expect } from "vitest";
import { classifyDossierAnomaly, DsAnomalyType, DS_ANOMALY_EXPLANATIONS } from "./ds-anomaly";
import { DSStatus } from "./ds-status";

describe("classifyDossierAnomaly", () => {
  it("erreur not_found → dossier supprimé/introuvable", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { error: "not_found" } })).toBe(
      DsAnomalyType.DS_SUPPRIME
    );
  });

  it("erreur unauthorized → accès refusé (token)", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_CONSTRUCTION, ds: { error: "unauthorized" } })).toBe(
      DsAnomalyType.DS_INACCESSIBLE
    );
  });

  it("autre erreur → erreur API DS", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { error: "timeout" } })).toBe(
      DsAnomalyType.DS_ERREUR
    );
  });

  it("en_construction local + en_construction DS → jamais déposé (drop-off, pas un bug)", () => {
    const t = classifyDossierAnomaly({ localStatus: DSStatus.EN_CONSTRUCTION, ds: { state: "en_construction" } });
    expect(t).toBe(DsAnomalyType.JAMAIS_DEPOSE);
    expect(DS_ANOMALY_EXPLANATIONS[t].isBug).toBe(false);
  });

  it("en_construction local + DS plus avancé → désync", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_CONSTRUCTION, ds: { state: "en_instruction" } })).toBe(
      DsAnomalyType.DESYNC
    );
  });

  it("en_instruction local + accepté DS → à propager", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "accepte" } })).toBe(
      DsAnomalyType.DESYNC_A_SYNCER
    );
  });

  it("en_instruction local + en_instruction DS → en attente instructeur (normal)", () => {
    const t = classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "en_instruction" } });
    expect(t).toBe(DsAnomalyType.EN_ATTENTE_INSTRUCTEUR);
    expect(DS_ANOMALY_EXPLANATIONS[t].isBug).toBe(false);
  });

  it("en_instruction local + en_construction DS → régression DS", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "en_construction" } })).toBe(
      DsAnomalyType.REGRESSION_DS
    );
  });

  it("refusé/sans_suite DS → désync", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "refuse" } })).toBe(
      DsAnomalyType.DESYNC
    );
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "sans_suite" } })).toBe(
      DsAnomalyType.DESYNC
    );
  });

  it("état DS inconnu → inattendu", () => {
    expect(classifyDossierAnomaly({ localStatus: DSStatus.EN_INSTRUCTION, ds: { state: "wtf" } })).toBe(
      DsAnomalyType.INATTENDU
    );
  });

  it("ds_status null + not_found → introuvable côté DS (drop-off / prefill non complété)", () => {
    expect(classifyDossierAnomaly({ localStatus: null, ds: { error: "not_found" } })).toBe(DsAnomalyType.DS_SUPPRIME);
  });

  it("ds_status null + DS a le dossier → jamais synchronisé (existe côté DS) → resync", () => {
    const t = classifyDossierAnomaly({ localStatus: null, ds: { state: "en_instruction" } });
    expect(t).toBe(DsAnomalyType.JAMAIS_SYNCHRONISE_EXISTE);
    expect(DS_ANOMALY_EXPLANATIONS[t].isBug).toBe(true);
  });

  it("ds_status null sans état ni erreur → inattendu", () => {
    expect(classifyDossierAnomaly({ localStatus: null, ds: {} })).toBe(DsAnomalyType.INATTENDU);
  });

  it("chaque type a une explication métier", () => {
    for (const type of Object.values(DsAnomalyType)) {
      const exp = DS_ANOMALY_EXPLANATIONS[type];
      expect(exp.label.length).toBeGreaterThan(0);
      expect(exp.explanation.length).toBeGreaterThan(0);
    }
  });
});
