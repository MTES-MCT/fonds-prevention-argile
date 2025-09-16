// Durées de session en secondes
export const SESSION_DURATION = {
  admin: 8 * 60 * 60, // 8 heures
  particulier: 24 * 60 * 60, // 24 heures
  redirectCookie: 5 * 60, // 5 minutes pour le cookie de redirection
} as const;

// Options des cookies sécurisés
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Helper pour créer les options de cookie avec expiration
export function getCookieOptions(maxAge?: number) {
  return {
    ...COOKIE_OPTIONS,
    ...(maxAge && { maxAge }),
  };
}
