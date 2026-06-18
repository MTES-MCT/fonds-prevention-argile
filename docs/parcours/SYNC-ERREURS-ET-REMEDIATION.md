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

> **Bon à savoir (erreur obsolète auto-résolue)** : depuis le fix « erreur active », le
> diagnostic ne compte plus une erreur de sync que si elle concerne encore le dossier courant
> (dossier présent, erreur postérieure à sa création, et aucune sync réussie depuis). Donc
> **après reset (dossier supprimé) ou resync réussie, le parcours quitte l'état sync-erreur**
> au prochain chargement — l'historique `sync_run_entries` reste conservé.

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

### `pnpm fix:relink-eligibilite` — relink d'un mismatch

Pour un dossier `EXISTE_SOUS_AUTRE_NUMERO` : repointe le dossier local vers le **vrai
numéro** (souvent déjà accepté) et remet ses colonnes d'état à NULL ; la prochaine sync
recopie l'état réel et fait avancer le parcours. À utiliser **à la place du reset** (qui
ferait un doublon). Cible non archivée, état le plus avancé ; ambiguïté → laissé pour
traitement manuel.

```bash
# explicite (numéro cible confirmé via le probe)
pnpm fix:relink-eligibilite --parcours-id=<uuid> --to-ds-number=<n> --apply
# auto-découverte des mismatches
pnpm fix:relink-eligibilite --from-sync-errors            # dry-run
pnpm fix:relink-eligibilite --from-sync-errors --apply
```

Après relink : **relancer une synchro** pour recopier l'état réel.

---

## 4. Playbook final

Ordre d'exécution recommandé. Chaque étape indique le(s) cas qu'elle résout.

1. **Diagnostiquer** (lecture seule) :
   `pnpm ds:probe-dossiers --from-sync-errors --email-crosscheck`.

2. **Relancer une synchro DS** (bouton « Lancer une synchro maintenant »,
   `/administration/synchronisations`).
   → Résout **EN_INSTRUCTION / DEPOSE_NON_INSTRUIT / TRAITE** (dossiers qui existent encore
   sur DN) : le miroir local se met à jour, le parcours se débloque et quitte la sync-erreur.

3. **Relinker les mismatches** (avant le reset) :
   `pnpm fix:relink-eligibilite --from-sync-errors` puis `--apply`, puis **resync**.
   → Résout **GONE / EXISTE_SOUS_AUTRE_NUMERO** : récupère le dossier réel (souvent accepté)
   sans doublon. Fait que ces parcours seront vus `EXISTS` (donc épargnés) à l'étape 4.

4. **Reset des drop-offs restants** :
   `pnpm fix:eligibilite-sync-error` (dry-run) puis `--apply`.
   → Résout **GONE / ABSENT** : supprime le pointeur mort, l'usager retrouve le CTA
   « Remplir le formulaire » (nouveau lien « commencer »). Le parcours quitte la sync-erreur.

5. **Nettoyer les faux dépôts legacy** (hygiène, indépendant) :
   `pnpm fix:clean-faux-depots` puis `--apply`.
   → Corrige les `submitted_at` trompeurs (création pré-#216) : diagnostic et stats fiables.

6. **PROBE_ERREUR / unauthorized** (s'il y en a) :
   `pnpm ds:check-permissions` → vérifier publication de la démarche + token instructeur.

> Depuis le fix « erreur active » (§2), reset et resync **font effectivement disparaître**
> les parcours de la liste sync-erreur au prochain chargement (l'erreur obsolète n'est plus
> comptée). Plus de « collant ».

---

## 5. Fichiers clés

| Rôle                               | Fichier                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Sonde DN lecture-seule             | `scripts/ops/ds/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)                               |
| Reset auto-vérifiant               | `scripts/ops/fix/reset-eligibilite-sync-error.ts` (`pnpm fix:eligibilite-sync-error`)       |
| Relink mismatch                    | `scripts/ops/fix/relink-eligibilite-dossier.ts` (`pnpm fix:relink-eligibilite`)             |
| Nettoyage faux dépôts legacy       | `scripts/ops/fix/clean-faux-depots-submitted-at.ts` (`pnpm fix:clean-faux-depots`)          |
| Vérif permissions / publication DN | `scripts/ops/ds/check-ds-permissions.ts` (`pnpm ds:check-permissions`)                      |
| Recherche dossier par email (UI)   | `searchEligibiliteByEmail` — page `/administration/diagnostics/[parcoursId]` (« Analyser ») |
| Classification diagnostic          | `src/features/backoffice/administration/diagnostics/services/diagnostics.service.ts`        |
| États diagnostic                   | `src/features/backoffice/administration/diagnostics/domain/diagnostics.types.ts`            |
| Sync DN                            | `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`                             |
| URL « commencer » vs « reprendre » | `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`                                   |

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

---

## 7. Évolution proposée : diagnostic enrichi DN (au-delà du DB-only)

Aujourd'hui la **liste** du diagnostic est DB-only : rapide, scanne tous les parcours, mais
ne distingue pas les sous-cas qui dépendent de DN (drop-off vs mismatch vs existant). Seule la
**page de détail** fait un cross-check DN live. Objectif : que la liste affiche les verdicts DN
**comme le probe**, sans bloquer l'UI ni marteler l'API DN.

**Tension** : un cross-check live coûte N appels DN (un `getDossier` par dossier) + une
pagination de la démarche pour le cross-check email. Le faire **synchrone** sur tous les
parcours à chaque ouverture de page est intenable (lenteur + rate-limit DN).

### Plan en 3 incréments

1. **Persister le verdict DN pendant la sync (quasi gratuit).** Le CRON de sync appelle déjà
   `getDossierStatus` pour chaque dossier. Ajouter à `dossiers_demarches_simplifiees` deux
   colonnes — `dn_probe_state` (`en_construction | en_instruction | accepte | refuse |
sans_suite | not_found`) et `dn_probe_at` — écrites par `syncDossierStatus` (succès → état,
   « not found » → `not_found`). La liste lit alors un verdict **DN-fiable** (latence ≤ cadence
   CRON, ~8 h), toujours en lecture DB. Migration Drizzle + écriture dans la sync.

2. **Classer la liste sur le verdict DN.** `getParcoursDiagnostics` utilise `dn_probe_state`
   (au lieu de déduire du `ds_status` local) pour produire les groupes du probe : `GONE`
   (not_found), `EXISTS` (état présent → resync), etc. Réutiliser `classifyDossierAnomaly`
   (déjà partagé) en lui passant `{ state | error }` issu de `dn_probe_state`.

3. **Rafraîchissement live à la demande (borné).** Un bouton « Sonder DN maintenant » sur la
   liste filtrée (ex. la sous-population sync-erreur, ~quelques dizaines) déclenche une server
   action qui exécute le probe **live** (avec `sleep`), met à jour les verdicts à l'écran et
   persiste `dn_probe_state`/`dn_probe_at`. Borne le coût à la sélection, pas à tout le parc.

### Cross-check email (mismatch)

La détection « existe sous un autre numéro » nécessite une pagination complète de la démarche :
trop coûteuse pour la liste. Elle reste **à la demande** (déjà dispo par parcours via
« Analyser » → `searchEligibiliteByEmail`). Option : une action batch « détecter les
mismatches » qui pagine **une fois** et marque les candidats `GONE` concernés.

### Trade-offs

- **Incrément 1+2** : le meilleur rapport valeur/risque (réutilise les appels DN déjà faits,
  liste fiable à ~8 h près, pas de surcoût DN). Coût : une migration + écriture sync.
- **Incrément 3** : fraîcheur temps réel mais bornée à une sélection ; à n'exposer qu'au
  super-admin.
- Garder la possibilité de **filtrer sur le verdict DN persisté** dans la liste (nouveaux
  filtres « disparu côté DN », « existe à resync »).
