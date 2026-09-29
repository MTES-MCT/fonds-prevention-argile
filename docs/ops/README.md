# Ops — commandes et requêtes du quotidien

Aide-mémoire opérationnel : se connecter à un environnement, lire des logs, diagnostiquer
un dossier, restaurer une base en local. Des commandes à copier-coller, pas un guide
d'architecture.

> Pour le **fonctionnement** du parcours et de la synchronisation, voir
> [`docs/parcours/FLOW-AND-SYNC.md`](../parcours/FLOW-AND-SYNC.md). Pour les **droits**,
> [`docs/security/RBAC-ROLES.md`](../security/RBAC-ROLES.md).

## J'ai besoin de…

| Besoin                                                    | Fichier                                          |
| --------------------------------------------------------- | ------------------------------------------------ |
| Me connecter à staging/prod, lire les logs, ouvrir `psql` | [`scalingo.md`](./scalingo.md)                   |
| Restaurer un backup en local, changer de rôle agent       | [`db-local.md`](./db-local.md)                   |
| Savoir où en est un demandeur (support, QA)               | [`requetes-support.md`](./requetes-support.md)   |
| Tester les webhooks Brevo                                 | [`webhooks-brevo.md`](./webhooks-brevo.md)       |
| Importer ou réimporter des structures AMO / Allers-Vers   | [`import-structures.md`](./import-structures.md) |

## Deux règles pour tout ce dossier

**Aucun secret ici.** Les commandes utilisent des variables (`$BREVO_WEBHOOK_SECRET`,
`$DATABASE_URL`) et chaque fichier dit où récupérer la valeur. Un secret collé dans un
fichier du repo est un secret à révoquer — cf.
[`.claude/context/security-rules.md`](../../.claude/context/security-rules.md).

**Aucune écriture en base à la main.** Ce dossier ne contient que de la **lecture** sur les
environnements déployés. Toute correction de données passe par un script `scripts/ops/`,
qui est en dry-run par défaut, tracé et rejouable — voir
[`scripts/ops/README.md`](../../scripts/ops/README.md). Un `UPDATE` tapé dans un `psql` de
prod n'est ni relu, ni testé, ni réversible.
