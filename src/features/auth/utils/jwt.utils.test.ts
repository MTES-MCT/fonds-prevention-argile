import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";
import { createToken, verifyToken } from "./jwt.utils";
import { AUTH_METHODS, ROLES } from "../domain/value-objects/constants";
import type { JWTPayload } from "../domain/entities";

const PAYLOAD: JWTPayload = {
  userId: "agent-123",
  role: ROLES.AMO,
  authMethod: AUTH_METHODS.PROCONNECT,
  exp: Date.now() + 3600000,
  iat: Date.now(),
};

function signerAvec(secret: string, payload: object): string {
  const entete = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const charge = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${entete}.${charge}`).digest("base64url");
  return `${entete}.${charge}.${signature}`;
}

describe("jwt.utils — secret de signature", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("signe et vérifie un jeton avec le secret configuré", () => {
    expect(verifyToken(createToken(PAYLOAD))).toMatchObject({ userId: "agent-123" });
  });

  it.each([
    ["absent", undefined],
    ["vide", ""],
    ["trop court", "a".repeat(31)],
  ])("refuse de signer quand JWT_SECRET est %s", (_cas, valeur) => {
    vi.stubEnv("JWT_SECRET", valeur);

    expect(() => createToken(PAYLOAD)).toThrow(/JWT_SECRET absent ou trop court/);
  });

  it("refuse de vérifier sans secret au lieu de répondre « pas de session »", () => {
    const jeton = createToken(PAYLOAD);
    vi.stubEnv("JWT_SECRET", undefined);

    expect(() => verifyToken(jeton)).toThrow(/JWT_SECRET absent ou trop court/);
  });

  it.each([
    ["même longueur", (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1)],
    ["tronquée", (s: string) => s.slice(0, -1)],
    ["rallongée", (s: string) => `${s}A`],
  ])("rejette une signature altérée (%s) sans lever", (_cas, alterer) => {
    const [entete, charge, signature] = createToken(PAYLOAD).split(".");

    expect(verifyToken(`${entete}.${charge}.${alterer(signature)}`)).toBeNull();
  });

  it("rejette un jeton signé avec l'ancien secret par défaut", () => {
    expect(verifyToken(signerAvec("change-this-secret", PAYLOAD))).toBeNull();
  });
});
