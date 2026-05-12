/**
 * Script pour récupérer le schéma complet d'une démarche DN
 * (champs, annotations privées, metadata)
 *
 * Usage: npx tsx scripts/fetch-demarche-schema.ts <numero_demarche>
 * Exemple: npx tsx scripts/fetch-demarche-schema.ts 129894
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const GRAPHQL_URL =
  process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL || "https://www.demarches-simplifiees.fr/api/v2/graphql";
const API_KEY = process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY;

if (!API_KEY) {
  console.error("DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY manquante dans .env.local");
  process.exit(1);
}

const demarcheNumber = parseInt(process.argv[2]);
if (!demarcheNumber) {
  console.error("Usage: npx tsx scripts/fetch-demarche-schema.ts <numero_demarche>");
  console.error("Exemple: npx tsx scripts/fetch-demarche-schema.ts 129894");
  process.exit(1);
}

const query = `
  query GetDemarcheSchema($number: Int!) {
    demarche(number: $number) {
      id
      number
      title
      state
      description
      dateCreation
      datePublication
      dateDerniereModification
      service {
        nom
        organisme
      }
      activeRevision {
        id
        datePublication
        champDescriptors {
          __typename
          id
          label
          description
          required
          ... on DropDownListChampDescriptor {
            options
          }
          ... on MultipleDropDownListChampDescriptor {
            options
          }
          ... on RepetitionChampDescriptor {
            champDescriptors {
              __typename
              id
              label
              description
              required
            }
          }
        }
        annotationDescriptors {
          __typename
          id
          label
          description
          required
          ... on DropDownListChampDescriptor {
            options
          }
        }
      }
    }
  }
`;

async function main() {
  console.log(`\nRecuperation du schema de la demarche ${demarcheNumber}...\n`);

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query, variables: { number: demarcheNumber } }),
  });

  if (!response.ok) {
    console.error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    process.exit(1);
  }

  const result = await response.json();

  if (result.errors) {
    console.error("Erreurs GraphQL:", JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }

  const demarche = result.data.demarche;

  // --- Metadata ---
  console.log("=== DEMARCHE ===");
  console.log(`  Numero: ${demarche.number}`);
  console.log(`  Titre: ${demarche.title}`);
  console.log(`  Etat: ${demarche.state}`);
  console.log(`  Description: ${demarche.description?.substring(0, 100)}...`);
  console.log(`  Service: ${demarche.service?.nom} (${demarche.service?.organisme})`);
  console.log(`  Cree le: ${demarche.dateCreation}`);
  console.log(`  Publie le: ${demarche.datePublication}`);
  console.log(`  ID GraphQL: ${demarche.id}`);

  // --- Champs ---
  const champs = demarche.activeRevision?.champDescriptors || [];
  console.log(`\n=== CHAMPS (${champs.length}) ===`);
  for (const champ of champs) {
    const reqTag = champ.required ? " [OBLIGATOIRE]" : "";
    console.log(`\n  ${champ.label}${reqTag}`);
    console.log(`    ID: ${champ.id}`);
    console.log(`    Type: ${champ.__typename}`);
    if (champ.description) {
      console.log(`    Description: ${champ.description.substring(0, 80)}`);
    }
    if (champ.options) {
      console.log(`    Options: ${champ.options.join(", ")}`);
    }
    if (champ.champDescriptors) {
      console.log(`    Sous-champs:`);
      for (const sub of champ.champDescriptors) {
        console.log(`      - ${sub.label} (${sub.__typename}, ID: ${sub.id})${sub.required ? " [OBLIGATOIRE]" : ""}`);
      }
    }
  }

  // --- Annotations privees ---
  const annotations = demarche.activeRevision?.annotationDescriptors || [];
  console.log(`\n=== ANNOTATIONS PRIVEES (${annotations.length}) ===`);
  for (const ann of annotations) {
    const reqTag = ann.required ? " [OBLIGATOIRE]" : "";
    console.log(`\n  ${ann.label}${reqTag}`);
    console.log(`    ID: ${ann.id}`);
    console.log(`    Type: ${ann.__typename}`);
    if (ann.description) {
      console.log(`    Description: ${ann.description.substring(0, 80)}`);
    }
    if (ann.options) {
      console.log(`    Options: ${ann.options.join(", ")}`);
    }
  }

  // --- Resume pour copier-coller ---
  console.log(`\n=== RESUME IDS (copier-coller) ===`);
  console.log(`\nChamps:`);
  for (const champ of champs) {
    console.log(`  "${champ.id}": "${champ.label}" (${champ.__typename})`);
  }
  console.log(`\nAnnotations privees:`);
  for (const ann of annotations) {
    console.log(`  "${ann.id}": "${ann.label}" (${ann.__typename})`);
  }
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
