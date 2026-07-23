# ADR-0021 : Synchro de contacts Brevo pilotée par les Automations (cycle de vie)

**Date** : 2026-07-21
**Statut** : Accepté

## Contexte

Besoin produit d'un cycle de vie email (V1 : mail de bienvenue « dans la journée » ;
V2 : relances évènementielles selon des critères amenés à évoluer — « pas d'AMO »,
« AMO validé »…). Jusqu'ici Brevo n'était utilisé qu'en **transactionnel** (HTML rendu
depuis des templates React Email, aucun contact synchronisé, aucune Automation).

Deux orchestrations possibles :

- **In-app (outbox + CRON)** : table de notifications + registre `type → template` +
  batch d'envoi. Logique versionnée/testée, mais chaque nouveau parcours = code + déploiement.
- **Brevo-driven (Contacts + Automation)** : l'app pousse des contacts + attributs +
  évènements ; Brevo décide du timing et du contenu (templates hébergés). V2 sans déploiement.

## Décision

**Brevo-driven.** L'app se limite à un **pipeline temps réel** qui pousse le contact
(attributs) et enregistre un **évènement** Brevo à chaque transition métier. Le timing des
envois, les templates et les parcours de relance vivent dans les **Automations Brevo** (UI).

### 1. Upsert du contact puis évènement (2 appels)

À chaque flux : `contacts.createContact` (`updateEnabled`) pour upserter le contact **et
l'ajouter à la liste** cycle de vie, puis `event.createEvent` pour enregistrer l'évènement.
Le SDK v5 permettrait de porter les attributs dans `contact_properties` de l'évènement (1
seul appel), mais `createEvent` ne gère pas l'appartenance à une liste : on garde les 2
appels. Point d'entrée unique `emitBrevoEvent(parcoursId, eventName, options)`.

### 2. Quatre hooks best-effort

`demandeur_cree` (inscription FC, 1re création du parcours), `simulation_enregistree` (migration de
la simulation localStorage sur le parcours post-login — fait remonter INSEE/DEPARTEMENT,
absents au `demandeur_cree` qui part avant), `amo_reponse`
(`approveValidation`/`rejectEligibility`), `dn_update` (`syncDossierStatus`, sur
changement réel de `ds_status` — couvre CRON + sync UI). Un échec Brevo n'échoue **jamais**
le flux métier (log seulement), comme les envois transactionnels existants.

### 3. Garde-fou anti-fuite staging au niveau de l'identité du contact

Une Automation envoie ses mails **depuis Brevo**, hors du redirect transactionnel
`EMAIL_DEV_INBOX`. On protège donc au niveau de l'email poussé
(`resolveBrevoContactEmail`) : production = vrai email ; staging = **sous-adresse** de
`EMAIL_DEV_INBOX` (`local+u<userId>@beta.gouv.fr`) ; local = no-op. Aucun contact staging
ne porte de vrai email → aucune Automation ne peut atteindre un citoyen, même mal
configurée. Le `+u<userId>` conserve un contact distinct par demandeur (dédup Brevo par email).

### 4. Contrat app ↔ Brevo comme seule interface

Le jeu d'attributs/évènements (`brevo-contacts.config.ts`, documenté dans
`docs/emails/BREVO-LIFECYCLE.md`) est l'unique surface partagée. V2 = brancher une
Automation sur un attribut/évènement déjà poussé, sans code.

## Conséquences

- **Positif** : V2 sans déploiement (autonomie équipe) ; réutilise le SDK déjà installé
  (aucune dépendance) ; envois délégués à Brevo (délais, segmentation, désinscription,
  deliverability natifs) ; code minimal et best-effort.
- **Négatif / à assumer** : la logique d'envoi vit **hors repo** (non versionnée/testée) ;
  fiabilité du pipeline = les hooks + (fast-follow) un CRON de réconciliation ;
  le sous-adressage staging suppose que la boîte accepte le `+`.
- **RGPD** : liste + Automation = sollicitation → base légale, opt-out et désinscription
  requis avant activation en production (validation DPO). Hook technique : attribut d'opt-out.

## Alternatives écartées

- **Outbox in-app + CRON** : plus versionnable/testable, mais impose un déploiement par
  nouveau parcours et duplique une orchestration que Brevo fournit déjà. Écartée pour la
  V2 « sans code ».
- **Templates codés (React Email) déclenchés en transactionnel** : cohérents avec
  l'existant mais l'app garderait la main sur le timing et le contenu — contraire à
  l'objectif d'autonomie éditoriale.
