# Base de données locale — reset, restauration, rôles

Tout ce qui touche à la base **locale** (Docker). Rien ici ne s'applique à un environnement
déployé.

Le conteneur s'appelle `fonds-argile-postgres`, la base `fonds_argile`, l'utilisateur
`fonds_argile_user` (cf. [`docker-compose.yml`](../../docker-compose.yml)).

## Démarrer, réinitialiser

```bash
pnpm db:start        # démarre PostgreSQL (Docker)
pnpm db:stop         # arrête
```

```bash
# Repartir d'une base vide : détruit le volume, recrée le conteneur, applique le schéma
pnpm db:reset && pnpm db:push:force
```

`db:reset` fait un `docker-compose down -v` : **le volume est supprimé**, toutes les données
locales sont perdues. C'est le but, mais c'est aussi sans confirmation.

```bash
pnpm db:studio       # Drizzle Studio (GUI) — pratique pour piocher un UUID
```

## Restaurer un dump dans la base locale

Un dump PostgreSQL (`.tar.gz` contenant un `.pgsql`) se charge dans la base locale en une
commande. Indiquer une fois le dossier de vos dumps dans `.env.local` :

```
DB_BACKUP_DIR=~/chemin/vers/mes/dumps
```

Puis :

```bash
pnpm db:restore
```

Sans argument, la commande liste les dumps du dossier, du plus récent au plus ancien ;
`Entrée` prend le plus récent. Si [`fzf`](https://github.com/junegunn/fzf) est installé, la
liste se filtre en tapant quelques lettres. On peut aussi nommer le fichier directement :
`pnpm db:restore mon-dump.tar.gz`.

Tout ce qui est réversible passe **avant** la confirmation : le script extrait l'archive dans
un dossier jetable, vérifie qu'elle contient exactement un `.pgsql`, le copie dans le conteneur
et contrôle que `pg_restore` sait le lire. Un dump illisible est donc refusé sans que la base
ait été touchée. Vient ensuite la **confirmation** : toute autre réponse que `o` abandonne sans
rien modifier. Après accord seulement, la base est supprimée (clients déconnectés), recréée
vide, puis restaurée. Les fichiers extraits sont effacés à toute sortie, erreur comprise.
Options :

| Option         | Effet                                                            |
| -------------- | ---------------------------------------------------------------- |
| `-d <dossier>` | Dossier des dumps, prioritaire sur tout le reste                 |
| `-k`           | Garde les fichiers temporaires après restauration                |
| `-y`           | Pas de confirmation : pour un appel scripté, jamais par habitude |
| `-h`           | Aide, avec le dossier effectivement retenu                       |

Ordre de résolution du dossier : `-d`, puis la variable d'environnement `DB_BACKUP_DIR`, puis
`DB_BACKUP_DIR` dans `.env.local`, et enfin `~/fonds-prevention-argile-backups`.

Le dossier doit être **hors du dépôt**, et c'est voulu : le script y décompresse le dump, donc
une copie en clair de la base. Dans le dépôt, un `git add -A` la publierait, et un agent de
code pourrait la lire. Le `.gitignore` bloque aussi `/backups/`, `*.pgsql`, `*.dump` et
`*.tar.gz`, en filet de sécurité si un dump y est déposé quand même.

> **Données de développement.** Le développement et les tests se font sur des données
> synthétiques (`pnpm seed:staging`) ou effectivement anonymisées **avant** leur transfert
> sur le poste. Une extraction nominative pour un diagnostic exceptionnel demande une
> justification tracée, le périmètre minimal, et une échéance de suppression qui couvre le
> dump, le volume Docker et les sauvegardes du poste. Neutraliser les intégrations sortantes
> avant de lancer l'app dessus : emails vers Mailhog, pas de token Brevo ni DN de production
> dans le `.env`. Pseudonymiser quelques emails ne rend pas un dump anonyme.

Vérifier que la restauration a abouti :

```bash
docker exec fonds-argile-postgres \
  psql -U fonds_argile_user -d fonds_argile -c "SELECT COUNT(*) FROM users;"
```

## Changer de rôle agent (tester les espaces du backoffice)

Pour parcourir les différents espaces sans repasser par ProConnect, on modifie directement
la ligne `agents` rattachée à l'email du compte. Le schéma est
[`src/shared/database/schema/agents.ts`](../../src/shared/database/schema/agents.ts) ; les
rôles et leurs périmètres sont décrits dans
[`docs/security/RBAC-ROLES.md`](../security/RBAC-ROLES.md).

Les 6 valeurs de l'enum `agent_role` :

`super_administrateur`, `administrateur`, `amo`, `allers_vers`, `amo_et_allers_vers`, `analyste`

Cohérence métier à respecter, sinon l'espace agent se bloque
([`AmoGuard`](<../../src/app/(backoffice)/components/AmoGuard.tsx>)) :

| Rôle visé            | `entreprise_amo_id` | `allers_vers_id` |
| -------------------- | ------------------- | ---------------- |
| `amo`                | obligatoire         | `NULL`           |
| `allers_vers`        | `NULL`              | obligatoire      |
| `amo_et_allers_vers` | obligatoire         | obligatoire      |
| tous les autres      | `NULL`              | `NULL`           |

Piocher d'abord les UUID nécessaires :

```bash
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -c "SELECT id, nom FROM entreprises_amo ORDER BY nom;" \
  -c "SELECT id, nom FROM allers_vers ORDER BY nom;"
```

Puis basculer le compte. `psql` substitue `:email` tel quel, d'où les quotes simples
imbriquées dans `-v` :

```bash
EMAIL="prenom.nom@beta.gouv.fr"

# Super-administrateur (ou administrateur / analyste : mêmes FK à NULL)
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="'$EMAIL'" \
  -c "UPDATE agents SET role = 'super_administrateur', entreprise_amo_id = NULL, allers_vers_id = NULL WHERE email = :email;"
```

```bash
EMAIL="prenom.nom@beta.gouv.fr"
AMO_ID="<uuid-entreprise-amo>"

# AMO
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="'$EMAIL'" -v amo_id="'$AMO_ID'" \
  -c "UPDATE agents SET role = 'amo', entreprise_amo_id = :amo_id, allers_vers_id = NULL WHERE email = :email;"
```

```bash
EMAIL="prenom.nom@beta.gouv.fr"
AV_ID="<uuid-allers-vers>"

# Aller-vers
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="'$EMAIL'" -v av_id="'$AV_ID'" \
  -c "UPDATE agents SET role = 'allers_vers', entreprise_amo_id = NULL, allers_vers_id = :av_id WHERE email = :email;"
```

Vérification :

```bash
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="'$EMAIL'" \
  -c "SELECT a.email, a.role, e.nom AS amo, av.nom AS allers_vers, a.desactive_at
      FROM agents a
      LEFT JOIN entreprises_amo e ON e.id = a.entreprise_amo_id
      LEFT JOIN allers_vers av    ON av.id = a.allers_vers_id
      WHERE a.email = :email;"
```

Trois pièges qui font perdre du temps :

- **`desactive_at` non nul coupe tout accès**, quel que soit le rôle
  ([RBAC §2.1](../security/RBAC-ROLES.md)) : un compte désactivé donne un espace agent vide
  et une redirection vers `/connexion/agent`. Le remettre à `NULL` pour tester.
- **Un `analyste` sans département est « national »** et n'a accès qu'aux statistiques, pas
  aux dossiers. Le mode départemental (« suivi DDT ») vient de la table `agent_permissions`
  (une ligne par `departement_code`), pas du rôle.
- **Se reconnecter après le changement.** Les gardes de page relisent le rôle en base
  (`getCurrentUser` utilise `agent.role`), mais le `middleware` aiguille sur le cookie
  `SESSION_ROLE` : sans reconnexion, les redirections restent celles de l'ancien rôle.

> Ces requêtes sont à réserver au **local**. Sur un environnement déployé, changer un rôle
> modifie les droits réels d'un agent : ça se fait depuis `/administration/agents`, qui trace
> l'opération.
