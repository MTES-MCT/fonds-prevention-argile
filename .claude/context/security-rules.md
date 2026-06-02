# Checklist sécurité

Guide de référence chargé via `@.claude/context/security-rules.md` depuis `CLAUDE.md`.
Adapté à la stack Next.js 15 (App Router) + Drizzle + FranceConnect du projet.

## Gestion des secrets

- JAMAIS de secret en dur dans le code ni dans un fichier commité. Les secrets
  vivent dans `.env` (gitignored) et sont lus via `process.env`.
- JAMAIS de secret exposé côté client : seules les variables `NEXT_PUBLIC_*` sont
  envoyées au navigateur. Tout ce qui est sensible (clés API, secret de session,
  identifiants Brevo, FranceConnect) reste sans ce préfixe.

```ts
// INTERDIT — clé exposée au bundle client
export const apiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY;

// CORRECT — lue uniquement côté serveur (Server Action / Route Handler)
const apiKey = process.env.BREVO_API_KEY;
```

## Validation des entrées

- TOUJOURS valider les entrées d'une Server Action ou d'un Route Handler avant
  usage. Ne jamais faire confiance au payload client (le `"use client"` ne protège rien).
- Préférer un schéma de validation (Zod) en première ligne de la fonction.

```ts
// INTERDIT — payload utilisé tel quel
export async function updateDossier(data: any) {
  await db.update(dossiers).set(data).where(eq(dossiers.id, data.id));
}

// CORRECT — validation puis champs explicites
const Schema = z.object({ id: z.string().uuid(), statut: z.enum([...]) });
export async function updateDossier(input: unknown) {
  const data = Schema.parse(input);
  await db.update(dossiers).set({ statut: data.statut }).where(eq(dossiers.id, data.id));
}
```

## Authentification et autorisation

- TOUTE Server Action ou Route Handler qui lit/écrit des données protégées doit
  d'abord vérifier la session (FranceConnect / agent) AVANT toute opération.
- Vérifier non seulement « l'utilisateur est connecté » mais aussi « il a le droit
  d'agir sur CETTE ressource » (le dossier lui appartient, ou il a le rôle agent requis).

```ts
// INTERDIT — pas de garde, n'importe qui appelle l'action
export async function getDossier(id: string) {
  return db.query.dossiers.findFirst({ where: eq(dossiers.id, id) });
}

// CORRECT — session vérifiée + appartenance de la ressource
export async function getDossier(id: string) {
  const session = await requireSession();
  const dossier = await db.query.dossiers.findFirst({ where: eq(dossiers.id, id) });
  if (!dossier || !canAccess(session, dossier)) throw new ForbiddenError();
  return dossier;
}
```

## Injection SQL

- TOUJOURS passer par le query builder Drizzle (`db.select().where(eq(...))`,
  `db.insert()`, `db.update()`). Voir aussi la section « Requêtes base de données »
  de `CLAUDE.md`.
- JAMAIS de SQL brut concaténé avec des valeurs utilisateur (`db.execute()` avec
  interpolation de chaîne).

## Exposition de données

- Ne renvoyer au client que les champs nécessaires. Ne pas sérialiser une entité
  complète si elle contient des champs internes (tokens, identifiants DS, données
  d'autres utilisateurs).
- L'email FranceConnect est non modifiable et potentiellement sensible : ne pas le
  réafficher inutilement ; le mail de contact est dans `emailContact`.

## Logs

- JAMAIS logger un secret, un token, un mot de passe ou un payload complet contenant
  des données personnelles.
- En cas d'erreur, logger le contexte (id technique, étape) plutôt que les données brutes.

## Dépendances

- Vérifier les vulnérabilités avant d'ajouter une dépendance.
- Les vulnérabilités acceptées (faux positifs / non exploitables) sont tracées dans
  `docs/security/snyk-accepted-vulnerabilities.md`.

## Checklist de revue finale

- [ ] Aucun secret en dur ni exposé via `NEXT_PUBLIC_*`
- [ ] Entrées validées (Zod) dans chaque Server Action / Route Handler
- [ ] Session ET autorisation sur la ressource vérifiées
- [ ] Accès DB via le query builder Drizzle, jamais de SQL brut
- [ ] Réponses limitées aux champs nécessaires
- [ ] Aucun secret ni donnée personnelle dans les logs
