/**
 * Liste, en LECTURE SEULE, les instructeurs d'une démarche DN avec leur id GraphQL et les groupes
 * où chacun manque. Sert à choisir DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID : DN refuse d'écrire une
 * annotation au nom d'un instructeur absent du groupe du dossier.
 *
 * Usage :
 *   pnpm ds:lister-instructeurs 126061
 *   pnpm ds:lister-instructeurs 126061 --email=prenom.nom@beta.gouv.fr
 *
 * À lancer avec le token de l'environnement visé (one-off Scalingo pour la prod).
 */

import "../lib/env";
import { dsQuery, requireDsApiKey } from "../lib/ds-graphql";
import { getArg } from "../lib/args";

interface GroupeInstructeur {
  label: string;
  closed: boolean;
  instructeurs: Array<{ id: string; email: string }>;
}

async function main(): Promise<void> {
  const numero = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)));
  if (!numero) {
    console.error("Usage : pnpm ds:lister-instructeurs <numéro de démarche> [--email=<email>]");
    process.exitCode = 1;
    return;
  }
  requireDsApiKey();
  const emailCherche = getArg("email")?.toLowerCase();

  const reponse = await dsQuery<{ demarche: { title: string; groupeInstructeurs: GroupeInstructeur[] } | null }>(
    `query ($numero: Int!) {
      demarche(number: $numero) { title groupeInstructeurs { label closed instructeurs { id email } } }
    }`,
    { numero }
  );
  const demarche = reponse.data?.demarche;
  if (!demarche) {
    const cause = reponse.errors?.[0]?.message ?? reponse.httpError ?? "réponse vide";
    console.error(`Démarche ${numero} illisible avec ce token : ${cause}`);
    process.exitCode = 1;
    return;
  }

  const groupes = demarche.groupeInstructeurs.filter((g) => !g.closed);
  const parEmail = new Map<string, { id: string; groupes: Set<string> }>();
  for (const groupe of groupes) {
    for (const instructeur of groupe.instructeurs) {
      const entree = parEmail.get(instructeur.email) ?? { id: instructeur.id, groupes: new Set<string>() };
      entree.groupes.add(groupe.label);
      parEmail.set(instructeur.email, entree);
    }
  }

  console.log(`\n${numero} — ${demarche.title} — ${groupes.length} groupe(s) ouvert(s)\n`);
  const lignes = [...parEmail].filter(([email]) => !emailCherche || email.toLowerCase() === emailCherche);
  if (lignes.length === 0)
    console.log(emailCherche ? `${emailCherche} n'est instructeur d'aucun groupe ouvert` : "Aucun instructeur");
  for (const [email, { id, groupes: siens }] of lignes.sort(([a], [b]) => a.localeCompare(b))) {
    const manquants = groupes.filter((g) => !siens.has(g.label)).map((g) => g.label);
    const couverture = manquants.length === 0 ? "tous les groupes" : `absent de : ${manquants.join(", ")}`;
    console.log(`  ${email.padEnd(40)} ${id}  ${siens.size}/${groupes.length} — ${couverture}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
