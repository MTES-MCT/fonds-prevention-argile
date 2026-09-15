# Scalingo — se connecter, lire les logs, diagnostiquer

Commandes de **lecture et de diagnostic** sur les environnements déployés.

> **Les commandes destructrices ne sont pas dans ce fichier, volontairement.** Pas de
> `DELETE`, pas de `DROP SCHEMA`, pas de `db:push:force`. Les remettre à côté de la
> commande de connexion prod, c'est prendre le risque d'un copier-coller dans le mauvais
> terminal. Pour corriger des données, voir [Lancer un script ops](#lancer-un-script-ops).

## Les deux apps

| Environnement  | App                    | Région           | URL publique                                         |
| -------------- | ---------------------- | ---------------- | ---------------------------------------------------- |
| Staging        | `fonds-argile-staging` | `osc-fr1`        | https://staging.fonds-prevention-argile.beta.gouv.fr |
| **Production** | `fonds-argile`         | `osc-secnum-fr1` | https://fonds-prevention-argile.beta.gouv.fr         |

La région n'est pas la même de part et d'autre : **une commande prod avec `osc-fr1` échoue**
(app introuvable), ce qui est un garde-fou plutôt qu'une gêne. L'inverse est vrai aussi.

Pour éviter de retaper l'app et la région à chaque fois — et de se tromper d'environnement,
ce qui est le vrai risque :

```bash
alias sg-staging='scalingo --app fonds-argile-staging --region osc-fr1'
alias sg-prod='scalingo --app fonds-argile --region osc-secnum-fr1'
```

Les exemples ci-dessous sont écrits en clair (sans alias) pour rester copiables tels quels.

## Se connecter au conteneur

Ouvre un one-off (conteneur jetable, avec le code et les variables d'env de l'app) :

```bash
scalingo --app fonds-argile-staging --region osc-fr1 run bash
```

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 run bash
```

## Logs

```bash
# Suivre en direct
scalingo --app fonds-argile-staging --region osc-fr1 logs -f
```

```bash
# Les N dernières lignes
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000
```

```bash
# Filtrer sur un sujet
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000 | grep -iE "rga|sitemap" | head -50
```

```bash
# Les erreurs, en écartant le bruit des webhooks Brevo
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000 \
  | grep -iv "brevo webhook" \
  | grep -iE "error|erreur|failed|exception"
```

Quand la sortie est trop longue pour être lue d'un bloc, passer par un fichier temporaire
plutôt que de scroller :

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000 \
  | grep -iv "brevo webhook" | grep -iE "error|erreur|failed|exception" \
  > /tmp/logs-erreurs.txt
wc -l /tmp/logs-erreurs.txt && tail -50 /tmp/logs-erreurs.txt
rm /tmp/logs-erreurs.txt
```

## psql (lecture)

Depuis un one-off (`run bash`), le client `psql` est déjà présent et `$SCALINGO_POSTGRESQL_URL`
est déjà renseignée. Le `PAGER=cat` évite de rester coincé dans `less` :

```bash
PAGER=cat psql $SCALINGO_POSTGRESQL_URL
```

Repères une fois dans le prompt :

```sql
\dt                 -- lister les tables
\d users            -- structure d'une table
\x on               -- affichage vertical (lisible sur les tables larges)
\q                  -- quitter
```

> Le `DATABASE_URL` de **staging** est en lecture seule et peut donc être utilisé depuis un
> shell local (utile pour `pnpm qa:cas-de-test`, cf. `CLAUDE.md`). Celui de **prod**, non :
> y rester en lecture est une discipline, pas une contrainte technique.

## Requêtes de lecture courantes

Volumétrie, pour vérifier qu'un environnement n'est pas vide après un déploiement ou un seed :

```sql
SELECT
  (SELECT COUNT(*) FROM users)                          AS users,
  (SELECT COUNT(*) FROM parcours_prevention)            AS parcours,
  (SELECT COUNT(*) FROM agents)                         AS agents,
  (SELECT COUNT(*) FROM entreprises_amo)                AS amo,
  (SELECT COUNT(*) FROM allers_vers)                    AS allers_vers,
  (SELECT COUNT(*) FROM parcours_amo_validations)       AS validations_amo,
  (SELECT COUNT(*) FROM dossiers_demarches_simplifiees) AS dossiers_ds;
```

État des migrations appliquées :

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 10;
```

Parcours sans EPCI résolu (diagnostic de couverture territoriale — voir `pnpm fix:epci`) :

```sql
SELECT COUNT(*) AS parcours_sans_epci
FROM parcours_prevention pp
WHERE pp.rga_simulation_data IS NOT NULL
  AND (pp.rga_simulation_data->'logement'->>'epci' IS NULL
    OR pp.rga_simulation_data->'logement'->>'epci' = '');
```

Pour retrouver un demandeur et lire l'état de son dossier, voir
[`requetes-support.md`](./requetes-support.md) — ces requêtes touchent à des données
nominatives et ont leurs propres précautions.

## CRON et jobs

```bash
scalingo --app fonds-argile-staging --region osc-fr1 cron-tasks
```

Depuis un one-off, la définition effective :

```bash
cat /app/cron.json
```

La synchronisation des parcours n'est pas un cron Scalingo mais un **workflow GitHub Actions**
qui appelle `POST /api/cron/sync-parcours` (3 fois par jour). Voir
[`FLOW-AND-SYNC.md` §4.3](../parcours/FLOW-AND-SYNC.md). Un super-admin peut aussi déclencher
une synchro depuis `/administration/synchronisations`.

## Variables d'environnement

```bash
scalingo --app fonds-argile-staging --region osc-fr1 env
```

```bash
# Une seule variable
scalingo --app fonds-argile --region osc-secnum-fr1 env | grep BREVO
```

La sortie de `env` contient **tous les secrets de l'app** : ne pas la rediriger vers un
fichier du repo, ne pas la coller dans un ticket ou une conversation.

## Lancer un script ops

Les corrections de données passent par les scripts `scripts/ops/`, lancés dans un one-off.
Ils sont en **dry-run par défaut** : `--apply` est ce qui écrit.

```bash
# Inventaire (n'écrit rien)
scalingo --app fonds-argile --region osc-secnum-fr1 run "pnpm fix:lier-amo-oblig"
```

```bash
# Puis, après avoir lu l'inventaire
scalingo --app fonds-argile --region osc-secnum-fr1 run "pnpm fix:lier-amo-oblig --apply"
```

**Les guillemets autour de la commande ne sont pas optionnels** : sans eux, la CLI Scalingo
interprète `--apply` comme un de ses propres flags et le script tourne en dry-run — on croit
avoir corrigé alors que rien n'est écrit.

Inventaire des scripts et de leurs flags : [`scripts/ops/README.md`](../../scripts/ops/README.md).

## Divers

```bash
# Connaître l'IP sortante (autorisations réseau, allowlists)
curl https://api.ipify.org
```
