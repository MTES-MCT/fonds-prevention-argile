# Tests manuels — Fluidité du passage Aller-vers vers AMO

**Environnement** : local — `pnpm db:start`, `pnpm db:migrate`, `pnpm start:dev`, Mailhog sur http://localhost:8025

> La base de dev ne porte que des structures du **36 (Indre)**, département à AMO imposé sans
> cumul. Les parcours 2 et 3 demandent donc de surcharger deux variables dans `.env.local`,
> puis de **redémarrer** `pnpm start:dev` (variables `NEXT_PUBLIC_`, lues au build).

---

## Parcours 1 — Un dossier créé par l'Aller-vers part chez l'AMO

**Persona** : agent Aller-vers **pur** (sans casquette AMO)
**Objectif** : prouver que la qualification transmet le dossier même si le demandeur n'a jamais
créé son compte — c'est le dossier qui restait chez l'Aller-vers.

> **Le compte est déterminant.** Avec un agent AMO ou hybride, le dossier est rattaché à son
> entreprise dès la création : il n'y a plus de prospect à qualifier, et l'action tracée est
> « Éligible — accompagnement accepté » (décision d'une AMO), pas « Éligible — qualifié par
> l'Aller-vers ». Ce parcours ne prouve alors rien.

**Données**

- Compte agent (ProConnect) : `user@yopmail.com` / `user@yopmail.com` — Aller-vers Adil 36, **sans entreprise AMO**, département 36 (AMO imposé)
- Adresse à saisir : `12 Rue Grande, 36000 Châteauroux`
- `.env.local` : aucune modification pour ce parcours

**Étapes**

- [ ] Se connecter sur http://localhost:3000/espace-agent/dossiers → l'espace agent s'ouvre
- [ ] Ouvrir http://localhost:3000/espace-agent/dossiers/nouveau?intent=av → assistant « Ajout d'un nouveau dossier », étape 1 sur 4
- [ ] Choisir « Créer simplement un dossier sans faire de simulation d'éligibilité », puis renseigner prénom, nom, l'adresse ci-dessus, un téléphone et un email `@yopmail.com` inédit
- [ ] Terminer **sans** envoyer l'invitation → dossier créé, visible dans le listing
- [ ] Ouvrir le dossier créé → bandeau « Le demandeur n'a pas encore accepté l'invitation », aucune AMO au dossier
- [ ] Qualifier : « Éligible et peut passer à l'étape AMO », mandataire financier « Non », confirmer → enregistrement sans erreur rouge
- [ ] Recharger la page → une AMO du 36 apparaît au dossier, en attente de sa réponse
- [ ] Ouvrir http://localhost:8025 → un mail de demande de validation est parti vers l'AMO du 36
- [ ] Rouvrir le dossier, section « Actions réalisées » → une seule ligne, **« ✅ Éligible — qualifié par l'Aller-vers »**, dont le message se termine par « Dossier transmis à l'AMO du territoire. »

> `/espace-agent/prospects` redirige vers `/espace-agent/dossiers` : les deux listings sont
> unifiés. Le bouton « Nouveau dossier » de cette page pointe sur `?intent=amo`, d'où l'URL
> explicite en `?intent=av` ci-dessus.

**Cas limites**

- [ ] Re-qualifier le même dossier en « Éligible » → pas de second mail dans Mailhog, pas de doublon d'AMO
- [ ] Qualifier un autre dossier créé **sans adresse** → message d'erreur explicite sur l'écran, la qualification reste enregistrée

**Remise à zéro** : `pnpm fix:purge-comptes-test-fc --email=<email saisi> --apply`

---

## Parcours 2 — L'Aller-vers tranche l'accompagnement (AMO facultatif)

**Persona** : agent Aller-vers
**Objectif** : vérifier les trois réponses possibles, et qu'« il ne sait pas encore » est la
seule qui laisse la question au demandeur.

**Données**

- `.env.local` : `NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE=54` puis **redémarrer** le serveur (le 36 devient facultatif)
- Compte agent (ProConnect) : `user@yopmail.com` / `user@yopmail.com` — Aller-vers Adil 36
- Prospect : http://localhost:3000/espace-agent/prospects/22222222-2222-4222-8222-222222222c20 — Châteauroux 36, sans validation AMO
- Deux autres prospects du même profil : `...222222c06` (Issoudun) et `...222222c07` (Le Blanc)

**Étapes**

- [ ] Ouvrir le prospect de Châteauroux et cocher « Éligible » → une question « Le demandeur souhaite-t-il être accompagné ? » apparaît, avec trois réponses
- [ ] Confirmer sans répondre à cette question → message « Veuillez indiquer ce que le demandeur souhaite comme accompagnement. »
- [ ] Répondre « Oui, il souhaite être accompagné par un AMO », confirmer → mail de demande à l'AMO dans Mailhog, historique mentionnant la transmission
- [ ] Sur le prospect d'Issoudun, qualifier éligible + « Non, il gère ses démarches seul » → aucun mail, historique mentionnant « Le demandeur poursuit sans accompagnement. »
- [ ] Sur le prospect du Blanc, qualifier éligible + « Il ne sait pas encore » → aucun mail, historique mentionnant « Choix de l'accompagnement laissé au demandeur. »
- [ ] Rouvrir chacun des trois → le callout de qualification affiche la ligne « Accompagnement : … » correspondante

**Cas limites**

- [ ] Remettre `NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE=36`, redémarrer, ouvrir un prospect et cocher « Éligible » → la question **n'apparaît pas** (l'AMO y est imposé)
- [ ] Toujours en AMO imposé, cocher « Non éligible » ou « À qualifier » → ni la question d'accompagnement, ni celle du mandataire financier

**Remise à zéro** : retirer les surcharges de `.env.local` et redémarrer le serveur

---

## Parcours 3 — L'Aller-vers qui est aussi l'AMO ne valide plus deux fois

**Persona** : agent hybride AMO + Aller-vers
**Objectif** : vérifier que sa qualification vaut validation AMO — sans mail de demande — et que
le dossier atteint directement l'étape éligibilité.

**Données**

- `.env.local` : `NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES=36` puis **redémarrer** le serveur
- Compte agent (ProConnect) : `martin@evlaa.com` — rôle `amo_et_allers_vers`, AMO du Berry Profond, département 36
- Adresse à saisir : `5 Rue Victor Hugo, 36100 Issoudun`

**Étapes**

- [ ] Se connecter, créer un dossier depuis http://localhost:3000/espace-agent/prospects (email `@yopmail.com` inédit, adresse ci-dessus)
- [ ] Qualifier ce dossier en « Éligible », mandataire financier « Oui », confirmer → aucune erreur
- [ ] Ouvrir Mailhog → **aucun** mail de demande de validation AMO n'est parti
- [ ] Rouvrir le dossier → il n'est plus en attente de réponse AMO, l'AMO du Berry Profond en est responsable
- [ ] Historique du dossier → le message de qualification se termine par « Accompagnement pris en charge par la structure qui a qualifié le dossier. »

**Cas limites**

- [ ] Refaire la même création + qualification avec `user@yopmail.com` (Aller-vers **pur**, sans casquette AMO) → un mail de demande **part bien** vers l'AMO : la validation directe lui est refusée
- [ ] Remettre `NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES=` (vide), redémarrer, refaire avec `martin@evlaa.com` → le mail de demande repart : hors cumul, le raccourci ne s'applique pas

**Remise à zéro** : retirer les surcharges de `.env.local`, `pnpm fix:purge-comptes-test-fc --email=<emails saisis> --apply`

---

## Parcours 4 — Le demandeur reprend un dossier déjà décidé

**Persona** : demandeur (FranceConnect)
**Objectif** : vérifier qu'au rattachement du compte, le parcours atterrit sur l'étape
correspondant à ce que l'agent a décidé — sans reposer la question.

**Données**

- Compte FranceConnect : login `test` / `123` — libre en base, à consommer (saisir le **login**, pas l'email)
- Autre compte si besoin : `avec_nom_dusage` / `123`
- Reprendre le dossier créé au **parcours 1** (AMO sollicitée, en attente de réponse) et son lien d'invitation

**Étapes**

- [ ] Depuis l'espace agent, sur le dossier du parcours 1, renvoyer l'invitation → mail reçu dans http://localhost:8025
- [ ] Ouvrir le lien d'invitation dans une fenêtre privée, se connecter avec `test` / `123` → le compte est rattaché au dossier existant
- [ ] Sur http://localhost:3000/mon-compte → le bandeau annonce l'attente de la réponse de l'AMO, **aucun** écran de choix d'accompagnement n'est proposé
- [ ] « Ma liste » → l'item « Choix de l'accompagnement » est déjà traité, l'étape « 2. Éligibilité » n'est pas ouverte
- [ ] Vérifier que les données de logement saisies par l'agent sont bien reprises (adresse de Châteauroux), pas une demande de refaire la simulation

**Cas limites**

- [ ] Refaire l'opération avec le dossier « autonomie » du parcours 2 → le demandeur arrive directement sur l'étape éligibilité, sans question d'accompagnement
- [ ] Refaire avec le dossier « il ne sait pas encore » du parcours 2 → le choix d'accompagnement **est** proposé au demandeur

**Remise à zéro** : `pnpm fix:purge-comptes-test-fc --email=wossewodda-3728@yopmail.com --apply`

---

## Parcours 5 — Non-régression

- [ ] Un demandeur du 36 arrivant sur http://localhost:3000/mon-compte à l'étape choix AMO voit toujours l'attribution automatique de son AMO
- [ ] Sur http://localhost:3000/espace-agent/dossiers, la liste et le détail d'un dossier s'affichent sans erreur
- [ ] Le détail d'une demande (http://localhost:3000/espace-agent/demandes/33333333-3333-4333-8333-333333333320) permet toujours d'accepter ou refuser l'éligibilité, et trace l'action
- [ ] « Vérifier son éligibilité » sur http://localhost:3000/espace-agent/dossiers/33333333-3333-4333-8333-333333333a13 : corriger en non éligible → dossier archivé ; revenir en éligible → désarchivé, et le parcours n'est pas bloqué sans callout
- [ ] Archiver puis désarchiver http://localhost:3000/espace-agent/prospects/55555555-5555-4555-8555-555555555536 → l'action d'archivage reste visible dans l'historique
- [ ] Page d'accueil publique, tableau des plafonds : le 36 est annoncé en AMO obligatoire
- [ ] `pnpm fix:lier-amo-oblig` (dry-run) → s'exécute sans erreur et inventorie les dossiers sans validation, y compris ceux restés en invitation
