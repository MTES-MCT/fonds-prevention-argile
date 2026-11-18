import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
// Le moteur que Next applique aux `source` de next.config : un autre donnerait un test qui passe à tort.
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import nextConfig from "../../../next.config";
import { PAGES_EMBARQUEES, construireReglesEnTetes, enTetesAttendus, enTetesInterdits } from "./en-tetes-http";

const RACINE_APP = join(process.cwd(), "src", "app");
const GROUPE_EMBARQUE = "(embed)";

interface RouteApp {
  chemin: string;
  embarquee: boolean;
}

function listerFichiersDeRoute(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const complet = join(dossier, entree.name);
    if (entree.isDirectory()) return listerFichiersDeRoute(complet);
    return entree.name === "page.tsx" || entree.name === "route.ts" ? [complet] : [];
  });
}

function versRoute(fichier: string): RouteApp {
  const segments = relative(RACINE_APP, fichier).split(sep).slice(0, -1);
  const chemin = segments
    .filter((segment) => !segment.startsWith("("))
    .map((segment) => (segment.startsWith("[...") ? "a/b" : segment.startsWith("[") ? "valeur" : segment))
    .join("/");
  return { chemin: `/${chemin}`, embarquee: segments.includes(GROUPE_EMBARQUE) };
}

/** Applique les règles comme Next : toutes celles qui correspondent, la dernière l'emporte par clé. */
function enTetesServis(chemin: string): Record<string, string> {
  const servis: Record<string, string> = {};
  for (const regle of construireReglesEnTetes()) {
    if (!getPathMatch(regle.source, { strict: true })(chemin)) continue;
    for (const { key, value } of regle.headers) servis[key.toLowerCase()] = value;
  }
  return servis;
}

const ROUTES = listerFichiersDeRoute(RACINE_APP).map(versRoute);

describe("en-têtes HTTP de sécurité", () => {
  it("retrouve les routes de l'application", () => {
    expect(ROUTES.length).toBeGreaterThan(50);
    expect(ROUTES.some((route) => route.embarquee)).toBe(true);
  });

  it.each(ROUTES.map((route) => [route.chemin, route] as const))("sert le socle commun sur %s", (chemin) => {
    expect(enTetesServis(chemin)).toMatchObject({
      "strict-transport-security": "max-age=63072000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    });
  });

  it.each(ROUTES.filter((route) => !route.embarquee).map((route) => [route.chemin] as const))(
    "interdit d'encadrer %s depuis un autre site",
    (chemin) => {
      const servis = enTetesServis(chemin);
      expect(servis["x-frame-options"]).toBe("SAMEORIGIN");
      expect(servis["content-security-policy"]).toBe("frame-ancestors 'self'");
    }
  );

  it.each(ROUTES.filter((route) => route.embarquee).map((route) => [route.chemin] as const))(
    "laisse un site partenaire encadrer %s",
    (chemin) => {
      const servis = enTetesServis(chemin);
      expect(servis["x-frame-options"]).toBeUndefined();
      expect(servis["content-security-policy"]).toBeUndefined();
    }
  );

  it("déclare chaque page du groupe (embed), et aucune autre", () => {
    const pagesDuGroupe = ROUTES.filter((route) => route.embarquee).map((route) => route.chemin);
    expect([...PAGES_EMBARQUEES].sort()).toEqual([...new Set(pagesDuGroupe)].sort());
  });

  it.each([
    ["/", false],
    ["/_next/static/chunks/main.js", false],
    ["/maplibre-gl-worker.mjs", false],
    ["/embed", false],
    ["/embed/simulateur", false],
    ["/embed-simulateur-bis", false],
    ["/embedded", false],
    ["/embed-simulateur", true],
    ["/embed-simulateur/etape", true],
    ["/embed-vulnerabilite-rga", true],
  ])("%s : encadrable par un tiers = %s", (chemin, encadrable) => {
    const servis = enTetesServis(chemin);
    expect(servis["x-content-type-options"]).toBe("nosniff");
    expect(servis["x-frame-options"]).toBe(encadrable ? undefined : "SAMEORIGIN");
    expect(servis["content-security-policy"]).toBe(encadrable ? undefined : "frame-ancestors 'self'");
  });

  it.each(ROUTES.map((route) => [route.chemin] as const))(
    "sert sur %s exactement ce que contrôle le script d'audit",
    (chemin) => {
      const servis = enTetesServis(chemin);
      const attendus = Object.fromEntries(enTetesAttendus(chemin).map(({ key, value }) => [key.toLowerCase(), value]));
      expect(servis).toEqual(attendus);
      for (const interdit of enTetesInterdits(chemin)) expect(servis[interdit.toLowerCase()]).toBeUndefined();
    }
  );

  it("branche ces règles dans next.config et masque X-Powered-By", async () => {
    expect(await nextConfig.headers?.()).toEqual(construireReglesEnTetes());
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
