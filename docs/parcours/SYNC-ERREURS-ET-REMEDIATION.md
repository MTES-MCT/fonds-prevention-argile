# Sync erreurs en éligibilité — diagnostic et remédiation

Guide simple pour comprendre et traiter les parcours affichés en **« sync erreur »** sur
`/administration/diagnostics`, en particulier ceux bloqués en `eligibilite/todo` à cause
d'un dossier Démarches Numériques (DN) introuvable.

> Complète [FLOW-AND-SYNC.md](FLOW-AND-SYNC.md) (§3 sync, §7 pièges DN). À lire avant
> d'utiliser les scripts `ds:probe-dossiers` et `fix:eligibilite-sync-error`.

---

## 1. C'est quoi une « sync erreur » ?

Les colonnes `ds_status`, `submitted_at`, `instructed_at`, `last_sync_at` d'un dossier sont
un **miroir local** de l'état DN. Elles ne sont écrites **que par une synchronisation
réussie**. Quand la sync d'un dossier échoue (l'API DN renvoie une erreur), **rien n'est
écrit** : le miroir local reste figé, et l'erreur est tracée dans `sync_run_entries.error`.

Le diagnostic classe alors le parcours en **sync erreur** dès qu'il existe une entrée
`sync_run_entries.error` non-null (la plus récente). L'erreur typique en éligibilité :

```
eligibilite: Sync dossier <N> échouée: GraphQL errors: Dossier not found
```

= le `ds_number` qu'on a stocké pointe vers un dossier que DN ne trouve pas.

> Conséquence importante : un parcours peut être bloqué en `eligibilite/todo` (miroir local
> vide) alors que le vrai dossier, côté DN, existe et a avancé. Le miroir et la réalité DN
> sont **découplés** dès que la sync échoue.

---

## 2. Les sous-cas

Le diagnostic distingue **deux états** (calculés en base, sans appel DN) :

| État diagnostic                                              | Condition en base                                                    | Interprétation                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Sync erreur (déposé non instruit)** (`SYNC_ERREUR_DEPOSE`) | `last_sync_at` ET `submitted_at` renseignés, pas d'`instructed_at`   | Dépôt confirmé par une sync, jamais instruit ; piste expiration/purge DN |
| **Sync erreur (autre)** (`SYNC_ERREUR`)                      | autres cas (`last_sync_at` null = jamais confirmé, ou déjà instruit) | Prefill jamais complété, token, ou erreur isolée                         |

> **Pourquoi `last_sync_at` et pas seulement `submitted_at` ?** `submitted_at` seul **n'est
> pas fiable** : avant la PR #216, il était posé **à la création** du dossier (faux dépôt
> legacy), pas au dépôt réel. Le **seul** signal d'un vrai dépôt est `last_sync_at`
> renseigné (= une sync a confirmé le dossier côté DN). Voir §6.

Mais l'état réel ne se connaît qu'en **interrogeant DN** (script `ds:probe-dossiers`). Les
verdicts DN possibles :

| Verdict DN (probe)                                  | Signification                                | Que faire                                                   |
| --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| **GONE** (`SUPPRIME_OU_INTROUVABLE` / `INEXISTANT`) | Le dossier n'existe plus / jamais côté DN    | Reset (voir §3) — sauf mismatch (ci-dessous)                |
| **EN_INSTRUCTION**                                  | Existe, pris en instruction par la DDT       | **Juste relancer une sync**                                 |
| **DEPOSE_NON_INSTRUIT**                             | Existe, en construction, pas encore instruit | **Juste relancer une sync** (restera « en attente »)        |
| **TRAITE**                                          | Existe, accepté/refusé/classé                | Relancer une sync                                           |
| **PROBE_ERREUR** (erreur ≠ not found)               | unauthorized, réseau…                        | Vérifier le token / la publication (`ds:check-permissions`) |

### Affiner les GONE

Un GONE recouvre plusieurs histoires, départagées par deux analyses :

**a) Par les signaux locaux** (sous-classification automatique du probe) :

- **Dépôt confirmé puis disparu** (`last_sync_at` renseigné) : une sync avait confirmé le
  dossier côté DN ; il a ensuite été **purgé** (expiration). L'âge en jours confirme la piste.
- **Jamais confirmé** (`last_sync_at` null) : le **prefill n'a jamais donné un vrai dossier
  côté DN** — l'usager ne l'a probablement jamais ouvert/complété. Un éventuel `submitted_at`
  ici est un **faux dépôt legacy** (création pré-#216), à ignorer.

**b) Par cross-check email** (`--email-crosscheck`) : pour chaque GONE, on cherche si
l'usager a un dossier **sous un autre numéro** dans la démarche éligibilité :

- **ABSENT** : aucun dossier sous son email → vrai drop-off (l'usager n'a rien sur DN).
- **EXISTE_SOUS_AUTRE_NUMERO** : un dossier existe sous un numéro différent → **mismatch
  de numéro** (le `ds_number` stocké ≠ celui réellement utilisé). C'est **récupérable par
  relink** (mettre à jour `ds_number`), surtout **PAS par reset** (qui ferait un doublon).

### Où voir ces sous-cas dans l'UI

- **Liste** (`/administration/diagnostics`) : DB-only (aucun appel DN), donc seulement les
  deux états calculables en base — `SYNC_ERREUR_DEPOSE` vs `SYNC_ERREUR` (cf. §2).
- **Détail** (`/administration/diagnostics/[parcoursId]`, « Analyser ») : cross-check DN
  **live**. La colonne **« Diagnostic métier »** affiche le sous-cas par dossier
  (`classifyDossierAnomaly`), y compris pour les dossiers `ds_status=null` (jamais
  synchronisés) : « Introuvable côté DS » (drop-off/purge), « Jamais synchronisé (existe
  côté DS) » (→ resync), « En attente instructeur », etc. La section **« Recherche du
  dossier perdu »** liste les dossiers de l'usager sous un autre numéro → révèle le
  **mismatch**.

---

## 3. Les scripts

### `pnpm ds:probe-dossiers` — diagnostic LECTURE SEULE

Interroge DN dossier par dossier et classe la réponse réelle. **N'écrit rien.**

```bash
# Sonde tous les dossiers d'éligibilité des parcours en sync erreur (eligibilite/todo)
pnpm ds:probe-dossiers --from-sync-errors

# + cross-check email pour départager les GONE (ABSENT vs EXISTE_SOUS_AUTRE_NUMERO)
pnpm ds:probe-dossiers --from-sync-errors --email-crosscheck

# Sonde une liste explicite
pnpm ds:probe-dossiers --numbers=28621590,32006324
```

- Sortie **anonymisée par défaut** (`--no-anonymize` pour le clair).
- Affiche par dossier : verdict DN, état DN, dates, et (mode sync-errors) les colonnes
  locales + la sous-classification d'âge des GONE.
- `--email-crosscheck` pagine la démarche éligibilité **une seule fois**, indexe les
  dossiers par email usager, et marque chaque GONE `ABSENT` ou `EXISTE_SOUS_AUTRE_NUMERO`.
- Récap final avec ventilation des catégories et des GONE.

### `pnpm fix:eligibilite-sync-error` — reset AUTO-VÉRIFIANT

Remet un demandeur bloqué « comme si l'AMO venait de valider » : supprime la ligne
`dossiers_demarches_simplifiees` de l'étape éligibilité, en laissant le parcours en
`eligibilite/todo`. Côté espace demandeur, le CTA « Remplir le formulaire » réapparaît et
un **nouveau lien prefill « commencer »** est généré (et non « reprendre » le dossier mort).

**Sécurité** : avant toute suppression, le script **interroge DN** (lecture seule) pour
chaque candidat et ne supprime **que** les dossiers que DN confirme disparus :

| Verdict DN                                   | Action du script                                       |
| -------------------------------------------- | ------------------------------------------------------ |
| **GONE**                                     | reset (suppression de la ligne)                        |
| **EXISTS** (construction/instruction/traité) | **laissé** — vraie donnée ; la prochaine sync rattrape |
| **PROBE_ERREUR**                             | laissé (incertitude)                                   |
| **SANS_DOSSIER**                             | rien à faire                                           |

```bash
pnpm fix:eligibilite-sync-error                      # dry-run (sonde DN, montre le plan)
pnpm fix:eligibilite-sync-error --anonymize          # dry-run anonymisé
pnpm fix:eligibilite-sync-error --parcours-id=<uuid> --apply   # un seul cas
pnpm fix:eligibilite-sync-error --apply              # supprime tous les GONE
```

Ne touche **ni** à la validation AMO (déjà `LOGEMENT_ELIGIBLE`), **ni** à
`sync_run_entries` (historique conservé).

> **Limite à connaître (mismatch)** : le script supprime **tous** les GONE, y compris un
> éventuel `EXISTE_SOUS_AUTRE_NUMERO` (que `getDossier` voit « not found » sur le mauvais
> numéro). Pour ces cas-là, le reset créerait un doublon. **Toujours lancer
> `ds:probe-dossiers --email-crosscheck` d'abord** : s'il existe des mismatches, les traiter
> par relink (hors script pour l'instant) avant le reset en masse.

> **Limite à connaître (diagnostic « collant »)** : le diagnostic classe en sync erreur dès
> qu'une entrée `sync_run_entries.error` non-null existe, sans la comparer aux syncs réussies
> postérieures. Après reset, ces parcours **restent affichés en sync erreur** tant que cette
> logique n'est pas corrigée (amélioration prévue : comparer l'erreur à la date du dossier
> courant).

### `pnpm fix:clean-faux-depots` — nettoyage des faux dépôts legacy

Repasse `submitted_at` à `NULL` pour les dossiers **jamais synchronisés** (`last_sync_at
IS NULL`) qui portent un `submitted_at` posé à la création par l'ancien code (pré-#216).
Voir §6 pour la cause. Sans effet de bord : `submitted_at` n'étant écrit que par une sync
réussie (qui pose aussi `last_sync_at`), tout `submitted_at` avec `last_sync_at` nul est
forcément un faux dépôt.

```bash
pnpm fix:clean-faux-depots           # dry-run (compte + ventilation par étape)
pnpm fix:clean-faux-depots --apply   # applique
```

---

## 4. Playbook de décision

1. **Diagnostiquer** : `pnpm ds:probe-dossiers --from-sync-errors --email-crosscheck`.
2. **EN_INSTRUCTION / DEPOSE_NON_INSTRUIT / TRAITE** (existent côté DN) → **relancer une
   sync** : bouton « Lancer une synchro maintenant » (`/administration/synchronisations`,
   super-admin) ou attendre le CRON. Le miroir local se corrige, parcours débloqué.
3. **GONE — ABSENT (drop-off) ou déposé-puis-purgé** → `fix:eligibilite-sync-error --apply`
   (nouveau lien « commencer »).
4. **GONE — EXISTE_SOUS_AUTRE_NUMERO (mismatch)** → **relink** (mettre à jour le `ds_number`
   vers le dossier réel), pas de reset. À traiter à part.
5. **PROBE_ERREUR / unauthorized** → vérifier que la démarche est publiée et que le token est
   instructeur : `pnpm ds:check-permissions`.

---

## 5. Fichiers clés

| Rôle                               | Fichier                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Sonde DN lecture-seule             | `scripts/ops/ds/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)                               |
| Reset auto-vérifiant               | `scripts/ops/fix/reset-eligibilite-sync-error.ts` (`pnpm fix:eligibilite-sync-error`)       |
| Nettoyage faux dépôts legacy       | `scripts/ops/fix/clean-faux-depots-submitted-at.ts` (`pnpm fix:clean-faux-depots`)          |
| Vérif permissions / publication DN | `scripts/ops/ds/check-ds-permissions.ts` (`pnpm ds:check-permissions`)                      |
| Recherche dossier par email (UI)   | `searchEligibiliteByEmail` — page `/administration/diagnostics/[parcoursId]` (« Analyser ») |
| Classification diagnostic          | `src/features/backoffice/administration/diagnostics/services/diagnostics.service.ts`        |
| États diagnostic                   | `src/features/backoffice/administration/diagnostics/domain/diagnostics.types.ts`            |
| Sync DN                            | `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`                             |
| URL « commencer » vs « reprendre » | `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`                                   |
| Nettoyage faux dépôts legacy       | `scripts/ops/fix/clean-faux-depots-submitted-at.ts` (`pnpm fix:clean-faux-depots`)          |

---

## 6. Cause racine du `submitted_at` trompeur (#216)

Pourquoi des dossiers « pas vraiment déposés » portent un `submitted_at` :

- **Avant la PR #216**, `createDossierForCurrentStep` posait à la **création**
  `ds_status = EN_CONSTRUCTION` **et** `submitted_at = now()`. Tout dossier prérempli était
  donc marqué « déposé » dès sa création, même si l'usager n'avait rien fait.
- **PR #216** (migration `0034_nullable_ds_status.sql`) a corrigé la sémantique : `ds_status`
  devient nullable, et un backfill repasse `ds_status` à `NULL` pour les dossiers jamais
  synchronisés (`UPDATE ... SET ds_status = NULL WHERE last_sync_at IS NULL`). **Mais il a
  laissé `submitted_at`.**
- Résultat : des dossiers avec `ds_status = NULL` (jamais confirmés côté DN) **et**
  `submitted_at` renseigné (date de création legacy). C'est un **faux dépôt**.

**Conséquences pratiques** :

- Le **bon signal** d'un vrai dépôt est `last_sync_at` (une sync a confirmé le dossier côté
  DN), pas `submitted_at` seul. La classification du diagnostic et du probe exige désormais
  `last_sync_at`.
- `pnpm fix:clean-faux-depots` complète le backfill de #216 en repassant ces `submitted_at`
  à `NULL` (cohérent avec l'intention de #216 : ne plus confondre création et dépôt, y compris
  côté stats).
- Depuis #216, le code de création **ne pose plus** `submitted_at` ; le problème est donc
  **borné aux dossiers créés avant #216** et ne se reproduit pas.
