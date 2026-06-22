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

### Synthèse : cas → action

Le sur-ensemble « sync erreur » se décompose, selon le **verdict DN réel** (sondé), en :

| Cas                                      | Verdict DN                                | Signal local                             | Action principale      | Transverse                   |
| ---------------------------------------- | ----------------------------------------- | ---------------------------------------- | ---------------------- | ---------------------------- |
| **A** — existe côté DN                   | en_instruction / en_construction / traité | —                                        | **resync**             | clean si faux `submitted_at` |
| **B1** — drop-off (prefill non complété) | not_found + **ABSENT**                    | `last_sync_at` NULL                      | **reset**              | clean si faux `submitted_at` |
| **B2** — mismatch                        | not_found + **existe sous autre n°**      | —                                        | **relink** (pas reset) | —                            |
| **B3** — déposé puis purgé/expiré        | not_found + ABSENT                        | `last_sync_at` renseigné                 | **reset**              | —                            |
| **Erreur de sondage**                    | unauthorized / api_error                  | —                                        | `ds:check-permissions` | —                            |
| **(transverse)** faux dépôt legacy       | n'importe                                 | `submitted_at` set + `last_sync_at` NULL | —                      | **`fix:clean-faux-depots`**  |

`clean` ne répare pas le parcours (c'est `reset`) : il efface le `submitted_at` trompeur posé
à la création par le code pré-#216 (cf. §6), qui fausse diagnostic et stats. `pnpm
ds:probe-dossiers --from-sync-errors --email-crosscheck` produit ce décompte directement
(section **PLAN D'ACTION**).

### Détail des états et verdicts

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

## 4. Playbook (prod)

Bout en bout. L'ordre n'est pas neutre (**relink avant reset**).

### 1. Déploiement

- Déployer la branche, puis **appliquer la migration** (`pnpm db:migrate`) → colonnes
  `dn_probe_*`. **Bloquant** : sans ça la vue diagnostic plante (`column dn_probe_state does
not exist`).
- Vérifier que `/administration/diagnostics` charge.

### 2. Remplir la « vérité DN » + régler les cas A

Au déploiement, `dn_probe_state` est vide → colonne « Verdict DN » = **Non sondé** partout.

- Cliquer **« Lancer une synchro maintenant »** (`/administration/synchronisations`) : elle
  **resynchronise ET écrit `dn_probe_state`** en une passe.
- Effet : les cas **A (existe côté DN)** se **corrigent tout seuls** (le miroir rattrape →
  ils quittent la sync-erreur) et le « Verdict DN » se remplit pour tous. _(Le CRON ferait
  pareil en quelques heures.)_

### 3. Lire le diagnostic — état des lieux

- Vue UI : filtrer les « sync erreur », lire la colonne **Verdict DN** (existe → résiduel à
  resync ; disparu → à traiter). « Analyser » pour le détail d'un dossier.
- Liste chiffrée + actionnable : `pnpm ds:probe-dossiers --from-sync-errors --email-crosscheck`
  → section **PLAN D'ACTION** (combien de resync / reset / relink / clean / erreur).

### 4. Exécuter les scripts — **dans cet ordre**, dry-run puis `--apply`

1. **Relink** (mismatches B2) **en premier** : `pnpm fix:relink-eligibilite --from-sync-errors`
   → `--apply` → **re-sync**. _Pourquoi en premier : un mismatch est « not found », le reset le
   supprimerait à tort ; le relink le rend « existe » et le reset l'épargne ensuite._
2. **Reset** (drop-offs B1 + purgés B3) : `pnpm fix:eligibilite-sync-error` → `--apply`.
   _Sûr : re-vérifie DN, ne supprime que les GONE confirmés._
3. **Clean** (faux dépôts legacy, transverse) : `pnpm fix:clean-faux-depots` → `--apply`.
   \_Indépendant : ne répare pas le parcours, nettoie les `submitted_at` trompeurs (diagnostic
   - stats). Lançable quand on veut.\_
4. **Erreur de sondage** (s'il y en a) : `pnpm ds:check-permissions` (démarche publiée + token
   instructeur).

### 5. Vérifier

- Rafraîchir la vue : les parcours traités **quittent la sync-erreur** (fix « erreur active »
  §2 : dossier supprimé / resyncé → erreur obsolète, plus de « collant »).
- Re-lancer `pnpm ds:probe-dossiers --from-sync-errors` → le PLAN D'ACTION doit retomber à ~0
  (le résiduel = nouveaux drop-offs depuis).

### 6. Pérenne

- Le drop-off **se reproduit** (prefills jamais complétés). Repasser périodiquement par la vue
  - relancer **reset/clean** au besoin. Le CRON entretient `dn_probe_state` et fait quitter
    l'erreur aux cas A automatiquement. Pas de logs prod nécessaires.

---

## 5. Fichiers clés

| Rôle                               | Fichier                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sonde DN lecture-seule             | `scripts/ops/sync-erreurs/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)                        |
| Reset auto-vérifiant               | `scripts/ops/sync-erreurs/reset-eligibilite-sync-error.ts` (`pnpm fix:eligibilite-sync-error`) |
| Relink mismatch                    | `scripts/ops/sync-erreurs/relink-eligibilite-dossier.ts` (`pnpm fix:relink-eligibilite`)       |
| Nettoyage faux dépôts legacy       | `scripts/ops/sync-erreurs/clean-faux-depots-submitted-at.ts` (`pnpm fix:clean-faux-depots`)    |
| Vérif permissions / publication DN | `scripts/ops/ds/check-ds-permissions.ts` (`pnpm ds:check-permissions`)                         |
| Recherche dossier par email (UI)   | `searchEligibiliteByEmail` — page `/administration/diagnostics/[parcoursId]` (« Analyser »)    |
| Classification diagnostic          | `src/features/backoffice/administration/diagnostics/services/diagnostics.service.ts`           |
| États diagnostic                   | `src/features/backoffice/administration/diagnostics/domain/diagnostics.types.ts`               |
| Sync DN                            | `src/features/parcours/dossiers-ds/services/ds-sync.service.ts`                                |
| URL « commencer » vs « reprendre » | `src/features/parcours/dossiers-ds/utils/ds-url.utils.ts`                                      |

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

## 7. Diagnostic enrichi DN (implémenté)

La **liste** du diagnostic reste DB-only (rapide, scanne tous les parcours), mais affiche
désormais le **verdict DN** sans marteler l'API, via un verdict **persisté pendant la sync**.

### Ce qui a été fait

1. **Verdict DN persisté pendant la sync.** Deux colonnes sur
   `dossiers_demarches_simplifiees` — `dn_probe_state` (`en_construction | en_instruction |
accepte | refuse | sans_suite | not_found | unauthorized | api_error`) et `dn_probe_at` —
   écrites par `syncDossierStatus` sur **tous** les chemins (succès → état réel, échec →
   `not_found` / `unauthorized` / `api_error`). Le CRON appelle déjà DN : surcoût quasi nul.
   Migration `0035_*` (`pnpm db:migrate` pour l'appliquer).

2. **Verdict DN dans la liste.** `getParcoursDiagnostics` expose `dn_probe_state` + le verdict
   dérivé (`dnVerdictOf` → `gone | exists | probe_error | unknown`, `DN_VERDICT_META`). La
   liste affiche une colonne **« Verdict DN »** (badge + état brut + fraîcheur). Lecture DB,
   latence ≤ cadence CRON (~8 h). NB : la classification métier (`DiagnosticState`) reste
   inchangée ; le verdict DN est une **colonne complémentaire**, pas un remplacement.

3. **Sonde DN à la demande (bornée).** Bouton **« Sonder DN (erreurs) »** (super-admin) →
   `probeDnSyncErrorsAction` → `probeDnForSyncErrors` interroge DN **live** (avec `sleep`)
   pour la **sous-population en sync-erreur** uniquement (cap `PROBE_CAP = 300`), persiste les
   verdicts, puis rafraîchit la liste. Coût borné à la sélection, pas à tout le parc.

### Reste possible (non fait)

- **Cross-check email (mismatch) batch** : détecter « existe sous un autre numéro » nécessite
  une pagination complète de la démarche — reste à la demande par parcours (« Analyser » →
  `searchEligibiliteByEmail`) ou via `pnpm ds:probe-dossiers --email-crosscheck`.
- **Filtres sur le verdict DN** dans la liste (« disparu côté DN », « existe à resync »).
- **Classer le `DiagnosticState` sur le verdict DN** (plutôt que sur `ds_status` local) si on
  veut fusionner les deux taxonomies.
