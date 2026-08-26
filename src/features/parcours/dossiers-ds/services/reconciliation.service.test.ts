import { describe, it, expect, vi } from "vitest";
import { decideRattachement, observationsAPersister, type ContexteRattachement } from "./reconciliation.service";
import { lireAnnotationFpa } from "../utils/annotation-fpa.utils";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("@/shared/database/client", () => ({ db: {} }));
vi.mock("@/shared/database/repositories", () => ({
  dossiersDsTentativesRepo: { findByDsNumber: vi.fn(), record: vi.fn() },
  dsObservationsRepo: { upsertMany: vi.fn() },
}));

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

  it("refuse de trancher quand deux annotations pointent des parcours différents", () => {
    expect(decideRattachement({ ...candidat, annotationAmbigue: true }, ctx())).toBe("annotation_ambigue");
  });

  it("refuse de trancher quand l'annotation a été modifiée à la main", () => {
    expect(decideRattachement({ ...candidat, annotationModifiee: true }, ctx())).toBe("annotation_modifiee");
  });

  it("classe à part une annotation pointant un parcours inconnu", () => {
    expect(decideRattachement(candidat, ctx({ parcoursExiste: false }))).toBe("parcours_inconnu");
  });
});

const DESCRIPTEUR = "Q2hhbXAtNjY4NzQ1Mg==";
const lien = (id: string) => `https://fonds-prevention-argile.beta.gouv.fr/espace-agent/dossiers/${id}`;

describe("lireAnnotationFpa", () => {
  it("lit le parcoursId de l'annotation identifiée par son descripteur", () => {
    const annotations = [
      { champDescriptorId: "autre", stringValue: lien("11111111-1111-1111-1111-111111111111") },
      { champDescriptorId: DESCRIPTEUR, stringValue: lien(PARCOURS) },
    ];
    // Le descripteur écarte l'annotation parasite : on ne lit QUE la bonne.
    expect(lireAnnotationFpa(annotations, DESCRIPTEUR)).toEqual({
      parcoursId: PARCOURS,
      ambigue: false,
      modifiee: false,
    });
  });

  it("signale une valeur préremplie modifiée à la main", () => {
    const annotations = [{ champDescriptorId: DESCRIPTEUR, stringValue: lien(PARCOURS), prefilledValueModified: true }];
    expect(lireAnnotationFpa(annotations, DESCRIPTEUR).modifiee).toBe(true);
  });

  it("signale l'ambiguïté quand deux annotations divergent", () => {
    const annotations = [
      { champDescriptorId: DESCRIPTEUR, stringValue: lien(PARCOURS) },
      { champDescriptorId: DESCRIPTEUR, stringValue: lien("11111111-1111-1111-1111-111111111111") },
    ];
    const lecture = lireAnnotationFpa(annotations, DESCRIPTEUR);
    expect(lecture.ambigue).toBe(true);
    expect(lecture.parcoursId).toBeNull();
  });

  it("retombe sur la reconnaissance du chemin si le descripteur est inconnu", () => {
    const annotations = [{ champDescriptorId: "peu-importe", stringValue: lien(PARCOURS) }];
    expect(lireAnnotationFpa(annotations, null).parcoursId).toBe(PARCOURS);
  });

  it("renvoie null sans annotation, ou sans lien FPA dedans", () => {
    expect(lireAnnotationFpa(undefined, DESCRIPTEUR).parcoursId).toBeNull();
    expect(lireAnnotationFpa([], DESCRIPTEUR).parcoursId).toBeNull();
    expect(
      lireAnnotationFpa([{ champDescriptorId: DESCRIPTEUR, stringValue: "https://exemple.fr/x" }], DESCRIPTEUR)
        .parcoursId
    ).toBeNull();
  });

  it("ignore une valeur qui n'est pas un uuid valide", () => {
    const annotations = [{ champDescriptorId: DESCRIPTEUR, stringValue: "/espace-agent/dossiers/pas-un-uuid" }];
    expect(lireAnnotationFpa(annotations, DESCRIPTEUR).parcoursId).toBeNull();
  });
});

// La file du back-office ne doit contenir que ce qui demande une action humaine.
describe("observationsAPersister", () => {
  const ligne = (verdict: string) => ({
    dsNumber: "32052358",
    step: Step.ELIGIBILITE,
    state: "accepte",
    parcoursId: PARCOURS,
    verdict,
    pointeurAvant: null,
  });

  it("écarte les dossiers déjà à jour", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(observationsAPersister([ligne("deja_a_jour")] as any, false)).toHaveLength(0);
  });

  it("garde les conflits et les dossiers sans annotation", () => {
    const lignes = [ligne("conflit_plusieurs_deposes"), ligne("sans_annotation"), ligne("annotation_modifiee")];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(observationsAPersister(lignes as any, false)).toHaveLength(3);
  });

  it("garde un rattachement proposé en observation, mais pas une fois appliqué", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(observationsAPersister([ligne("rattachement")] as any, false)).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(observationsAPersister([ligne("rattachement")] as any, true)).toHaveLength(0);
  });
});
