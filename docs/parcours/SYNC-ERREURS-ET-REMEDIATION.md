# Sync erreurs en éligibilité — diagnostic et remédiation

Guide simple pour comprendre et traiter les parcours affichés en **« sync erreur »** sur
`/administration/diagnostics`, en particulier ceux bloqués en `eligibilite/todo` à cause
d'un dossier Démarches Numériques (DN) introuvable.

> Complète [FLOW-AND-SYNC.md](FLOW-AND-SYNC.md) (§3 sync, §7 pièges DN). À lire avant
> d'utiliser les scripts `ds:probe-dossiers` et `fix:eligibilite-sync-error`.

> **AVERTISSEMENT (2026-08-24) — le reset est GELÉ, cf. [ADR-0026](../adr/0026-gel-reset-eligibilite-not-found.md).**
> Un prérempli **non encore déposé** est invisible de l'API instructeur DN et répond
> `Dossier not found` **exactement comme un dossier purgé**. Le verdict **GONE de ce guide
> n'est donc pas concluant**, et le reset a supprimé des pointeurs vivants (parcours
> `c3ffd5bb` : dossier #32052358 « not found » en juin, supprimé, puis déposé le 25/06 et
> accepté le 09/07 — devenu invisible de l'app). `fix:eligibilite-sync-error --apply` refuse
> désormais de s'exécuter. Tout ce qui suit sur le reset est conservé pour l'historique mais
> **ne doit pas être appliqué** ; la réparation passe par le **relink**.

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

> Les lignes **reset** de ce tableau sont **gelées** ([ADR-0026](../adr/0026-gel-reset-eligibilite-not-found.md)) :
> B1 et B3 ne sont pas distinguables d'un prérempli simplement pas encore déposé. Ne rien
> supprimer ; seul le **relink** (B2) répare aujourd'hui.

`clean` ne répare pas le parcours (c'est `reset`) : il efface le `submitted_at` trompeur posé
à la création par le code pré-#216 (cf. §6), qui fausse diagnostic et stats. `pnpm
ds:probe-dossiers --from-sync-errors --email-crosscheck` produit ce décompte directement
(section **PLAN D'ACTION**).

### Détail des états et verdicts

Le diagnostic distingue **trois états** (en base, sans appel DN), en s'appuyant sur le verdict
DN persisté `dn_probe_state`. Depuis [ADR-0026](../adr/0026-gel-reset-eligibilite-not-found.md),
seuls les deux premiers naissent d'une **erreur de sync** : un prérempli non déposé n'en produit
plus (la sync retourne un succès `notObserved`), il est classé sur ses seules colonnes locales.

| État diagnostic                                       | Condition en base                                       | Sévérité | Sens                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| **Anomalie de synchro** (`SYNC_ANOMALIE`)             | `dn_probe_state` = `unauthorized` / `api_error`         | error    | vrai pépin technique (token, réseau) — **à investiguer**                                    |
| **Dossier déposé disparu** (`DOSSIER_DEPOSE_DISPARU`) | `last_sync_at` ET `submitted_at`, pas d'`instructed_at` | warning  | dépôt réel confirmé puis disparu côté DN — **rare**                                         |
| **Prérempli non déposé** (`DOSSIER_DN_NON_CREE`)      | ni `last_sync_at` ni `submitted_at`                     | info     | pas encore transmis, donc masqué par DN à l'API instructeur — **normal, le gros du volume** |

> **Pourquoi `last_sync_at` et pas seulement `submitted_at` ?** `submitted_at` seul **n'est
> pas fiable** : avant la PR #216, il était posé **à la création** du dossier (faux dépôt
> legacy), pas au dépôt réel. Le **seul** signal d'un vrai dépôt est `last_sync_at`
> renseigné (= une sync a confirmé le dossier côté DN). Voir §6.

> **Pourquoi « prérempli non déposé » est en `info` (pas en rouge) ?** Parce que ce n'est pas
> une anomalie : DN masque à l'API instructeur tout dossier non transmis, donc l'absence de
> nouvelles est l'état **attendu** tant que l'usager n'a pas déposé. C'est aussi le gros du
> volume (105 cas sur 116 en août 2026). Le rouge est réservé à la vraie **anomalie technique**.

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

### Les deux files de travail (ADR-0027)

Depuis la réconciliation, `/administration/diagnostics` s'ouvre sur **deux onglets qui appellent
une action**, alimentés par la table `ds_reconciliation_observations` :

- **À rattacher** — dossiers déposés sans lien vers un parcours (créés hors FPA, ou antérieurs à
  l'annotation), et rattachements proposés mais pas encore appliqués. Le rattachement se fait
  depuis le détail dossier, menu « Gérer ».
- **À arbitrer** — deux dossiers déposés pour une même étape, lien FPA retouché ou contradictoire,
  numéro revendiqué par deux parcours. Décision humaine obligatoire, jamais automatique.

Le bouton « Analyser » balaye une démarche en lecture seule et remplit ces files : il n'applique
aucun rattachement. L'écriture reste explicite, via `pnpm ds:reconcilier --apply`.

Un troisième onglet, **États des parcours**, conserve la vue détaillée par état — utile au
diagnostic, mais ce n'est plus le point d'entrée : la majorité de ses états sont normaux.

### Où voir ces sous-cas dans l'UI

- **Liste** (`/administration/diagnostics`) : DB-only (aucun appel DN), donc les états
  calculables en base — `SYNC_ANOMALIE` / `DOSSIER_DEPOSE_DISPARU` / `DOSSIER_DN_NON_CREE`
  (cf. §2) + la colonne **Verdict DN** (issue de `dn_probe_state`).
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

### `pnpm fix:eligibilite-sync-error` — reset AUTO-VÉRIFIANT (GELÉ, ADR-0026)

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
pnpm fix:eligibilite-sync-error --parcours-id=<uuid> # dry-run ciblé
```

> `--apply` **refuse de s'exécuter** (sortie en erreur) : le verdict GONE ne distingue pas un
> prérempli en attente d'un dossier purgé. Seul le dry-run reste utile, comme diagnostic.

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

Depuis [ADR-0027](../adr/0027-tentative-prefill-vs-dossier-confirme.md), la remédiation ne
supprime plus rien : on **enregistre** tous les numéros connus, on **rattache** ce qui a été
déposé, et on ne tranche à la main que ce qui l'exige.

### 1. Déployer et migrer

```bash
pnpm db:migrate
```

Bloquant : sans les tables `dossiers_ds_tentatives` et `ds_reconciliation_observations`, la
page diagnostics ne charge pas.

### 2. Amorcer le registre des numéros

```bash
pnpm ds:backfill-tentatives          # dry-run : compte et ventile
pnpm ds:backfill-tentatives --apply
```

Deux sources : les pointeurs courants (fiables) et les numéros retrouvés dans
`sync_run_entries.error` (indices — pointeurs supprimés par l'ancien reset). Idempotent,
rejouable sans effet cumulatif. **À faire avant toute analyse** : sans lui, les dossiers dont
le pointeur a disparu ressortiraient à tort comme inconnus.

### 3. Analyser, depuis l'interface

`/administration/diagnostics`, bouton « Analyser » de l'étape voulue. Le balayage interroge DN
en lecture seule et remplit les deux files. Il n'applique aucun rattachement.

Si le message annonce une analyse **interrompue**, les résultats sont partiels et rien n'a été
écrit : relancer une fois DN de nouveau joignable.

### 4. Traiter les deux files

**À rattacher** — un dossier existe côté DN mais aucun parcours ne le suit. Pour chaque ligne :

1. Cliquer **« Identifier »** : l'écran interroge DN et affiche l'identité déclarée, le compte
   usager, les champs du formulaire, puis **les demandeurs qui correspondent** — par adresse de
   logement, téléphone, e-mail ou nom, du plus concordant au moins concordant.
2. À défaut de candidat, ouvrir le dossier côté DN (le numéro est cliquable) et chercher à la
   main dans l'espace agent ou dans les demandeurs.
3. **S'il existe** : ouvrir son dossier → « Gérer » → « Rattacher un dossier DN », saisir le
   numéro. L'étape est déduite de la démarche du dossier, pas du parcours : un dossier
   d'éligibilité rattaché depuis un parcours plus avancé reste une éligibilité. L'observation
   se referme toute seule, et une note d'audit est écrite dans l'historique du dossier.

   **S'il a déjà un dossier pour cette étape**, deux cas selon son état : tant qu'il n'a jamais
   été observé déposé (un prérempli), le rattachement le **remplace** — l'ancien numéro reste au
   registre et la réconciliation le rattrapera s'il finit déposé. S'il a été déposé, le
   rattachement est **refusé** : deux dossiers réels, c'est un arbitrage (voir la file
   correspondante), pas un rattachement.

4. **S'il n'existe pas** — dossier de test, démarche remplie hors dispositif, doublon
   abandonné — cliquer « Écarter ». Rien n'est modifié côté DN.

Deux refus possibles au rattachement, tous deux volontaires : « ce numéro est déjà rattaché à
un autre demandeur » (on ne vole jamais un dossier) et « ce parcours a déjà un dossier déposé
pour cette étape » — deux dossiers réels pour une même étape, c'est un arbitrage, pas un
rattachement. Dans ce dernier cas, trancher d'abord côté DN (classement sans suite du doublon).

Priorité de traitement : les dossiers **acceptés ou en instruction** d'abord. Un dossier accepté
qu'FPA ignore, c'est un demandeur dont le parcours n'avance pas alors que son droit est acquis.
Les `en_construction` très anciens sont le plus souvent des tests ou des abandons.

**À arbitrer** — le rattachement automatique s'est arrêté volontairement : il y a une décision
métier à prendre, et aucune règle ne peut la prendre à notre place.

| Situation                                  | Ce que ça veut dire                                                      | Ce qu'on fait                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Deux dossiers pour une étape**           | Le parcours a déjà un dossier déposé sous un autre numéro                | Choisir lequel fait foi, classer l'autre sans suite côté DN, puis rattacher      |
| **Plusieurs dépôts pour un même parcours** | Plusieurs dossiers déposés portent le même lien FPA                      | Idem : trancher côté DN, le survivant se rattachera au balayage suivant          |
| **Numéro déjà rattaché ailleurs**          | Ce numéro appartient à un autre demandeur (souvent un compte en double)  | Vérifier les deux parcours et décider lequel garder — jamais de rattachement ici |
| **Lien FPA modifié / contradictoire**      | DN signale la valeur préremplie comme retouchée, ou deux liens divergent | Vérifier à qui appartient réellement le dossier, puis rattacher à la main        |
| **Parcours introuvable**                   | Le lien pointe un parcours supprimé depuis                               | Rien à rattacher : écarter                                                       |

Les deux boutons de la file **ne modifient aucune donnée** : ils referment l'observation, rien
de plus. « Marquer comme traité » signifie « j'ai tranché ailleurs », « Écarter » signifie
« ce cas ne nous concerne pas ». Le vrai arbitrage se fait côté DN, ou via le rattachement
manuel une fois le doublon écarté.

> Un cas refermé se **rouvre tout seul** si un balayage ultérieur lui trouve un verdict
> différent. Refermer sans avoir traité ne fait donc que repousser le problème.

Pour un rattachement en masse, le script fait la même chose que l'interface :

```bash
pnpm ds:reconcilier                  # dry-run
pnpm ds:reconcilier --apply          # applique les rattachements automatiques
```

Le **premier passage doit être lancé sans `--since`** : un dossier déposé il y a des mois et
jamais modifié depuis serait invisible d'un balayage incrémental.

### 5. Resynchroniser

« Lancer une synchro maintenant » (`/administration/synchronisations`) : les dossiers repointés
récupèrent leur état réel et les parcours avancent.

### 6. Ce qui ne se répare pas comme ça

- Un demandeur dont le lien ne fonctionne plus se débloque **seul**, depuis `/mon-compte`
  (« Ce lien ne fonctionne plus ? »). Aucune intervention nécessaire.
- Les dossiers antérieurs au 2026-08-25 n'ont pas d'annotation FPA : ils ne se rattachent
  jamais automatiquement, seul le numéro déjà connu les identifie. Population figée.
- `pnpm fix:clean-faux-depots` reste disponible, indépendant du reste : il nettoie les
  `submitted_at` trompeurs d'avant #216 (diagnostic et stats), sans rien réparer.
- Une erreur de sondage (`unauthorized`, `api_error`) n'est pas un problème de rattachement :
  `pnpm ds:check-permissions`.

### 7. Au quotidien

Relancer l'analyse depuis l'interface de temps en temps — la réconciliation n'est pas encore
branchée sur le CRON. Les files ne se remplissent que de ce qui a été déposé depuis, donc elles
restent courtes. Le drop-off (préremplis jamais complétés) continue d'exister mais ne demande
plus rien : ce n'est plus une anomalie, et le demandeur se débloque seul.

---

## 5. Fichiers clés

| Rôle                               | Fichier                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sonde DN lecture-seule             | `scripts/ops/sync-erreurs/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)                        |
| Reset auto-vérifiant               | `scripts/ops/sync-erreurs/reset-eligibilite-sync-error.ts` (`pnpm fix:eligibilite-sync-error`) |
| Relink mismatch                    | `scripts/ops/sync-erreurs/relink-eligibilite-dossier.ts` (`pnpm fix:relink-eligibilite`)       |
| Nettoyage faux dépôts legacy       | `scripts/ops/sync-erreurs/clean-faux-depots-submitted-at.ts` (`pnpm fix:clean-faux-depots`)    |
| Amorçage du registre               | `scripts/ops/sync-erreurs/backfill-tentatives.ts` (`pnpm ds:backfill-tentatives`)              |
| Réconciliation au dépôt            | `scripts/ops/sync-erreurs/reconcilier-dossiers.ts` (`pnpm ds:reconcilier`)                     |
| Files de travail (back-office)     | `diagnostics/actions/reconciliation.actions.ts`, `app/(backoffice)/.../DiagnosticsTabs.tsx`    |
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
