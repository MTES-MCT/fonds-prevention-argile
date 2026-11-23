import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { fonctionsExportees, listerFichiers } from "@/shared/testing/server-exports";
import { REGISTRE_ROUTES, type ProtectionRoute } from "./registre-routes";

const RACINE = __dirname;
const METHODES_HTTP = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

// Par protection, les appels qui la réalisent. Reconnaît un nom, pas sa justesse : cf. RBAC-TEST-PLAN § 5.
const GARDES: Record<Exclude<ProtectionRoute, "publique">, string[]> = {
  secret: ["verifyBearerToken"],
  session: ["getSession", "getCurrentUser", "isAuthenticated", "lireSessionSignee"],
  oidc: ["handleFranceConnectCallback", "handleProConnectCallback"],
  jeton: ["findByClaimToken"],
};

interface Handler {
  cle: string;
  fichier: string;
  corps: string;
  instructions: string[];
}

const contient = (texte: string, noms: string[]) => noms.some((nom) => new RegExp(`\\b${nom}\\b`).test(texte));

const handlers: Handler[] = listerFichiers(RACINE, (chemin) => chemin.endsWith("/route.ts")).flatMap((chemin) =>
  fonctionsExportees(chemin)
    // Une réexportation n'a pas de corps lisible : elle reste dans la liste, et échoue faute de déclaration.
    .filter((fn) => METHODES_HTTP.has(fn.nom) || fn.nom.endsWith("(réexportée)"))
    .map((fn) => ({
      cle: `${relative(RACINE, chemin).replace(/\/route\.ts$/, "")} › ${fn.nom}`,
      fichier: chemin,
      corps: fn.corps,
      instructions: fn.instructions,
    }))
);

// Un route handler est un endpoint HTTP joignable par n'importe qui : le middleware ne garde que les pages.
describe("Routes d'API : chaque méthode exportée est déclarée et protégée comme annoncé", () => {
  it("recense les route handlers de l'application", () => {
    expect(handlers.length).toBeGreaterThanOrEqual(15);
  });

  it.each(handlers)("$cle est déclarée dans le registre", ({ cle }) => {
    expect(
      REGISTRE_ROUTES[cle],
      "route non déclarée : ajoutez-la à src/app/registre-routes.ts avec sa protection et sa justification"
    ).toBeDefined();
  });

  it("le registre ne déclare aucune route disparue", () => {
    const existantes = new Set(handlers.map((handler) => handler.cle));
    expect(Object.keys(REGISTRE_ROUTES).filter((cle) => !existantes.has(cle))).toEqual([]);
  });

  it.each(Object.entries(REGISTRE_ROUTES))("%s justifie sa protection", (_cle, { justification }) => {
    expect(justification.length).toBeGreaterThan(30);
  });

  const gardes = handlers.filter(({ cle }) => REGISTRE_ROUTES[cle] && REGISTRE_ROUTES[cle].protection !== "publique");

  it.each(gardes)("$cle appelle la garde de sa protection", ({ cle, corps }) => {
    const protection = REGISTRE_ROUTES[cle].protection as Exclude<ProtectionRoute, "publique">;
    expect(contient(corps, GARDES[protection]), `aucun appel reconnu pour « ${protection} »`).toBe(true);
  });

  // Un secret vérifié après une lecture ou un traitement ne protège plus ce traitement.
  it.each(gardes.filter(({ cle }) => REGISTRE_ROUTES[cle].protection === "secret"))(
    "$cle vérifie le secret avant toute autre instruction",
    ({ instructions, fichier }) => {
      expect(instructions[0]).toMatch(/^if \(!verifyBearerToken\(request\)\)/);
      expect(readFileSync(fichier, "utf8")).toMatch(/\bbearerCorrespond\(/);
    }
  );

  const limitees = handlers.filter(({ cle }) => typeof REGISTRE_ROUTES[cle]?.debit === "string");
  const nonLimitees = handlers.filter(({ cle }) => typeof REGISTRE_ROUTES[cle]?.debit === "object");

  // En tête, avant toute lecture : un appel refusé ne doit rien coûter (ADR-0054).
  it.each(limitees)("$cle plafonne le débit avant toute autre instruction", ({ cle, instructions }) => {
    expect(instructions[0]).toBe(`const refus = limiterDebit(request, "${REGISTRE_ROUTES[cle].debit}");`);
    expect(instructions[1]).toBe("if (refus) return refus;");
  });

  it.each(nonLimitees)("$cle n'a pas de plafond et dit pourquoi", ({ cle, corps }) => {
    const { aucun } = REGISTRE_ROUTES[cle].debit as { aucun: string };
    expect(aucun.length).toBeGreaterThan(30);
    expect(corps).not.toMatch(/\blimiterDebit\(/);
  });

  it("une route publique est plafonnée, sauf raison écrite", () => {
    const publiquesSansPlafond = handlers
      .filter(({ cle }) => REGISTRE_ROUTES[cle]?.protection === "publique")
      .filter(({ cle }) => typeof REGISTRE_ROUTES[cle].debit !== "string")
      .map(({ cle }) => cle);
    expect(publiquesSansPlafond.sort()).toEqual(["(main)/oidc-callback › GET", "api/health › GET"]);
  });

  it("une route publique n'appelle aucune garde : elle changerait alors de protection", () => {
    const toutes = Object.values(GARDES).flat();
    const incoherentes = handlers
      .filter(({ cle }) => REGISTRE_ROUTES[cle]?.protection === "publique")
      .filter(({ corps }) => contient(corps, toutes))
      .map(({ cle }) => cle);
    expect(incoherentes).toEqual([]);
  });
});
