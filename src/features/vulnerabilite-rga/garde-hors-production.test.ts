import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Le simulateur de vulnérabilité n'est pas en production (ADR-0030). Tout point d'entrée — lien, bouton, carte,
// page, action — doit passer par `isVulnerabiliteRgaActive()`. Ce test échoue quand un fichier en pose un
// sans la garde, pour qu'un oubli ne se découvre pas en production.

const GARDE = "isVulnerabiliteRgaActive";

// Ce qui trahit un lien vers le simulateur ou ses pages : l'URL, les routes, le contenu de la home qui le promeut.
const MARQUEURS = [
  "VULNERABILITE_RGA_URL",
  "particulier.maVulnerabilite",
  "espaceAgent.testVulnerabilite",
  "cta_vulnerabilite_url",
  "vulnerabilite_section",
];

// Ces fichiers nomment un marqueur sans porter la garde, et c'est sans risque.
const EXCEPTIONS: Record<string, string> = {
  "src/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-routes.ts": "définition de l'URL, aucun rendu",
  "src/features/vulnerabilite-rga/components/results/LancerTestVulnerabiliteButton.tsx":
    "bouton feuille, monté seulement par VulnerabiliteMaListe et la page du compte, qui portent la garde",
  "src/shared/domain/partners/renvoi-iframe.ts": "définition de l'URL de l'iframe, aucun rendu",
  "src/app/(embed)/embed-simulateur/page.tsx": "ne fait que transmettre l'URL à ResultNonEligible, qui porte la garde",
};

// Les parents se contentent de monter ces composants et actions : c'est à eux de porter la garde.
const PORTEURS_DE_GARDE = [
  "src/app/(main)/(home)/components/VulnerabiliteSection.tsx",
  "src/app/(main)/(home)/components/LogementConcerneRgaSection.tsx",
  "src/features/simulateur/components/results/ResultNonEligible.tsx",
  "src/features/parcours/core/components/common/VulnerabiliteMaListe.tsx",
  "src/features/parcours/core/actions/ma-vulnerabilite.actions.ts",
  "src/app/(backoffice)/espace-agent/shared/components/VulnerabiliteDossier.tsx",
  "src/features/backoffice/espace-agent/shared/actions/test-vulnerabilite-agent.actions.ts",
  "src/features/vulnerabilite-rga/actions/enregistrer-resultat.actions.ts",
];

function fichiers(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(entree.name) ? [chemin] : [];
  });
}

const SOURCES = fichiers("src").filter((chemin) => !/\.test\.(ts|tsx)$/.test(chemin));
const contenu = (chemin: string) => readFileSync(chemin, "utf8");

describe("simulateur de vulnérabilité : rien en production", () => {
  it("garde chaque fichier qui mène au simulateur", () => {
    const sansGarde = SOURCES.filter((chemin) => {
      const texte = contenu(chemin);
      return MARQUEURS.some((marqueur) => texte.includes(marqueur)) && !texte.includes(GARDE);
    }).filter((chemin) => !(chemin in EXCEPTIONS));

    expect(sansGarde).toEqual([]);
  });

  it("garde les composants et actions que leurs parents se contentent de monter", () => {
    const sansGarde = PORTEURS_DE_GARDE.filter((chemin) => !contenu(chemin).includes(GARDE));

    expect(sansGarde).toEqual([]);
  });

  it("répond 404 sur chaque page dont la route porte le simulateur", () => {
    const pages = SOURCES.filter((chemin) => /page\.tsx$/.test(chemin) && /vulnerabilite/.test(chemin));
    const sansGarde = pages.filter((chemin) => !contenu(chemin).includes(`if (!${GARDE}()) notFound()`));

    // Simulateur public, iframe, onglet admin, page du compte, test fait par l'agent.
    expect(pages).toHaveLength(5);
    expect(sansGarde).toEqual([]);
  });

  it("n'a pas d'exception devenue inutile", () => {
    const inutiles = Object.keys(EXCEPTIONS).filter((chemin) => {
      const texte = contenu(chemin);
      return texte.includes(GARDE) || !MARQUEURS.some((marqueur) => texte.includes(marqueur));
    });

    expect(inutiles).toEqual([]);
  });
});
