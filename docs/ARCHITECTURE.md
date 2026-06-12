# Vue d'ensemble de l'architecture

Carte de haut niveau du projet : features métier, code partagé, routes et modèle
de données. Pour les choix structurants et leur justification, voir
[docs/adr/](adr/README.md). Pour les conventions de code, voir `CLAUDE.md`.

---

## 1. Couches

```
src/app/        Routes Next.js (pages + Server Actions + Route Handlers API)
src/features/   Domaines métier (DDD-lite : domain / services / actions / adapters)
src/shared/     Code transverse (database, components, domain, email, config, utils)
```

Voir [ADR-0006](adr/0006-architecture-ddd-lite-par-features.md) pour le découpage
DDD-lite par feature.

---

## 2. Features métier (`src/features/`)

| Feature                | Rôle métier                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `auth`                 | Authentification FranceConnect + ProConnect, sessions, rôles et permissions  |
| `parcours/core`        | Domaine du parcours : étapes, statuts, value-objects, progression            |
| `parcours/amo`         | Sélection et validation de l'AMO (assistant maîtrise d'ouvrage)              |
| `parcours/dossiers-ds` | Dossiers Démarches Simplifiées : création/préremplissage, sync, suivi d'état |
| `simulateur`           | Simulateur RGA (exposition au retrait-gonflement des argiles, éligibilité)   |
| `rga-map`              | Visualisation cartographique des zones RGA                                   |
| `seo`                  | Données géographiques et SEO : catastrophes naturelles (catnat), allers-vers |
| `backoffice`           | Espaces agents : `espace-agent` (suivi dossiers) et `administration`         |

Sous-modules notables :

- `parcours/dossiers-ds/` est la feature de référence pour la structure DDD-lite
  (`domain/`, `adapters/graphql` + `adapters/rest`, `services/`, `actions/`,
  `mappers/`, `utils/`).
- `backoffice/administration/` (gestion AMO, agents, allers-vers, synchronisations,
  stats) vs `backoffice/espace-agent/` (dossiers/prospects de l'agent connecté).
- `seo/catnat/` (import et recherche catastrophes naturelles) et
  `seo/allers-vers/` (structures de sensibilisation et leurs territoires).

---

## 3. Code partagé (`src/shared/`)

| Sous-dossier                                                 | Rôle                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `database/`                                                  | Drizzle ORM : `schema/`, `repositories/`, migrations, client              |
| `domain/`                                                    | Value-objects et types métier transverses (Step, Status, DSStatus, rôles) |
| `components/`                                                | Composants React réutilisables (DSFR, layout, cartes, alertes)            |
| `email/`                                                     | Templates React Email + service d'envoi (Brevo / Mailhog)                 |
| `config/`                                                    | Configuration d'environnement validée par Zod (`env.config.ts`)           |
| `utils/`                                                     | Helpers (dates, géo, crypto, async, téléphone, parsing)                   |
| `types/`                                                     | Types TypeScript globaux (`ActionResult`, coordonnées, etc.)              |
| `hooks/`, `constants/`, `services/`, `adapters/`, `testing/` | Divers transverses                                                        |

---

## 4. Routes (`src/app/`)

| Groupe                  | Rôle                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `(main)`                | Site public + parcours demandeur (accueil, simulateur, parcours, mon-compte, pages légales) |
| `(backoffice)`          | Espaces agents privés ProConnect (`espace-agent`, `administration`)                         |
| `(embed)`               | Pages embarquées pour partenaires (iframes) — voir `docs/partners/`                         |
| `api/auth`              | Callbacks et logout FranceConnect / ProConnect                                              |
| `api/cron`              | Jobs récurrents (sync parcours DS) — voir `docs/parcours/FLOW-AND-SYNC.md`                  |
| `api/webhooks`          | Webhooks entrants (DS, Brevo)                                                               |
| `api/rga`, `api/health` | Requêtes spatiales RGA, healthcheck                                                         |

Le contrôle d'accès aux routes est détaillé dans
[docs/security/RBAC-ROLES.md](security/RBAC-ROLES.md).

---

## 5. Modèle de données

Schémas Drizzle dans `src/shared/database/schema/` (un fichier par table),
repositories dans `src/shared/database/repositories/`.

### Relations clés

```
users (1) ──1:1── parcours_prevention (1) ──1:N── dossiers_demarches_simplifiees
                        │
                        ├──1:1── parcours_amo_validations ──N:1── entreprises_amo
                        │              └──1:N── amo_validation_tokens
                        ├──1:N── parcours_commentaires ──N:1── agents
                        ├──1:N── prospect_qualifications ──N:1── agents
                        └──1:N── sync_run_entries ──N:1── sync_runs

agents ──N:1── entreprises_amo        entreprises_amo ──1:N── entreprises_amo_communes
agents ──N:1── allers_vers            allers_vers ──1:N── allers_vers_departements
agent_permissions ──N:1── agents      allers_vers ──1:N── allers_vers_epci

catastrophes_naturelles   (référentiel CATNAT par commune INSEE)
rga_zones                 (géométries PostGIS, aléa RGA par zone)
```

### Tables principales

| Domaine          | Tables                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Parcours         | `users`, `parcours_prevention`, `dossiers_demarches_simplifiees`, `parcours_commentaires`          |
| AMO              | `parcours_amo_validations`, `amo_validation_tokens`, `entreprises_amo`, `entreprises_amo_communes` |
| Agents           | `agents`, `agent_permissions`                                                                      |
| Allers-vers      | `allers_vers`, `allers_vers_departements`, `allers_vers_epci`, `prospect_qualifications`           |
| Référentiels géo | `catastrophes_naturelles`, `rga_zones` (PostGIS)                                                   |
| Synchronisation  | `sync_runs`, `sync_run_entries`                                                                    |

> `users` (demandeur FranceConnect) et `agents` (ProConnect) sont deux tables
> distinctes : le citoyen et l'agent ne partagent pas la même identité.

---

## 6. Intégrations externes

| Service               | Usage                                            | Adapter / config                                 |
| --------------------- | ------------------------------------------------ | ------------------------------------------------ |
| FranceConnect         | Identité demandeurs                              | `src/features/auth/adapters/franceconnect/`      |
| ProConnect            | Identité agents                                  | `src/features/auth/adapters/proconnect/`         |
| Démarches Simplifiées | Dossiers (GraphQL lecture + REST préremplissage) | `src/features/parcours/dossiers-ds/adapters/`    |
| Brevo / Mailhog       | Emails (prod / dev)                              | `src/shared/email/`                              |
| Matomo                | Analytics                                        | `@socialgouv/matomo-next`                        |
| Géorisques / RGA      | Données risque                                   | `src/features/seo/`, `scripts/import/rga-zones/` |

> Démarches Simplifiées = `demarche.numerique.gouv.fr` (nouveau nom de
> `demarches-simplifiees.fr`, même backend). Une seule instance : les 3 URLs de
> config DS pointent vers le même domaine et le token doit être instructeur de
> chaque démarche. Voir [ADR-0009](adr/0009-instance-unique-ds-et-permissions-token.md).

Voir aussi : [FLOW-AND-SYNC.md](parcours/FLOW-AND-SYNC.md) (parcours et sync DS),
[RBAC-ROLES.md](security/RBAC-ROLES.md) (accès), [adr/](adr/README.md) (décisions).
