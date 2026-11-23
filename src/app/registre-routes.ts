import type { NomDebit } from "@/shared/services/limitation-debit/limitation-debit";

// Inventaire des route handlers (`route.ts`) : ce qui protège chacun. `garde-routes.test.ts` échoue
// sur une route ou une méthode absente d'ici, et sur une protection annoncée que le code n'appelle pas.

export type ProtectionRoute =
  /** Jeton partagé dans `Authorization: Bearer`, comparé en temps constant. */
  | "secret"
  /** Ne répond que pour la session du visiteur, et ne renvoie que ses propres données. */
  | "session"
  /** Retour d'un fournisseur d'identité : `state` et `nonce` vérifiés avant toute écriture. */
  | "oidc"
  /** Jeton à usage unique porté par l'URL, envoyé par email à son destinataire. */
  | "jeton"
  /** Aucune garde, par décision : la justification dit pourquoi. */
  | "publique";

export interface DeclarationRoute {
  protection: ProtectionRoute;
  /** Plafond d'appels par adresse IP (ADR-0054), ou la raison de ne pas en poser. */
  debit: NomDebit | { aucun: string };
  justification: string;
}

/** Clé : chemin du fichier sous `src/app/`, sans `/route.ts`, puis la méthode HTTP exportée. */
export const REGISTRE_ROUTES: Record<string, DeclarationRoute> = {
  "(main)/claim-dossier/[token] › GET": {
    protection: "jeton",
    debit: "connexion",
    justification:
      "Lien d'invitation d'un demandeur : un jeton inconnu, expiré ou déjà consommé ne pose aucun cookie et redirige vers la page d'erreur.",
  },
  "(main)/oidc-callback › GET": {
    protection: "publique",
    debit: { aucun: "Ne fait que rediriger vers le callback FranceConnect, qui porte la limite." },
    justification:
      "Relais d'adresse imposé par FranceConnect : ne lit rien, redirige vers le callback sous BASE_URL, qui fait les vérifications.",
  },
  "api/auth/check › GET": {
    protection: "session",
    debit: {
      aucun:
        "Appelée à chaque changement de page par tout visiteur : une limite par adresse bloquerait un service entier derrière une même IP.",
    },
    justification: "État de connexion du visiteur : sans session conforme, répond « non connecté » sans lire la base.",
  },
  "api/auth/fc/callback › GET": {
    protection: "oidc",
    debit: "connexion",
    justification: "Retour FranceConnect : la session n'est ouverte qu'après vérification du state et du nonce.",
  },
  "api/auth/fc/login › GET": {
    protection: "publique",
    debit: "connexion",
    justification: "Départ de la connexion FranceConnect : pose state et nonce, puis redirige vers le fournisseur.",
  },
  "api/auth/fc/logout › POST": {
    protection: "session",
    debit: { aucun: "N'agit que sur la session du visiteur, sans appel sortant ni lecture en base." },
    justification: "Ferme la session FranceConnect du visiteur : sans session, répond 400 sans rien effacer.",
  },
  "api/auth/pc/callback › GET": {
    protection: "oidc",
    debit: "connexion",
    justification:
      "Retour ProConnect : state, nonce, signature du jeton et double authentification vérifiés avant toute écriture (ADR-0047).",
  },
  "api/auth/pc/login › GET": {
    protection: "publique",
    debit: "connexion",
    justification: "Départ de la connexion ProConnect : pose state et nonce, puis redirige vers le fournisseur.",
  },
  "api/auth/pc/logout › POST": {
    protection: "session",
    debit: { aucun: "N'agit que sur la session du visiteur, sans appel sortant ni lecture en base." },
    justification:
      "Ferme la session ProConnect du visiteur, même antérieure à la 2FA ; sans session, efface les cookies et répond 400.",
  },
  "api/cron/import-catnat › POST": {
    protection: "secret",
    debit: { aucun: "Refusée dès la première instruction sans le secret, comparé en temps constant." },
    justification:
      "Import hebdomadaire des arrêtés de catastrophe naturelle, lancé par GitHub Actions avec CRON_SECRET.",
  },
  "api/cron/sync-parcours › POST": {
    protection: "secret",
    debit: { aucun: "Refusée dès la première instruction sans le secret, comparé en temps constant." },
    justification: "Synchronisation lancée par GitHub Actions avec CRON_SECRET.",
  },
  "api/ds/piece-modele › GET": {
    protection: "publique",
    debit: "lecture",
    justification:
      "Modèles de pièces publics (CERFA vierges) : la démarche est restreinte à la liste configurée et la cible vient de DN, pas de l'appelant.",
  },
  "api/health › GET": {
    protection: "publique",
    debit: { aucun: "Sonde de vie lue par l'hébergeur : un 429 ferait passer un conteneur sain pour défaillant." },
    justification: "Sonde de disponibilité pour la supervision : ne renvoie que l'état de l'API et de la base.",
  },
  "api/rga/alea › GET": {
    protection: "publique",
    debit: "lecture",
    justification:
      "Donnée géographique publique : niveau d'aléa argile pour un point, utilisé par le simulateur anonyme.",
  },
  "api/webhooks/brevo › POST": {
    protection: "secret",
    debit: {
      aucun:
        "Brevo envoie ses évènements par rafales : une limite en perdrait, et la route est refusée sans le secret.",
    },
    justification: "Évènements d'email envoyés par Brevo avec BREVO_WEBHOOK_SECRET.",
  },
  "api/webhooks/brevo › GET": {
    protection: "secret",
    debit: { aucun: "Refusée dès la première instruction sans le secret, comparé en temps constant." },
    justification: "Test d'accessibilité du webhook, sous le même secret.",
  },
};
