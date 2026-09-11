import { describe, it, expect, vi } from "vitest";
import { buildContactAttributes } from "./contact-mapping";
import { BREVO_ATTRS } from "./brevo-contacts.config";
import type { User } from "@/shared/database/schema/users";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";

vi.mock("@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service", () => ({
  resolveAdminUrl: vi.fn().mockResolvedValue("https://fonds-prevention-argile.beta.gouv.fr/espace-agent/dossiers/v1"),
}));

const user = (over: Partial<User> = {}): User =>
  ({
    id: "u1",
    prenom: "Jean",
    nom: "Dupont",
    email: "jean@gmail.com",
    emailContact: null,
    sourceAcquisition: null,
    ...over,
  }) as User;

const parcours = (over: Partial<ParcoursPrevention> = {}): ParcoursPrevention =>
  ({
    id: "p1",
    userId: "u1",
    currentStep: "choix_amo",
    currentStatus: "todo",
    situationParticulier: "prospect",
    createdAt: new Date("2026-07-21T10:00:00Z"),
    rgaSimulationData: { logement: { code_departement: "36", commune: "36044" } },
    rgaSimulationDataAgent: null,
    ...over,
  }) as unknown as ParcoursPrevention;

describe("buildContactAttributes — ELIGIBILITE", () => {
  const SIM_ELIGIBLE = {
    logement: {
      code_departement: "47",
      commune: "47001",
      type: "maison",
      zone_dexposition: "fort",
      annee_de_construction: (new Date().getFullYear() - 20).toString(),
      niveaux: 2,
      mitoyen: false,
      proprietaire_occupant: true,
    },
    rga: { sinistres: "saine", indemnise_indemnise_rga: false, demande_catnat_en_cours: false, assure: true },
    menage: { personnes: 2, revenu_rga: 25000 },
  };

  it("pose `non_eligible` sur une simulation non éligible (mail de bienvenue à dévier)", async () => {
    const p = parcours({ rgaSimulationData: { logement: { type: "appartement", commune: "36044" } } } as never);
    const attrs = await buildContactAttributes(user(), p, "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.ELIGIBILITE]).toBe("non_eligible");
  });

  it("repasse à `eligible` quand la simulation est corrigée", async () => {
    const attrs = await buildContactAttributes(
      user(),
      parcours({ rgaSimulationData: SIM_ELIGIBLE } as never),
      "j@x.fr"
    );
    expect(attrs[BREVO_ATTRS.ELIGIBILITE]).toBe("eligible");
  });

  it("reste absent tant qu'aucun critère n'est tranché", async () => {
    const attrs = await buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.ELIGIBILITE]).toBeUndefined();
  });
});

describe("buildContactAttributes", () => {
  it("mappe les champs de base", async () => {
    const attrs = await buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs).toMatchObject({
      [BREVO_ATTRS.PRENOM]: "Jean",
      [BREVO_ATTRS.NOM]: "Dupont",
      [BREVO_ATTRS.DATE_INSCRIPTION]: "2026-07-21",
      [BREVO_ATTRS.SITUATION]: "prospect",
      [BREVO_ATTRS.ETAPE]: "choix_amo",
      [BREVO_ATTRS.STATUT]: "todo",
      [BREVO_ATTRS.DEPARTEMENT]: "36",
      [BREVO_ATTRS.INSEE]: "36044",
      [BREVO_ATTRS.PARCOURS_ID]: "p1",
      [BREVO_ATTRS.ADMIN_URL]: "https://fonds-prevention-argile.beta.gouv.fr/espace-agent/dossiers/v1",
    });
  });

  it("n'inclut pas A_AMO dans la base (posé par les hooks, sinon un dn_update l'écraserait)", async () => {
    const attrs = await buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.A_AMO]).toBeUndefined();
  });

  it("priorise les données agent (getEffectiveRGAData) pour l'INSEE/département", async () => {
    const attrs = await buildContactAttributes(
      user(),
      parcours({
        rgaSimulationData: { logement: { commune: "36044" } } as never,
        rgaSimulationDataAgent: { logement: { commune: "75056" } } as never,
      }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.INSEE]).toBe("75056");
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBe("75");
  });

  it("renormalise un INSEE stocké en nombre (récupère les zéros initiaux) et en dérive le département", async () => {
    const attrs = await buildContactAttributes(
      user(),
      parcours({ rgaSimulationData: { logement: { commune: 1234 } } as never }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.INSEE]).toBe("01234");
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBe("01");
  });

  it("EMAIL_REEL présent quand l'email poussé diffère du vrai (staging sous-adressé)", async () => {
    const attrs = await buildContactAttributes(user(), parcours(), "marie+uu1@beta.gouv.fr");
    expect(attrs[BREVO_ATTRS.EMAIL_REEL]).toBe("jean@gmail.com");
  });

  it("EMAIL_REEL absent en production (email poussé == vrai)", async () => {
    const attrs = await buildContactAttributes(user(), parcours(), "jean@gmail.com");
    expect(attrs[BREVO_ATTRS.EMAIL_REEL]).toBeUndefined();
  });

  it("omet les champs vides plutôt que d'écraser Brevo", async () => {
    const attrs = await buildContactAttributes(
      user({ prenom: null }),
      parcours({ rgaSimulationData: null }),
      "jean@gmail.com"
    );
    expect(attrs[BREVO_ATTRS.PRENOM]).toBeUndefined();
    expect(attrs[BREVO_ATTRS.DEPARTEMENT]).toBeUndefined();
  });
});
