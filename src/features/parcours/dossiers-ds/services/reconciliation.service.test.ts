import { describe, it, expect, vi } from "vitest";
import { decideRattachement, type ContexteRattachement } from "./reconciliation.service";
import { extraireParcoursIdDepuisAnnotations } from "../utils/annotation-fpa.utils";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("@/shared/database/client", () => ({ db: {} }));

// Le singleton du client GraphQL lit l'env DN à la construction : inutile ici, la règle testée
// est pure.
vi.mock("../adapters/graphql/client", () => ({ graphqlClient: { getDemarcheDossiers: vi.fn() } }));

const PARCOURS = "c3ffd5bb-7b8b-4d0d-a5b6-1ff91cabc975";

const candidat = { dsNumber: "32052358", step: Step.ELIGIBILITE, state: "accepte", parcoursId: PARCOURS };

function ctx(overrides: Partial<ContexteRattachement> = {}): ContexteRattachement {
  return {
    parcoursExiste: true,
    pointeurDsNumber: null,
    pointeurConfirme: false,
    parcoursIdDuNumero: null,
    plusieursCandidats: false,
    ...overrides,
  };
}

// Cf. ADR-0027 : le rattachement se fait au dépôt, et un conflit ne se tranche jamais tout seul.
describe("decideRattachement", () => {
  it("rattache un dossier déposé quand le parcours n'a aucun pointeur", () => {
    expect(decideRattachement(candidat, ctx())).toBe("rattachement");
  });

  it("rattache quand le pointeur courant n'est qu'une tentative jamais observée", () => {
    expect(decideRattachement(candidat, ctx({ pointeurDsNumber: "32872663" }))).toBe("rattachement");
  });

  it("ne fait rien si le pointeur vise déjà ce numéro", () => {
    expect(decideRattachement(candidat, ctx({ pointeurDsNumber: "32052358" }))).toBe("deja_a_jour");
  });

  it("refuse de voler un numéro déjà rattaché à un autre parcours", () => {
    expect(decideRattachement(candidat, ctx({ parcoursIdDuNumero: "11111111-1111-1111-1111-111111111111" }))).toBe(
      "conflit_autre_parcours"
    );
  });

  it("signale un conflit quand le parcours a déjà un dossier confirmé sous un autre numéro", () => {
    expect(decideRattachement(candidat, ctx({ pointeurDsNumber: "32872663", pointeurConfirme: true }))).toBe(
      "conflit_dossier_confirme"
    );
  });

  it("signale un conflit quand plusieurs dossiers déposés visent le même parcours", () => {
    expect(decideRattachement(candidat, ctx({ plusieursCandidats: true }))).toBe("conflit_plusieurs_deposes");
  });

  it("classe à part un dossier déposé sans annotation FPA", () => {
    expect(decideRattachement({ ...candidat, parcoursId: null }, ctx())).toBe("sans_annotation");
  });

  it("classe à part une annotation pointant un parcours inconnu", () => {
    expect(decideRattachement(candidat, ctx({ parcoursExiste: false }))).toBe("parcours_inconnu");
  });
});

describe("extraireParcoursIdDepuisAnnotations", () => {
  it("extrait le parcoursId de l'URL du lien FPA", () => {
    const annotations = [
      { stringValue: "Autre annotation" },
      { stringValue: `https://fonds-prevention-argile.beta.gouv.fr/espace-agent/dossiers/${PARCOURS}` },
    ];
    expect(extraireParcoursIdDepuisAnnotations(annotations)).toBe(PARCOURS);
  });

  it("renvoie null sans annotation, ou sans lien FPA dedans", () => {
    expect(extraireParcoursIdDepuisAnnotations(undefined)).toBeNull();
    expect(extraireParcoursIdDepuisAnnotations([])).toBeNull();
    expect(extraireParcoursIdDepuisAnnotations([{ stringValue: "https://exemple.fr/autre-chose" }])).toBeNull();
  });

  it("ignore une valeur qui n'est pas un uuid valide", () => {
    expect(extraireParcoursIdDepuisAnnotations([{ stringValue: "/espace-agent/dossiers/pas-un-uuid" }])).toBeNull();
  });
});
