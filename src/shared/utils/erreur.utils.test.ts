import { describe, expect, it } from "vitest";
import { estViolationUnicite, resumerErreur } from "./erreur.utils";

// Reproduit la forme d'une DrizzleQueryError : requête et paramètres dans le message, erreur du driver en cause.
function erreurDrizzle(code: string) {
  const cause = Object.assign(new Error("duplicate key value"), { code });
  const erreur = new Error('Failed query: insert into "parcours_actions"\nparams: Alice Dupont,alice@example.com', {
    cause,
  });
  erreur.name = "DrizzleQueryError";
  return erreur;
}

describe("resumerErreur", () => {
  it("ne garde ni la requête ni ses paramètres", () => {
    const resume = resumerErreur(erreurDrizzle("23505"));

    expect(resume).toBe("DrizzleQueryError (23505)");
    expect(resume).not.toContain("Alice");
    expect(resume).not.toContain("alice@example.com");
  });

  it("se contente du nom sans code SQL, et ne lit rien d'autre qu'une Error", () => {
    expect(resumerErreur(new TypeError("Alice"))).toBe("TypeError");
    expect(resumerErreur("Alice")).toBe("erreur inconnue");
  });
});

describe("estViolationUnicite", () => {
  it("reconnaît le code 23505, enveloppé par Drizzle ou nu", () => {
    expect(estViolationUnicite(erreurDrizzle("23505"))).toBe(true);
    expect(estViolationUnicite(Object.assign(new Error("x"), { code: "23505" }))).toBe(true);
    expect(estViolationUnicite(erreurDrizzle("23503"))).toBe(false);
    expect(estViolationUnicite(null)).toBe(false);
  });
});
