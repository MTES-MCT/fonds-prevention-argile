# Scripts — dossiers DN en sync-erreur

Toolkit de diagnostic et remédiation des parcours bloqués en `eligibilite/todo`, affichés
**SYNC EN ERREUR** sur `/administration/diagnostics`.

Guide complet (cas, sous-cas, playbook) : [docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md](../../../docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md).

Tous les scripts : **dry-run par défaut**, `--anonymize` pour masquer les PII. `--apply`
écrit — **sauf `fix:eligibilite-sync-error`, dont le `--apply` est gelé** (refus + sortie en
erreur, cf. [ADR-0026](../../../docs/adr/0026-gel-reset-eligibilite-not-found.md) et l'encadré
en bas de page) : il ne reste utilisable qu'en dry-run, comme diagnostic. Ils chargent l'env
via `../lib/db` (dotenv) ; ceux qui appellent DN importent `graphqlClient` **après** pour
garantir l'ordre de chargement.

| Script                              | Alias                             | Rôle                                                               |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `probe-dossiers.ts`                 | `pnpm ds:probe-dossiers`          | Sonde DN **lecture seule** (verdicts + cross-check email)          |
| `reset-eligibilite-sync-error.ts`   | `pnpm fix:eligibilite-sync-error` | **GELÉ** (`--apply` refusé, ADR-0026) — dry-run diagnostic seul    |
| `relink-eligibilite-dossier.ts`     | `pnpm fix:relink-eligibilite`     | **Relink** d'un mismatch (dossier réel sous un autre numéro)       |
| `clean-faux-depots-submitted-at.ts` | `pnpm fix:clean-faux-depots`      | Nettoyage des faux `submitted_at` legacy (pré-#216)                |
| `backfill-tentatives.ts`            | `pnpm ds:backfill-tentatives`     | Amorce le registre des tentatives DN (ADR-0027)                    |
| `reconcilier-dossiers.ts`           | `pnpm ds:reconcilier`             | Rattache les dossiers déposés à leur parcours via l'annotation FPA |

Ordre recommandé : **backfill** (registre) → **analyse** (interface ou `ds:reconcilier`) →
traitement des deux files → resync (UI). `probe` et `relink` restent utiles pour un cas isolé.
Détails : voir le playbook (§4 de la doc).

> Le **reset est gelé** ([ADR-0026](../../../docs/adr/0026-gel-reset-eligibilite-not-found.md)) :
> un prérempli non déposé est invisible de l'API instructeur et répond `Dossier not found`
> comme un dossier purgé, donc le verdict GONE ne prouve rien. Supprimer la ligne orpheline
> le dossier que l'usager déposera plus tard. Réparer par **relink**, jamais par suppression.
