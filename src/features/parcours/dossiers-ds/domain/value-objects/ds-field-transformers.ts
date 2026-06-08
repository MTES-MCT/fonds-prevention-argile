/**
 * Transformers de champs DS réutilisables entre démarches.
 *
 * Les démarches éligibilité et diagnostic préremplissent les mêmes données
 * adresse/commune issues de la simulation RGA. On centralise ici la logique
 * de transformation pour éviter la divergence entre les deux mappings.
 */
import { asString } from "@/shared/utils";

/**
 * Champ "Adresse (texte)" DS : on ne garde que la rue, sans le code postal
 * ni ce qui le suit. Ex : "12 rue des Lilas 75001 Paris" -> "12 rue des Lilas".
 */
export function toAdresseRueSeule(value: unknown): string {
  const adresse = asString(value);
  if (!adresse) return "";
  const match = adresse.match(/^(.+?)\s+\d{5}/);
  return match ? match[1].trim() : adresse;
}

/**
 * Champ "Commune" DS (CommuneChampDescriptor) : DS attend le tuple
 * [codePostal, codeInsee]. Le code INSEE vient de `logement.commune`, le code
 * postal est ré-extrait de l'adresse complète (`logement.adresse`).
 * Le code postal est utilisé par DS pour router le dossier vers le bon groupe
 * d'instructeurs (par département).
 */
export function toCommuneValue(codeInsee: unknown, adresse: unknown): [string, string] {
  const insee = asString(codeInsee) ?? "";
  const adresseStr = asString(adresse);
  const codePostalMatch = adresseStr ? adresseStr.match(/\b(\d{5})\b/) : null;
  const codePostal = codePostalMatch ? codePostalMatch[1] : "";
  return [codePostal, insee];
}
