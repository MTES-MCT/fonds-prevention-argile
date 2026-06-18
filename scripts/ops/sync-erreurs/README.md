# Scripts — dossiers DN en sync-erreur

Toolkit de diagnostic et remédiation des parcours bloqués en `eligibilite/todo`, affichés
**SYNC EN ERREUR** sur `/administration/diagnostics`.

Guide complet (cas, sous-cas, playbook) : [docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md](../../../docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md).

Tous les scripts : **dry-run par défaut**, `--apply` pour écrire, `--anonymize` pour masquer
les PII. Ils chargent l'env via `../lib/db` (dotenv) ; ceux qui appellent DN importent
`graphqlClient` **après** pour garantir l'ordre de chargement.

| Script                              | Alias                             | Rôle                                                         |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `probe-dossiers.ts`                 | `pnpm ds:probe-dossiers`          | Sonde DN **lecture seule** (verdicts + cross-check email)    |
| `reset-eligibilite-sync-error.ts`   | `pnpm fix:eligibilite-sync-error` | **Reset** des dossiers confirmés disparus côté DN (drop-off) |
| `relink-eligibilite-dossier.ts`     | `pnpm fix:relink-eligibilite`     | **Relink** d'un mismatch (dossier réel sous un autre numéro) |
| `clean-faux-depots-submitted-at.ts` | `pnpm fix:clean-faux-depots`      | Nettoyage des faux `submitted_at` legacy (pré-#216)          |

Ordre recommandé : **probe** → resync (UI) → **relink** → **reset** → **clean**. Détails et
cas résolus : voir le playbook (§4 de la doc).
