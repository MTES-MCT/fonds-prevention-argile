// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from "jose";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn() }));
vi.mock("./proconnect.config", () => ({ getProConnectConfig: vi.fn() }));

import {
  JetonProConnectInvalideError,
  lireUserInfoProConnect,
  verifierIdTokenProConnect,
  type ContexteVerificationProConnect,
} from "./proconnect-oidc";

const ISSUER = "https://proconnect.test/api/v2";
const CLIENT_ID = "client-fpa";
const CLIENT_SECRET = "secret-client-fpa-suffisamment-long-pour-hs256";
const NONCE = "nonce-attendu";

let cleEs256: CryptoKey;
let cleRs256: CryptoKey;
let cleEtrangere: CryptoKey;
let contexte: ContexteVerificationProConnect;

beforeAll(async () => {
  const es = await generateKeyPair("ES256");
  const rs = await generateKeyPair("RS256");
  const etrangere = await generateKeyPair("ES256");
  cleEs256 = es.privateKey;
  cleRs256 = rs.privateKey;
  cleEtrangere = etrangere.privateKey;

  const jwkEs: JWK = { ...(await exportJWK(es.publicKey)), kid: "es", alg: "ES256" };
  const jwkRs: JWK = { ...(await exportJWK(rs.publicKey)), kid: "rs", alg: "RS256" };

  contexte = {
    issuer: ISSUER,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    jwks: createLocalJWKSet({ keys: [jwkEs, jwkRs] }),
  };
});

const claimsValides = (): JWTPayload => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  sub: "sub-agent",
  nonce: NONCE,
  acr: "eidas1-mfa",
});

async function signer(
  payload: JWTPayload,
  options: { alg?: "ES256" | "RS256" | "HS256"; kid?: string; cle?: CryptoKey | Uint8Array; expire?: string } = {}
): Promise<string> {
  const alg = options.alg ?? "ES256";
  const cle =
    options.cle ?? (alg === "HS256" ? new TextEncoder().encode(CLIENT_SECRET) : alg === "RS256" ? cleRs256 : cleEs256);
  const kid = options.kid ?? (alg === "RS256" ? "rs" : alg === "ES256" ? "es" : undefined);

  return new SignJWT(payload)
    .setProtectedHeader({ alg, ...(kid ? { kid } : {}) })
    .setIssuedAt()
    .setExpirationTime(options.expire ?? "5m")
    .sign(cle);
}

describe("verifierIdTokenProConnect", () => {
  it.each(["ES256", "RS256", "HS256"] as const)(
    "accepte un id_token %s valide et rend sub, acr et amr",
    async (alg) => {
      const jeton = await signer({ ...claimsValides(), amr: ["pwd", "totp"] }, { alg });

      const claims = await verifierIdTokenProConnect(jeton, NONCE, contexte);

      expect(claims).toEqual({ sub: "sub-agent", acr: "eidas1-mfa", amr: ["pwd", "totp"] });
    }
  );

  it("refuse une signature par une clé absente du JWKS", async () => {
    const jeton = await signer(claimsValides(), { cle: cleEtrangere });

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toBeInstanceOf(
      JetonProConnectInvalideError
    );
  });

  it("refuse un HS256 signé avec un autre secret", async () => {
    const jeton = await signer(claimsValides(), { alg: "HS256", cle: new TextEncoder().encode("x".repeat(48)) });

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toThrow(JetonProConnectInvalideError);
  });

  it("refuse un jeton non signé (alg none)", async () => {
    const encoder = (objet: object) => Buffer.from(JSON.stringify(objet)).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + 300;
    const jeton = `${encoder({ alg: "none" })}.${encoder({ ...claimsValides(), exp })}.`;

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toThrow(JetonProConnectInvalideError);
  });

  it("refuse un jeton dont la charge utile a été modifiée", async () => {
    const [entete, , signature] = (await signer(claimsValides())).split(".");
    const falsifie = Buffer.from(JSON.stringify({ ...claimsValides(), acr: "eidas3" })).toString("base64url");

    await expect(verifierIdTokenProConnect(`${entete}.${falsifie}.${signature}`, NONCE, contexte)).rejects.toThrow(
      JetonProConnectInvalideError
    );
  });

  it("refuse un jeton expiré", async () => {
    const jeton = await signer(claimsValides(), { expire: "-10m" });

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toThrow(JetonProConnectInvalideError);
  });

  it("refuse un émetteur inattendu", async () => {
    const jeton = await signer({ ...claimsValides(), iss: "https://autre.test/api/v2" });

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toThrow(/émetteur/);
  });

  it("refuse une audience inattendue", async () => {
    const jeton = await signer({ ...claimsValides(), aud: "autre-client" });

    await expect(verifierIdTokenProConnect(jeton, NONCE, contexte)).rejects.toThrow(/audience/);
  });

  it("exige azp quand le jeton vise plusieurs audiences", async () => {
    const sansAzp = await signer({ ...claimsValides(), aud: [CLIENT_ID, "autre-client"] });
    const avecAzp = await signer({ ...claimsValides(), aud: [CLIENT_ID, "autre-client"], azp: CLIENT_ID });

    await expect(verifierIdTokenProConnect(sansAzp, NONCE, contexte)).rejects.toThrow(/azp/);
    await expect(verifierIdTokenProConnect(avecAzp, NONCE, contexte)).resolves.toMatchObject({ sub: "sub-agent" });
  });

  it.each([
    ["différent", "autre-nonce"],
    ["absent côté navigateur", undefined],
  ])("refuse un nonce %s", async (_cas, nonceStocke) => {
    const jeton = await signer(claimsValides());

    await expect(verifierIdTokenProConnect(jeton, nonceStocke, contexte)).rejects.toThrow(/nonce/);
  });
});

describe("lireUserInfoProConnect", () => {
  it("lit une réponse JSON telle quelle", async () => {
    const infos = await lireUserInfoProConnect(JSON.stringify({ sub: "sub-agent", email: "a@b.fr" }), contexte);

    expect(infos).toEqual({ sub: "sub-agent", email: "a@b.fr" });
  });

  it("vérifie une réponse JWT signée", async () => {
    const jeton = await signer({ iss: ISSUER, aud: CLIENT_ID, sub: "sub-agent", email: "a@b.fr" });

    await expect(lireUserInfoProConnect(jeton, contexte)).resolves.toMatchObject({ sub: "sub-agent" });
  });

  it("accepte un JWT UserInfo sans iss ni aud, seulement recommandés", async () => {
    const jeton = await signer({ sub: "sub-agent" });

    await expect(lireUserInfoProConnect(jeton, contexte)).resolves.toMatchObject({ sub: "sub-agent" });
  });

  it("refuse un JWT UserInfo signé par une clé inconnue", async () => {
    const jeton = await signer({ sub: "sub-agent" }, { cle: cleEtrangere });

    await expect(lireUserInfoProConnect(jeton, contexte)).rejects.toThrow(JetonProConnectInvalideError);
  });

  it("refuse un JWT UserInfo d'un autre émetteur", async () => {
    const jeton = await signer({ iss: "https://autre.test/api/v2", sub: "sub-agent" });

    await expect(lireUserInfoProConnect(jeton, contexte)).rejects.toThrow(/émetteur/);
  });
});
