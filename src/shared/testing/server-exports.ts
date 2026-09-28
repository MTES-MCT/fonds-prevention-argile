import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// Lecture par l'AST : une regex manquait les exports fléchés et les commentaires avant la directive.
export interface FonctionExportee {
  nom: string;
  /** Instructions du corps, un try de tête déplié ; une fonction fléchée à expression n'en a qu'une. */
  instructions: string[];
  /** Texte complet du corps, pour les gardes qui ne sont pas en tête. */
  corps: string;
}

function parser(chemin: string): ts.SourceFile {
  return ts.createSourceFile(chemin, readFileSync(chemin, "utf8"), ts.ScriptTarget.Latest, true);
}

export function aDirectiveUseServer(fichier: ts.SourceFile): boolean {
  const premiere = fichier.statements[0];
  return (
    !!premiere &&
    ts.isExpressionStatement(premiere) &&
    ts.isStringLiteral(premiere.expression) &&
    premiere.expression.text === "use server"
  );
}

export function listerFichiers(dossier: string, filtre: (chemin: string) => boolean): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return listerFichiers(chemin, filtre);
    return filtre(chemin) ? [chemin] : [];
  });
}

export function listerFichiersServer(dossier: string): string[] {
  return listerFichiers(
    dossier,
    (chemin) => /\.tsx?$/.test(chemin) && !/\.test\.tsx?$/.test(chemin) && aDirectiveUseServer(parser(chemin))
  );
}

const estExporte = (noeud: ts.Node) =>
  ts.canHaveModifiers(noeud) && !!ts.getModifiers(noeud)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

function decrire(nom: string, corps: ts.ConciseBody, fichier: ts.SourceFile): FonctionExportee {
  if (!ts.isBlock(corps)) return { nom, instructions: [corps.getText(fichier)], corps: corps.getText(fichier) };
  const tete = corps.statements[0];
  const statements = tete && ts.isTryStatement(tete) ? tete.tryBlock.statements : corps.statements;
  return { nom, instructions: statements.map((s) => s.getText(fichier)), corps: corps.getText(fichier) };
}

// Fonctions exportées, sous toutes leurs formes : déclaration, const fléchée, `export { x }` local.
export function fonctionsExportees(chemin: string): FonctionExportee[] {
  const fichier = parser(chemin);
  const locales = new Map<string, ts.ConciseBody>();
  const exportees = new Set<string>();

  for (const noeud of fichier.statements) {
    if (ts.isFunctionDeclaration(noeud) && noeud.name && noeud.body) {
      const estDefaut = ts.getModifiers(noeud)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      const nom = estDefaut ? "default" : noeud.name.text;
      locales.set(nom, noeud.body);
      if (estExporte(noeud)) exportees.add(nom);
    }
    if (ts.isVariableStatement(noeud)) {
      for (const decl of noeud.declarationList.declarations) {
        const init = decl.initializer;
        if (ts.isIdentifier(decl.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          locales.set(decl.name.text, init.body);
          if (estExporte(noeud)) exportees.add(decl.name.text);
        }
      }
    }
    if (ts.isExportDeclaration(noeud) && noeud.exportClause && ts.isNamedExports(noeud.exportClause)) {
      for (const spec of noeud.exportClause.elements) {
        // Une réexportation d'un autre module n'a pas de corps lisible ici : elle doit échouer, pas passer.
        exportees.add(noeud.moduleSpecifier ? `${spec.name.text} (réexportée)` : (spec.propertyName ?? spec.name).text);
      }
    }
  }

  return [...exportees].map((nom) => {
    const corps = locales.get(nom);
    return corps ? decrire(nom, corps, fichier) : { nom, instructions: [], corps: "" };
  });
}
