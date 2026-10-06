# Statistiques : ce que compte chaque chiffre

Une ligne par statistique affichée, publique ou interne : ce qu'elle compte, en une ou deux phrases,
et d'où elle vient. **À mettre à jour dans la même PR que toute modification d'une statistique**
(calcul, source, libellé, filtre), règle posée dans `CLAUDE.md`.

---

## 1. Unités et fenêtres

| Terme               | Définition                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Simulation terminée | Un résultat de simulation (évènement Matomo `simulateur_result_*`, `nb_events`). Réafficher un résultat sans rien changer ne compte qu'une fois. |
| Visite              | Un passage sur le site (`nb_visits`) : une visite qui fait trois simulations compte une fois.                                                    |
| Visiteur unique     | Un visiteur dédoublonné sur la période (`nb_uniq_visitors`) : non additif, la somme des mois dépasse le total de la période.                     |
| Compte              | Un `parcours_prevention`. Le back-office ne compte que ceux rattachés à un utilisateur (`userId`), la page publique les compte tous.             |
| Dossier             | Un `dossiers_demarches_simplifiees`, c'est-à-dire un formulaire Démarche Numérique d'une étape.                                                  |

- **Back-office** : les `n` derniers jours calendaires, aujourd'hui compris (`getFenetrePeriode`) ; « Depuis le début » part
  du 16/10/2025. La variation compare à la période précédente de même durée.
- **Onglets Demandeurs** : fenêtre glissante calculée dans le navigateur (`maintenant − n × 24 h`), pas alignée sur minuit.
- **Simulations** : le back-office les lit dans le nom de l'évènement de résultat, seule unité qui s'additionne par département (ADR-0046).
- **Matomo** : jamais de `period=range` pour un comptage additif ; la fenêtre est découpée en jours, semaines ou mois
  (`decouperPeriodeMatomo`, ADR-0033).

---

## 2. Page publique `/stats`

Cumulés depuis le lancement, sans filtre, mis en cache une heure. Service : `public-stats/services/public-stats.service.ts`.

| Statistique                      | Ce qu'elle compte                                                                                                                      | Source                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Visiteurs uniques                | Visiteurs dédoublonnés depuis le lancement.                                                                                            | Matomo, `VisitsSummary.get`        |
| Simulations terminées            | **Visites** ayant affiché au moins un résultat : une visite à trois simulations compte une fois. Pas la même unité que le back-office. | Matomo, `Events.getAction` visites |
| Simulations éligibles            | Visites ayant affiché au moins un résultat éligible.                                                                                   | Matomo, `Events.getAction` visites |
| Comptes créés                    | Tous les parcours créés, rattachés ou non à un utilisateur.                                                                            | BDD `parcours_prevention`          |
| Dossiers d'éligibilité déposés   | Formulaires d'éligibilité transmis à la DDT.                                                                                           | BDD, étape éligibilité déposée     |
| Diagnostics réalisés ou en cours | Parcours arrivés au diagnostic ou au-delà (devis, factures), archivés compris.                                                         | BDD `current_step`                 |
| Graphique Visiteurs              | Visiteurs uniques de chaque mois : un visiteur revenu deux mois compte dans les deux.                                                  | Matomo, `getUniqueVisitors` mois   |
| Graphique Comptes créés          | Parcours créés par mois.                                                                                                               | BDD                                |
| Graphique Dossiers déposés       | Formulaires d'éligibilité transmis, par mois de dépôt.                                                                                 | BDD `submitted_at`                 |
| Graphique Dossiers validés       | Formulaires d'éligibilité acceptés par la DDT, par mois de décision.                                                                   | BDD `processed_at`                 |

---

## 3. Back-office — Tableau de bord (`/administration`)

Filtres : période, département (pas de filtre partenaire). Service : `tableau-de-bord/services/tableau-de-bord.service.ts`.

| Statistique                   | Ce qu'elle compte                                                                                                      | Source                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Visiteurs uniques sur le site | Visiteurs dédoublonnés sur la période, filtrés par département via la dimension Matomo.                                | Matomo, `VisitsSummary.get`    |
| Simulations éligibles (X / Y) | Simulations terminées éligibles sur le total des simulations terminées, même source que l'Acquisition.                 | Matomo, `Events.getName`       |
| Comptes créés                 | Parcours rattachés à un utilisateur, créés sur la période.                                                             | BDD                            |
| Dossiers archivés             | Parcours archivés sur la période, quel que soit le motif (motif vide compris).                                         | BDD `archived_at`              |
| Réponses d'AMO en attente     | Demandes d'accompagnement encore sans réponse, sur le total des demandes envoyées à une AMO pendant la période.        | BDD `parcours_amo_validations` |
| En cours de dépôt             | Parcours à l'étape éligibilité dont le formulaire DN est créé mais pas encore transmis.                                | BDD                            |
| Dossiers déposés sur DN       | Formulaires transmis pendant la période, toutes étapes confondues.                                                     | BDD `submitted_at`             |
| Dossiers acceptés par la DDT  | Formulaires acceptés pendant la période, toutes étapes confondues.                                                     | BDD `processed_at`             |
| Alerte « motifs en hausse »   | Motifs d'archivage en hausse de plus de 10 % par rapport à la période précédente (absente sur « Depuis le début »).    | BDD                            |
| Demandes archivées (N)        | Archivages ventilés par motif (top 5 puis « Autre »), archivages sans motif compris : N égale « Dossiers archivés ».   | BDD `archive_reason`           |
| Demandes inéligibles (N)      | Parcours archivés pour inéligibilité, ventilés par raison de qualification ; une demande peut avoir plusieurs raisons. | BDD `prospect_qualifications`  |
| Top 5 départements            | Par département : simulations terminées (Matomo), comptes et dossiers DN créés (BDD), et dossiers DN ÷ simulations.    | Matomo + BDD                   |

---

## 4. Back-office — Acquisition (`/administration/acquisition`)

Filtres : période, département, partenaire. Composant : `acquisition/components/AcquisitionPanel.tsx`.

| Statistique                           | Ce qu'elle compte                                                                                                                                                   | Source                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Simulations terminées                 | Simulations menées jusqu'au résultat, anonymes comprises. Même total que le tableau par département (non renseigné compris).                                        | Matomo, `Events.getName`          |
| Simulations éligibles / non éligibles | Les mêmes, selon le verdict affiché.                                                                                                                                | Matomo, `Events.getName`          |
| Comptes créés                         | Parcours rattachés à un utilisateur, créés sur la période.                                                                                                          | BDD                               |
| Transfo. simu. → comptes              | Comptes créés ÷ simulations terminées.                                                                                                                              | Calculé                           |
| Détail des étapes du tunnel           | Pour chaque étape du simulateur, visites qui l'atteignent, qui passent à la suivante ou qui abandonnent ; 7 derniers jours, aujourd'hui compris, sans filtre.       | Matomo Funnels                    |
| Motifs d'inéligibilité                | Raisons de qualification des parcours archivés pour inéligibilité (même donnée que le Tableau de bord), pas les motifs du simulateur.                               | BDD                               |
| Top 5 simulations par département     | Les cinq départements qui comptent le plus de simulations terminées.                                                                                                | Matomo, `Events.getName`          |
| Top 5 simulations par communes        | Visites ayant affiché un résultat dans la commune ; ignore le filtre département.                                                                                   | Matomo, dimension commune         |
| Simulations par département (tableau) | Simulations terminées par département, plus comptes et dossiers DN (BDD). La ligne « non renseigné » regroupe les résultats d'avant octobre 2026, sans département. | Matomo + BDD                      |
| Site vitrine — Visiteurs uniques      | Visiteurs dédoublonnés sur la période.                                                                                                                              | Matomo, `VisitsSummary.get`       |
| Site vitrine — Taux de rebond         | Part des visites limitées à une seule page.                                                                                                                         | Matomo, `VisitsSummary.get`       |
| Site vitrine — Évolution des visites  | Visites de tout le site par jour, semaine ou mois.                                                                                                                  | Matomo, `VisitsSummary.getVisits` |

---

## 5. Back-office — Demandeurs (`/administration/demandeurs`)

Valeurs calculées dans le navigateur à partir de la liste des demandeurs (périmètre de l'agent) ; les badges de variation
viennent du Tableau de bord national.

| Statistique                         | Ce qu'elle compte                                                                                                                | Source                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Actifs / Archivés                   | Demandeurs de la liste filtrée, archivés ou non.                                                                                 | Liste                      |
| Demandes archivées par étape        | Demandeurs archivés sur la période, par étape atteinte.                                                                          | Liste                      |
| Données des N demandeurs            | Demandeurs créés sur la période.                                                                                                 | Liste                      |
| Évolution des demandeurs            | Demandeurs créés par jour (période ≤ 30 jours) ou par semaine.                                                                   | Liste                      |
| Demandes par étape                  | Demandeurs non archivés, par étape en cours.                                                                                     | Liste                      |
| Délais moyens par étape             | Temps moyen entre deux jalons : choix de l'AMO, réponse de l'AMO, puis dépôts successifs (diagnostic, devis, factures).          | Liste                      |
| Répartitions demandes d'AMO         | Demandes envoyées, validées, en attente et refusées par une AMO.                                                                 | Liste                      |
| Répartition dossiers DN             | Formulaires DN en création, déposés (`en_construction`), en instruction, et instruits (acceptés, refusés ou classés sans suite). | Liste                      |
| Sources d'acquisition               | Comment les demandeurs disent avoir connu le dispositif.                                                                         | Liste `source_acquisition` |
| Données d'éligibilité               | Simulations rattachées à un parcours : état de la maison, indemnisation antérieure, tranche de revenus.                          | BDD, simulations           |
| Top 5 départements / communes (BDD) | Parcours ayant une simulation, par département ou commune : simulations rattachées à un compte, pas les simulations Matomo.      | BDD                        |

---

## 6. Back-office — Activité (`/administration/activite`)

| Statistique                    | Ce qu'elle compte                                                                | Source                 |
| ------------------------------ | -------------------------------------------------------------------------------- | ---------------------- |
| Total des actions enregistrées | Actions écrites sur les dossiers pendant la période (agents et système).         | BDD `parcours_actions` |
| Demandeurs distincts concernés | Demandeurs ayant au moins une action sur la période.                             | BDD                    |
| Délai moyen de 1ère réponse    | Heures entre l'inscription d'un demandeur et la première action sur son dossier. | BDD                    |
| Demandeurs sans réponse        | Demandeurs inscrits sur la période sans aucune action.                           | BDD                    |
| Répartition par type d'action  | Actions par type, avec leur évolution.                                           | BDD                    |

---

## 7. Back-office — Vulnérabilité (`/administration/vulnerabilite`, inactif en production)

| Statistique                      | Ce qu'elle compte                                                           | Source                |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Simulations réalisées            | Simulations de vulnérabilité enregistrées (table anonyme).                  | BDD                   |
| Points par simulation (moyennes) | Moyenne des points critiques, de vigilance, à vérifier et bonnes pratiques. | BDD + grille courante |
| Détail des étapes du tunnel      | Visites par étape, 7 derniers jours aujourd'hui compris.                    | Matomo Funnels        |
| Simulations par département      | Visites ayant affiché un résultat de vulnérabilité, par département.        | Matomo, dimension     |
| Répartition des réponses         | Part de chaque réponse, parmi les simulations ayant répondu à la question.  | BDD                   |

---

## 8. Espace agent

| Statistique                     | Ce qu'elle compte                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cartes de la liste des dossiers | Dossiers du périmètre de l'agent par état (pré-éligibilité, AMO, ménage, DDT), sans les filtres de la liste. |
| Demandes d'accompagnement (AMO) | Demandes en attente de réponse de l'entreprise de l'agent, hors archivées.                                   |
| Dossiers suivis au total (AMO)  | Dossiers validés éligibles par l'entreprise, hors archivés.                                                  |

---

## 9. Écarts connus

Des statistiques au libellé proche ne comptent pas la même chose. À corriger une par une, en mettant ce document à jour.

- **Simulations** : la page publique compte des visites, le back-office des simulations (≈ 1,6 simulation par visite).
- **Top 5 par communes** : visites Matomo (Acquisition) contre simulations rattachées à un compte (Demandeurs).
- **Comptes créés** : tous les parcours (public) contre parcours rattachés à un utilisateur (back-office).
- **Dossiers déposés / validés** : éligibilité seule (public), toutes étapes (Tableau de bord), statut `en_construction` (Demandeurs).
