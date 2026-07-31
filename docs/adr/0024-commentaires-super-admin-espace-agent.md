# ADR-0024 : Commentaires/actions ouverts au super-admin dans l'espace agent

**Date** : 2026-07-31
**Statut** : Accepté

## Contexte

Le `SUPER_ADMINISTRATEUR` a un accès national à l'espace agent (`/espace-agent/*`), mais
strictement en **lecture seule** : toute Server Action d'écriture y appelle
`assertNotSuperAdminReadOnly()` (`super-admin-access.ts`), qui refuse l'action pour ce rôle
avant même de vérifier autre chose. Un bandeau (`SuperAdminReadOnlyBanner`) rappelle ce
statut sur toutes les pages de l'espace agent.

Le besoin exprimé : permettre au super-admin de **logguer un suivi** sur un dossier — ajouter
un commentaire/une action, comme le fait déjà un `ANALYSTE` en mode départemental sur son
territoire — sans pour autant lui ouvrir la gestion de l'éligibilité, de l'accompagnement ou
la création de dossiers, qui restent des décisions métier réservées aux AMO/Aller-vers.

Un précédent existe déjà : [ADR-0016](0016-reouverture-demande-refusee.md) a ouvert la
ré-ouverture d'une demande refusée au super-admin, en contournant volontairement
`assertNotSuperAdminReadOnly()` pour cette seule action. Ce projet suit le même schéma pour
les commentaires.

## Décision

> Les Server Actions `createActionAction`, `updateActionAction` et `deleteActionAction`
> (`espace-agent/shared/actions/dossier-actions.actions.ts`) n'appellent plus
> `assertNotSuperAdminReadOnly()`. Le super-admin peut donc créer une action/un commentaire
> sur n'importe quel dossier (portée nationale, `COMMENTAIRES_READ_ALL` déjà présent) et
> éditer/supprimer **ses propres** commentaires, exactement comme n'importe quel agent
> (`canEditAction`, ownership par `agentId`). Aucun traitement de faveur au-delà : il ne peut
> pas éditer/supprimer les commentaires d'un autre agent.

Le reste de l'espace agent reste bloqué pour le super-admin via
`assertNotSuperAdminReadOnly()` : gestion de l'éligibilité (accepter/refuser une demande,
refuser un accompagnement éligible), arrêt/refus d'accompagnement, archivage/désarchivage,
création de dossier, qualification prospect, édition des données de simulation.

Le texte du bandeau `SuperAdminReadOnlyBanner` est ajusté pour refléter cette exception
(« lecture seule, hors ajout de commentaires/actions de suivi »).

## Options envisagées

### Option A — Exception ciblée sur les 3 Server Actions de commentaires (retenue)

- Avantages : minimal (3 suppressions d'appel), cohérent avec le précédent ADR-0016, aucune
  modification du modèle de permissions (`ROLE_PERMISSIONS[SUPER_ADMINISTRATEUR]` contient
  déjà toutes les permissions, y compris `COMMENTAIRES_*`, depuis toujours) ; la restriction
  « propres commentaires uniquement » vient gratuitement de `canEditAction`, déjà appliquée à
  tous les rôles.
- Inconvénients : le bandeau générique « lecture seule » devient une simplification légère
  (une écriture reste possible) — corrigé en reformulant son texte plutôt qu'en le retirant.

### Option B — Nouveau rôle ou permission dédiée (ex. `SUPER_ADMIN_SUIVI`)

- Avantages : distinction explicite dans la matrice de permissions.
- Inconvénients : sur-ingénierie pour une seule capacité déjà couverte par le rôle existant ;
  ajoute un rôle pour un cas qui se résout par le retrait d'un unique garde-fou applicatif.

### Option C — Formulaire dédié « note super-admin » hors du flux `parcours_actions`

- Avantages : séparerait explicitement les notes super-admin du fil d'actions des agents.
- Inconvénients : duplique l'UI et le modèle de données pour un besoin identique (loguer un
  suivi) ; casse la cohérence du fil d'actions unique par dossier.

## Conséquences

### Positives

- Le super-admin peut assurer un suivi de dossier (note, appel, précision) sans dépendre d'un
  agent AMO/Aller-vers, utile en cas d'absence ou de dossier orphelin.
- Aucun changement de la matrice de permissions ni de l'UI (le formulaire n'était déjà pas
  masqué côté client pour ce rôle) — seule la garde serveur est retirée pour ces 3 actions.

### Négatives / Risques

- Le bandeau « lecture seule » est désormais une approximation ; risque de confusion si le
  texte n'est pas tenu à jour en cas de nouvelle exception future (à documenter dans
  [RBAC-ROLES.md §6.1.2](../security/RBAC-ROLES.md)).
- Toute future capacité supplémentaire ouverte au super-admin doit suivre le même principe
  (garde ciblée, pas de retrait généralisé de `assertNotSuperAdminReadOnly`) pour ne pas
  éroder progressivement le read-only par accumulation d'exceptions non documentées.

## Liens

- [RBAC-ROLES.md §6.1.2](../security/RBAC-ROLES.md#612-commentairesactions-ouverts-au-super-admin-deuxième-exception-au-read-only)
- [RBAC-TEST-PLAN.md](../security/RBAC-TEST-PLAN.md) — tableau MEDIUM, ligne « Commentaires create/update/delete »
- [ADR-0016](0016-reouverture-demande-refusee.md) — précédent (ré-ouverture de demande)
- `src/features/backoffice/espace-agent/shared/actions/dossier-actions.actions.ts`
- `src/features/backoffice/espace-agent/shared/actions/dossier-actions.actions.test.ts`
- `src/app/(backoffice)/espace-agent/components/SuperAdminReadOnlyBanner.tsx`
