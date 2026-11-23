# ADR-0054 : Limitation de débit des routes publiques, en mémoire et par conteneur

**Date** : 2026-11-18
**Statut** : Accepté

## Contexte

L'inventaire des routes d'API (`src/app/registre-routes.ts`) a montré qu'aucune n'avait de plafond
d'appels. Plusieurs sont publiques et coûtent quelque chose à chaque appel : `/api/rga/alea` lance une
requête PostGIS, `/api/ds/piece-modele` un appel à Démarches Numériques, les départs et retours de
connexion un aller-retour vers FranceConnect ou ProConnect, `/claim-dossier/[token]` une lecture en base.
Leurs entrées sont validées, mais rien n'empêche de les appeler en boucle.

Devant l'application, le routeur Scalingo ne documente qu'une file d'attente de 50 requêtes par
conteneur web, pas de limitation de débit. L'application tourne sur des conteneurs de 512 Mo, où la
mémoire est déjà surveillée (`docs/ops/scalingo.md`). Le socle de sécurité de l'homologation demande une
« protection contre les attaques courantes ».

## Décision

> Nous plafonnons les appels par adresse IP avec un compteur tenu en mémoire du processus, posé en
> première instruction des routes publiques coûteuses.

- **Deux règles** (`DEBITS`, `src/shared/services/limitation-debit/limitation-debit.ts`) : `lecture`,
  120 appels par minute, et `connexion`, 60 par minute. Les plafonds sont larges : une administration
  entière sort souvent par une seule adresse.
- **Un compteur par règle et par adresse**, partagé entre les routes de la règle. Le chemin ne peut pas
  entrer dans la clé : celui d'une route à jeton change à chaque appel, et donnerait un compteur neuf à
  chaque essai.
- **L'adresse est celle de `X-Real-IP`**, que le routeur Scalingo écrase. À défaut, la dernière valeur
  de `X-Forwarded-For`, jamais la première, que le client écrit lui-même. Elle n'est pas stockée ; depuis
  l'ADR-0055, le premier dépassement d'une fenêtre l'écrit au journal de sécurité.
- **La table des compteurs est bornée à 10 000 entrées** : chaque adresse nouvelle en crée une, et un
  balayage d'adresses ne doit pas remplir la mémoire.
- **Chaque route déclare son plafond dans le registre**, ou la raison de ne pas en avoir.
  `garde-routes.test.ts` échoue si le limiteur n'est pas la première instruction.

Trois familles de routes n'ont pas de plafond, par décision :

| Route                                | Raison                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `/api/health`                        | Sonde de vie lue par l'hébergeur : un 429 ferait redémarrer un conteneur sain    |
| `/api/auth/check`                    | Appelée à chaque changement de page : bloquerait un service derrière une même IP |
| `/api/cron/*`, `/api/webhooks/brevo` | Refusées dès la première instruction sans le secret ; Brevo envoie par rafales   |

## Options envisagées

### Option A — Compteur en mémoire du processus (retenue)

- Avantages : aucune brique d'infrastructure à ajouter, à payer ni à homologuer ; aucun appel réseau ni
  écriture sur le chemin d'une requête ; un refus ne coûte rien.
- Inconvénients : le plafond vaut par conteneur, donc N conteneurs laissent passer N fois le plafond ;
  il repart de zéro à chaque redémarrage ; il n'arrête pas une attaque répartie sur beaucoup d'adresses.

### Option B — Compteur partagé dans Redis

- Avantages : plafond exact quel que soit le nombre de conteneurs, conservé aux redémarrages.
- Inconvénients : un service de plus à souscrire, superviser et inscrire au dossier d'homologation ; un
  appel réseau par requête ; une panne de Redis devient une panne des routes, ou une limite qui saute.

### Option C — Compteur dans PostgreSQL

- Avantages : pas de nouveau service, plafond partagé.
- Inconvénients : une écriture par appel sur la base que le plafond cherche justement à protéger.

### Option D — Limiter dans le middleware

- Avantages : un seul point pour toutes les routes.
- Inconvénients : le middleware tourne dans le runtime Edge, où la persistance d'un état entre deux
  requêtes n'est pas garantie ; il s'exécute aussi sur chaque page, où un plafond par adresse gênerait
  les services derrière une même IP.

### Option E — S'en remettre à l'hébergeur

- Avantages : rien à écrire.
- Inconvénients : Scalingo ne documente aucune limitation de débit ; un pare-feu applicatif reste à
  arbitrer avec le RSSI et ne se décide pas dans le dépôt.

## Conséquences

### Positives

- Une boucle d'appels depuis une adresse s'arrête après 120 lectures ou 60 étapes de connexion par
  minute, avec un 429 et un `Retry-After`.
- Une route publique ajoutée sans plafond ni raison écrite fait échouer la CI.
- Le dossier d'homologation dispose d'une réponse vérifiable à « protection contre les attaques
  courantes », et de ses limites écrites.

### Négatives / Risques

- **Ce n'est pas une protection anti-DDoS.** Une attaque répartie passe sous chaque plafond. Le
  pare-feu applicatif reste un sujet ouvert.
- **Le plafond dépend du nombre de conteneurs.** Passer à plusieurs conteneurs web le multiplie d'autant :
  réévaluer cette décision à ce moment-là (option B).
- **Des utilisateurs légitimes derrière une même adresse partagent un compteur.** Les plafonds sont
  calibrés pour que ça n'arrive pas en usage normal ; un 429 inattendu en recette est un signal pour les
  relever, pas pour retirer la limite.
- Les server actions publiques (référentiels CATNAT et Aller-vers, chiffrement du simulateur en iframe)
  ne sont pas couvertes : elles ne passent pas par un `route.ts`.

## Liens

- Limiteur : `src/shared/services/limitation-debit/limitation-debit.ts`
- Registre et test : `src/app/registre-routes.ts`, `src/app/garde-routes.test.ts`
- Registre des contrôles : [CONTROLES-CI.md](../security/CONTROLES-CI.md)
- Routage Scalingo : <https://doc.scalingo.com/platform/internals/routing>
