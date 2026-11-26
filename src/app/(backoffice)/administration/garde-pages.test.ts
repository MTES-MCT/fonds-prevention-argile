import { describe, expect, it } from "vitest";
import { relative } from "node:path";
import { fonctionsExportees, listerFichiers } from "@/shared/testing/server-exports";

const RACINE = __dirname;

type Niveau =
  /** Tout agent connecté : statistiques nationales agrégées (ADR-0017). */
  | "agent"
  /** Administrateur et super-administrateur. */
  | "admin"
  | "super-admin"
  /** Ne rend rien : renvoie vers une page qui porte sa propre garde. */
  | "redirection";

// Niveau d'accès de chaque page, aligné sur RBAC-ROLES § 3. Une page absente d'ici fait échouer le test.
const NIVEAUX: Record<string, Niveau> = {
  "page.tsx": "agent",
  "acquisition/page.tsx": "agent",
  "activite/page.tsx": "agent",
  "demandeurs/page.tsx": "agent",
  "satisfaction/page.tsx": "agent",
  "vulnerabilite/page.tsx": "agent",
  "commentaires/page.tsx": "admin",
  "structures/page.tsx": "admin",
  "structures/[id]/page.tsx": "admin",
  "agents/page.tsx": "super-admin",
  "diagnostics/page.tsx": "super-admin",
  "diagnostics/[parcoursId]/page.tsx": "super-admin",
  "synchronisations/page.tsx": "super-admin",
  "synchronisations/[id]/page.tsx": "super-admin",
  "allers-vers/page.tsx": "redirection",
  "amo/page.tsx": "redirection",
  "experts/page.tsx": "redirection",
};

const TEST_DE_ROLE: Record<Exclude<Niveau, "agent" | "redirection">, RegExp> = {
  admin: /!isAdminRole\(access\.user\.role\)/,
  "super-admin": /!isSuperAdminRole\(access\.user\.role\)/,
};

const pages = listerFichiers(RACINE, (chemin) => chemin.endsWith("/page.tsx")).flatMap((chemin) =>
  fonctionsExportees(chemin)
    .filter((fn) => fn.nom === "default")
    .map((fn) => ({ fichier: relative(RACINE, chemin), corps: fn.corps, instructions: fn.instructions }))
);

const deNiveau = (...niveaux: Niveau[]) => pages.filter((page) => niveaux.includes(NIVEAUX[page.fichier]));

// Le layout ne protège pas ses pages (RSC rendus en parallèle) : chacune porte sa garde, ou ne rend rien.
describe("Administration : chaque page porte la garde de son niveau d'accès", () => {
  it("recense les pages de l'administration", () => {
    expect(pages.length).toBeGreaterThanOrEqual(16);
  });

  it.each(pages)("$fichier a un niveau d'accès déclaré", ({ fichier }) => {
    expect(NIVEAUX[fichier], "page non déclarée : ajoutez son niveau d'accès dans NIVEAUX").toBeDefined();
  });

  it("aucun niveau n'est déclaré pour une page disparue", () => {
    const existantes = new Set(pages.map((page) => page.fichier));
    expect(Object.keys(NIVEAUX).filter((fichier) => !existantes.has(fichier))).toEqual([]);
  });

  it.each(deNiveau("agent", "admin", "super-admin"))(
    "$fichier vérifie l'accès agent et renvoie un visiteur non connecté vers la connexion",
    ({ corps }) => {
      expect(corps).toMatch(/const access = await checkAgentAccess\(\);/);
      expect(corps).toMatch(/access\.errorCode === "NOT_AUTHENTICATED"\) \{\s*redirect\(ROUTES\.connexion\.agent\);/);
      expect(corps).toMatch(/if \(!access\.hasAccess\b/);
    }
  );

  it.each(deNiveau("admin", "super-admin"))(
    "$fichier refuse un agent qui n'a pas le rôle requis",
    ({ fichier, corps }) => {
      const niveau = NIVEAUX[fichier] as "admin" | "super-admin";
      expect(corps).toMatch(TEST_DE_ROLE[niveau]);
    }
  );

  // Une page « agent » qui teste un rôle a changé de niveau : la déclaration doit suivre.
  it.each(deNiveau("agent"))("$fichier ne restreint à aucun rôle, comme déclaré", ({ corps }) => {
    expect(corps).not.toMatch(/isAdminRole|isSuperAdminRole/);
  });

  it.each(deNiveau("redirection"))("$fichier ne fait que rediriger vers une page gardée", ({ instructions }) => {
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatch(/^redirect\("\/administration\/structures\?habilitation=\w+"\);$/);
  });
});
