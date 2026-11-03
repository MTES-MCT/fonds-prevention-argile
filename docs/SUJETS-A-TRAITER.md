# Sujets à traiter plus tard

Sujets identifiés et volontairement reportés : ce qu'on sait du problème, ce qui reste à décider,
et ce qu'il faut faire avant de s'y mettre. Le détail reste dans la doc de référence, vers laquelle
chaque entrée renvoie.

> Ajouter une entrée quand un sujet est écarté d'une PR (revue, périmètre, arbitrage en attente) ;
> la retirer dans la PR qui le traite. Une entrée dit **pourquoi** c'est reporté et **quel préalable**
> la débloque, sinon elle ne sert à rien.

---

## Doublons de demandeur

### Trier les 8 paires invitation / compte FranceConnect au même email

Relevées le 2 novembre 2026 (section 10 de la requête de diagnostic d'ADR-0050) : chaque fois, un
agent a invité un demandeur qui avait déjà un compte FranceConnect. Plusieurs sont mortes d'un côté
(dossier archivé), trois invitations ont encore un jeton valide : désormais, un clic sur l'une d'elles
connecte le demandeur à son compte et trace le conflit au lieu de planter.

**Préalable** : les décisions métier sont prises (3 novembre 2026, six doublons, dont deux trouvés
par homonymie) ; il reste à les exécuter avec `pnpm fix:fusionner-invite`, `--avec-qualifications` ou
`--supprimer-seulement` selon la décision. Un dossier invité portant un formulaire DN reste à traiter à
la main. Le contact Brevo d'un stub supprimé n'est pas effacé : à décider si on le purge.

### Revue de la PR doublons : points écartés et questions métier

Relevés par la revue du 2 novembre 2026, laissés hors de la PR :

- **Vérification et création non atomiques** : deux agents qui créent le même demandeur à la même
  seconde passent tous deux le contrôle d'email. Écarté : fenêtre de quelques millisecondes, aucune
  contrainte d'unicité possible sur l'email (adresses partagées), et le doublon éventuel est désormais
  signalé au rattachement puis réparable par `fix:fusionner-invite`. À reprendre si des doublons
  réapparaissent malgré la garde.
- **Index pour la détection** : `LOWER(email)` et l'adresse JSONB sont parcourus sans index, à chaque
  création par un agent seulement, sur quelques milliers de lignes. À mesurer (`EXPLAIN ANALYZE` sur
  une copie) si la volumétrie change d'ordre de grandeur.
- **Questions métier** : faut-il une dérogation quand deux demandeurs partagent un email (le message
  affirme « ce demandeur a déjà un compte ») ? Accepte-t-on que la réponse distingue compte et
  invitation, et confirme un logement connu, hors du périmètre de l'agent ? La simulation de l'agent
  copiée par la fusion doit-elle fermer l'édition du demandeur comme une correction ? Faut-il tracer
  la fusion dans l'historique (aujourd'hui, les actions déplacées gardent leur libellé d'origine, sans
  mention du rapprochement) ? Que faire du contact Brevo du stub supprimé ?

**Préalable** : arbitrage produit sur les questions métier ; mesure de volumétrie pour les index.

---

## Rôles portés par la structure (ADR-0051)

### Page « Structures » de l'administration

La PR 1 ne crée une structure qu'à l'import d'une AMO ou d'un Aller-vers, et le formulaire agent ne
fait que choisir une structure existante. Il manque une page pour lister les structures et leurs
rôles, les renommer, rattacher l'habilitation d'une autre structure (fusion) ou la détacher, et voir
leurs agents. Un rattachement d'habilitation doit réaligner les colonnes héritées de ses agents
(`resynchroniserColonnesHeritees`).

**Préalable** : la PR 1 en production.

### Nettoyage : trigger transitoire et colonnes héritées

Les triggers `structure_par_defaut_*` et `agents_structure_depuis_rattachements` et les colonnes
`agents.role` / `entreprise_amo_id` / `allers_vers_id` ne servent qu'au retour arrière. À supprimer (avec les trois valeurs de rôle de
structure de l'enum `agent_role`, procédé de la migration `0036`), puis poser la contrainte « rôle
plateforme XOR structure ». Ce nettoyage rend le retour arrière impossible.

**Préalable** : une release complète sans retour arrière après la PR 1.

### Comportements conservés tels quels

- Union des territoires d'un agent hybride face au responsable d'un dossier, et délégation
  départementale de `canActAsResponsable` : inchangées, à réexaminer si une structure à deux rôles
  le demande.
- `avCumuleAmo` (règle départementale) reste distinct d'une structure à deux rôles, tant que la règle
  métier n'est pas réarbitrée.
- Fin d'activité AMO d'une structure sans perdre l'historique : impossible aujourd'hui comme demain,
  les validations bloquant la suppression de la ligne AMO.

**Préalable** : un besoin métier exprimé.

---

## Synchronisation DN

### Rattraper les dossiers classés sans suite des parcours archivés ou complétés

- **Constat** : avant la PR #392, la synchro recopiait l'état DN `sans_suite`, refusé par l'enum
  `ds_status`. Les dossiers concernés sont restés figés à leur ancien état, sans `processed_at`.
  Le CRON rattrape les parcours actifs à son premier passage, mais `findActiveForSync` exclut les
  parcours archivés ou complétés, et `pnpm ds:backfill-processed-at` ne sélectionne que les dossiers
  déjà finaux en base. Ceux-là restent donc faux.
- **Préalable** : mesurer en production avec `pnpm ds:analyser-ecarts` (cause « classé sans suite dans DN,
  jamais recopié en base »), après le déploiement de #392 et un premier run du CRON. Ce script vit sur la
  branche `feat/audit-ecarts-dn`, pas encore mergée : il faut la merger d'abord.
- **À faire si des dossiers restent** : un script ops ponctuel, dry-run par défaut, qui écrit le
  statut traduit (`dsStatusFromEtatDn`) et les dates DN, **sans** progression ni réouverture du
  parcours.
- **Référence** : [FLOW-AND-SYNC §3.2](parcours/FLOW-AND-SYNC.md#32-mapping-ds--interne).

### Un lien FPA remplacé par du texte échappe à la détection « modifié à la main »

- **Constat** : `lireAnnotationFpa` ne relève `prefilledValueModified` que sur une annotation dont la
  valeur contient encore l'URL du dossier. Une annotation écrasée par un texte libre n'est donc pas
  vue comme modifiée : la réconciliation et `pnpm ds:analyser-ecarts` la classent comme dossier sans
  lien FPA, au lieu de la signaler pour arbitrage.
- **Pourquoi reporté** : le helper sert la réconciliation en écriture (`--apply`) ; changer son verdict
  change les rattachements, ce qui sort d'une PR de script d'analyse.
- **À faire** : lire le drapeau du descripteur FPA avant d'analyser sa valeur, avec un test sur une
  annotation modifiée devenue illisible.
- **Référence** : [FLOW-AND-SYNC §2.6.1](parcours/FLOW-AND-SYNC.md#261-annotation-privée--lien-vers-le-dossier-fpa--adr-0025).

### Transition d'étape conditionnée à l'étape attendue

- **Constat** : la synchro (CRON comme demandeur) relit l'étape avant d'appeler `moveToNextStep`,
  mais une progression concurrente peut encore s'intercaler entre cette relecture et l'écriture. Le
  parcours avancerait alors depuis une étape dont le dossier n'a pas été relu, voire serait marqué
  complété.
- **Pourquoi reporté** : la fenêtre est de quelques millisecondes (CRON trois fois par jour contre une
  synchro demandeur), et la fermer change le contrat de `moveToNextStep` et du repository.
- **À faire** : passer l'étape attendue à `moveToNextStep` et conditionner l'UPDATE
  (`WHERE current_step = <attendue>`), sur le modèle de `markAsCompleted` (`WHERE completed_at IS NULL`).
- **Référence** : [FLOW-AND-SYNC §6.1](parcours/FLOW-AND-SYNC.md#61-auto-progression-automatique-cron--sync-ui-demandeur).

### Purge de l'historique des synchros et flag « parcours complété »

- Dette déjà décrite dans [FLOW-AND-SYNC §6.10](parcours/FLOW-AND-SYNC.md#610-non-décisions--dette-technique-connue).

---

## Statistiques

Écarts de définition entre statistiques au libellé proche, listés dans
[STATISTIQUES.md § Écarts connus](stats/STATISTIQUES.md#9-écarts-connus). Chacun attend un arbitrage
produit : le code est simple une fois la définition choisie.

### Bornes de mois de `/stats` calculées en heure locale

- **Constat** : `finMoisPrecedent` et `lifetimeMatomoRangeMensuel` (`public-stats.service.ts`) lisent la
  date en heure **locale** du serveur, alors que les dates en base et `aggregerParMois` sont en UTC.
  Sur un serveur en `Europe/Paris`, la dernière heure de septembre (22 h 30 UTC) ferait inclure
  septembre dans le graphique alors qu'il serait exclu en UTC. Scalingo tourne en UTC : aucun écart
  constaté en production.
- **Pourquoi reporté** : toucher le calcul d'une statistique publique impose d'en mettre à jour
  l'inventaire et d'arbitrer la convention, hors du périmètre d'un script d'analyse. `pnpm
ds:analyser-ecarts` suppose le même serveur en UTC.
- **À faire** : une définition UTC unique de la fenêtre, partagée par le service et l'audit, avec un
  test au changement de mois.
- **Référence** : [STATISTIQUES.md](stats/STATISTIQUES.md).

### Suivi du simulateur : écrans de correction, réaffichage, nom de l'évènement

- **Constat** : les écrans de correction (agent, demandeur) rendent le même formulaire que le simulateur
  public et envoient les mêmes évènements de résultat, et un résultat réaffiché repart : les « visites
  avec un résultat » peuvent en être gonflées, sans qu'on sache de combien (ADR-0046). Le nom de l'évènement ne porte pas le département ; l'y porter ne rendrait pas à lui seul les visites additives,
  il faudrait aussi une règle de résultat unique par visite (ou compter des évènements). Le département est déjà porté par
  la dimension de l'évènement : voir « Tableau par département : des lignes qui s'additionnent ».
- **À faire** : le garde-fou existe sur `feat/simulations-par-departement` (commits 8f85b0a9, 7f04c43f,
  128ce3e8) : aucun évènement depuis un écran de correction, un même résultat envoyé une fois par visite
  (30 minutes, `localStorage`), et le code département dans le nom de l'évènement. À trier : livrer le
  garde-fou seul, ou avec le nom.
- **Préalable pour basculer ensuite vers un comptage en simulations** : que l'historique nommé couvre les
  périodes affichées, sinon le tableau se vide. Attendre ne suffira jamais pour « Depuis le début » : les
  résultats antérieurs n'auront jamais de nom. Il faudra garder une catégorie historique, ou faire partir
  le nouveau compteur d'une date de début affichée, et décider si `/stats` bascule en même temps (son
  chiffre public changerait : en septembre 2026, 13 902 évènements de résultat contre 7 903 visites, soit +76 %, relevé du 2026-10-07). Une première implémentation de la bascule existe sur la même branche
  (commits 58fadbc6, dc7d2ca9, 23a509fe, annulés par 085627d8).
- **À vérifier sur un Matomo réel avant toute mise en production** (non établi) : avec un nom d'évènement,
  `Events.getAction` en `flat=1` peut renvoyer des libellés « action - nom ». L'adaptateur lit le libellé
  exact (`sumEventCounts`) : l'entonnoir et `/stats` tomberaient alors à 0.

### Tableau par département : des lignes qui s'additionnent

- **Constat** : mesuré le 2026-10-08, côté éligibles, compter par département les visites dont l'évènement de résultat porte lui-même le département donne des lignes additives (1 816 sur 30 départements, égales aux 1 816 visites distinctes) ; le tableau actuel somme des lignes département × page (1 899). Le pied affiche pour l'instant le total de l'entonnoir et la somme des lignes (ADR-0046, mise à jour du 2026-10-08).
- **Pourquoi reporté** : un appel Matomo par département et par verdict, de 3 à 90 s chacun sur 30 jours, impossible au chargement. Il faudrait un pré-calcul quotidien : comptes journaliers stockés en base, sommés sur la période.
- **Préalables avant de décider** :
  1. répéter la mesure sur une période close (septembre 2026), pour les éligibles puis les non éligibles (environ 94 départements, non mesurés en entier) ;
  2. vérifier que les comptes journaliers se somment exactement en celui de la période (une visite appartient à un seul jour) ;
  3. compter « Sans département » par différence (visites distinctes moins visites ayant un département), pas avec les évènements sans département : 8 visites non éligibles ont les deux ; unir `3` et `03` dans la requête au lieu d'additionner deux compteurs ;
  4. traiter le filtre partenaire, appliqué aujourd'hui, et l'historique, rattrapable depuis la mi-septembre seulement ;
  5. aligner la source de l'entonnoir (`Events.getAction`, en retard sur les derniers jours) ou faire corriger l'archivage : sans cela, le total et la somme des lignes divergent encore.
- **Référence** : [ADR-0046](adr/0046-unite-de-mesure-des-simulations.md), [STATISTIQUES.md § 9](stats/STATISTIQUES.md#9-écarts-connus).

### Comptes du tableau par département : rapprocher de la carte nationale

- **Constat** : la carte « Comptes créés » compte tous les parcours créés sur la période ; le tableau ne compte que ceux qui ont une simulation du demandeur et un département extractible. L'écart mêle parcours sans simulation et départements inconnus, sans qu'on sache la part de chacun.
- **Préalable** : une mesure en lecture seule sur la base de production (script ponctuel, par exemple en one-off Scalingo) qui sépare les deux causes. Une ligne « Sans département connu » n'aurait de sens qu'ensuite.

### Libellés « Simulations » restants

- Les cartes Top 5 d'Acquisition (`TopSimulationsCard`) et la carte Top 5 départements du Tableau de bord (colonnes « Simulations » et « Simu. éligibles ») gardent « Simulations », avec infobulle. Elles lisent les mêmes lignes non dédoublonnées que le tableau : à renommer en « Visites avec un résultat » dans une PR dédiée.

### Dossiers déposés / validés : trois définitions

- **Constat** : éligibilité seule (`/stats`), toutes étapes sur `submitted_at` (Tableau de bord), statut
  `en_construction` seul (Demandeurs).
- **Préalable** : choisir ; la recommandation est d'aligner Demandeurs sur le Tableau de bord.

### Top 5 communes : visites Matomo ou simulations rattachées à un compte

- **Constat** : Acquisition compte des visites (dimension commune), Demandeurs des parcours.
- **Préalable** : renommer celui de Demandeurs ; compter des simulations par commune demanderait de
  définir un encodage stable de la commune et du département dans le nom de l'évènement (la chaîne est libre), puis de
  vérifier son exploitation dans les rapports Matomo.

### Anomalies relevées par l'inventaire

Détail et références dans [STATISTIQUES.md § 9](stats/STATISTIQUES.md#anomalies-probables). Aucune n'est corrigée par
la PR qui a posé l'inventaire ; chacune se corrige seule une fois la définition arbitrée.

- **Filtre département** : choisir une seule lecture (simulation de l'agent d'abord, ou du demandeur d'abord) et décider si un
  parcours sans simulation du demandeur doit compter au national mais pas dans un département.
- **« En cours de création » à 0 pour les agents non administrateurs** : la projection des stats masque le numéro DN ; soit un
  indicateur booléen dans la projection, soit retirer la carte pour ces rôles.
- **« Demandes d'AMO envoyées »** : exclure l'autonomie (`sans_amo`) du badge et de la carte, ou la nommer.
- **Archivage par correction d'agent** : écrire le motif canonique `RAISON_ARCHIVAGE_NON_ELIGIBLE` et une qualification, comme
  le fait le chemin demandeur (ADR-0034), pour que « Demandes inéligibles » retrouve ces dossiers.
- **Top 5 communes** : normaliser la comparaison du code département ; à vérifier d'abord si le JSONB garde le zéro initial. Clé
  Matomo à passer de la commune seule à commune et département si la dimension le permet.
- **Site vitrine** : remonter « indisponible » plutôt que des zéros quand Matomo échoue.
- **Délai de 1ère réponse** : exclure les actions écrites au nom du demandeur, qui donnent un délai proche de 0 h.
- **Échec affiché comme un vide** (retour de revue de la PR #394) : le Top 5 départements du Tableau de bord
  (`TableauDeBord.tsx`) et les cartes Top 5 d'Acquisition n'ont pas d'état d'erreur distinct d'un vrai vide ; seul le tableau par
  département en a un (`useTopDepartementsMatomo`).
- **Tiroir « Autre » des demandes archivées** : le filtrage par motif se fait en JavaScript, après lecture de tous les
  archivages de la période avec leurs jointures. Négligeable aux volumes actuels (environ 215 dossiers archivés en production en
  septembre 2026, voir FLOW-AND-SYNC § 2.8) ; à repasser en SQL si ce nombre grossit.
- **Tests du Tableau de bord** : les requêtes SQL (prédicats département, dossiers DN) et le cache Next sont mockés ; un test
  d'intégration sur la base locale attraperait ce que les mocks ne voient pas.

---

## Simulateur de vulnérabilité RGA

### Vérifier que la table `vulnerabilite_simulations` est vide en production avant tout changement de grille

- **Constat** : le simulateur est masqué en production (`isVulnerabiliteRgaActive`), mais trois
  surfaces relisent la grille pour recatégoriser des réponses déjà enregistrées : l'encart
  vulnérabilité de l'espace agent (`build-info-vulnerabilite.service.ts`), l'onglet
  `/administration/vulnerabilite` (masqué lui aussi) et le détail des dossiers. Si la table contient
  des lignes en production, une recatégorisation de la grille (PR #409 : gouttières, mitoyenneté)
  change leurs points critiques et de vigilance après déploiement, sans migration de données.
- **Préalable** : un `SELECT count(*)` sur `vulnerabilite_simulations` en production, en lecture
  seule (cf. [scalingo.md](ops/scalingo.md)). Non vérifié : la PR ne pouvait pas lire cette base.
- **À faire** : si la table est vide, retirer cette entrée. Sinon, décider si l'encart agent doit
  relire la grille courante ou la catégorie figée à l'enregistrement.
- **Référence** : [guide du simulateur](vulnerabilite/SIMULATEUR-VULNERABILITE-RGA.md).

---

## Sécurité et dépendances

### Migration Next 16, ESLint 10, `@vitejs/plugin-react` 6, remplacement de `@react-email/components`

- Détail dans la section « Prochaine revue » de
  [snyk-accepted-vulnerabilities.md](security/snyk-accepted-vulnerabilities.md#prochaine-revue).
