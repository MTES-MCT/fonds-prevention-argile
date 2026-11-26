import { isIP } from "node:net";

// Un en-tête qui n'a pas la forme d'une adresse n'est pas repris : il finirait tel quel au journal de sécurité.
function adresseValide(valeur: string | null | undefined): string | null {
  const adresse = valeur?.trim();
  return adresse && isIP(adresse) ? adresse : null;
}

/** Adresse du visiteur vue par le routeur Scalingo, qui écrase X-Real-IP. */
export function adresseDepuisEnTetes(enTetes: Headers): string {
  const reelle = adresseValide(enTetes.get("x-real-ip"));
  if (reelle) return reelle;
  // Dernière valeur : la seule posée par un intermédiaire de confiance, les premières viennent du client.
  const transmises = enTetes.get("x-forwarded-for")?.split(",") ?? [];
  return adresseValide(transmises.at(-1)) ?? "inconnue";
}
