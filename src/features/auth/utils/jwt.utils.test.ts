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
  ])("refuse de signer et de vérifier quand JWT_SECRET est %s", (_cas, valeur) => {
    const jeton = createToken(PAYLOAD);
    vi.stubEnv("JWT_SECRET", valeur);

    expect(() => createToken(PAYLOAD)).toThrow(/JWT_SECRET absent ou trop court/);
    // Lever plutôt que répondre « pas de session » : la panne de configuration doit se voir.
    expect(() => verifyToken(jeton)).toThrow(/JWT_SECRET absent ou trop court/);
  });

  it("accepte un secret d'exactement 32 caractères", () => {
    vi.stubEnv("JWT_SECRET", "s".repeat(32));

    expect(verifyToken(createToken(PAYLOAD))).toMatchObject({ userId: "agent-123" });
  });

  it("lit le secret à chaque appel : un jeton signé avant rotation devient invalide", () => {
    const jeton = createToken(PAYLOAD);
    vi.stubEnv("JWT_SECRET", "nouveau-secret-apres-rotation-de-32-car");

    expect(verifyToken(jeton)).toBeNull();
  });

  it.each([
    ["même longueur", (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1)],
    ["tronquée", (s: string) => s.slice(0, -1)],
    ["rallongée", (s: string) => `${s}A`],
    ["avec padding", (s: string) => `${s}=`],
  ])("rejette une signature altérée (%s) sans lever", (_cas, alterer) => {
    const [entete, charge, signature] = createToken(PAYLOAD).split(".");

    expect(verifyToken(`${entete}.${charge}.${alterer(signature)}`)).toBeNull();
  });

  it("rejette une variante base64url qui décode vers le même HMAC", () => {
    const [entete, charge, signature] = createToken(PAYLOAD).split(".");
    const octets = Buffer.from(signature, "base64url");
    // 43 caractères pour 32 octets : les 2 bits de poids faible du dernier sont ignorés au décodage.
    const variante = Array.from({ length: 128 }, (_, code) => signature.slice(0, -1) + String.fromCharCode(code)).find(
      (candidat) => candidat !== signature && Buffer.from(candidat, "base64url").equals(octets)
    );

    expect(variante).toBeDefined();
    expect(verifyToken(`${entete}.${charge}.${variante}`)).toBeNull();
  });

  it("rejette un jeton signé avec l'ancien secret par défaut", () => {
    expect(verifyToken(signerAvec("change-this-secret", PAYLOAD))).toBeNull();
  });
});
