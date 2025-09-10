import { createHmac } from "crypto";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!secretKey || !adminPassword) {
  throw new Error(
    "Les variables JWT_SECRET et ADMIN_PASSWORD doivent être définies dans .env.local"
  );
}

// Types pour le payload JWT
interface JWTPayload {
  user: {
    role: string;
    loginTime: string;
  };
  exp: number;
  iat: number;
}

// Créer un token JWT simple sans dépendance externe
function createToken(payload: JWTPayload): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const signature = createHmac("sha256", secretKey!)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Vérifier et décoder un token JWT
function verifyToken(token: string): JWTPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    const expectedSignature = createHmac("sha256", secretKey!)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null; // Signature invalide
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString()
    ) as JWTPayload;

    // Vérifier l'expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token expiré
    }

    return payload;
  } catch {
    // En cas d'erreur de parsing ou autre
    return null;
  }
}

export async function login(password: string) {
  // Vérifier le mot de passe
  if (!password || password !== adminPassword) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Créer la session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const payload: JWTPayload = {
    user: {
      role: "admin",
      loginTime: new Date().toISOString(),
    },
    exp: expires.getTime(),
    iat: Date.now(),
  };

  const token = createToken(payload);

  // Sauvegarder la session dans un cookie httpOnly
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return { success: true };
}

export async function logout() {
  // Supprimer le cookie de session
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    expires: new Date(0),
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  return payload;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}
