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

Le dump est **pseudonymisé par défaut** : noms, contacts, adresses, textes libres et jetons sont
remplacés par [`scripts/dev/anonymiser.sql`](../../scripts/dev/anonymiser.sql), colonne par colonne
selon [l'inventaire des données personnelles](../security/DONNEES-PERSONNELLES.md). Les agents en
`@beta.gouv.fr` et `@yopmail.com` sont conservés, pour se connecter en local avec son compte ou un
compte du bac à sable. Des contrôles en fin de script annulent tout s'il reste une donnée à
remplacer.

Tout ce qui est réversible passe **avant** la confirmation : le script extrait l'archive dans
un dossier jetable, vérifie qu'elle contient exactement un `.pgsql`, le copie dans le conteneur
et le fait lire **en entier** par `pg_restore`, vers `/dev/null`. Un dump illisible ou tronqué
est donc refusé sans que la base ait été touchée. Ce contrôle ne garantit pas que chaque
instruction SQL passera à la restauration (une extension manquante, par exemple), seulement que
le fichier est complet et lisible. Vient ensuite la **confirmation** : toute autre réponse que `o` abandonne sans
rien modifier. Après accord, le dump est restauré dans une base temporaire propre à l'exécution
(`fpa_restauration_<pid>`), pseudonymisé et contrôlé. Ensuite seulement, la base locale est fermée
aux connexions, ses clients déconnectés, et les deux bases échangent leur nom **dans une même
transaction** : un échec à n'importe quelle étape laisse la base locale en place, et l'application
ne lit jamais une base en clair. L'ancienne base est supprimée après l'échange. Les fichiers extraits
et la base temporaire sont effacés à toute sortie, erreur comprise ; une base temporaire laissée par
une restauration tuée (`kill -9`, terminal fermé) est supprimée au lancement suivant. Le bilan
affiché en fin de pseudonymisation compte les lignes traitées et liste les clés de simulation
retirées (inconnues ou de forme inattendue).
Options :

| Option         | Effet                                                            |
| -------------- | ---------------------------------------------------------------- |
| `-d <dossier>` | Dossier des dumps, prioritaire sur tout le reste                 |
| `-k`           | Garde les fichiers temporaires après restauration                |
| `-n`           | Garde les données nominatives : diagnostic exceptionnel justifié |
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
> sur le poste. La pseudonymisation de `db:restore` protège la base locale, pas le dump, qui reste
> en clair dans le dossier des sauvegardes ; et une base pseudonymisée reste une donnée
> personnelle (commune, année de construction et revenu suffisent parfois à retrouver un ménage). Une extraction nominative pour un diagnostic exceptionnel demande une
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

Depuis la migration `0059` ([ADR-0051](../adr/0051-roles-amo-aller-vers-portes-par-la-structure.md)),
le rôle d'un agent vient de deux sources exclusives :

| Compte                 | Ce qui fait le rôle                                                      | `structure_id` |
| ---------------------- | ------------------------------------------------------------------------ | -------------- |
| Plateforme             | la colonne `role` : `super_administrateur`, `administrateur`, `analyste` | `NULL`         |
| Membre d'une structure | les habilitations de la structure : sa ligne AMO, sa ligne Aller-vers    | obligatoire    |

Les colonnes `role`, `entreprise_amo_id` et `allers_vers_id` d'un membre de structure ne sont
plus lues (elles ne servent qu'au retour arrière) : inutile de les modifier en local, et risqué
(cinquième piège ci-dessous).

Piocher d'abord la structure, avec les rôles qu'elle donne :

```bash
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile <<'SQL'
SELECT s.id, s.nom, ea.nom AS amo, av.nom AS allers_vers
FROM structures s
LEFT JOIN entreprises_amo ea ON ea.structure_id = s.id
LEFT JOIN allers_vers av ON av.structure_id = s.id
ORDER BY s.nom;
SQL
```

Puis basculer le compte. La requête passe par l'**entrée standard** : `psql` n'interpole ses
variables ni dans `-c`, ni sans la forme `:'email'`, qui les échappe. Les valeurs se donnent
donc brutes, sans guillemets :

```bash
EMAIL="prenom.nom@beta.gouv.fr"

# Super-administrateur (ou administrateur / analyste)
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v ON_ERROR_STOP=1 -v email="$EMAIL" <<'SQL'
UPDATE agents SET role = 'super_administrateur', structure_id = NULL
WHERE email = :'email';
SQL
```

```bash
EMAIL="prenom.nom@beta.gouv.fr"
STRUCTURE_ID="<uuid-structure>"

# Membre d'une structure : AMO, Aller-vers ou les deux, selon ses habilitations
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v ON_ERROR_STOP=1 -v email="$EMAIL" -v structure_id="$STRUCTURE_ID" <<'SQL'
UPDATE agents SET structure_id = :'structure_id'
WHERE email = :'email';
SQL
```

Vérification :

```bash
docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile \
  -v email="$EMAIL" <<'SQL'
SELECT a.email, a.role AS role_plateforme, s.nom AS structure, ea.nom AS amo, av.nom AS allers_vers, a.desactive_at
FROM agents a
LEFT JOIN structures s       ON s.id = a.structure_id
LEFT JOIN entreprises_amo ea ON ea.structure_id = a.structure_id
LEFT JOIN allers_vers av     ON av.structure_id = a.structure_id
WHERE a.email = :'email';
SQL
```

Cinq pièges qui font perdre du temps :

- **Une structure sans habilitation, ou un rôle `amo` / `allers_vers` sans structure, ne donne
  aucun rôle** : le compte est refusé partout, comme un compte désactivé.
- **`desactive_at` non nul coupe tout accès**, quel que soit le rôle
  ([RBAC §2.1](../security/RBAC-ROLES.md)) : un compte désactivé donne un espace agent vide
  et une redirection vers `/connexion/agent`. Le remettre à `NULL` pour tester.
- **Un `analyste` sans département est « national »** et n'a accès qu'aux statistiques, pas
  aux dossiers. Le mode départemental (« suivi DDT ») vient de la table `agent_permissions`
  (une ligne par `departement_code`), pas du rôle.
- **Modifier `role`, `entreprise_amo_id` ou `allers_vers_id` sans `structure_id` recalcule la
  structure** depuis ces colonnes (trigger transitoire de l'ADR-0051) : `role = 'amo'` sans
  `entreprise_amo_id` retire la structure, donc le rôle. Changer de structure par `structure_id`.
- **Se reconnecter après le changement.** Les gardes de page relisent le rôle en base
  (`getCurrentUser`, rôle dérivé de la structure), mais le `middleware` aiguille sur le cookie
  `SESSION_ROLE` : sans reconnexion, les redirections restent celles de l'ancien rôle.

> Ces requêtes sont à réserver au **local**. Sur un environnement déployé, changer un rôle
> modifie les droits réels d'un agent : ça se fait depuis `/administration/agents`, qui trace
> l'opération.
