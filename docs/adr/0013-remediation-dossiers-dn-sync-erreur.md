# ADR-0013 : Remédiation des dossiers DN en sync-erreur (vérification DN, erreur active)

**Date** : 2026-06-18
**Statut** : Accepté

## Contexte

Des parcours restent bloqués en `eligibilite/todo`, affichés **SYNC EN ERREUR** sur
`/administration/diagnostics`. Diagnostic complet (cf.
[SYNC-ERREURS-ET-REMEDIATION.md](../parcours/SYNC-ERREURS-ET-REMEDIATION.md)) :

- La cause dominante est le **drop-off** : l'app crée un dossier prérempli DN au clic
  « Remplir le formulaire », mais l'usager ne le complète jamais → DN purge le prérempli →
  `getDossier` renvoie « Dossier not found » → la sync échoue indéfiniment.
- Le signal `submitted_at` était **trompeur** : avant [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md)/#216,
  la création posait `ds_status = EN_CONSTRUCTION` **et** `submitted_at = now()` (faux dépôt).
  La migration 0034 a remis `ds_status` à NULL pour les dossiers jamais synchronisés mais a
  **laissé `submitted_at`**. Le seul signal fiable d'un vrai dépôt est **`last_sync_at`**.
- Le diagnostic classait en sync-erreur dès qu'une `sync_run_entries.error` non-null existait,
  **sans la comparer** à l'état courant → l'erreur « collait » même après remédiation.
- Un cas marginal : l'usager a un dossier réel **sous un autre numéro** (mismatch), souvent
  déjà **accepté**, que le pointeur local raté masquait.

Sur 46 cas réels : 43 drop-offs, 1 mismatch accepté, 2 dossiers existants à resynchroniser.

## Décision

> **1. Remédiation pilotée par la vérité DN, jamais à l'aveugle.** Avant toute suppression,
> on interroge DN (lecture seule) et on n'agit que sur les pointeurs **confirmés morts** :
>
> - dossier disparu côté DN (`not found`) + aucun dossier sous l'email → **reset**
>   (suppression de la ligne → nouveau lien « commencer ») ;
> - dossier existant sous un autre numéro → **relink** (repointage `ds_number`), pas reset ;
> - dossier existant côté DN → **resync**, on ne touche à rien.
>
> **2. `last_sync_at` est le signal de « vrai dépôt »**, pas `submitted_at`. La classification
> (`DOSSIER_DEPOSE_DISPARU` vs `DOSSIER_DN_NON_CREE`, sous-classification du probe) l'exige ;
> un script nettoie les faux `submitted_at` legacy (`last_sync_at IS NULL`).
>
> **3. Erreur de sync « active ».** Le diagnostic ne compte une erreur que si elle concerne
> encore le dossier courant : dossier présent, erreur postérieure à sa création, et aucune
> sync réussie depuis. Reset/resync font donc **disparaître** le parcours de la liste.

Outillage (scripts ops, dry-run par défaut, `--apply` pour écrire) :
`ds:probe-dossiers` (diagnostic lecture seule + cross-check email),
`fix:eligibilite-sync-error` (reset auto-vérifiant), `fix:relink-eligibilite` (relink),
`fix:clean-faux-depots` (nettoyage legacy).

## Options envisagées

- **Reset en masse à l'aveugle (sur `submitted_at IS NULL`)** : écarté — supprimerait des
  dossiers réels (mismatch accepté, dossiers existants), et l'heuristique `submitted_at` est
  faussée par les faux dépôts legacy.
- **Neutraliser l'historique `sync_run_entries.error`** pour vider la liste : écarté — perte
  d'audit et ne distingue pas « corrigé » de « encore cassé ». La règle « erreur active »
  obtient le même résultat sans réécrire l'historique.
- **Ne rien créer côté DN tant que l'usager n'a pas déposé** : piste valable pour la racine
  (évite les préremplis fantômes) mais structurante — hors scope de cette remédiation.

## Conséquences

- Les parcours réellement corrigés **quittent** la liste sync-erreur au prochain chargement.
- La remédiation est sûre par construction (vérification DN avant écriture) et rejouable.
- La **liste** du diagnostic reste DB-only mais affiche désormais un **verdict DN** persisté
  par la sync (`dn_probe_state`) + une sonde live à la demande bornée à la sous-population en
  erreur (cf. doc §7). Les sous-cas fins (drop-off vs mismatch) restent affinés sur la **page
  de détail** (cross-check DN live + recherche par email).
- Le drop-off de fond (préremplis non complétés) persiste tant qu'on crée le dossier DN au
  clic ; le diagnostic + les scripts permettent de le traiter en continu.

## Liens

- [SYNC-ERREURS-ET-REMEDIATION.md](../parcours/SYNC-ERREURS-ET-REMEDIATION.md) — guide, cas, playbook.
- [ADR-0009](0009-semantique-statut-ds-depose-vs-brouillon.md) — sémantique `ds_status` / `submitted_at`.
- [ADR-0012](0012-url-reprise-dossier-basee-sur-depot.md) — URL « commencer » vs « reprendre ».
- [FLOW-AND-SYNC.md](../parcours/FLOW-AND-SYNC.md) §7 — pièges DN.
