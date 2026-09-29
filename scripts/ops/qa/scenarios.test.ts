import { describe, expect, it } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types/dossiers-territoire.types";
import { SCENARIOS, grouperEpcisMultiAmo, type ScenarioContext } from "./scenarios";

describe("grouperEpcisMultiAmo", () => {
  it("ne garde que les EPCI couverts par au moins deux AMO distinctes", () => {
    const epcis = grouperEpcisMultiAmo([
      { codeEpci: "200068500", nomAmo: "Habitat Cambrésis" },
      { codeEpci: "243200458", nomAmo: "Anti-Fissure Express" },
      { codeEpci: "200068500", nomAmo: "Argiles du Nord" },
    ]);

    expect([...epcis]).toEqual([["200068500", ["Argiles du Nord", "Habitat Cambrésis"]]]);
  });

  it("ne compte pas deux fois la même AMO", () => {
    const epcis = grouperEpcisMultiAmo([
      { codeEpci: "200068500", nomAmo: "Habitat Cambrésis" },
      { codeEpci: "200068500", nomAmo: "Habitat Cambrésis" },
    ]);

    expect(epcis.size).toBe(0);
  });
});

describe("scénario prospect-epci-multi-amo", () => {
  const scenario = SCENARIOS.find((s) => s.id === "prospect-epci-multi-amo")!;
  const ctx: ScenarioContext = { parcoursAvecActionSysteme: new Set(), epcisMultiAmo: new Set(["200068500"]) };

  function dossier(surcharge: Partial<DossierItem>): DossierItem {
    return {
      validation: null,
      archivedAt: null,
      canActAsResponsable: true,
      logement: { commune: "59122", codeDepartement: "59", codeEpci: "200068500" },
      ...surcharge,
    } as DossierItem;
  }

  it("retient un prospect à qualifier dans un EPCI à plusieurs AMO", () => {
    expect(scenario.matches(dossier({}), ctx)).toBe(true);
  });

  it("écarte un EPCI à une seule AMO, un EPCI inconnu et un dossier déjà en lien avec une AMO", () => {
    expect(
      scenario.matches(dossier({ logement: { commune: "32013", codeDepartement: "32", codeEpci: "243200458" } }), ctx)
    ).toBe(false);
    expect(scenario.matches(dossier({ logement: { commune: null, codeDepartement: null, codeEpci: null } }), ctx)).toBe(
      false
    );
    expect(
      scenario.matches(
        dossier({
          validation: {
            id: "v",
            statut: StatutValidationAmo.EN_ATTENTE,
            entrepriseAmoId: "a",
            choisieAt: new Date(),
            valideeAt: null,
          },
        }),
        ctx
      )
    ).toBe(false);
  });
});
