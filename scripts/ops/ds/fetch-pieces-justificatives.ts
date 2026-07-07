/**
 * Liste les pièces justificatives (et leurs modèles téléchargeables) de chaque
 * démarche DN configurée. Sert à confirmer la forme réelle du schéma
 * (PieceJustificativeChampDescriptor.fileTemplate) avant de câbler l'UI dynamique,
 * et sert d'outil de vérification récurrent (comme ds:check-permissions).
 *
 * Script autonome (aucun import `@/`) → lançable tel quel en local et sur Scalingo.
 *
 * Usage:
 *   npx tsx scripts/ops/ds/fetch-pieces-justificatives.ts            # toutes les démarches configurées
 *   npx tsx scripts/ops/ds/fetch-pieces-justificatives.ts 129894     # une démarche par numéro
 *   pnpm ds:fetch-pieces
 *
 * Prérequis : DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY + DEMARCHES_SIMPLIFIEES_ID_* dans l'env.
 */

import { dsQuery } from "../lib/ds-graphql";

// Démarches configurées (on ignore celles non renseignées), ou une seule si passée en argument.
const argNumber = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;
const DEMARCHES = argNumber
  ? [{ etape: "(argument)", id: String(argNumber) }]
  : [
      { etape: "eligibilite", id: process.env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE },
      { etape: "diagnostic", id: process.env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC },
      { etape: "devis", id: process.env.DEMARCHES_SIMPLIFIEES_ID_DEVIS },
      { etape: "factures", id: process.env.DEMARCHES_SIMPLIFIEES_ID_FACTURES },
    ].filter((d): d is { etape: string; id: string } => Boolean(d.id));

if (DEMARCHES.length === 0) {
  console.error("Aucune démarche configurée (DEMARCHES_SIMPLIFIEES_ID_* absents ou numéro en argument)");
  process.exit(1);
}

// Le fragment PieceJustificativeChampDescriptor.fileTemplate est la cible : c'est
// le modèle téléchargeable exposé par DN. On l'inspecte au niveau racine ET dans les
// blocs répétables (RepetitionChampDescriptor) où des PJ peuvent vivre.
const QUERY = `
  query GetPiecesJustificatives($number: Int!) {
    demarche(number: $number) {
      number
      title
      state
      activeRevision {
        champDescriptors {
          __typename
          id
          label
          description
          required
          ... on PieceJustificativeChampDescriptor {
            fileTemplate {
              filename
              url
              contentType
              byteSize
            }
          }
          ... on RepetitionChampDescriptor {
            champDescriptors {
              __typename
              id
              label
              description
              required
              ... on PieceJustificativeChampDescriptor {
                fileTemplate {
                  filename
                  url
                  contentType
                  byteSize
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface FileTemplate {
  filename?: string;
  url?: string;
  contentType?: string;
  byteSize?: number;
}

interface ChampDescriptor {
  __typename: string;
  id: string;
  label: string;
  description?: string | null;
  required?: boolean;
  fileTemplate?: FileTemplate | null;
  champDescriptors?: ChampDescriptor[];
}

const MAX_INT32 = 2147483647;

function printPiece(champ: ChampDescriptor, indent: string): void {
  const reqTag = champ.required ? " [OBLIGATOIRE]" : "";
  console.log(`${indent}- ${champ.label}${reqTag}  (id: ${champ.id})`);
  if (champ.description) {
    console.log(`${indent}    ${champ.description.substring(0, 100)}`);
  }
  if (champ.fileTemplate?.url) {
    const t = champ.fileTemplate;
    console.log(`${indent}    modèle: ${t.filename ?? "(sans nom)"} -> ${t.url}`);
  } else {
    console.log(`${indent}    modèle: (aucun)`);
  }
}

async function inspectDemarche(etape: string, id: string): Promise<void> {
  console.log(`\n=== ${etape} (démarche ${id}) ===`);

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0 || numericId > MAX_INT32) {
    console.log("  id non numérique ou hors plage (placeholder ?) — ignoré");
    return;
  }

  const r = await dsQuery<{
    demarche: {
      number: number;
      title: string;
      state: string;
      activeRevision?: { champDescriptors: ChampDescriptor[] };
    } | null;
  }>(QUERY, { number: numericId });

  if (r.httpError) {
    console.log(`  Erreur HTTP: ${r.httpError}`);
    return;
  }
  if (r.errors?.length) {
    console.log(`  Erreurs GraphQL: ${r.errors.map((e) => e.extensions?.code ?? e.message).join(", ")}`);
    return;
  }

  const demarche = r.data?.demarche;
  if (!demarche) {
    console.log("  Démarche introuvable (numéro inexistant ?)");
    return;
  }

  console.log(`  Titre: ${demarche.title} | state=${demarche.state}`);

  const champs = demarche.activeRevision?.champDescriptors ?? [];
  const pieces = champs.filter((c) => c.__typename === "PieceJustificativeChampDescriptor");

  console.log(`\n  Pièces justificatives (racine): ${pieces.length}`);
  for (const p of pieces) printPiece(p, "  ");

  // PJ nichées dans des blocs répétables.
  const repetitions = champs.filter((c) => c.__typename === "RepetitionChampDescriptor");
  for (const rep of repetitions) {
    const subPieces = (rep.champDescriptors ?? []).filter((c) => c.__typename === "PieceJustificativeChampDescriptor");
    if (subPieces.length > 0) {
      console.log(`\n  Dans le bloc répétable « ${rep.label} »:`);
      for (const p of subPieces) printPiece(p, "    ");
    }
  }
}

async function main() {
  for (const demarche of DEMARCHES) {
    await inspectDemarche(demarche.etape, demarche.id);
  }
  console.log("");
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
