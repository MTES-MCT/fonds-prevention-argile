# Journal de sécurité

Ce que l'application journalise pour pouvoir dire, après coup, qui s'est connecté et qui a fait quoi
dans l'administration. Décision et alternatives : [ADR-0055](../adr/0055-journal-de-securite-sur-la-sortie-standard.md).

> **Tout évènement ajouté, renommé ou retiré met à jour ce registre dans la même PR.** Une action
> d'administration qui écrit sans journaliser fait échouer `administration/journal-actions.test.ts`.

---

## 1. Forme d'une ligne

Une ligne JSON par évènement, sur la sortie standard, écrite par `journaliser`
(`src/shared/services/journal-securite/journal-securite.ts`).

```json
{
  "journal": "securite",
  "v": 1,
  "date": "2026-11-23T13:45:33.624Z",
  "evenement": "agent_cree",
  "resultat": "succes",
  "acteur": { "type": "agent", "id": "<uuid>", "role": "super_administrateur" },
  "cible": { "type": "agent", "id": "<uuid>" },
  "details": { "compte": "plateforme", "role": "analyste" },
  "ip": "203.0.113.7"
}
```

| Champ       | Contenu                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `journal`   | Toujours `securite` : c'est ce qui distingue ces lignes des messages de diagnostic               |
| `date`      | Instant de l'évènement, en UTC                                                                   |
| `evenement` | Un nom de la liste fermée du § 2                                                                 |
| `resultat`  | `succes`, `refus` (la règle a dit non) ou `echec` (panne)                                        |
| `acteur`    | `agent` ou `demandeur` avec son identifiant, `systeme` (le CRON), `anonyme` avant toute identité |
| `cible`     | Ce sur quoi porte l'évènement : agent, structure, expert, parcours, dossier DN, route            |
| `motif`     | Code court d'un refus ou d'un échec                                                              |
| `details`   | Codes, identifiants et compteurs                                                                 |
| `ip`        | Adresse vue par le routeur de l'hébergeur (`X-Real-IP`), `inconnue` hors d'une requête           |

Une valeur d'en-tête qui n'a pas la forme d'une adresse IP n'est pas reprise : le champ vaut `inconnue`.

**Aucune identité n'entre au journal** : ni nom, ni email, ni téléphone, ni texte saisi (la raison d'une
désactivation reste en base). Un agent se retrouve par son identifiant dans `/administration/agents`.

**Le journal reste une donnée personnelle** : un identifiant, une adresse IP et la date d'une action
désignent une personne, même sans son nom. Inventaire : [DONNEES-PERSONNELLES.md](DONNEES-PERSONNELLES.md).
Il ne sert qu'à la sécurité (attribuer une connexion ou une écriture, reconstituer un incident), pas à
mesurer l'activité d'un agent.

---

## 2. Évènements

### Accès

| Évènement               | Quand                                                                 | Motifs de refus ou d'échec                                                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connexion_agent`       | Retour de ProConnect, réussi ou non                                   | `erreur_fournisseur`, `parametres_manquants`, `etat_invalide`, `double_authentification_absente`, `jeton_invalide`, `sujet_incoherent`, `donnees_incompletes`, `agent_inconnu_ou_desactive`, `erreur_technique` |
| `connexion_demandeur`   | Retour de FranceConnect, réussi ou non                                | `erreur_fournisseur`, `parametres_manquants`, `etat_invalide`, `nonce_invalide`, `erreur_technique`                                                                                                             |
| `deconnexion_agent`     | Déconnexion ProConnect                                                |                                                                                                                                                                                                                 |
| `deconnexion_demandeur` | Déconnexion FranceConnect                                             |                                                                                                                                                                                                                 |
| `acces_refuse`          | Appel du CRON ou du webhook Brevo sans le bon secret                  | `secret_invalide`                                                                                                                                                                                               |
| `debit_depasse`         | Premier dépassement d'un plafond d'appels dans une fenêtre (ADR-0054) |                                                                                                                                                                                                                 |

Une connexion d'agent réussie porte son niveau d'authentification (`acr`), une connexion de demandeur
dit si le compte vient d'être créé. `erreur_fournisseur` (connexion annulée ou refusée chez ProConnect ou
FranceConnect) porte notre code d'erreur interne, jamais le texte renvoyé par le fournisseur.

### Administration

| Évènement                                                               | Action journalisée                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `agent_cree`, `agent_modifie`                                           | Création, modification : rôle ou structure donnés, champs modifiés |
| `agent_desactive`, `agent_reactive`, `agent_supprime`                   | Retrait et retour d'un accès                                       |
| `structure_creee`, `structure_modifiee`, `structure_supprimee`          | Vie d'une structure                                                |
| `habilitation_ajoutee`, `habilitation_modifiee`, `habilitation_retiree` | AMO, Aller-vers ou expert : ce qui fait les rôles des agents       |
| `structures_importees`                                                  | Import Excel : rôle importé, nombre de structures créées, refusées |
| `expert_desactive`, `expert_reactive`                                   | Annuaire des experts                                               |
| `synchronisation_lancee`                                                | Synchronisation DN, par le CRON ou à la main                       |
| `amo_rattachee`, `observation_dn_resolue`                               | Réparations depuis les diagnostics                                 |
| `sondage_dn_lance`, `reconciliation_analysee`                           | Balayages DN qui écrivent leurs verdicts en base                   |

---

## 3. Lire le journal

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000 | grep '"journal":"securite"'
```

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 logs-archives
```

→ les lignes au-delà de 50 Mio sont dans des archives à télécharger, à filtrer avec le même `grep`.

Conservation : un an, par l'hébergeur. La CNIL recommande de garder ces journaux entre six mois et un an
(délibération n° 2021-122) : un collecteur ne doit pas les garder plus longtemps sans motif écrit. Ce que disent les autres journaux : l'historique d'un dossier est
dans `parcours_actions` (ADR-0028), celui des synchronisations dans `sync_runs`.

---

## 4. Ce qui n'est pas journalisé

- Les lectures, dont la consultation de la liste nominative des demandeurs.
- Les refus d'accès aux pages et aux actions de l'administration (un agent sans le rôle requis).
- Les actions de l'espace agent sur un dossier : elles sont dans l'historique du dossier.
- Les requêtes HTTP une à une : c'est le rôle des journaux du routeur de l'hébergeur.

Suivi dans [SUJETS-A-TRAITER.md](../SUJETS-A-TRAITER.md).
