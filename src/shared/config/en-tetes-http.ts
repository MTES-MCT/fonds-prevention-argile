// Importé par next.config.ts : ni alias `@/`, ni dépendance, pour rester chargeable hors bundler.

export interface EnTete {
  key: string;
  value: string;
}

export interface RegleEnTetes {
  source: string;
  headers: EnTete[];
}

/** Pages affichables dans l'iframe d'un site partenaire : une par dossier de `src/app/(embed)/`. */
export const PAGES_EMBARQUEES = ["/embed-simulateur", "/embed-vulnerabilite-rga"] as const;

export const EN_TETES_COMMUNS: EnTete[] = [
  // Deux ans, sous-domaines compris (staging). Ignoré par les navigateurs en HTTP, donc sans effet en local.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

export const EN_TETES_NON_ENCADRABLE: EnTete[] = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

// Une page embarquée ne reçoit aucun de ces deux en-têtes : `frame-ancestors *` refuserait un parent
// hors http(s) (fichier local, webview d'application), que l'absence d'en-tête autorise.
export const EN_TETES_ABSENTS_SI_EMBARQUEE = EN_TETES_NON_ENCADRABLE.map((enTete) => enTete.key);

export function estPageEmbarquee(chemin: string): boolean {
  return PAGES_EMBARQUEES.some((page) => chemin === page || chemin.startsWith(`${page}/`));
}

export function construireReglesEnTetes(): RegleEnTetes[] {
  // `(?:/|$)` : `/embed-simulateur-bis` n'est pas `/embed-simulateur` et reste donc protégée.
  const pagesEmbarquees = PAGES_EMBARQUEES.map((page) => `${page.slice(1)}(?:/|$)`).join("|");

  return [
    { source: "/(.*)", headers: EN_TETES_COMMUNS },
    { source: `/((?!${pagesEmbarquees}).*)`, headers: EN_TETES_NON_ENCADRABLE },
  ];
}

/** L'intention, sans passer par les motifs de Next : sert à contrôler les règles et un site déployé. */
export function enTetesAttendus(chemin: string): EnTete[] {
  return estPageEmbarquee(chemin) ? EN_TETES_COMMUNS : [...EN_TETES_COMMUNS, ...EN_TETES_NON_ENCADRABLE];
}

/** En-têtes qui ne doivent pas sortir sur ce chemin. */
export function enTetesInterdits(chemin: string): string[] {
  return estPageEmbarquee(chemin) ? ["X-Powered-By", ...EN_TETES_ABSENTS_SI_EMBARQUEE] : ["X-Powered-By"];
}
