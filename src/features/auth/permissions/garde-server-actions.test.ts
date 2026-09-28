import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Garde-fou RBAC-TEST-PLAN §5 : le middleware n'authentifie que les pages, chaque action se garde elle-même.
const SRC = join(__dirname, "../../..");

// Autorisation : rôle, permission, périmètre ou propriété de la ressource.
const GARDES_AUTORISATION = [
  "checkBackofficePermission",
  "checkAgentAccess",
  "checkRoleAccess",
  "checkTabAccess",
  "ensureSuperAdmin",
  "isSuperAdminRole",
  "isAdminRole",
  "hasPermission",
  "verifyProspectTerritoryAccess",
  "verifyAmoOwnership",
  "getScopeFilters",
  "getStatsScopeFilters",
  "calculateAgentScope",
  "evaluerAccesEspaceAgent",
  "refusAccesEspaceAgent",
  "resolveEspaceAgentAccess",
];

// Session : suffit hors backoffice, l'action ne lisant que le parcours du demandeur connecté.
const GARDES_SESSION = ["getSession", "getCurrentUser", "getCurrentAgent"];

// Exceptions légitimes, une justification chacune ; une entrée devenue inutile fait échouer le test.
const ALLOWLIST: Record<string, string> = {
  "features/backoffice/shared/actions/agent.actions.ts › getCurrentAgent":
    "Résout l'agent de la session courante : c'est la brique d'authentification des autres gardes.",
  "features/backoffice/shared/actions/super-admin-access.ts › assertNotSuperAdminReadOnly":
    "Ne renvoie qu'un booléen sur l'agent connecté, aucune donnée.",
  "features/backoffice/shared/actions/super-admin-access.ts › isCurrentUserSuperAdmin":
    "Ne renvoie qu'un booléen sur l'agent connecté, aucune donnée.",
  "features/parcours/amo/actions/amo-validation.actions.ts › getValidationDataByToken":
    "Clé d'accès : token randomUUID de 90 jours envoyé par email à l'AMO, sans compte requis.",
  "features/simulateur/actions/encrypt-rga-data.actions.ts › encryptRGAData":
    "Mode iframe : chiffre la simulation du visiteur lui-même, ne lit rien en base.",
  "features/simulateur/actions/decrypt-rga-data.actions.ts › decryptRGAData":
    "Mode iframe : restitue au visiteur la simulation qu'il a lui-même chiffrée.",
  "features/seo/allers-vers/actions/allers-vers.actions.ts › getAllAllersVersWithRelationsAction":
    "Annuaire public des structures Aller-vers, affiché sur les pages SEO.",
  "features/seo/allers-vers/actions/allers-vers.actions.ts › getAllersVersByDepartementAction":
    "Annuaire public des structures Aller-vers, affiché sur les pages SEO.",
  "features/seo/allers-vers/actions/allers-vers.actions.ts › getAllersVersByEpciAction":
    "Annuaire public des structures Aller-vers, affiché sur les pages SEO.",
  "features/seo/allers-vers/actions/allers-vers.actions.ts › getAllersVersByEpciWithFallbackAction":
    "Annuaire public des structures Aller-vers, affiché sur les pages SEO.",
  "features/seo/catnat/actions/catnat.actions.ts › getCatnatForCommuneAction":
    "Référentiel public des arrêtés de catastrophe naturelle.",
  "features/seo/catnat/actions/catnat.actions.ts › getTotalCatnatForDepartementAction":
    "Référentiel public des arrêtés de catastrophe naturelle.",
  "features/seo/catnat/actions/catnat.actions.ts › getCatnatStatsByTypeAction":
    "Référentiel public des arrêtés de catastrophe naturelle.",
  "features/seo/catnat/actions/catnat.actions.ts › getTotalCatnatForEpciAction":
    "Référentiel public des arrêtés de catastrophe naturelle.",
};

interface Action {
  cle: string;
  corps: string;
  backoffice: boolean;
}

function listerFichiersServer(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return listerFichiersServer(chemin);
    if (!/\.tsx?$/.test(nom) || /\.test\.tsx?$/.test(nom)) return [];
    return /^["']use server["']/.test(readFileSync(chemin, "utf8")) ? [chemin] : [];
  });
}

function extraireActions(chemin: string): Action[] {
  const fichier = relative(SRC, chemin);
  const lignes = readFileSync(chemin, "utf8").split("\n");
  return lignes.flatMap((ligne, i) => {
    const nom = ligne.match(/^export async function (\w+)/)?.[1];
    if (!nom) return [];
    const finSignature = lignes.findIndex((l, j) => j >= i && !l.startsWith(" ") && l.endsWith("{"));
    const fin = lignes.findIndex((l, j) => j > finSignature && l === "}");
    return [
      {
        cle: `${fichier} › ${nom}`,
        corps: lignes.slice(finSignature + 1, fin).join("\n"),
        backoffice: fichier.startsWith("features/backoffice/"),
      },
    ];
  });
}

const contient = (corps: string, gardes: string[]) => gardes.some((g) => new RegExp(`\\b${g}\\b`).test(corps));

function estGardee({ corps, backoffice }: Action): boolean {
  if (contient(corps, GARDES_AUTORISATION)) return true;
  return !backoffice && contient(corps, GARDES_SESSION);
}

describe("Server actions — chaque endpoint porte une garde reconnue", () => {
  const actions = listerFichiersServer(SRC).flatMap(extraireActions);

  it("recense les actions de tout src/", () => {
    expect(actions.length).toBeGreaterThan(100);
  });

  // Le backoffice exige une autorisation : une session seule laisse passer n'importe quel agent, voire un demandeur.
  it.each(actions.filter((a) => !(a.cle in ALLOWLIST)))("$cle", (action) => {
    expect(estGardee(action), "aucune garde reconnue : ajoutez-en une, ou justifiez l'exception dans l'ALLOWLIST").toBe(
      true
    );
  });

  it("l'allowlist ne contient que des actions existantes et non gardées", () => {
    const parCle = new Map(actions.map((a) => [a.cle, a]));
    const perimees = Object.keys(ALLOWLIST).filter((cle) => !parCle.has(cle) || estGardee(parCle.get(cle)!));
    expect(perimees).toEqual([]);
  });
});
