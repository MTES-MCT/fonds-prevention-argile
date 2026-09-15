# Synchro de contacts Brevo (cycle de vie) — V0

Pipeline temps réel qui pousse les **contacts + attributs + évènements** vers Brevo à
chaque évènement métier. L'orchestration (timing des envois, choix des templates,
parcours de relance) vit dans les **Automations Brevo** (UI, sans déploiement) ; le code
ne fait que **peupler la donnée**.

> Décision d'architecture : [ADR-0021](../adr/0021-synchro-contacts-brevo-cycle-de-vie.md).
> Envois transactionnels (validation AMO, invitation, arrêt d'accompagnement) : voir
> `src/shared/email/` — indépendants de ce pipeline.

---

## 1. Qui possède quoi

| Côté **code (repo)**                                            | Côté **Brevo (UI, équipe, sans deploy)**                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Résout l'email du contact par environnement (anti-fuite)        | Crée les **attributs** de contact (voir §3)                          |
| Mappe `user`+`parcours` → attributs                             | Crée la **liste** cycle de vie (1 par env) → `BREVO_CONTACT_LIST_ID` |
| Upsert du contact dans la liste + enregistrement de l'évènement | Construit les **templates** hébergés                                 |
| 7 hooks best-effort (§2)                                        | Construit les **Automations** (déclenchées par évènement/attribut)   |

Le code **ne dépend pas** de l'existence d'une Automation : il remplit la liste, que des
Automations soient branchées ou non. C'est ce découplage qui rend les évolutions rapides.

---

## 2. Les 7 flux (hooks best-effort)

Un échec Brevo n'échoue jamais le flux métier appelant (log seulement).

| Déclencheur                    | Fichier                                                                                                           | `event_name`                    | `event_properties`                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| Dossier créé par un conseiller | `features/backoffice/espace-agent/creation-dossier/services/creation-dossier.service.ts` (`createDossierByAgent`) | `dossier_cree_par_conseiller`   | —                                                        |
| Compte créé                    | `features/auth/adapters/franceconnect/franceconnect.service.ts`                                                   | `demandeur_cree`                | —                                                        |
| Simulation enregistrée         | `features/parcours/core/actions/parcours-simulateur-rga-migration.actions.ts`                                     | `simulation_enregistree`        | —                                                        |
| Simulation non éligible        | idem — en plus du précédent, au **1er** archivage seulement                                                       | `simulation_non_eligible`       | —                                                        |
| Simulation non éligible        | `features/parcours/core/actions/enregistrer-simulation-demandeur.actions.ts` (correction depuis l'espace)         | `simulation_non_eligible`       | —                                                        |
| Simulation redevenue éligible  | idem — au dé-archivage seulement                                                                                  | `simulation_redevenue_eligible` | —                                                        |
| AMO définie                    | `features/parcours/amo/services/amo-selection.service.ts` (`selectAmoForUser`)                                    | `amo_defini`                    | —                                                        |
| Réponse AMO                    | `features/parcours/amo/services/amo-validation.service.ts`                                                        | `amo_reponse`                   | `decision` (`eligible`/`non_eligible`), `est_mandataire` |
| Dossier DN créé (brouillon)    | `features/parcours/dossiers-ds/services/dossier-ds.service.ts` (`createDossierForCurrentStep`)                    | `dn_update`                     | `step`, `old_ds_status` (`""`), `new_ds_status` (`""`)   |
| Update DN                      | `features/parcours/dossiers-ds/services/ds-sync.service.ts`                                                       | `dn_update`                     | `step`, `old_ds_status`, `new_ds_status`                 |

- `dossier_cree_par_conseiller` part quand un conseiller (AMO ou Aller-vers) pré-crée un dossier pour un
  demandeur sans compte FranceConnect actif (`createDossierByAgent`) : le `parcours_prevention` est
  créé **à cet instant précis**, potentiellement bien avant que le demandeur se connecte. Pousse
  `CREE_PAR_CONSEILLER=true` et `CONSEILLER_*` (déjà résolvables à ce stade : simulation/AMO saisis par
  l'agent). Distinct de `demandeur_cree` — les deux ne se recouvrent jamais (cf. ci-dessous).
- `demandeur_cree` (« compte créé ») part au premier compte **actif** : soit une inscription
  autonome (aucun dossier agent en amont), soit le premier rattachement (« claim ») d'un dossier
  pré-créé par un agent — piloté par `isNewAccount` (`userRepo.upsertFromFranceConnect`), pas par la
  création du `parcours_prevention` (qui peut précéder la connexion FC de plusieurs jours côté
  agent). Pousse `CREE_PAR_CONSEILLER` (`user.claimedAt !== null` — vrai seulement si ce compte provient
  d'un dossier pré-créé).

  > **Différé jusqu'à ce que le verdict soit connu (ADR-0034).** L'évènement déclenche le mail de
  > bienvenue, qui promet le contact d'un conseiller — faux pour un non éligible, dont le dossier
  > est archivé et que personne ne reprendra. Il n'est donc plus émis systématiquement au callback
  > FranceConnect :
  >
  > - **au callback**, seulement si une simulation est **déjà connue** (rattachement d'un dossier
  >   pré-créé, simulation agent promue) — et si elle est non éligible, c'est
  >   `simulation_non_eligible` qui part à la place ;
  > - **sinon** (inscription autonome, cas courant), il est émis à l'enregistrement de la
  >   **première** simulation, dans `migrateSimulationDataToDatabase` — même endroit, même
  >   exclusivité avec `simulation_non_eligible`.
  >
  > Conséquence assumée : un compte créé qui ne simule **jamais** ne reçoit aucun `demandeur_cree`,
  > donc aucun mail — on ne connaît ni son territoire ni son éligibilité, la promesse serait fausse
  > pour lui aussi. Décidé en septembre 2026 ; à revoir si une relance « terminez votre simulation »
  > est mise en place.

  Quand il part au callback pour une inscription autonome — cas devenu impossible depuis ce
  différé — INSEE/DEPARTEMENT et `CONSEILLER_*` étaient absents faute de simulation. Ils sont
  désormais toujours présents, puisque l'évènement suit l'enregistrement de la simulation.

- `simulation_enregistree` part quand la simulation localStorage est enregistrée sur le parcours
  (post-login) : il fait remonter INSEE/DEPARTEMENT, et donc **c'est le premier instant réel où le
  territoire — et donc `CONSEILLER_*` — devient résolvable** pour une inscription autonome
  (Aller-vers de l'EPCI/département par défaut ; l'attribution AMO auto en département obligatoire
  arrive un peu après, via `amo_defini`). **Idempotent** : une re-migration à l'identique (hors
  `simulatedAt`) ne le ré-émet pas (`isSameSimulationContent`).
- `simulation_non_eligible` et `simulation_redevenue_eligible` encadrent les deux **basculements**
  d'éligibilité, jamais les états stables : le premier au 1er archivage, le second au dé-archivage.
  Une correction qui laisse le dossier dans le même camp — y compris un changement de **raison**
  d'inéligibilité sur un dossier déjà archivé — n'émet que `simulation_enregistree`. Sans quoi le
  demandeur recevrait le même mail à chaque passage sur son formulaire.

  > **Pourquoi un évènement pour le retour à l'éligibilité (ADR-0036).** Depuis que le demandeur peut
  > corriger sa simulation, un dossier archivé peut redevenir éligible : un conseiller va le reprendre,
  > ce qu'aucun mail ne disait. `demandeur_cree` ne pouvait pas jouer ce rôle — il est déjà parti, et
  > il ne part qu'une fois. L'attribut `ELIGIBILITE` bascule bien à `eligible` (recalculé à chaque
  > push), mais un attribut segmente, il ne déclenche pas.
  >
  > Les deux points d'écriture ne se recouvrent pas : dans `migrateSimulationDataToDatabase`
  > (**première** simulation du compte), un dé-archivage est déjà couvert par `demandeur_cree`, dont
  > le mail de bienvenue promet précisément ce conseiller — l'évènement dédié n'y est donc pas émis.
  > Il ne sert que la **correction** d'une simulation existante.

  > **Angle mort connu — les corrections d'agent ne poussent rien.** `updateSimulationDataAction`
  > (correction de simulation par un AMO/Aller-vers) et `qualifyProspect` (qualification Aller-vers)
  > archivent et dé-archivent eux aussi, sans appeler `emitBrevoEvent` : le contact n'est ni
  > rafraîchi ni notifié. Le demandeur dont l'agent corrige la simulation ne reçoit donc aucun de
  > ces deux mails. Non traité par ADR-0036, qui ne couvre que le chemin demandeur.

- `amo_defini` part quand une AMO est attachée au parcours (choix manuel du demandeur ou
  auto-attribution — `assignAmoAutomatiqueForUser` délègue à `selectAmoForUser`, donc un seul hook
  couvre les deux). Rafraîchit les attributs `CONSEILLER_*` sur le contact : le responsable peut
  changer en cours de parcours (Aller-vers territorial → AMO), le mail de bienvenue n'étant pas la
  seule surface qui doit rester à jour.
- `dn_update` part de **deux endroits** distincts, tous deux best-effort :
  - à la **création** du dossier DN (`createDossierForCurrentStep`, brouillon local, avant
    tout dépôt — `ds_status` reste `NULL` en base à ce stade) : `old_ds_status`/`new_ds_status`
    sont poussés vides (`""`), et `DS_STATUT` est remis à `""` sur le contact — attention, ceci
    écrase un `DS_STATUT` d'une étape précédente déjà tranchée (ex. éligibilité `accepte`) si un
    nouveau dossier (diagnostic) est créé juste après ; assumé pour l'instant, à surveiller côté
    Automation si ça pose problème en pratique ;
  - au **changement réel** de `ds_status` détecté par la sync (même condition que
    `sync_run_entries`), au niveau bas de `syncDossierStatus` → couvre à la fois le CRON de
    sync et la sync UI demandeur.
    Une Automation qui veut distinguer les deux doit filtrer sur `new_ds_status` (vide = création,
    non vide = transition réelle) — `old_ds_status` seul ne suffit pas : le tout premier `dn_update`
    de transition (dépôt, `NULL → en_construction`) a lui aussi `old_ds_status` vide.

Point d'entrée unique : `emitBrevoEvent(parcoursId, eventName, { attributes?, eventProperties? })`
(`src/shared/email/brevo/`).

---

## 3. Contrat d'attributs (à créer dans Brevo)

Les `contact_properties` sont **ignorées si l'attribut n'existe pas** côté compte Brevo.
Source de vérité des noms : `src/shared/email/brevo/brevo-contacts.config.ts` (`BREVO_ATTRS`).

| Attribut               | Type    | Alimenté par                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PRENOM`, `NOM`        | Texte   | tous les flux                                                                                                                                                                                                                                                                                                                                                                        |
| `DATE_INSCRIPTION`     | Date    | tous (date de création du parcours)                                                                                                                                                                                                                                                                                                                                                  |
| `SITUATION`            | Texte   | tous (`prospect`/`particulier`)                                                                                                                                                                                                                                                                                                                                                      |
| `ETAPE`                | Texte   | tous (étape courante du parcours)                                                                                                                                                                                                                                                                                                                                                    |
| `STATUT`               | Texte   | tous (`todo`/`en_instruction`/`valide`)                                                                                                                                                                                                                                                                                                                                              |
| `A_AMO`                | Booléen | `false` à `demandeur_cree`, `true` à `amo_reponse` (jamais en base : un `dn_update` l'écraserait)                                                                                                                                                                                                                                                                                    |
| `AMO_STATUT`           | Texte   | `amo_reponse`                                                                                                                                                                                                                                                                                                                                                                        |
| `EST_MANDATAIRE`       | Booléen | `amo_reponse` (éligible + mandataire)                                                                                                                                                                                                                                                                                                                                                |
| `DS_STATUT`            | Texte   | `dn_update`                                                                                                                                                                                                                                                                                                                                                                          |
| `DEPARTEMENT`, `INSEE` | Texte   | dès que la simulation existe (`simulation_enregistree`, puis `amo_reponse`/`dn_update`) — pas au `demandeur_cree`                                                                                                                                                                                                                                                                    |
| `SOURCE_ACQUISITION`   | Texte   | tous                                                                                                                                                                                                                                                                                                                                                                                 |
| `PARCOURS_ID`          | Texte   | tous — `parcours_prevention.id`, dispo dès la création du parcours (avant toute résolution AMO/AV). Gardé pour rétrocompatibilité, voir `ADMIN_URL`                                                                                                                                                                                                                                  |
| `ADMIN_URL`            | Texte   | tous — URL complète vers la fiche de suivi dans l'espace agent, déjà résolue côté serveur (`resolveAdminUrl`, source de vérité unique) : `/espace-agent/prospects/{id}` (pas de validation AMO), `/espace-agent/demandes/{id}` (validation en attente sur une AMO réelle, non archivée), sinon `/espace-agent/dossiers/{id}`                                                         |
| `CONSEILLER_TYPE`      | Texte   | `dossier_cree_par_conseiller`, `demandeur_cree` (si déjà résolvable), `simulation_enregistree` et `amo_defini` — `AMO` ou `ALLERS_VERS`                                                                                                                                                                                                                                              |
| `CONSEILLER_NOM`       | Texte   | idem — nom de la structure responsable                                                                                                                                                                                                                                                                                                                                               |
| `CONSEILLER_EMAIL`     | Texte   | idem — 1er email de contact de la structure                                                                                                                                                                                                                                                                                                                                          |
| `CONSEILLER_TELEPHONE` | Texte   | idem                                                                                                                                                                                                                                                                                                                                                                                 |
| `CONSEILLER_HORAIRES`  | Texte   | idem — absent si la structure n'a pas renseigné d'horaires                                                                                                                                                                                                                                                                                                                           |
| `CREE_PAR_CONSEILLER`  | Booléen | `dossier_cree_par_conseiller` (`true`) et `demandeur_cree` (`user.claimedAt !== null`) — posé une fois, ne change plus                                                                                                                                                                                                                                                               |
| `ELIGIBILITE`          | Texte   | tous, dès qu'un critère est tranché — `eligible` / `non_eligible`, **verdict de la simulation** recalculé à chaque push (une simulation corrigée repasse à `eligible`). Absent tant que la simulation est incomplète sans critère bloquant. Sert à **segmenter** un état ; ce sont `simulation_non_eligible` / `simulation_redevenue_eligible` qui **déclenchent** sur un changement |
| `EMAIL_REEL`           | Texte   | **staging seulement** — vrai email quand le contact est sous-adressé (debug)                                                                                                                                                                                                                                                                                                         |

Évènements (`BREVO_EVENTS`) : `dossier_cree_par_conseiller`, `demandeur_cree`, `simulation_enregistree`,
`simulation_non_eligible`, `simulation_redevenue_eligible`, `amo_defini`, `amo_reponse`, `dn_update`.

---

## 4. Résolution d'email par environnement (garde-fou anti-fuite)

`resolveBrevoContactEmail(user)` :

| Env                    | Email poussé comme identité du contact                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **local** / pas de clé | `null` → **aucun push**                                                                                                   |
| **production**         | vrai email (`emailContact ?? email`)                                                                                      |
| **staging**            | sous-adresse de `EMAIL_DEV_INBOX` : `local+u<userId>@domaine` (jamais le vrai email) ; `null` si `EMAIL_DEV_INBOX` absent |

Une Automation Brevo envoie ses mails **depuis Brevo**, hors du redirect transactionnel
`EMAIL_DEV_INBOX`. En staging, on protège donc au niveau de **l'identité du contact** : aucun
contact staging ne porte de vrai email → aucune Automation ne peut atteindre un citoyen, même
mal configurée. Le `+u<userId>` garde un contact distinct par demandeur (Brevo dédoublonne par
email) tout en livrant tout dans la boîte de test.

---

## 5. TODO Brevo (setup UI)

- [ ] Créer les **attributs** du §3 (types respectés).
- [ ] Créer **2 listes** cycle de vie (staging + prod) → renseigner `BREVO_CONTACT_LIST_ID`
      par app Scalingo.
- [ ] Vérifier que la boîte `EMAIL_DEV_INBOX` accepte le sous-adressage `+`.
- [ ] Construire/valider les Automations **d'abord sur la liste staging**, puis dupliquer en prod.
- [ ] Mail de bienvenue (`demandeur_cree`) : personnaliser le template avec les attributs de contact
      `CONSEILLER_TYPE`/`CONSEILLER_NOM`/`CONSEILLER_EMAIL`/`CONSEILLER_TELEPHONE`/`CONSEILLER_HORAIRES`
      quand présents (ex. `{{contact.CONSEILLER_NOM}}`), avec un repli générique si absents (cas normal
      d'un demandeur qui s'inscrit lui-même, sans conseiller encore rattaché à cet instant).
- [ ] Décider si `dossier_cree_par_conseiller` doit déclencher une Automation dédiée (relance vers le
      demandeur pour qu'il finalise son compte) ou rester une simple mise à jour de contact.
- [ ] **Dévier le mail de bienvenue pour les non éligibles** (`ELIGIBILITE = non_eligible`) : il promet
      le contact d'un conseiller, or le dossier est archivé et personne ne le reprendra (ADR-0034).
      Brancher l'Automation dédiée sur **`simulation_non_eligible`**. **Rien à conditionner côté
      bienvenue** : `demandeur_cree` et `simulation_non_eligible` sont désormais mutuellement
      exclusifs côté code (cf. §2), un non éligible ne déclenche donc jamais l'Automation de
      bienvenue. L'attribut `ELIGIBILITE` reste utile pour segmenter les campagnes ultérieures
      (ne pas relancer un non éligible).
- [ ] **Annoncer le retour à l'éligibilité** : brancher une Automation sur
      **`simulation_redevenue_eligible`** (ADR-0036). Le demandeur a corrigé sa simulation, son
      dossier est dé-archivé et un conseiller va le reprendre — le mail de bienvenue est déjà parti
      et ne repartira pas. Personnaliser avec les `CONSEILLER_*`, comme la bienvenue.
- [ ] Ne pas conditionner cette Automation sur `ELIGIBILITE` : l'attribut vaut `eligible` en
      permanence pour l'immense majorité des contacts, l'évènement est le seul signal du
      **changement**.

---

## 6. RGPD

Ranger des citoyens dans une liste + Automation relève de la sollicitation : base légale,
opt-out et lien de désinscription requis avant toute Automation d'envoi en production
(à valider avec le DPO). Hook technique prévu : un attribut d'opt-out qui coupe le push.

---

## 7. Observabilité (logs serveur)

- **Erreurs** : toujours loggées (`console.error`, ex. `[BREVO_CONTACTS] upsertContact échec: …`) —
  visibles dans les logs Scalingo sans rien activer.
- **Trace détaillée** (diagnostic staging) : `DEBUG_BREVO_CONTACTS=true` active un journal
  complet du flux — début d'émission, raison de no-op (synchro désactivée, email non
  résoluble), email (masqué en production), **clés** d'attributs (jamais les valeurs, anti-PII),
  et résultat `{ upserted, tracked }`. À désactiver hors debug (verbeux).

---

## 8. Backfill des contacts existants (script ops)

Les attributs ne sont poussés qu'au moment d'un **évènement** (§2). Un contact dont le dernier
évènement est antérieur à l'ajout d'un attribut au contrat (§3) reste donc figé sur les anciennes
données — ex. `CONSEILLER_*` ou `ADMIN_URL` absents chez un demandeur inscrit avant leur mise en
place, ce qui fait planter les Automations qui comptent dessus.

`pnpm fix:backfill-brevo` recalcule et **upsert** l'état courant complet de chaque contact, sans
jamais rejouer `trackEvent` (aucun évènement historique n'est re-tiré, donc aucune Automation
n'est déclenchée). Il réutilise `buildContactAttributes` / `buildConseillerAttributes` — les mêmes
fonctions que les hooks live — et redérive depuis la base les attributs d'état normalement posés
par les hooks événementiels : `A_AMO` / `AMO_STATUT` / `EST_MANDATAIRE` (depuis
`parcours_amo_validations.statut`), `DS_STATUT` (dossier DS de l'étape courante) et
`CREE_PAR_CONSEILLER` (`parcours.created_by_agent_id`).

Dry-run par défaut ; voir [`scripts/ops/README.md`](../../scripts/ops/README.md#backfill-brevo-attributes)
pour les options (`--apply`, `--parcours-id`, `--sleep`, `--no-anonymize`) et les prérequis.

> `DS_STATUT` suit la même convention que le hook `dn_update` : il reflète le dossier de l'**étape
> courante** et vaut `""` si ce dossier n'est pas encore déposé — un contact revenu à une étape non
> déposée voit donc son `DS_STATUT` remis à vide, exactement comme en flux live (§2).

---

## 9. Fichiers clés

| Rôle                                                                | Fichier                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Contrat (attributs/évènements) + résolution email                   | `src/shared/email/brevo/brevo-contacts.config.ts`                                            |
| Adapter Contacts + Events                                           | `src/shared/email/brevo/brevo-contacts.adapter.ts`                                           |
| Mapping user+parcours → attributs                                   | `src/shared/email/brevo/contact-mapping.ts`                                                  |
| Mapping conseiller local (AMO/AV) → attributs                       | `src/shared/email/brevo/conseiller-mapping.ts`                                               |
| Point d'entrée `emitBrevoEvent`                                     | `src/shared/email/brevo/brevo-contacts.service.ts`                                           |
| Dossier créé par un conseiller (hook `dossier_cree_par_conseiller`) | `src/features/backoffice/espace-agent/creation-dossier/services/creation-dossier.service.ts` |
| Compte créé / rattachement stub (`isNewAccount`)                    | `src/shared/database/repositories/user.repository.ts` (`upsertFromFranceConnect`)            |
| Backfill des attributs (sans rejeu d'évènements)                    | `scripts/ops/fix/backfill-brevo-attributes.ts` (`pnpm fix:backfill-brevo`)                   |
