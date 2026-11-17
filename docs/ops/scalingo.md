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

> **Aucun `DATABASE_URL` n'est en lecture seule, staging compris** : son rôle a le droit de
> modifier les tables (vérifié le 28/09/2026 avec
> `SELECT has_table_privilege(current_user, 'users', 'UPDATE')`). L'exporter dans un shell
> local reste possible pour un script qui ne fait que lire, comme `pnpm qa:cas-de-test`, mais
> tout ce qui est lancé dans ce shell écrit sur staging. Rester en lecture est une discipline,
> pas une contrainte technique, sur staging comme en prod. `pnpm seed:staging` refuse
> désormais une base distante sans `--yes-staging`, même si `.env.local` annonce « local ».

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
# Puis, après avoir lu l'inventaire, un dossier à la fois
scalingo --app fonds-argile --region osc-secnum-fr1 run "pnpm fix:lier-amo-oblig --parcours-id=<uuid> --apply"
```

> Ce script **écrit en production et envoie des emails** : chaque validation créée déclenche
> l'invitation de l'AMO. Sans `--parcours-id`, `--apply` traite d'un coup tous les dossiers de
> l'inventaire. Cibler un dossier est la règle ; un `--apply` global se décide après lecture de
> l'inventaire complet, pas par copier-coller.

**Les guillemets autour de la commande ne sont pas optionnels** : sans eux, la CLI Scalingo
interprète `--apply` comme un de ses propres flags et le script tourne en dry-run — on croit
avoir corrigé alors que rien n'est écrit.

Inventaire des scripts et de leurs flags : [`scripts/ops/README.md`](../../scripts/ops/README.md).

## Mémoire du conteneur

```bash
scalingo --app fonds-argile-staging --region osc-fr1 stats
```

Le pourcentage affiché **compte le cache de fichiers** : mesuré le 16 novembre 2026, 300 Mo écrits
sur disque dans un one-off s'affichent 311 MiB pour 2 Mo de mémoire réelle. Un conteneur à 95 % peut
donc aller bien.

Le **swap** seul ne dit pas davantage que le conteneur sature : le 17 novembre, `web-1` l'a gardé plein
(128 MiB) pendant sept heures avec 150 Mo de mémoire réelle sur 512, sans gel ni timeout. La machine
hôte, elle, n'avait que 3,8 Go disponibles sur 57,6 et 14,5 Go en swap (lu dans un one-off) : c'est
probablement elle qui pousse en swap les pages peu utilisées de ses conteneurs.

Le 15 novembre 2026, le staging s'est figé, mémoire et swap pleins : plus aucune connexion PostgreSQL
n'aboutissait (`CONNECT_TIMEOUT` dans les logs), les pages expiraient et le cron de synchronisation a
échoué, jusqu'au `restart`. La cause n'est pas établie. Repères : le serveur pèse 188 Mo à froid,
240 Mo après dix minutes de trafic, 280 Mo après dix-sept heures.

### Relevé mémoire dans les logs

Pour savoir ce qui grossit, deux variables activent un relevé périodique, lu au démarrage du
serveur : les poser, puis redémarrer.

```bash
scalingo --app fonds-argile-staging --region osc-fr1 env-set MEMORY_LOG_INTERVAL_MINUTES=10 MEMORY_LOG_TOP_ALLOCATIONS=8
```

```bash
scalingo --app fonds-argile-staging --region osc-fr1 restart
```

```bash
# L'évolution, une ligne par relevé (valeurs en Mo)
scalingo --app fonds-argile-staging --region osc-fr1 logs --lines 5000 | grep "\[memoire\] actif" | sort
```

```bash
# Les fonctions dont la mémoire retenue a le plus grossi depuis le premier relevé
scalingo --app fonds-argile-staging --region osc-fr1 logs --lines 5000 | grep "\[memoire\] alloc" | sort | tail -8
```

La colonne qui monte d'un relevé à l'autre désigne la piste :

| Colonne qui monte              | Ce que ça désigne                                                   |
| ------------------------------ | ------------------------------------------------------------------- |
| `anon` + `swap`                | Mémoire réelle du serveur, où qu'elle soit : c'est elle qui grossit |
| `tas`, `vieux`, `grands`       | Objets JavaScript retenus : le coupable est dans les lignes `alloc` |
| `buffers`, `externe`           | Tampons binaires (réponses HTTP, fichiers) gardés en mémoire        |
| `horsTas` seul, `tas` stable   | Mémoire native : traitement d'images (`sharp`), fragmentation       |
| `ressources` (`TCPSocketWrap`) | Connexions ou minuteurs jamais fermés                               |
| `cache` seul                   | Cache de fichiers, que le noyau reprend au besoin : rien à corriger |
| `limite`                       | Le conteneur a buté sur ses 512 Mo : son contenu est en cause       |
| `swapRefuse`                   | Le swap du conteneur était plein quand le noyau a voulu y écrire    |
| `tues`                         | Un processus du conteneur a été tué faute de mémoire                |
| `ralenti`, `bloque`            | Secondes passées à attendre de la mémoire : `bloque` qui monte, gel |

`limite`, `swapRefuse`, `tues`, `ralenti` et `bloque` sont cumulés depuis la création du conteneur.
`hote dispo` et `hote swapLibre` décrivent la machine hôte (`/proc/meminfo`), pas le conteneur.

Le swap vient-il du code ? Trois lectures, sur les relevés où `swap` monte :

| Ce qu'on lit                                        | Conclusion                                               |
| --------------------------------------------------- | -------------------------------------------------------- |
| `limite` ne bouge pas, `hote dispo` est bas         | L'hôte reprend de la mémoire : le code n'y est pour rien |
| `limite` monte, `anon` + `swap` loin des 512 Mo     | Le cache de fichiers remplit le conteneur, sans gravité  |
| `limite` monte, `anon` + `swap` approche des 512 Mo | Le serveur grossit : chercher dans `tas` et `alloc`      |

Une ligne `alloc` se lit `+12.3 Mo (41.0 Mo) fonction (fichier:ligne:colonne) < appelant` :
croissance depuis le premier relevé, taille actuelle, puis la fonction applicative la plus proche de
l'allocation. Le fichier est relatif à `.next/server/` (`nm/` pour `node_modules`) ; le code y est
minifié, la colonne se retrouve dans le fichier du même build. `MEMORY_LOG_TOP_ALLOCATIONS` absente
ou à 0 : seule la ligne de synthèse est écrite, sans échantillonnage des allocations.

`total` est la mémoire que `scalingo stats` affiche, cache de fichiers et mémoire du noyau compris ;
`enSwap` est la part du processus Node partie en swap, comptée dans `horsTas`.

Limites : les allocations sont échantillonnées (une tous les 128 Kio), et rien n'y explique une
hausse de `horsTas`. Le relevé ne voit que le serveur en marche, pas le build d'un déploiement, qui
tourne dans un autre conteneur. Retirer les deux variables (`env-unset`) une fois la cause trouvée.

## Divers

```bash
# Connaître l'IP sortante (autorisations réseau, allowlists)
curl https://api.ipify.org
```
