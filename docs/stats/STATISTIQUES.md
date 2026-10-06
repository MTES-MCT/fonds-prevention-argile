# Statistiques : ce que compte chaque chiffre

Une ligne par statistique affichée, publique ou interne : ce qu'elle compte, en une ou deux phrases,
et d'où elle vient. **À mettre à jour dans la même PR que toute modification d'une statistique**
(calcul, source, libellé, filtre), règle posée dans `CLAUDE.md`.

Relevé le 2026-10-06 par lecture du code. Aucun chiffre de production n'a été consulté : ce que Matomo fait
réellement (portée de la dimension département, effet d'un segment, durée d'une visite) n'est pas établi ici.

---

## 1. Unités et fenêtres

| Terme               | Définition                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulation terminée | Somme, par verdict, des **visites** ayant affiché un résultat (`nb_visits` de chaque évènement `simulateur_result_*`) : une visite qui obtient les deux verdicts compte deux fois, plusieurs résultats du même verdict une fois. |
| Visite              | Un passage sur le site (`nb_visits`) : une visite qui fait trois simulations compte une fois.                                                                                                                                    |
| Visiteur unique     | Un visiteur dédoublonné sur la période (`nb_uniq_visitors`) : non additif, la somme des mois dépasse le total de la période.                                                                                                     |
| Compte              | Un `parcours_prevention` ; `user_id` y est obligatoire et unique, tout parcours a donc un utilisateur, créé par le demandeur ou par un agent.                                                                                    |
| Dossier             | Un `dossiers_demarches_simplifiees`, c'est-à-dire un formulaire Démarche Numérique d'une étape (un par parcours et par étape).                                                                                                   |

- **Back-office (Tableau de bord, Acquisition)** : les `n` derniers jours calendaires, aujourd'hui compris (`getFenetrePeriode`) ;
  6 mois = 180 jours, 12 mois = 365 jours ; « Depuis le début » part du 16/10/2025. La variation compare à la période
  précédente de même durée, et n'existe pas sur « Depuis le début ».
- **Fenêtres propres à d'autres écrans** : Activité et la base de Vulnérabilité prennent `maintenant − n jours`, sans alignement
  sur minuit ; le Matomo de Vulnérabilité prend des dates UTC, soit `n + 1` jours, et « Depuis le début » y part de 1970. Les
  onglets Demandeurs filtrent dans le navigateur sur `maintenant − n × 24 h`, borne basse seule, sauf « Données d'éligibilité »,
  calculée côté serveur sur les jours calendaires.
- **Filtre département** : sur le serveur, un parcours compte seulement s'il a une simulation du demandeur (`rgaSimulationData`
  non nul), le département étant lu d'abord dans la simulation de l'agent. Dans les listes du navigateur (Demandeurs), il est
  lu d'abord dans la simulation du demandeur.
- **Simulations Matomo** : comptées en visites (entonnoir, `/stats`, tops, tableau), ADR-0046. Les écrans de correction et le
  réaffichage d'un résultat envoient aussi des évènements et gonflent ce compte (voir § 9). Les statistiques BDD ont leur propre
  unité (parcours, dossiers).
- **Matomo** : les comptages d'évènements de l'entonnoir sont découpés en jours, semaines ou mois (`decouperPeriodeMatomo`,
  ADR-0033) ; les rapports par dimension (département, commune) et les tunnels restent en `period=range`.

---

## 2. Page publique `/stats`

Sans filtre, mis en cache une heure. Les cartes comptent tout ce qui existe en base, sans borne de date, ou dans Matomo depuis le
lancement. Les graphiques partent du 16/10/2025 et s'arrêtent au mois précédent, mois en UTC. Service : `public-stats/services/public-stats.service.ts`.

| Statistique                              | Ce qu'elle compte                                                                                                                                                       | Source                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Visiteurs uniques                        | Visiteurs dédoublonnés depuis le lancement.                                                                                                                             | Matomo, `VisitsSummary.get`        |
| Simulations terminées                    | Visites ayant affiché un résultat, par verdict, depuis le lancement. Même calcul que le back-office ; sur « Depuis le début », les deux écrans donnent le même chiffre. | Matomo, `Events.getAction` visites |
| Simulations éligibles                    | Visites ayant affiché au moins un résultat éligible.                                                                                                                    | Matomo, `Events.getAction` visites |
| Comptes créés                            | Tous les parcours en base, sans borne de date.                                                                                                                          | BDD `parcours_prevention`          |
| Dossiers d'éligibilité déposés           | Formulaires d'éligibilité transmis à la DDT.                                                                                                                            | BDD, étape éligibilité déposée     |
| Diagnostics réalisés ou en cours         | Parcours dont l'étape courante est le diagnostic, le devis ou les factures, diagnostic non commencé compris, archivés compris.                                          | BDD `current_step`                 |
| Graphique Visiteurs                      | Visiteurs uniques de chaque mois : un visiteur revenu deux mois compte dans les deux.                                                                                   | Matomo, `getUniqueVisitors` mois   |
| Graphique Comptes créés                  | Parcours créés par mois.                                                                                                                                                | BDD                                |
| Graphique Dossiers d'éligibilité déposés | Formulaires d'éligibilité transmis, par mois de dépôt.                                                                                                                  | BDD `submitted_at`                 |
| Graphique Dossiers d'éligibilité validés | Formulaires d'éligibilité acceptés par la DDT, par mois de décision.                                                                                                    | BDD `processed_at`                 |

---

## 3. Back-office — Tableau de bord (`/administration`)

Filtres : période, département (pas de filtre partenaire). Service : `tableau-de-bord/services/tableau-de-bord.service.ts`.

| Statistique                   | Ce qu'elle compte                                                                                                                                                                                                                                                                                                                      | Source                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Visiteurs uniques sur le site | Visiteurs dédoublonnés sur la période, filtrés par département via la dimension Matomo.                                                                                                                                                                                                                                                | Matomo, `VisitsSummary.get`    |
| Simulations éligibles (X / Y) | Visites ayant affiché un résultat éligible, sur la somme par verdict des visites ayant affiché un résultat.                                                                                                                                                                                                                            | Matomo, `Events.getAction`     |
| Comptes créés                 | Parcours créés sur la période. Avec un filtre département, seulement ceux qui ont une simulation du demandeur.                                                                                                                                                                                                                         | BDD                            |
| Dossiers archivés             | Parcours actuellement archivés dont la date d'archivage tombe dans la période, quel que soit le motif (motif vide compris) : un désarchivage remet la date à vide.                                                                                                                                                                     | BDD `archived_at`              |
| Réponses d'AMO en attente     | Validations toujours en attente, hors parcours archivés, sur toutes les validations créées pendant la période : refus, autonomie (`sans_amo`) et archivés sont dans ce total.                                                                                                                                                          | BDD `parcours_amo_validations` |
| En cours de dépôt             | Parcours non archivés à l'étape éligibilité dont le formulaire DN, créé pendant la période, n'est pas encore transmis.                                                                                                                                                                                                                 | BDD                            |
| Dossiers déposés sur DN       | Formulaires transmis pendant la période, toutes étapes confondues.                                                                                                                                                                                                                                                                     | BDD `submitted_at`             |
| Dossiers acceptés par la DDT  | Formulaires acceptés pendant la période, toutes étapes confondues.                                                                                                                                                                                                                                                                     | BDD `processed_at`             |
| Alerte « motifs en hausse »   | Motifs d'archivage en hausse de plus de 10 % (variation arrondie) par rapport à la période précédente : un motif absent avant compte comme une hausse, les archivages sans motif sont exclus. Absente sur « Depuis le début ».                                                                                                         | BDD                            |
| Demandes archivées (N)        | Archivages ventilés par motif (top 5 puis « Autre »), archivages sans motif compris : N égale « Dossiers archivés ».                                                                                                                                                                                                                   | BDD `archive_reason`           |
| Demandes inéligibles (N)      | Parcours archivés pour inéligibilité (motif « Non éligible au dispositif » ou « Le demandeur n'est pas éligible ») qui ont aussi une qualification « non éligible » avec raisons, ventilés par raison de leur dernière qualification ; une demande peut avoir plusieurs raisons.                                                       | BDD `prospect_qualifications`  |
| Top 5 départements            | Par département : visites ayant affiché un résultat (Matomo, somme par département et URL), comptes et dossiers DN créés (BDD, parcours avec simulation, classés par département de la simulation). Classement par défaut sur dossiers DN ÷ visites, au choix parmi cinq colonnes. Indisponible sans dimension département configurée. | Matomo + BDD                   |

---

## 4. Back-office — Acquisition (`/administration/acquisition`)

Filtres : période, département, partenaire (`users.partner_source` côté base, referrer côté Matomo : deux définitions).
Composant : `acquisition/components/AcquisitionPanel.tsx`.

| Statistique                           | Ce qu'elle compte                                                                                                                                                                                                                                                                                                                                                                                                                                             | Source                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Simulations terminées                 | Visites ayant affiché un résultat, par verdict, anonymes comprises : une visite qui obtient les deux verdicts compte deux fois.                                                                                                                                                                                                                                                                                                                               | Matomo, `Events.getAction`          |
| Simulations éligibles / non éligibles | Visites ayant affiché au moins un résultat du verdict ; leur somme fait « Simulations terminées ».                                                                                                                                                                                                                                                                                                                                                            | Matomo, `Events.getAction`          |
| Comptes créés                         | Parcours créés sur la période. Avec un filtre département, seulement ceux qui ont une simulation du demandeur.                                                                                                                                                                                                                                                                                                                                                | BDD                                 |
| Transfo. simu. → comptes              | Comptes créés ÷ simulations terminées : une base divisée par des visites Matomo, avec deux définitions du partenaire quand il est filtré.                                                                                                                                                                                                                                                                                                                     | Calculé                             |
| Détail des étapes du tunnel           | Pour chaque étape du simulateur, visites qui l'atteignent, qui passent à la suivante ou qui abandonnent ; 7 derniers jours, aujourd'hui compris. Ignore la période et le département, absent quand un partenaire est choisi ; les deux étapes de résultat n'ont ni conversion ni abandon.                                                                                                                                                                     | Matomo Funnels                      |
| Motifs d'inéligibilité                | Raisons de qualification des parcours archivés pour inéligibilité sur la période (même donnée que le Tableau de bord) : choisies par un agent, ou dérivées du verdict du simulateur pour un demandeur connecté. Quatre premières affichées ; les simulations anonymes n'y figurent pas.                                                                                                                                                                       | BDD                                 |
| Top 5 simulations par département     | Les cinq premières lignes du tableau par département (même calcul).                                                                                                                                                                                                                                                                                                                                                                                           | Matomo, dimension département       |
| Top 5 simulations par communes        | Somme non dédoublonnée des visites par commune, les homonymes de départements différents étant fusionnés ; ignore le filtre département. Retombe sur les parcours de la base (avec simulation, filtrés par département) si la dimension commune n'est pas configurée, si Matomo ne renvoie rien ou s'il échoue.                                                                                                                                               | Matomo, dimension commune           |
| Simulations par département (tableau) | Somme non dédoublonnée des visites par département et par URL : une visite qui touche deux départements, ou deux pages, compte dans chacun. Plus comptes (parcours créés sur la période avec simulation) et dossiers DN (formulaires créés sur la période, toutes étapes) de la base ; un département absent de Matomo a 0 simulation, et les valeurs qui ne sont pas un département connu sont écartées. Indisponible sans dimension département configurée. | Matomo, dimension département + BDD |
| Site vitrine — Visiteurs uniques      | Visiteurs dédoublonnés sur la période, filtrés par département et partenaire.                                                                                                                                                                                                                                                                                                                                                                                 | Matomo, `VisitsSummary.get`         |
| Site vitrine — Taux de rebond         | Part des visites limitées à une seule page, mêmes filtres.                                                                                                                                                                                                                                                                                                                                                                                                    | Matomo, `VisitsSummary.get`         |
| Site vitrine — Évolution des visites  | Visites du site, filtrées par département et partenaire, par jour (7 et 30 jours), semaine (90 jours et 6 mois) ou mois (au-delà) ; les semaines et mois de bord sont entiers. Une erreur Matomo affiche tout à 0, sans « indisponible ».                                                                                                                                                                                                                     | Matomo, `VisitsSummary.getVisits`   |

---

## 5. Back-office — Demandeurs (`/administration/demandeurs`)

Sauf mention, valeurs calculées dans le navigateur à partir des demandeurs **créés** sur la période (fenêtre glissante, § 1).
Périmètre : national, sauf l'analyste départemental, borné à son territoire. Certains badges de variation viennent du Tableau de
bord national, d'autres sont calculés dans le navigateur.

| Statistique                                          | Ce qu'elle compte                                                                                                                                                                                                                                                                                                                                                                                 | Source                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Actifs / Archivés                                    | Deux compteurs, non archivés et archivés, parmi tous les demandeurs (filtres étape, département, nom ; pas de période). Onglet réservé aux administrateurs (`USERS_DETAIL_READ`).                                                                                                                                                                                                                 | Liste                      |
| Demandes archivées par étape (Statistiques demandes) | Demandeurs créés sur la période et archivés aujourd'hui, par dernière étape atteinte.                                                                                                                                                                                                                                                                                                             | Liste                      |
| Demandes archivées par étape (Archivage)             | Demandeurs archivés pendant la période, par dernière étape atteinte. Les tables « Demandes archivées » et « Demandes inéligibles » du même onglet viennent du serveur (§ 3), en jours calendaires, alors que ce graphique est en fenêtre glissante.                                                                                                                                               | Liste                      |
| Données des N demandeurs                             | Demandeurs créés sur la période.                                                                                                                                                                                                                                                                                                                                                                  | Liste                      |
| Évolution des demandeurs                             | Demandeurs créés par jour, ou par semaine (lundi UTC) quand leurs dates s'étalent sur plus de 30 jours.                                                                                                                                                                                                                                                                                           | Liste                      |
| Demandes par étape                                   | Demandeurs non archivés, par étape en cours.                                                                                                                                                                                                                                                                                                                                                      | Liste                      |
| Délais moyens par étape                              | Choix AMO (inscription → choix, le choix de l'autonomie compte), Réponse AMO (choix → réponse), Diag. (validation AMO → dépôt), Devis et Factures (dépôt précédent → dépôt) ; Total (inscription → fin du parcours, sinon dernière mise à jour) n'est pas leur somme. Dossiers archivés exclus, jours entiers jamais négatifs, moyenne sur les seuls demandeurs ayant les deux dates.             | Liste                      |
| Répartitions demandes d'AMO                          | Demandeurs ayant une validation AMO, autonomie (`sans_amo`) comprise ; validées = éligibles, refusées = non éligibles ou accompagnement refusé, en attente = hors archivés.                                                                                                                                                                                                                       | Liste                      |
| Répartition dossiers DN                              | Compte des **dossiers** (pas des demandeurs) des quatre étapes : en création (numéro DN sans statut, hors parcours archivés), déposés en attente d'instruction (`en_construction`), en instruction, instruits (acceptés, refusés ou classés sans suite). `non_accessible` n'est compté nulle part. Pour les agents non administrateurs le numéro DN est masqué : « en création » vaut toujours 0. | Liste                      |
| Sources d'acquisition                                | Nombre de réponses par source ; le pourcentage est rapporté à tous les demandeurs créés sur la période, sans-réponse compris.                                                                                                                                                                                                                                                                     | Liste `source_acquisition` |
| Données d'éligibilité                                | Parcours créés sur la période (jours calendaires du serveur, pas la fenêtre du titre) ayant une simulation du demandeur, donnée de l'agent prioritaire : état de la maison et indemnisation sur les seules simulations éligibles, tranches de revenus sur toutes celles qui ont revenu, foyer et région.                                                                                          | Serveur, BDD               |
| Top 5 départements / communes (BDD)                  | Même population que « Données d'éligibilité », par département ou commune : simulations rattachées à un compte, pas les simulations Matomo. Le top départements reste national quand un département est filtré ; le top communes le respecte.                                                                                                                                                     | BDD                        |

---

## 6. Back-office — Activité (`/administration/activite`)

Fenêtre : `maintenant − n jours`, non alignée sur minuit, avec la période précédente de même durée (absente sur « Depuis le
début », qui part du 16/10/2025).

| Statistique                    | Ce qu'elle compte                                                                                                                                                                                                                                                  | Source                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Total des actions enregistrées | Toutes les actions écrites sur les dossiers pendant la période, quel que soit l'auteur : agent, système ou demandeur. Avec un filtre département, la simulation du demandeur doit exister.                                                                         | BDD `parcours_actions` |
| Demandeurs distincts concernés | Demandeurs ayant au moins une action sur la période.                                                                                                                                                                                                               | BDD                    |
| Délai moyen de 1ère réponse    | Heures entre l'inscription (pendant la période) et la première action sur le dossier, de n'importe quel auteur et quelle que soit sa date, y compris celles écrites au nom du demandeur (d'où des délais proches de 0 h) ; les demandeurs sans action sont exclus. | BDD                    |
| Demandeurs sans réponse        | Demandeurs inscrits pendant la période sans aucune action à ce jour, celles du demandeur comprises.                                                                                                                                                                | BDD                    |
| Répartition par type d'action  | Actions par type, avec leur évolution.                                                                                                                                                                                                                             | BDD                    |

---

## 7. Back-office — Vulnérabilité (`/administration/vulnerabilite`, inactif en production)

Filtre période seul. Fenêtre propre à cette page (§ 1) ; le tunnel porte sur 7 jours.

| Statistique                      | Ce qu'elle compte                                                                                                                                | Source                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Simulations réalisées            | Une ligne de la table anonyme par affichage du résultat, sans dédoublonnage : un retour arrière suivi d'un nouvel affichage en crée une seconde. | BDD                   |
| Points par simulation (moyennes) | Moyenne des points critiques, de vigilance, à surveiller et bonnes pratiques.                                                                    | BDD + grille courante |
| Détail des étapes du tunnel      | Visites par étape, 7 derniers jours aujourd'hui compris.                                                                                         | Matomo Funnels        |
| Simulations par département      | Visites ayant affiché un résultat de vulnérabilité, somme par département et URL non dédoublonnée ; vingt premiers départements affichés.        | Matomo, dimension     |
| Répartition des réponses         | Part de chaque réponse, parmi les simulations ayant répondu à la question.                                                                       | BDD                   |

---

## 8. Espace agent

| Statistique                     | Ce qu'elle compte                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cartes de la liste des dossiers | Dossiers du périmètre de l'agent par état (pré-éligibilité, AMO, ménage, DDT), hors archivés et refusés, sans les filtres de la liste ni le tag Mes / Tous. |
| Badge de l'onglet « Dossiers »  | Tous les parcours du périmètre de l'agent, archivés compris.                                                                                                |
| Demandes d'accompagnement (AMO) | Demandes en attente de réponse de l'entreprise de l'agent, hors archivées (national pour le super-administrateur).                                          |
| Dossiers suivis au total (AMO)  | Dossiers validés éligibles par l'entreprise, hors archivés (national pour le super-administrateur).                                                         |

---

## 9. Écarts connus

Des statistiques au libellé proche ne comptent pas la même chose. À corriger une par une, en mettant ce document à jour.
Les arbitrages sont suivis dans [SUJETS-A-TRAITER](../SUJETS-A-TRAITER.md#statistiques).

### Définitions à choisir

- **Tableau par département et entonnoir** : somme non dédoublonnée contre somme par verdict ; l'écart varie selon la période
  (relevé en octobre 2026 sur 30 jours : 8 301 contre 7 962). Ne se résorbera qu'en comptant des simulations (ADR-0046).
- **Top 5 par communes** : visites Matomo (Acquisition) contre simulations rattachées à un compte (Demandeurs).
- **Dossiers déposés / validés** : éligibilité seule (public), toutes étapes (Tableau de bord), statut `en_construction` (Demandeurs).
  Un dossier `en_construction` renvoyé en correction est « déposé » en Demandeurs et « Ménage » côté agent.
- **Demandes d'AMO** : un flux (Tableau de bord : validations dont le choix tombe dans la période), une cohorte (Demandeurs :
  parcours créés dans la période) et un stock (agent : l'entreprise, sans période) ; la même inscription ne compte pas aux trois endroits.
- **Fenêtres** : calendaire (Tableau de bord, Acquisition), glissante (Activité, Demandeurs, Vulnérabilité). Un « 7 jours » demandé un
  mardi à 15 h commence mercredi à 0 h au Tableau de bord, mardi à 15 h dans Activité et Demandeurs, et couvre 8 jours côté Matomo de Vulnérabilité.
- **Filtre partenaire** : `users.partner_source` côté base, referrer côté Matomo, dans le même ratio « Transfo. simu. → comptes ».

### Anomalies probables

- **Filtre département** : « Comptes créés » exige une simulation du demandeur et lit l'agent d'abord, Demandeurs lit le demandeur
  d'abord. Un dossier créé par un Aller-vers (simulation de l'agent seule) est compté au national mais absent du filtre département
  et du tableau par département, et présent en Demandeurs.
- **« En cours de création » (Demandeurs)** : vaut 0 pour les agents non administrateurs, car la projection des stats masque le numéro DN.
- **« Demandes d'AMO envoyées »** : compte aussi les demandeurs en autonomie (`sans_amo`), qui n'ont sollicité aucune AMO.
- **Archivage par correction d'agent** : un dossier devenu inéligible est archivé avec un motif libre (« Non éligible (…) »), sans
  qualification. Il compte dans « Dossiers archivés » mais pas dans « Demandes inéligibles », et fragmente la ventilation des motifs.
- **Top 5 communes** : le filtre département compare le code brut (`"03"` contre `"3"`) ; la liste serait vide si la simulation garde
  le zéro. Le format réel stocké n'est pas établi ici. Côté Matomo, la clé est le nom de commune seul.
- **Site vitrine** : une erreur Matomo affiche des zéros partout, sans « indisponible ».
- **Délai de 1ère réponse** : une action écrite au nom du demandeur (simulation non éligible à l'inscription) compte comme réponse,
  d'où un délai proche de 0 h et une absence de « sans réponse ».
- **Suivi du simulateur** : les écrans de correction (agent, demandeur) envoient les mêmes évènements de résultat que le simulateur
  public, et un résultat réaffiché repart. « Simulations terminées » est donc gonflé d'autant, sans qu'on sache de combien.

### Libellés à préciser

- **Répartition dossiers DN (Demandeurs)** : le badge de « Déposés » mesure la variation des dossiers créés, pas des dossiers déposés.
- **Diagnostics réalisés ou en cours** : compte aussi les parcours dont le diagnostic n'est pas commencé.
- **Carte « Demandes d'accompagnement »** : dans la liste des dossiers, elle compte tout le territoire ; sur l'accueil AMO, seulement
  l'entreprise de l'agent.
- **Visiteurs uniques** : 0 au Tableau de bord, « Indisponible » en public, filtre département retiré en Acquisition quand la
  métrique ou la dimension manque.
- **Top 5 départements du Tableau de bord** : classé par défaut sur dossiers DN ÷ visites, donc un département à 1 visite et 1 dossier
  passe premier à 100 %.
