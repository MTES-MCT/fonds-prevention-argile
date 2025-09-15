import { createHmac } from "crypto";
import { cookies } from "next/headers";
import * as argon2 from "argon2";
import { getServerEnv } from "../config/env.config";
import type { ExtendedJWTPayload, AuthUser } from "./auth.types";

// Récupération sécurisée des secrets via getServerEnv
const getSecrets = () => {
  const env = getServerEnv();
  return {
    secretKey: env.JWT_SECRET,
    adminPassword: env.ADMIN_PASSWORD,
  };
};

// Cache pour le hash du mot de passe (évite de recalculer)
let passwordHashCache: string | null = null;

// Créer un token JWT simple sans dépendance externe
export function createToken(payload: ExtendedJWTPayload): string {
  const { secretKey } = getSecrets();

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

  const signature = createHmac("sha256", secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Vérifier et décoder un token JWT
export function verifyToken(token: string): ExtendedJWTPayload | null {
  try {
    const { secretKey } = getSecrets();
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    const expectedSignature = createHmac("sha256", secretKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null; // Signature invalide
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString()
    ) as ExtendedJWTPayload;

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

// Login classique avec mot de passe (admin)
export async function login(password: string) {
  const { adminPassword } = getSecrets();

  // Validation basique
  if (!password || password.length < 8) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Générer le hash du mot de passe admin si pas déjà fait
  if (!passwordHashCache) {
    passwordHashCache = await argon2.hash(adminPassword);
  }

  // Vérifier le mot de passe avec Argon2
  const isValid = await argon2.verify(passwordHashCache, password);

  if (!isValid) {
    return { success: false, error: "Mot de passe incorrect" };
  }

  // Créer la session
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const payload: ExtendedJWTPayload = {
    user: {
      role: "admin",
      authMethod: "password",
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

// Logout générique (admin ou FranceConnect)
export async function logout() {
  // Récupérer la session pour vérifier le type d'auth
  const session = await getSession();

  // Supprimer tous les cookies de session
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    expires: new Date(0),
    path: "/",
  });
  cookieStore.set("session_role", "", {
    expires: new Date(0),
    path: "/",
  });
  cookieStore.set("session_auth", "", {
    expires: new Date(0),
    path: "/",
  });

  // Retourner le type d'auth pour savoir si on doit faire un logout FranceConnect
  return {
    authMethod: session?.user.authMethod || null,
    fcIdToken: session?.user.fcIdToken || null,
  };
}

// Récupérer la session courante
export async function getSession(): Promise<ExtendedJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  return payload;
}

// Vérifier si l'utilisateur est authentifié
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Récupérer les infos utilisateur pour le contexte frontend
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const { user } = session;

  // Format différent selon le type d'auth
  if (user.authMethod === "franceconnect") {
    return {
      role: user.role,
      authMethod: user.authMethod,
      name:
        `${user.firstName} ${user.lastName}`.trim() ||
        "Utilisateur FranceConnect",
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  // Admin
  return {
    role: user.role,
    authMethod: user.authMethod,
    name: "Administrateur",
  };
}
