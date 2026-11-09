# Homologation de sécurité — index du dossier

Point d'entrée du dossier d'homologation du service (RGS) : ce qui existe déjà, rubrique par
rubrique, et ce qu'il reste à produire. La page ne remplace aucun document, elle dit où trouver
chaque pièce. Le format du dossier (MonServiceSécurisé de l'ANSSI ou modèle du ministère) reste à
fixer avec le RSSI ; les rubriques ci-dessous se retrouvent dans l'un comme dans l'autre.

> Une PR qui produit une pièce manquante met à jour cette page : la ligne quitte
> « [Ce qui reste à produire](#ce-qui-reste-à-produire) » et la rubrique pointe vers le document.

## Cadre

| Élément                   | Valeur                                                                                             | Source                                |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Service                   | Information sur le RGA, simulateur d'éligibilité, suivi du parcours d'aide, back-office des agents | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| Responsable de traitement | DGALN                                                                                              | Politique de confidentialité, § I     |
| Base légale               | Mission d'intérêt public, décret n° 2025-920 et arrêté du 6 septembre 2025                         | Politique de confidentialité, § IV    |
| DPD                       | DPD du ministère, adresse publiée                                                                  | Politique de confidentialité, § VI    |
| Autorité d'homologation   | À désigner                                                                                         | —                                     |
| Format du dossier         | À fixer avec le RSSI du ministère                                                                  | —                                     |
| Hébergement               | Scalingo : production en `osc-secnum-fr1` (région SecNumCloud), staging en `osc-fr1`               | [scalingo.md](../ops/scalingo.md)     |
| Environnements            | Production, staging, local ; un dump de production n'arrive en local que pseudonymisé              | [db-local.md](../ops/db-local.md)     |

## 1. Description du service et architecture

- [README.md](../../README.md) : installation, variables d'environnement, déploiement, clés de
  chiffrement (`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `RGA_ENCRYPTION_KEY`).
- [ARCHITECTURE.md](../ARCHITECTURE.md) : couches, features, routes, modèle de données,
  intégrations externes (§ 6).
- [adr/](../adr/README.md) : décisions structurantes, dont ADR-0001 (Next.js), ADR-0002
  (PostgreSQL et Drizzle), ADR-0005 (authentification) et ADR-0006 (architecture par features).
- [FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) : parcours du demandeur, synchronisation avec
  Démarches Numériques, CRON.

**À produire** : la fiche de description au format du dossier (finalités, utilisateurs et volumes,
besoins de disponibilité, d'intégrité, de confidentialité et de traçabilité).

## 2. Interconnexions et sous-traitants

| Service                             | Usage                                                                                     | Données échangées                                                                           | Authentification                                    | Référence                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Scalingo                            | Hébergement de l'application et de PostgreSQL                                             | Toutes                                                                                      | —                                                   | [scalingo.md](../ops/scalingo.md)                                                                 |
| Démarches Numériques (DINUM)        | Création des formulaires préremplis (REST), lecture des dossiers et annotations (GraphQL) | Identité, contacts, adresse, réponses du simulateur ; en retour état, revenus, avis d'impôt | Jeton d'instructeur, en lecture et écriture         | [FLOW-AND-SYNC](../parcours/FLOW-AND-SYNC.md) § 2.6 et § 3, ADR-0011, ADR-0043                    |
| FranceConnect                       | Connexion des demandeurs                                                                  | Identité et email reçus                                                                     | OIDC, niveau `eidas1`                               | ADR-0005                                                                                          |
| ProConnect                          | Connexion des agents                                                                      | Identité et email reçus                                                                     | OIDC, double authentification exigée, jeton vérifié | ADR-0005, ADR-0047                                                                                |
| Brevo                               | Emails transactionnels, contacts et évènements du cycle de vie, webhooks entrants         | Email, nom, attributs du parcours                                                           | Clé d'API ; webhooks par jeton Bearer               | [BREVO-LIFECYCLE.md](../emails/BREVO-LIFECYCLE.md), [webhooks-brevo.md](../ops/webhooks-brevo.md) |
| Matomo (instance beta.gouv)         | Mesure d'audience en mode exempté, statistiques lues par le back-office                   | Données de navigation                                                                       | Jeton d'API en lecture                              | ADR-0008, [STATISTIQUES.md](../stats/STATISTIQUES.md)                                             |
| La Suite Messages (ANCT)            | Formulaire de contact, widget chargé dans le navigateur                                   | Message et coordonnées saisis par le visiteur                                               | —                                                   | ADR-0023                                                                                          |
| Géoplateforme IGN (`data.geopf.fr`) | Géocodage des adresses (BAN)                                                              | Adresse saisie ou déclarée                                                                  | Aucune, API publique                                | `src/shared/adapters/ban/`                                                                        |
| BDNB (`api.bdnb.io`)                | Caractéristiques du bâtiment choisi au simulateur                                         | Identifiant RNB ou clé BAN du bâtiment                                                      | Aucune, API publique                                | `src/shared/adapters/bdnb/`                                                                       |
| API Géo (`geo.api.gouv.fr`)         | Communes, EPCI, départements                                                              | Codes géographiques                                                                         | Aucune, API publique                                | [ARCHITECTURE.md](../ARCHITECTURE.md) § 6                                                         |
| Géorisques                          | Arrêtés de catastrophe naturelle, zones d'aléa importées                                  | Aucune donnée personnelle                                                                   | Aucune                                              | [rga-zones](../../scripts/import/rga-zones/README.md)                                             |
| data.gouv.fr                        | Fond de carte et couche d'aléa 2026, chargés par le navigateur                            | Zone consultée sur la carte, par les requêtes de tuiles                                     | Aucune                                              | `public/map/style-carte-argile.json`                                                              |
| Partenaires en iframe (MAIF)        | Intègrent le simulateur (`/embed`)                                                        | Données de simulation chiffrées dans l'URL                                                  | Clé `RGA_ENCRYPTION_KEY`                            | [PARTNER-TRACKING.md](../partners/PARTNER-TRACKING.md), ADR-0049                                  |
| GitHub (Actions)                    | Code source, CI, déclenchement du CRON de synchronisation                                 | Aucune donnée ; appel de l'API de l'application                                             | Jeton `CRON_SECRET`                                 | [FLOW-AND-SYNC](../parcours/FLOW-AND-SYNC.md) § 4.3                                               |

**À produire** :

- un schéma des flux tiré de ce tableau (sens, protocole, données) ;
- une politique de confidentialité à jour. Elle ne cite que Démarches Numériques, Scalingo et OVH :
  Brevo, Matomo, La Suite Messages et les API géographiques y manquent, et le code ne fait aucun
  appel à OVH. Le statut de chaque service (sous-traitant ou simple destinataire) se tranche avec le
  DPD.

## 3. Données personnelles

- [DONNEES-PERSONNELLES.md](DONNEES-PERSONNELLES.md) : inventaire colonne par colonne, nature de
  chaque donnée, jetons qui donnent un accès en production. Tenu à jour par
  `inventaire-donnees-personnelles.test.ts`.
- [db-local.md](../ops/db-local.md) et `scripts/dev/anonymiser.sql` : restauration pseudonymisée
  des dumps.
- Pages publiques : `src/app/(main)/{politique-confidentialite,mentions-legales,cgu}/content/`.
- ADR-0031 : les simulations de vulnérabilité sont stockées sans lien avec un compte.

**À produire** :

- le registre de traitement : fiche à récupérer auprès de la DGALN si elle existe, sinon à rédiger
  avec le DPD ;
- une AIPD, ou la justification écrite de s'en passer : le service traite des revenus, l'avis
  d'imposition et l'adresse du logement ;
- la purge des données : la politique annonce 1 an après la dernière connexion pour un compte et
  5 ans pour l'instruction, mais le code ne contient aucun mécanisme de purge, et `sync_runs`
  grossit sans limite ([FLOW-AND-SYNC](../parcours/FLOW-AND-SYNC.md) § 6.10).

## 4. Authentification et contrôle d'accès

- [RBAC-ROLES.md](RBAC-ROLES.md) : rôles, espaces, périmètres de données, exceptions.
- [RBAC-TEST-PLAN.md](RBAC-TEST-PLAN.md) : matrice rôle × surface et couverture des refus.
- [TESTING-AUTH.md](../testing/TESTING-AUTH.md) : stratégie de tests de l'authentification.
- ADR-0005 (FranceConnect et ProConnect), ADR-0047 (double authentification des agents), ADR-0029
  (un agent désactivé perd l'accès à la requête suivante), ADR-0014 et ADR-0017 (périmètres),
  ADR-0051 (rôle porté par la structure).
- Garde-fous automatiques : `garde-server-actions.test.ts` (toute server action exportée porte une
  garde), `espace-agent/garde-actions.test.ts` et `(backoffice)/espace-agent/garde-pages.test.ts`.
- Sessions : cookie `httpOnly`, `sameSite=lax`, `secure` en production ; 8 h pour un agent, 24 h
  pour un demandeur (`session.config.ts`). Le rôle est relu en base à chaque requête, jamais pris
  dans le jeton.

**À produire** : la liste des accès d'exploitation (Scalingo production, GitHub, Démarches
Numériques, Brevo, Matomo, comptes FranceConnect et ProConnect partenaires), la procédure
d'arrivée et de départ, et leur revue périodique.

## 5. Sécurité applicative et chaîne de développement

- [security-rules.md](../../.claude/context/security-rules.md) : secrets, validation Zod,
  autorisation, SQL, logs.
- [CLAUDE.md](../../CLAUDE.md) : conventions de code et garde-fous connus.
- [README.md](../../README.md), sections « Sécurité et qualité du code » (Husky, Talisman) et
  « Sécurité des dépendances » (`minimumReleaseAge`, `allowBuilds`, intégrité du lockfile).
- `.github/workflows/ci.yml` (détection de secrets, typecheck, lint, tests, build à chaque push)
  et `.github/dependabot.yml`.
- [snyk-accepted-vulnerabilities.md](snyk-accepted-vulnerabilities.md) : audits successifs,
  vulnérabilités acceptées et justifiées.

**À produire ou corriger** :

- les en-têtes HTTP : l'application ne pose que `X-Frame-Options` (`next.config.ts`). Ni CSP, ni
  HSTS, ni `Referrer-Policy`, `Permissions-Policy` ou `X-Content-Type-Options` ; vérifier ce
  qu'ajoute Scalingo. Sur `/embed`, `ALLOWALL` n'est pas une valeur reconnue, seul
  `frame-ancestors *` agit ;
- un `/.well-known/security.txt`, qui indique où signaler une faille ;
- un audit de sécurité ou un test d'intrusion : aucun n'a été réalisé.

## 6. Exploitation, journalisation et continuité

- [scalingo.md](../ops/scalingo.md), [ops/README.md](../ops/README.md) et
  [requetes-support.md](../ops/requetes-support.md) : accès, logs, variables d'environnement,
  requêtes de diagnostic.
- [scripts/ops/README.md](../../scripts/ops/README.md) : scripts de correction, à blanc par défaut.
- [FLOW-AND-SYNC](../parcours/FLOW-AND-SYNC.md) § 4 et § 5 : CRON authentifié, historique des
  synchronisations consultable par le super-administrateur.
- ADR-0028 : piste d'audit métier dans `parcours_actions`, dont les actions automatiques ne se
  modifient ni ne se suppriment.

**À produire** :

- les sauvegardes et la continuité : sauvegardes PostgreSQL chez Scalingo, perte de données et
  durée d'interruption acceptables, test de restauration ;
- la journalisation technique : conservation des logs Scalingo, traces de connexion des agents.
  La consultation d'un dossier n'est pas tracée ;
- les secrets : inventaire (à partir des variables du README), détenteurs, rotation.

## 7. Incidents

- [INCIDENT-double-progression-amo.md](../parcours/INCIDENT-double-progression-amo.md) : retour
  d'expérience d'un incident de production.
- [SYNC-ERREURS-ET-REMEDIATION.md](../parcours/SYNC-ERREURS-ET-REMEDIATION.md) : erreurs de
  synchronisation et leur remédiation.

**À produire** : la procédure d'incident de sécurité et de violation de données (qui prévenir :
RSSI, DPD, CERT ministériel ; notification à la CNIL sous 72 heures par le responsable de
traitement).

## 8. Risques et plan d'action

- [snyk-accepted-vulnerabilities.md](snyk-accepted-vulnerabilities.md) : risque résiduel accepté
  sur les dépendances.
- [SUJETS-A-TRAITER.md](../SUJETS-A-TRAITER.md), section « Sécurité et dépendances » : dette
  suivie.

**À produire** : l'analyse de risques (EBIOS RM allégée, ou celle de MonServiceSécurisé), les
risques résiduels acceptés, et un plan d'action daté tiré de la liste ci-dessous.

## Ce qui reste à produire

| Pièce                                                  | Rubrique | Avec qui                        |
| ------------------------------------------------------ | -------- | ------------------------------- |
| Fiche de description et besoins de sécurité            | 1        | Équipe, autorité d'homologation |
| Schéma des flux                                        | 2        | Équipe                          |
| Politique de confidentialité à jour des sous-traitants | 2, 3     | Équipe, DPD                     |
| Registre de traitement                                 | 3        | DPD                             |
| AIPD ou justification                                  | 3        | DPD                             |
| Purge conforme aux durées annoncées                    | 3        | Équipe                          |
| Accès d'exploitation, arrivées et départs              | 4        | Équipe                          |
| En-têtes HTTP de sécurité                              | 5        | Équipe                          |
| `security.txt`                                         | 5        | Équipe                          |
| Audit ou test d'intrusion                              | 5        | Autorité d'homologation         |
| Sauvegardes et continuité                              | 6        | Équipe                          |
| Journalisation technique                               | 6        | Équipe                          |
| Inventaire et rotation des secrets                     | 6        | Équipe                          |
| Procédure d'incident et de violation de données        | 7        | Équipe, RSSI, DPD               |
| Analyse de risques et plan d'action                    | 8        | Équipe, RSSI                    |
