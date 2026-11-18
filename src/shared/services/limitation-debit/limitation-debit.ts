import { NextResponse } from "next/server";

// Limiteur en mémoire, par conteneur : il arrête une boucle d'appels, pas une attaque répartie (ADR-0054).

export interface RegleDebit {
  max: number;
  fenetreMs: number;
}

// Plafonds larges : une administration entière sort souvent par une seule adresse IP.
// Un plafond vaut par adresse pour toutes les routes de la règle : le chemin d'une route à jeton varie à chaque appel.
export const DEBITS = {
  /** Lectures publiques qui coûtent une requête PostGIS, un appel à DN ou une lecture en base. */
  lecture: { max: 120, fenetreMs: 60_000 },
  /** Étapes de connexion : chacune écrit un cookie ou appelle le fournisseur d'identité. */
  connexion: { max: 60, fenetreMs: 60_000 },
} as const satisfies Record<string, RegleDebit>;

export type NomDebit = keyof typeof DEBITS;

interface Compteur {
  debut: number;
  compte: number;
}

// Borne dure : le conteneur n'a que 512 Mo, et chaque adresse nouvelle crée une entrée.
export const NOMBRE_MAX_COMPTEURS = 10_000;

// Sur globalThis : chaque route a son propre bundle, un module peut y être instancié plusieurs fois.
const etatGlobal = globalThis as typeof globalThis & { __compteursDebit?: Map<string, Compteur> };
const compteurs = (etatGlobal.__compteursDebit ??= new Map<string, Compteur>());

/** Adresse du visiteur vue par le routeur Scalingo, qui écrase X-Real-IP ; jamais journalisée ni stockée. */
export function adresseClient(request: Request): string {
  const reelle = request.headers.get("x-real-ip")?.trim();
  if (reelle) return reelle;
  // Dernière valeur : la seule posée par un intermédiaire de confiance, les premières viennent du client.
  const transmises = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  return transmises.at(-1)?.trim() || "inconnue";
}

function faireDeLaPlace(maintenant: number): void {
  for (const [cle, compteur] of compteurs) {
    if (maintenant - compteur.debut >= DEBITS.lecture.fenetreMs) compteurs.delete(cle);
  }
  // Toujours plein : on retire les plus anciens, quitte à leur rendre un peu de marge.
  for (const cle of compteurs.keys()) {
    if (compteurs.size < NOMBRE_MAX_COMPTEURS) break;
    compteurs.delete(cle);
  }
}

/** Renvoie la réponse 429 à retourner, ou `null` si l'appel est sous le plafond. */
export function limiterDebit(request: Request, nom: NomDebit): NextResponse | null {
  const { max, fenetreMs } = DEBITS[nom];
  const maintenant = Date.now();
  const cle = `${nom}:${adresseClient(request)}`;

  let compteur = compteurs.get(cle);
  if (!compteur || maintenant - compteur.debut >= fenetreMs) {
    if (!compteur && compteurs.size >= NOMBRE_MAX_COMPTEURS) faireDeLaPlace(maintenant);
    compteur = { debut: maintenant, compte: 0 };
    compteurs.set(cle, compteur);
  }

  compteur.compte += 1;
  if (compteur.compte <= max) return null;

  const attente = Math.max(1, Math.ceil((compteur.debut + fenetreMs - maintenant) / 1000));
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez dans une minute." },
    { status: 429, headers: { "Retry-After": String(attente), "Cache-Control": "no-store" } }
  );
}

/** Réservé aux tests : l'état survit d'un cas à l'autre dans un même fichier. */
export function reinitialiserDebits(): void {
  compteurs.clear();
}

export function nombreDeCompteurs(): number {
  return compteurs.size;
}
