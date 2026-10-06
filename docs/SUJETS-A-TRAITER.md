# Sujets à traiter plus tard

Sujets identifiés et volontairement reportés : ce qu'on sait du problème, ce qui reste à décider,
et ce qu'il faut faire avant de s'y mettre. Le détail reste dans la doc de référence, vers laquelle
chaque entrée renvoie.

> Ajouter une entrée quand un sujet est écarté d'une PR (revue, périmètre, arbitrage en attente) ;
> la retirer dans la PR qui le traite. Une entrée dit **pourquoi** c'est reporté et **quel préalable**
> la débloque, sinon elle ne sert à rien.

---

## Synchronisation DN

### Rattraper les dossiers classés sans suite des parcours archivés ou complétés

- **Constat** : avant la PR #392, la synchro recopiait l'état DN `sans_suite`, refusé par l'enum
  `ds_status`. Les dossiers concernés sont restés figés à leur ancien état, sans `processed_at`.
  Le CRON rattrape les parcours actifs à son premier passage, mais `findActiveForSync` exclut les
  parcours archivés ou complétés, et `pnpm ds:backfill-processed-at` ne sélectionne que les dossiers
  déjà finaux en base. Ceux-là restent donc faux.
- **Préalable** : mesurer en production avec `pnpm ds:analyser-ecarts` (cause « état DN absent de
  l'enum ds_status »), après le déploiement de #392 et un premier run du CRON. Ce script vit sur la
  branche `feat/audit-ecarts-dn`, pas encore mergée : il faut la merger d'abord.
- **À faire si des dossiers restent** : un script ops ponctuel, dry-run par défaut, qui écrit le
  statut traduit (`dsStatusFromEtatDn`) et les dates DN, **sans** progression ni réouverture du
  parcours.
- **Référence** : [FLOW-AND-SYNC §3.2](parcours/FLOW-AND-SYNC.md#32-mapping-ds--interne).

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

### Suivi du simulateur : écrans de correction, réaffichage, nom de l'évènement

- **Constat** : les écrans de correction (agent, demandeur) rendent le même formulaire que le simulateur
  public et envoient les mêmes évènements de résultat, et un résultat réaffiché repart : « simulations
  terminées » est gonflé d'autant (ADR-0046). Le nom de l'évènement ne porte pas le département, donc
  aucun comptage additif par département n'est possible.
- **À faire** : le garde-fou existe sur `feat/simulations-par-departement` (commits 8f85b0a9, 7f04c43f,
  128ce3e8) : aucun évènement depuis un écran de correction, un même résultat envoyé une fois par visite
  (30 minutes, `localStorage`), et le code département dans le nom de l'évènement. À trier : livrer le
  garde-fou seul, ou avec le nom.
- **Préalable pour basculer ensuite vers un comptage en simulations** : que l'historique nommé couvre les
  périodes affichées, sinon le tableau se vide. Attendre ne suffira jamais pour « Depuis le début » : les
  résultats antérieurs n'auront jamais de nom. Il faudra garder une catégorie historique, ou faire partir
  le nouveau compteur d'une date de début affichée, et décider si `/stats` bascule en même temps (son
  chiffre public changerait). Une première implémentation de la bascule existe sur la même branche
  (commits 58fadbc6, dc7d2ca9, 23a509fe, annulés par 085627d8).
- **À vérifier sur un Matomo réel avant toute mise en production** (non établi) : avec un nom d'évènement,
  `Events.getAction` en `flat=1` peut renvoyer des libellés « action - nom ». L'adaptateur lit le libellé
  exact (`sumEventCounts`) : l'entonnoir et `/stats` tomberaient alors à 0.

### Dossiers déposés / validés : trois définitions

- **Constat** : éligibilité seule (`/stats`), toutes étapes sur `submitted_at` (Tableau de bord), statut
  `en_construction` seul (Demandeurs).
- **Préalable** : choisir ; la recommandation est d'aligner Demandeurs sur le Tableau de bord.

### Top 5 communes : visites Matomo ou simulations rattachées à un compte

- **Constat** : Acquisition compte des visites (dimension commune), Demandeurs des parcours.
- **Préalable** : renommer celui de Demandeurs ; compter des simulations par commune demanderait de
  porter la commune dans le nom de l'évènement, qui ne peut pas porter à la fois département et commune.

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
- **Tests du Tableau de bord** : les requêtes SQL (prédicats département, dossiers DN) et le cache Next sont mockés ; un test
  d'intégration sur la base locale attraperait ce que les mocks ne voient pas.

---

## Sécurité et dépendances

### Vulnérabilité High `source-map-js` (`pnpm audit --prod`)

- **Constat** : `source-map-js` <1.2.2 (GHSA-68fv-2mgg-jv7q, DoS), transitif via
  `@socialgouv/matomo-next > next > postcss`, apparu après le refresh d'octobre 2026. Tracé comme
  accepté par la PR #394 : le correctif n'est installable qu'à partir du 7 octobre (`minimumReleaseAge`).
- **À faire** : override `source-map-js: ^1.2.2`, checksum `.talismanrc`, section « Refresh » de
  [snyk-accepted-vulnerabilities.md](security/snyk-accepted-vulnerabilities.md).

### Migration Next 16, ESLint 10, `@vitejs/plugin-react` 6, remplacement de `@react-email/components`

- Détail dans la section « Prochaine revue » de
  [snyk-accepted-vulnerabilities.md](security/snyk-accepted-vulnerabilities.md#prochaine-revue).
