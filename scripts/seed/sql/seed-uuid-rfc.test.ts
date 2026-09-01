import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Zod 4 valide les uuid selon la RFC 4122 (version dans [1-8], variante dans [89ab]).
// Un id de seed non conforme fait echouer les server actions qui le valident, bien
// avant tout traitement : le flux devient intestable hors production.
const uuidSchema = z.string().uuid();

const UUID_COMPLET = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
// Prefixe partiel des patterns LIKE et des commentaires (`...-1111-1111-1111-%`).
const UUID_PREFIXE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-(?![0-9a-f]{12})/g;

function fichiersSql(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) return fichiersSql(chemin);
    return chemin.endsWith(".sql") || chemin.endsWith(".md") ? [chemin] : [];
  });
}

const fichiers = fichiersSql(__dirname);

describe("uuid des jeux de donnees seedes", () => {
  it("trouve les fichiers de seed", () => {
    expect(fichiers.length).toBeGreaterThan(0);
  });

  it.each(fichiers)("%s ne contient que des uuid conformes RFC 4122", (fichier) => {
    const contenu = readFileSync(fichier, "utf8");

    const nonConformes = [...new Set(contenu.match(UUID_COMPLET) ?? [])].filter(
      (uuid) => !uuidSchema.safeParse(uuid).success
    );
    expect(nonConformes).toEqual([]);
  });

  // Les patterns LIKE de nettoyage et de comptage portent sur le prefixe de l'id :
  // ils doivent suivre la meme normalisation, sinon le seed n'est plus idempotent.
  it.each(fichiers)("%s aligne ses prefixes LIKE sur la meme normalisation", (fichier) => {
    const contenu = readFileSync(fichier, "utf8");

    const nonConformes = [...new Set(contenu.match(UUID_PREFIXE) ?? [])].filter(
      (prefixe) => !uuidSchema.safeParse(`${prefixe}000000000000`).success
    );
    expect(nonConformes).toEqual([]);
  });
});
