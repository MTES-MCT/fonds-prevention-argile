# ADR-0016 : Ré-ouverture d'une demande refusée par l'AMO

**Date** : 2026-06-25
**Statut** : Accepté

## Contexte

Un demandeur refusé par l'AMO porte une validation `parcours_amo_validations.statut`
dans un statut refusé (`logement_non_eligible`, en pratique le seul posé aujourd'hui,
ou `accompagnement_refuse`). Le parcours reste figé en `choix_amo / todo` et le dossier
apparaît dans les **archives** de l'AMO (état `REFUSE`, cf. `STATUTS_REFUSES`).

Cas métier fréquent : le demandeur avait été annulé car injoignable / pas encore prêt,
puis « se réveille » et veut reprendre. Il faut pouvoir **ré-ouvrir** la demande =
remettre la validation en attente pour que l'AMO la traite à nouveau.

Ce n'est PAS un désarchivage « notion A » (`parcours_prevention.archived_at`) :
`unarchiveDossierAction` ne touche pas `validation.statut` et son bouton UI est masqué
pour les refusés (`!isRefuse`). Il existait un script ops spécialisé
(`reset-amo-non-eligible.ts`) ; on veut une capacité unifiée, ouverte aussi via l'UI,
et tracée.

## Décision

> Nous exposons une ré-ouverture de demande refusée via un **service métier partagé**
> (`reouvrirDemandeRefusee`) appelé à la fois par le script ops et par une server
> action UI, nous **traçons** l'action dans `parcours_actions`, et nous autorisons
> l'action au **super-admin + l'AMO de l'entreprise rattachée + l'Aller-vers couvrant
> le territoire**.

Détail :

- Service `src/features/parcours/amo/services/reouverture-demande.service.ts` : pur
  domaine (aucune session/permission). Remet `validation` refusée -> `en_attente`
  (reset `valideeAt`/commentaire/tracking email), `parcours` -> `prospect` /
  `archived_* = null` / `current_status = en_instruction`, crée un token frais (90 j),
  et renvoie un email AMO optionnel.
- Script `scripts/ops/fix/reouvrir-demande.ts` (ex `reset-amo-non-eligible.ts`,
  renommé) : mince wrapper CLI dry-run/`--apply`.
- Server action `reouvrirDemandeAction` : garde de permission + service + audit +
  `revalidatePath`.
- Audit : insertion `parcours_actions` (type système `dossier_reouvert`, hors
  formulaire) avec snapshot auteur — répond au besoin « qui a ré-ouvert et quand »
  sans nouvelle colonne ni migration.
- Permission : prédicat pur `canReopenRefusedDemande(scope, …)`.

## Options envisagées

### Stockage de l'audit

#### Option A — `parcours_actions` (retenue)

- Avantages : table d'audit déjà en place (agent, horodatage, snapshot auteur conservé
  même si l'agent est supprimé) ; visible dans l'historique du dossier ; aucune
  migration ; cohérent avec les autres actions agent (ADR-0010).
- Inconvénients : il faut un type d'action « système » non listé dans le formulaire.

#### Option B — colonnes dédiées `reopened_at` / `reopened_by` sur `parcours_prevention`

- Avantages : lecture directe sans jointure.
- Inconvénients : migration ; ne mémorise qu'une seule ré-ouverture ; multiplie les
  colonnes `*_by/_at` (anti-pattern vs l'audit existant).

### Périmètre de permission

#### Option A — super-admin + AMO entreprise + AV territorial (retenue)

- Avantages : colle au besoin produit (un Aller-vers qui couvre le territoire peut
  relancer un dossier de son secteur même s'il porte une AMO) ; super-admin pour le
  support.
- Inconvénients : volontairement **plus large** que la visibilité normale
  (`canAccessDossier` refuse à l'AV un dossier portant une AMO) — donc une garde
  dédiée `canReopenRefusedDemande` et non la réutilisation directe de la visibilité.

#### Option B — `assertCanActAsResponsable` tel quel (AMO responsable + super-admin)

- Avantages : réutilise une garde existante.
- Inconvénients : pour une demande refusée le responsable résolu est l'AMO, donc l'AV
  serait refusé — contraire au besoin exprimé.

## Conséquences

### Positives

- Une seule logique métier entre script ops et UI (pas de duplication, transaction et
  garde-fous communs).
- Traçabilité immédiate (qui/quand) dans l'historique du dossier, sans migration.
- Capacité libre-service pour les AMO/AV concernés ; le support garde le script.

### Négatives / Risques

- La garde de ré-ouverture est plus permissive que la visibilité standard : tout
  ajout d'appelant doit passer par `canReopenRefusedDemande` (testé) pour éviter une
  sur-ouverture. Le super-admin est ici **autorisé en écriture** (exception explicite
  à `assertNotSuperAdminReadOnly`).
- `accompagnement_refuse` n'est jamais posé aujourd'hui : pris en charge par
  robustesse, mais non exercé en pratique.

### Migration

Aucune migration BDD. Renommage de l'alias `pnpm fix:amo-non-eligible` ->
`pnpm fix:reouvrir-demande`.

## Liens

- Service : `src/features/parcours/amo/services/reouverture-demande.service.ts`
- Server action : `src/features/backoffice/espace-agent/dossiers/actions/reouvrir-demande.actions.ts`
- Garde : `src/features/auth/permissions/services/agent-scope.service.ts` (`canReopenRefusedDemande`)
- Audit : `src/features/backoffice/espace-agent/shared/domain/types/action.types.ts` (`dossier_reouvert`), `src/features/backoffice/espace-agent/shared/services/author-snapshot.ts`
- UI : `src/app/(backoffice)/espace-agent/dossiers/[id]/components/ReouvrirDemandeButton.tsx`, `src/app/(backoffice)/espace-agent/shared/components/ReouvrirDemandeModal.tsx`
- Script : `scripts/ops/fix/reouvrir-demande.ts`
- ADR liés : [ADR-0010](0010-actions-typees-parcours.md) (actions typées), [ADR-0014](0014-perimetre-donnees-role-analyste.md) (périmètre rôles)
