import { createHash } from "node:crypto";

/**
 * Redaction PII pour les scripts ops.
 * `createRedactor(true)` anonymise, `createRedactor(false)` renvoie les valeurs en clair.
 * Le sel est aléatoire par run → hash stable sur un run, imprévisible d'un run à l'autre.
 */
export function createRedactor(anonymize: boolean) {
  const RUN_SALT = createHash("sha256")
    .update(String(Date.now()) + Math.random().toString())
    .digest("hex")
    .slice(0, 16);

  function shortHash(value: string): string {
    return createHash("sha256")
      .update(RUN_SALT + value)
      .digest("hex")
      .slice(0, 6);
  }
  function redactEmail(email: string | null | undefined): string {
    if (!email) return "<aucun>";
    if (!anonymize) return email;
    const at = email.indexOf("@");
    if (at <= 0) return `<redacted:${shortHash(email)}>`;
    const tld = email.slice(email.lastIndexOf(".") + 1);
    return `<email:${shortHash(email)}@***.${tld}>`;
  }
  function redactName(nom: string | null | undefined, prenom: string | null | undefined): string {
    const full = `${prenom ?? ""} ${nom ?? ""}`.trim();
    if (!full) return "<anonyme>";
    if (!anonymize) return full;
    return `<user:${shortHash(full)}>`;
  }
  function redactUuid(id: string): string {
    if (!anonymize) return id;
    return `<id:${shortHash(id)}>`;
  }
  function redactDsNumber(n: number | string | null): string {
    if (n === null || n === undefined) return "<aucun>";
    if (!anonymize) return `#${n}`;
    return `#<ds:${shortHash(String(n))}>`;
  }
  return { shortHash, redactEmail, redactName, redactUuid, redactDsNumber };
}
