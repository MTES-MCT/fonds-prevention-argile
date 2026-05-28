# Incident : double-progression du parcours à la validation AMO

Document de référence sur le bug constaté en prod en mai 2026 : certains parcours sautaient deux étapes (`CHOIX_AMO → ELIGIBILITE → DIAGNOSTIC`) en une seule transaction de validation AMO, sans qu'aucun dossier DS n'ait été créé entre les deux.

À lire en complément de [FLOW-AND-SYNC.md](./FLOW-AND-SYNC.md) qui décrit le modèle d'état nominal.

---

## 1. Symptômes observés

En prod, 12 parcours étaient à `current_step = diagnostic, current_status = todo` mais sans aucune ligne dans `dossiers_demarches_simplifiees` pour l'étape `diagnostic`. Le script [`audit-parcours-ds-integrity.ts`](../../scripts/ops/audit-parcours-ds-integrity.ts) a permis de les lister.

On a découpé en deux groupes :

- **Groupe A — 9 parcours** : avaient bien une ligne BDD `step = eligibilite, ds_status = accepte`. Le CRON les a progressés normalement après acceptance de leur dossier éligibilité, mais l'utilisateur n'est jamais revenu pour cliquer sur "Créer mon dossier diagnostic". **Cas légitime, pas un bug**.
- **Groupe B — 3 parcours** : aucune ligne DS, même pas pour `eligibilite`. Tous ont leur `parcours.updated_at` aligné à la milliseconde près sur `parcours_amo_validations.validee_at`. **Anomalie**.

| ID anonymisé | Validation AMO | Phase code à l'époque |
| --- | --- | --- |
| #B-1 | 2026-04-02 | avant `ecbe35aa` (auto-progression côté sync) |
| #B-2 | 2026-04-14 | avant `ecbe35aa` |
| #B-3 | 2026-05-22 | après le CRON `d080e57e`, **bug encore actif** |

---

## 2. Méthodologie d'enquête

L'absence de logs HTTP (rétention Scalingo dépassée, pas de Sentry/Datadog en prod) a imposé une enquête purement par données. On a procédé par couches d'élimination, sur le parcours #B-3 (le plus récent, le plus susceptible d'être encore actif).

### 2.1 Couches d'analyse

1. **État brut du parcours et user** : créé via FranceConnect, pas via agent (`created_by_agent_id = NULL`), pas archivé, `last_login` 3 semaines avant la validation, RGA simulé.
2. **Autres parcours / users pour la même personne** : un seul. Pas de duplication.
3. **Sync runs autour de la validation** : aucun sync_run actif entre 10h et 13h le 22/05 → le CRON n'a pas tourné dans cette fenêtre.
4. **Tokens AMO** : un seul token, créé à la sélection AMO le 11/04, utilisé à la validation le 22/05. Pas de re-génération.
5. **Commentaires admin** : aucun. Pas d'intervention manuelle tracée.
6. **Empreinte Brevo** : `email_clicked_at = 14/04` (3 jours après réception), `email_opened_at = NULL`, validation 38 jours plus tard. Donc l'AMO n'a probablement **pas** cliqué sur le lien email au moment de valider — il a utilisé le backoffice.
7. **Triggers / rules PostgreSQL** : aucun trigger métier, aucune rule. La table n'est mutée que par le code applicatif.

### 2.2 Hypothèses écartées

| Hypothèse | Écartée par |
| --- | --- |
| CRON de sync a fait sauter le step | Couche 3 (aucun sync_run dans la fenêtre) + couche 1 du script audit (aucun `sync_run_entries`) |
| `skipAmoStep` a été appelé | `choisie_at` ne correspond pas à la date où le skip aurait écrasé le row |
| Auto-progression `syncDossierStatus` (commit `ecbe35aa`, retiré dans `d080e57e`) | Fenêtre temporelle incompatible avec #B-3 (post-suppression) et avec #B-1/#B-2 (pré-introduction) |
| Server action `passerEtapeSuivante` | Définie mais **importée nulle part** dans l'UI → Next.js ne l'expose pas comme endpoint client appelable |
| Crash CRON entre la mutation et l'écriture de `sync_run_entries` | Couche 3 vide |
| Trigger ou rule PG masqué(e) | Couche 7 vide |
| Intervention manuelle SQL/Drizzle Studio | Ni prouvable ni réfutable sans audit log — exclue par pragmatisme |

---

## 3. Cause racine

`approveValidation()` et `rejectEligibility()` ([`amo-validation.service.ts`](../../src/features/parcours/amo/services/amo-validation.service.ts)) étaient :

- **Non idempotents** : aucune vérification `valideeAt IS NULL` avant d'agir. Un second appel sur la même validation refaisait toutes les mutations.
- **Non atomiques** : la mise à jour de la validation, du token, du parcours et la progression étaient des UPDATE séparés, sans transaction. Pas de garantie de cohérence si une étape échouait.
- **Non conditionnels** : `moveToNextStep` lisait l'état courant et avançait d'une étape, sans vérifier que le step de départ était bien celui attendu.

Combinés, ces trois défauts permettaient à **deux appels concurrents** à `approveValidation` de faire avancer le parcours de deux étapes en cascade :

```
État initial : CHOIX_AMO / EN_INSTRUCTION

R1 démarre à T+0ms     : lit CHOIX_AMO/EN_INSTRUCTION
R2 démarre à T+~5ms    : lit CHOIX_AMO/EN_INSTRUCTION (R1 pas encore commit)
R1 update validation   → valideeAt = NOW
R1 updateStatus(VALIDE)→ CHOIX_AMO / VALIDE
R1 moveToNextStep      → relit l'état, voit VALIDE → ELIGIBILITE / TODO
R2 update validation   → valideeAt = NOW (écrase)
R2 updateStatus(VALIDE)→ ELIGIBILITE / VALIDE   ← état dérivé du commit de R1
R2 moveToNextStep      → relit l'état, voit VALIDE → DIAGNOSTIC / TODO
```

État final : `DIAGNOSTIC / TODO`, sans aucun dossier DS créé.

Le déclencheur le plus probable des deux appels concurrents : **double-clic sur le bouton "Valider" du backoffice espace-agent** ([`ReponseAccompagnement.tsx`](../../src/app/(backoffice)/espace-agent/demandes/[id]/components/ReponseAccompagnement.tsx)). Le bouton était bien protégé par un state `isSubmitting`, mais celui-ci n'est appliqué qu'au re-render React suivant le `onClick` — deux clics très rapprochés (latence réseau lente) passaient les deux la garde côté UI.

Brevo confirme indirectement : pour le cas étudié, `email_clicked_at` est antérieur de 38 jours à la validation. L'AMO a donc validé via le backoffice, pas via le lien email — donc deux appels veulent dire deux clics sur le **même** bouton.

---

## 4. Fix appliqué

Trois niveaux de défense, dans la même PR.

### 4.1 Niveau serveur — idempotence atomique

`approveValidation` et `rejectEligibility` sont maintenant wrappées dans `db.transaction()`, et la mutation de la validation est conditionnelle :

```ts
const [validation] = await tx
  .update(parcoursAmoValidations)
  .set({ statut: LOGEMENT_ELIGIBLE, commentaire, valideeAt: new Date() })
  .where(and(
    eq(parcoursAmoValidations.id, validationId),
    isNull(parcoursAmoValidations.valideeAt),
  ))
  .returning({ id, parcoursId });

if (!validation) {
  // Soit introuvable, soit déjà validée → no-op idempotent
  // (on lit l'état pour distinguer et retourner alreadyProcessed)
}
```

Sous l'isolation `READ COMMITTED` (défaut PostgreSQL), deux UPDATE concurrents sur la même ligne sont sérialisés. Le 2e réévalue la clause `valideeAt IS NULL` après le commit du 1er → retourne 0 ligne → no-op.

### 4.2 Niveau serveur — transition parcours atomique conditionnelle

La progression du parcours n'est plus `updateStatus(VALIDE) + moveToNextStep`. C'est une transition métier unique, conditionnée sur l'état attendu :

```ts
const [moved] = await tx
  .update(parcoursPrevention)
  .set({ currentStep: Step.ELIGIBILITE, currentStatus: Status.TODO })
  .where(and(
    eq(parcoursPrevention.id, validation.parcoursId),
    inArray(parcoursPrevention.currentStep, [Step.CHOIX_AMO, Step.INVITATION]),
  ))
  .returning({ id });

if (!moved) {
  console.warn(`parcours ${validation.parcoursId} déjà progressé hors CHOIX_AMO/INVITATION — step non touché`);
}
```

Cela ferme **définitivement** la classe de bugs : même si une seconde mutation passait outre la garde idempotence, elle ne pourrait plus avancer un parcours qui n'est plus à `CHOIX_AMO` ou `INVITATION`.

### 4.3 Niveau UI — garde synchrone anti-double-clic

Dans [`ReponseAccompagnement.tsx`](../../src/app/(backoffice)/espace-agent/demandes/[id]/components/ReponseAccompagnement.tsx), ajout d'un `useRef` qui bloque les clics avant que React n'ait re-rendu le bouton en `disabled` :

```ts
const submitLockRef = useRef(false);

const handleSubmit = async () => {
  if (submitLockRef.current) return;
  submitLockRef.current = true;
  setIsSubmitting(true);
  try {
    // ...
  } finally {
    setIsSubmitting(false);
    submitLockRef.current = false;
  }
};
```

Et gestion explicite du cas `result.data?.alreadyProcessed === true` : on n'affiche pas la modale de confirmation classique, on affiche un message d'info "Demande déjà traitée".

### 4.4 Feedback utilisateur

Le type de retour de `approveValidation` et `rejectEligibility` expose maintenant :

```ts
{ message: string; alreadyProcessed: boolean; valideeAt: Date }
```

Permet à l'UI de distinguer "validé à l'instant" (succès normal, modale de confirmation) vs "validé il y a X (jours|secondes)" (lien rouvert, message d'info dédié).

---

## 5. Correction du stock

Le script [`fix-double-progression-amo.ts`](../../scripts/ops/fix-double-progression-amo.ts) détecte lui-même les parcours victimes du bug (même critère que l'audit) et les ramène à `eligibilite/todo`. Il les catégorise en trois :

| Catégorie | Critère | Traitement |
|---|---|---|
| **régressable** | aucun dossier DS | régression directe (`--apply`) |
| **cleanup requis** | dossiers downstream uniquement `en_construction` (brouillons jamais soumis — ex. cas "Edouard" qui a cliqué "Créer mon dossier diagnostic") | suppression des brouillons + régression (`--apply --with-cleanup`) |
| **à reviewer** | au moins un dossier downstream soumis | jamais touché automatiquement, listé |

Garanties : la régression est un UPDATE conditionnel sur `current_step IN (diagnostic,devis,factures)` (skip si l'état a changé depuis la détection) ; la suppression de brouillon est conditionnée sur `ds_status='en_construction'` ; tout passe en transaction par parcours.

```bash
tsx scripts/ops/fix-double-progression-amo.ts                         # dry-run
tsx scripts/ops/fix-double-progression-amo.ts --apply                 # régressables
tsx scripts/ops/fix-double-progression-amo.ts --apply --with-cleanup  # + cas "Edouard"
```

Ramener à `eligibilite/todo` est sûr : pour les cas "cleanup requis", on ne supprime que des brouillons DS jamais soumis. Le parcours reprend normalement via l'UI à la prochaine connexion de l'utilisateur, et un dossier diagnostic neuf (avec les bonnes annotations) sera créé le moment venu.

### Runbook d'exécution

À jouer dans l'ordre, sur un **restore frais de la BDD prod en local** (`DATABASE_URL` du `.env.local` doit pointer vers ce restore). Les alias pnpm transmettent les flags directement, sans `--`.

`--anonymize` masque les PII (id, email, ds_number) à l'affichage — disponible sur **toutes** les commandes ci-dessous (audit, dry-run ET apply), pour produire des logs partageables. Les vraies valeurs restent utilisées en interne pour les écritures.

```bash
# 0. Restore frais de la BDD prod en local
bash .local/restore-db.sh <backup>.tar.gz

# 1. Audit (read-only). Catégorise et affiche un résumé :
#    légitimes (rien à corriger) / régressables / cleanup requis / à reviewer.
#    --anonymize : version masquée (partage / ticket Notion). Sans flag : version interne avec identités.
pnpm audit:parcours-ds --anonymize --csv=audit-J0-anon.csv
pnpm audit:parcours-ds --csv=audit-J0.csv

# 2. Plan de correction (dry-run, aucune écriture).
#    Affiche les mêmes catégories que l'audit (logique partagée) : régressables / cleanup requis / à reviewer.
pnpm fix:double-progression --anonymize

# 3. Correction. --with-cleanup traite aussi les cas "Edouard"
#    (suppression des brouillons diagnostic en_construction + régression).
#    --anonymize : logs d'exécution partageables (OK/SKIP/ERR avec id masqués).
pnpm fix:double-progression --apply --with-cleanup --anonymize

# 4. Vérification : doit afficher 0 régressable / 0 cleanup requis.
pnpm fix:double-progression --anonymize

# 5. Re-audit : ne doit rester que les cas légitimes (groupe A, utilisateurs passifs).
pnpm audit:parcours-ds --anonymize

# --- J+3 puis J+7 (après déploiement du fix serveur) ---
# Confirme qu'aucun NOUVEAU cas n'apparaît (le fix d'idempotence tient).
pnpm fix:double-progression --anonymize
```

Cibler un seul parcours (ex. débloquer un cas isolé sans toucher au reste) :

```bash
pnpm fix:double-progression --parcours-id=<uuid> --apply --with-cleanup --anonymize
```

Si l'étape 1, 2 ou 3 liste des cas en catégorie **à reviewer** (dossier downstream soumis côté DS), ils ne sont jamais touchés automatiquement : les traiter au cas par cas (recherche du dossier DS, rattachement manuel ou décision métier).

---

## 6. Prévention future

### 6.1 À adopter sur les autres transitions

Le pattern **UPDATE conditionnel sur l'état attendu** doit être généralisé. Toute transition métier qui dépend de l'état courant devrait faire un UPDATE avec un `WHERE` qui inclut les champs lus, et tester le résultat. Sinon, on rouvre la classe de bugs ailleurs.

Candidats à durcir progressivement (non bloquant pour la PR de fix) :

- [`moveToNextStep`](../../src/features/parcours/core/services/parcours-progression.service.ts) — accepte `userId`, relit l'état, fait un UPDATE non conditionnel. À refactorer pour prendre un `expectedFrom: { step, status }` paramètre.
- [`skipAmoStepForUser`](../../src/features/parcours/amo/services/amo-selection.service.ts) — protégé par un `if` au début, mais la lecture et l'UPDATE ne sont pas atomiques. À mettre en transaction avec UPDATE conditionnel.
- [`createDiagnosticDossier`](../../src/features/parcours/core/services/diagnostic.service.ts) — l'insertion du dossier en BDD et l'update du statut sont séparés. Peuvent se désynchroniser si une étape échoue. À mettre en transaction.

### 6.2 Observabilité — manquant critique

L'enquête a été coûteuse parce qu'il n'y a aucun audit log des transitions d'état. Pour ne plus avoir à reconstituer ce genre de timeline par corrélation de timestamps, deux options non exclusives :

- **Table applicative `parcours_history`** alimentée par tous les `updateStep` / `updateStatus`. Stocke `parcours_id, from_step, to_step, from_status, to_status, actor, reason, at`.
- **Trigger PostgreSQL** sur `parcours_prevention` qui logge tout `UPDATE` de `current_step` ou `current_status` dans une table d'audit. Moins flexible (pas d'`actor` applicatif facile) mais imparable côté DB.

À prioriser côté roadmap technique.

### 6.3 Logs HTTP

La rétention par défaut Scalingo couvre seulement quelques jours. Pour les incidents qui se révèlent plusieurs semaines après leur déclenchement (cas de #B-3, découvert 5 jours après le fait, déjà à la limite), considérer :

- Activer `logs-archives` long terme (S3).
- Configurer Sentry pour les erreurs serveur, et tracer les server actions sensibles (validations AMO, créations de dossier, transitions de step) avec un span dédié.

---

## 7. Références

- Script d'audit (read-only) : [`scripts/ops/audit-parcours-ds-integrity.ts`](../../scripts/ops/audit-parcours-ds-integrity.ts)
- Script de correction stock : [`scripts/ops/fix-double-progression-amo.ts`](../../scripts/ops/fix-double-progression-amo.ts)
- Doc nominale du flow : [`FLOW-AND-SYNC.md`](./FLOW-AND-SYNC.md)
- Service patché : [`src/features/parcours/amo/services/amo-validation.service.ts`](../../src/features/parcours/amo/services/amo-validation.service.ts)
- UI patchée : [`src/app/(backoffice)/espace-agent/demandes/[id]/components/ReponseAccompagnement.tsx`](../../src/app/(backoffice)/espace-agent/demandes/[id]/components/ReponseAccompagnement.tsx)
