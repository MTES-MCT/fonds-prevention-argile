# ADR-0055 : Journal de sécurité écrit sur la sortie standard

**Date** : 2026-11-23
**Statut** : Accepté

## Contexte

Le socle de sécurité de l'homologation demande trois choses : des journaux d'accès et d'activité
d'administration, centralisés et indexés, conservés au moins douze mois.

L'application n'en avait pas. L'historique d'un dossier (`parcours_actions`, ADR-0028) trace les
décisions métier, mais rien ne disait qui s'était connecté, quelle connexion avait été refusée, ni qui
avait créé un agent, changé une habilitation ou importé des structures. Les 400 appels à `console.*` du
code sont des messages de diagnostic, sans format ni liste d'évènements.

Scalingo conserve un an tout ce que l'application écrit sur sa sortie standard (« all logs on Scalingo
are kept for 1 year », documentation relue le 23 novembre 2026) : les lignes récentes se lisent avec
`scalingo logs`, les plus anciennes dans des archives de 50 Mio.

## Décision

> Un évènement de sécurité s'écrit par une seule fonction, `journaliser`, sous la forme d'une ligne JSON
> sur la sortie standard. L'hébergeur en assure la conservation.

- **Une ligne par évènement**, reconnaissable à `"journal":"securite"` : date, évènement, résultat
  (`succes`, `refus`, `echec`), acteur, cible, motif, détails, adresse IP.
- **Une liste fermée d'évènements** (`EVENEMENTS_SECURITE`) : connexions et déconnexions, accès refusés à
  une route protégée par un secret, dépassements de débit, et toute écriture faite depuis
  l'administration. Le registre est dans [JOURNALISATION.md](../security/JOURNALISATION.md).
- **Des identifiants, jamais des identités** : l'acteur et la cible sont des identifiants techniques. Ni
  nom, ni email, ni texte saisi. Un filet masque toute valeur contenant `@` et tronque à 120 caractères.
- **L'adresse IP est journalisée** : c'est ce qui permet d'attribuer une connexion ou une action. Elle ne
  l'était nulle part avant (ADR-0054 la gardait hors des journaux).
- **Le journal n'échoue jamais** : une écriture impossible ne doit pas invalider l'opération tracée.
- **Un test refuse une action d'administration qui n'écrit pas au journal**, sauf si elle est déclarée
  comme une lecture (`administration/journal-actions.test.ts`).

## Options envisagées

### Option A — Lignes JSON sur la sortie standard (retenue)

- Avantages : aucune table, aucune migration, aucun service à souscrire ; la conservation d'un an est
  celle de l'hébergeur, hors de portée de l'application ; le journal sort de la base, qu'un compte
  applicatif compromis pourrait réécrire ; un collecteur de journaux se branche sans changer le code.
- Inconvénients : sans collecteur, la recherche se fait par `grep` sur des archives à télécharger, ce
  qui n'est pas un journal « indexé » ; un an est exactement le minimum demandé, sans marge.

### Option B — Table `journal_securite` en base

- Avantages : requêtable et indexé d'emblée, affichable dans l'administration, durée de conservation
  choisie par nous.
- Inconvénients : le journal vit dans la base qu'il surveille, modifiable par le même rôle PostgreSQL ;
  une table de plus de données personnelles (identifiants, adresses IP) dans chaque dump, à pseudonymiser
  et à purger ; une écriture en base sur le chemin de chaque connexion.

### Option C — Service de journalisation tiers appelé par l'application

- Avantages : indexation et alertes.
- Inconvénients : un sous-traitant de plus à contractualiser et à inscrire au dossier ; un appel réseau
  par évènement ; rien que le collecteur de l'hébergeur ne fasse sans toucher au code.

## Conséquences

### Positives

- Les connexions, leurs refus et les écritures de l'administration sont attribuables à un agent, une
  date et une adresse.
- La liste des évènements est fermée et testée : en ajouter un se voit dans une PR.
- Le dossier d'homologation dispose d'un registre des évènements et d'une durée de conservation citée.

### Négatives / Risques

- **« Indexé » n'est pas tenu sans collecteur.** Brancher un collecteur Scalingo (`log-drains-add`) vers
  un service de recherche reste à arbitrer et se fait hors du dépôt.
- **Douze mois sans marge**, et sur la foi de la documentation de l'hébergeur : à faire confirmer pour la
  région de production, et à porter au contrat.
- **L'adresse IP et l'identifiant d'un agent sont des données personnelles** conservées un an hors de la
  base : à inscrire au registre des traitements.
- **Les lectures ne sont pas journalisées**, y compris la consultation de la liste nominative des
  demandeurs, ni les refus d'accès aux pages et aux actions de l'administration.
- Les requêtes HTTP elles-mêmes ne sont pas dans ce journal : c'est le rôle des journaux du routeur de
  l'hébergeur, désactivés par défaut.

## Liens

- Journal : `src/shared/services/journal-securite/journal-securite.ts`
- Registre des évènements : [JOURNALISATION.md](../security/JOURNALISATION.md)
- Test : `src/features/backoffice/administration/journal-actions.test.ts`
- Historique métier d'un dossier : [ADR-0028](0028-actions-automatiques-decisions-et-archivage.md)
- Journaux Scalingo : <https://doc.scalingo.com/platform/app/logs>
