/**
 * Partenaires intégrant le simulateur via iframe (referrer Matomo).
 * Ajouter un nouveau partenaire = une entrée dans PARTNER_REFERRERS + un PartnerOption.
 */
export type PartnerKey = "maif";

export const PARTNER_REFERRERS: Record<PartnerKey, string> = {
  maif: "auxalentours.maif.fr",
};

export const PARTNER_LABELS: Record<PartnerKey, string> = {
  maif: "MAIF (auxalentours)",
};

export const PARTNER_OPTIONS: { value: PartnerKey; label: string }[] = (
  Object.keys(PARTNER_REFERRERS) as PartnerKey[]
).map((key) => ({ value: key, label: PARTNER_LABELS[key] }));

export function isPartnerKey(value: string): value is PartnerKey {
  return value in PARTNER_REFERRERS;
}
