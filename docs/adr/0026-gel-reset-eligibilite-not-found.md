# ADR-0026 : Gel du reset destructif — « Dossier not found » ne prouve pas la disparition

**Date** : 2026-08-24
**Statut** : Accepté (amende [ADR-0013](0013-remediation-dossiers-dn-sync-erreur.md))

## Contexte

[ADR-0013](0013-remediation-dossiers-dn-sync-erreur.md) pose l'équation « `getDossier` renvoie
`Dossier not found` → le pointeur est mort → reset (suppression de la ligne
`dossiers_demarches_simplifiees`) ». Cette équation est **fausse**.

Un dossier créé par l'API REST de préremplissage est un **brouillon orphelin, invisible de
l'API GraphQL instructeur tant que l'usager ne l'a pas déposé** (comportement documenté par
DN). Tant qu'il n'est pas transmis, `getDossier` répond `Dossier not found` — exactement
comme pour un dossier réellement purgé. Les deux situations sont **indistinguables** par
l'API : ni GraphQL (l'énumération `DossierState` ne contient pas `brouillon` ;
`deletedDossiers` ne couvre que les dossiers ayant été visibles), ni REST (aucun endpoint de
statut du token de préremplissage).

Conséquence : le script `fix:eligibilite-sync-error --apply` supprime des pointeurs
**vivants**. L'usager conserve son lien prefill, dépose plus tard, et son dossier devient
orphelin — invisible de l'app, qui lui propose alors de recommencer et crée un second
prérempli fantôme.

Cas de référence, parcours `c3ffd5bb-7b8b-4d0d-a5b6-1ff91cabc975` (constaté en prod) :

| Date               | Fait                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| 2026-06-18 → 06-21 | 11 `sync_run_entries.error` sur `Sync dossier 32052358 ... Dossier not found`  |
| ~2026-06-21/22     | La ligne disparaît (seul chemin de suppression identifié : ce script)          |
| 2026-06-25         | L'usager dépose **#32052358** — même numéro, donc jamais supprimé côté DN      |
| 2026-07-09         | **#32052358 accepté** — invisible de l'app                                     |
| 2026-07-28         | L'app réaffiche « Remplir le formulaire » et crée **#32872663**, jamais ouvert |

Le parcours est resté bloqué en `eligibilite/todo` alors que son éligibilité était acquise.

## Décision

> Nous **gelons l'option `--apply`** de `fix:eligibilite-sync-error` : le script refuse de
> s'exécuter et sort en erreur. Le mode dry-run reste ouvert (diagnostic).
>
> Corollaire : **aucune remédiation ne supprime plus de pointeur**. La réparation passe par
> le **relink** (`fix:relink-eligibilite`), qui repointe sans rien détruire.

Le verdict `GONE` du script et l'état `DOSSIER_DN_NON_CREE` du diagnostic restent affichés
mais deviennent **non concluants** : ils signifient « jamais observé déposé », pas « disparu ».

Ce gel est une mesure d'arrêt d'urgence, pas la correction de fond. Il ouvre la voie à :
reclassifier le prérempli non observé comme état normal (et non comme erreur de sync),
persister l'historique des numéros DN générés, et réconcilier les dossiers perdus via
l'annotation FPA porteuse du `parcoursId` ([ADR-0025](0025-lien-fpa-annotation-eligibilite.md)).

## Options envisagées

### Option A — Gel total de `--apply`, dry-run conservé (retenue)

- Avantages : arrête immédiatement la destruction ; garde l'outil de diagnostic ; le garde-fou
  vit dans le code, pas dans une consigne orale ; explicite la cause dans le message d'erreur.
- Inconvénients : les rares cas de brouillon réellement purgé ne sont plus traités par script
  (l'usager reste avec un lien mort jusqu'à la correction de fond).

### Option B — Garder `--apply` derrière un seuil d'ancienneté

- Avantages : traiterait encore les cas anciens.
- Inconvénients : **aucun seuil n'est sûr**. DN conserve les brouillons trois mois après leur
  **dernière modification**, information que l'app ne voit pas : un prérempli créé il y a
  quatre mois peut avoir été modifié hier. Le seuil donnerait une fausse assurance.

### Option C — Garder `--apply` sous condition de cross-check email négatif

- Avantages : écarte les mismatches déjà identifiables.
- Inconvénients : un cross-check `ABSENT` ne prouve rien non plus — l'usager peut déposer
  demain. C'est précisément le scénario du cas de référence. De plus l'email n'est pas une clé
  fiable (partagé, modifié, contact ≠ usager) et un prérempli non déposé n'expose pas encore
  d'email usager.

### Option D — Corriger d'abord la classification de la sync

- Avantages : traite la cause (le faux positif) plutôt que le symptôme.
- Inconvénients : demande une PR de code applicatif et un déploiement ; pendant ce temps le
  script reste armé. Retenue comme **suite immédiate**, pas comme alternative au gel.

## Conséquences

### Positives

- Plus aucun pointeur vivant ne peut être supprimé, y compris par un lancement distrait.
- Le message d'erreur documente la cause : il n'y a rien à savoir en dehors du code.
- Le diagnostic et le probe restent pleinement disponibles en lecture seule.

### Négatives / Risques

- Les parcours dont le brouillon a réellement été purgé conservent un pointeur mort et restent
  affichés en sync-erreur — bruit assumé tant que la reclassification n'est pas faite.
- `sync_run_entries` continue d'accumuler des erreurs sur ces dossiers (jusqu'à la suite).

### Migration

Aucune migration de données. Le stock de parcours déjà orphelinés se répare au cas par cas :
recensement des numéros cités dans `sync_run_entries.error` et absents de
`dossiers_demarches_simplifiees`, sondage DN (`ds:probe-dossiers`), puis relink des numéros
déposés. Ces numéros sont des **indices** de récupération, jamais une base de relink
automatique : ils ne restituent ni l'URL prefill ni le `ds_id`.

## Amendement (2026-08-27) — le diagnostic ne classe plus un prérempli en anomalie

Le panneau de diagnostic par parcours affichait encore ces dossiers en rouge (« Introuvable côté
DS », `isBug: true`), avec une explication qui recommandait le reset — antérieure à cet ADR et
le contredisant. Un relevé en production a montré **131 dossiers `not_found`, tous jamais
observés déposés, aucune disparition réelle** : la totalité du volume rouge était du bruit.

`classifyDossierAnomaly` prend désormais `jamaisObserveDepose` (aucun `submitted_at`, ni
`last_sync_at`, ni `ds_status`) et sépare deux verdicts :

- **`PREFILL_NON_DEPOSE`** (`isBug: false`) — le cas normal, celui des 131 ;
- **`DS_SUPPRIME`** (`isBug: true`) — réservé au dossier **déjà observé déposé** qui disparaît,
  la seule vraie anomalie.

La remédiation associée n'est pas le reset gelé mais la **réinitialisation** unitaire
(`reinitialiserDossierEtape`), sûre depuis le registre des tentatives (ADR-0027) : le numéro
survit au retrait du pointeur. Elle est exposée aux agents (« Gérer → Réinitialiser le
formulaire DN »), jamais appliquée en masse ni automatiquement — c'est précisément
l'automatisation aveugle que cet ADR a gelée.

## Liens

- Script gelé : `scripts/ops/sync-erreurs/reset-eligibilite-sync-error.ts`
- Réparation : `scripts/ops/sync-erreurs/relink-eligibilite-dossier.ts` (`pnpm fix:relink-eligibilite`)
- Diagnostic : `scripts/ops/sync-erreurs/probe-dossiers.ts` (`pnpm ds:probe-dossiers`)
- Guide : [SYNC-ERREURS-ET-REMEDIATION.md](../parcours/SYNC-ERREURS-ET-REMEDIATION.md)
- [ADR-0013](0013-remediation-dossiers-dn-sync-erreur.md) — amendé sur le point « GONE → reset »
- [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md) — sémantique `ds_status` / dépôt
- [ADR-0012](0012-url-reprise-dossier-basee-sur-depot.md) — URL « commencer » vs « reprendre »
- [ADR-0025](0025-lien-fpa-annotation-eligibilite.md) — annotation FPA (clé de réconciliation)
