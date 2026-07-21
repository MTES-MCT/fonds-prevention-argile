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
| 3 hooks best-effort (§2)                                        | Construit les **Automations** (déclenchées par évènement/attribut)   |

Le code **ne dépend pas** de l'existence d'une Automation : il remplit la liste, que des
Automations soient branchées ou non. C'est ce découplage qui rend les évolutions rapides.

---

## 2. Les 3 flux (hooks best-effort)

Un échec Brevo n'échoue jamais le flux métier appelant (log seulement).

| Déclencheur        | Fichier                                                         | `event_name`     | `event_properties`                                       |
| ------------------ | --------------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| Création demandeur | `features/auth/adapters/franceconnect/franceconnect.service.ts` | `demandeur_cree` | —                                                        |
| Réponse AMO        | `features/parcours/amo/services/amo-validation.service.ts`      | `amo_reponse`    | `decision` (`eligible`/`non_eligible`), `est_mandataire` |
| Update DN          | `features/parcours/dossiers-ds/services/ds-sync.service.ts`     | `dn_update`      | `step`, `old_ds_status`, `new_ds_status`                 |

- `demandeur_cree` ne part **qu'à la première création** du parcours (pas à chaque login).
- `dn_update` ne part **que sur changement réel** de `ds_status` (même condition que
  `sync_run_entries`). Le hook est au niveau bas de `syncDossierStatus` → couvre à la fois
  le CRON de sync et la sync UI demandeur.

Point d'entrée unique : `emitBrevoEvent(parcoursId, eventName, { attributes?, eventProperties? })`
(`src/shared/email/brevo/`).

---

## 3. Contrat d'attributs (à créer dans Brevo)

Les `contact_properties` sont **ignorées si l'attribut n'existe pas** côté compte Brevo.
Source de vérité des noms : `src/shared/email/brevo/brevo-contacts.config.ts` (`BREVO_ATTRS`).

| Attribut               | Type    | Alimenté par                                                                 |
| ---------------------- | ------- | ---------------------------------------------------------------------------- |
| `PRENOM`, `NOM`        | Texte   | tous les flux                                                                |
| `DATE_INSCRIPTION`     | Date    | tous (date de création du parcours)                                          |
| `SITUATION`            | Texte   | tous (`prospect`/`particulier`)                                              |
| `ETAPE`                | Texte   | tous (étape courante du parcours)                                            |
| `STATUT`               | Texte   | tous (`todo`/`en_instruction`/`valide`)                                      |
| `A_AMO`                | Booléen | base `false`, passé `true` par `amo_reponse`                                 |
| `AMO_STATUT`           | Texte   | `amo_reponse`                                                                |
| `EST_MANDATAIRE`       | Booléen | `amo_reponse` (éligible + mandataire)                                        |
| `DS_STATUT`            | Texte   | `dn_update`                                                                  |
| `DEPARTEMENT`, `INSEE` | Texte   | tous (depuis `rgaSimulationData`)                                            |
| `SOURCE_ACQUISITION`   | Texte   | tous                                                                         |
| `EMAIL_REEL`           | Texte   | **staging seulement** — vrai email quand le contact est sous-adressé (debug) |

Évènements (`BREVO_EVENTS`) : `demandeur_cree`, `amo_reponse`, `dn_update`.

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

---

## 6. RGPD

Ranger des citoyens dans une liste + Automation relève de la sollicitation : base légale,
opt-out et lien de désinscription requis avant toute Automation d'envoi en production
(à valider avec le DPO). Hook technique prévu : un attribut d'opt-out qui coupe le push.

---

## 7. Fichiers clés

| Rôle                                              | Fichier                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| Contrat (attributs/évènements) + résolution email | `src/shared/email/brevo/brevo-contacts.config.ts`  |
| Adapter Contacts + Events                         | `src/shared/email/brevo/brevo-contacts.adapter.ts` |
| Mapping user+parcours → attributs                 | `src/shared/email/brevo/contact-mapping.ts`        |
| Point d'entrée `emitBrevoEvent`                   | `src/shared/email/brevo/brevo-contacts.service.ts` |
