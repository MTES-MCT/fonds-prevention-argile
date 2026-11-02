# ADR-0050 : Doublons de demandeur à l'invitation

**Date** : 2026-11-02
**Statut** : Accepté

## Contexte

Un agent peut créer un dossier pour un demandeur et l'inviter à le réclamer avec FranceConnect
(`createDossierByAgent`). Rien ne vérifiait que ce demandeur n'avait pas déjà un compte. Or un
compte FranceConnect ne porte qu'un `fc_id` (contrainte d'unicité) : un second dossier ne peut
jamais lui être rattaché.

Cas de production du 2 novembre 2026 : un demandeur inscrit en novembre 2025, déclaré non éligible
par Soliha 03 en mars 2026. Sa simulation stockait le département en nombre (`3`), que
`matchesTerritoire` ne rapprochait pas de « 03 » : le dossier avait disparu de la liste de Soliha.
Soliha lui a donc recréé un dossier en juillet, avec un autre email. Le demandeur s'est reconnecté
sur son compte, qui lui annonçait toujours son inéligibilité, pendant que Soliha suivait l'autre
dossier. La même requête a relevé 8 autres paires invitation / compte FranceConnect au même email.

Mesuré le même jour : 104 simulations stockent leurs codes en nombres, toutes faites entre novembre 2025 et
janvier 2026 (aucune depuis). Onze dossiers actifs en sortaient, 6 dans l'Allier et 5 dans les
Alpes-de-Haute-Provence, dont 2 demandes encore en attente d'une réponse de Soliha 03 : la page qui les liste
par entreprise n'est reliée à aucun menu, et la liste « Dossiers » les cachait.

Quand le demandeur cliquait l'invitation, le rattachement violait l'unicité de `fc_id` : il lisait
« Erreur lors de l'échange de token », et l'erreur Drizzle, journalisée telle quelle, emportait
son `sub`, son email et son nom dans les logs.

## Décision

> Le compte FranceConnect existant fait foi. On empêche de créer un doublon quand on peut le
> détecter, et on le signale à l'agent quand il apparaît malgré tout.

- **Email déjà connu** (email ou email de contact d'un compte, ou d'une invitation en attente) :
  création refusée, contrôlée dès l'étape « Coordonnées » puis de nouveau à l'enregistrement.
- **Logement déjà connu** (même clé BAN ou même adresse normalisée) : alerte, que l'agent peut
  passer en confirmant qu'il s'agit d'un autre demandeur (`confirmerDoublonAdresse`).
- **Lien vers le dossier existant** seulement s'il est dans le périmètre de l'agent
  (`verifyProspectTerritoryAccess`) ; sinon le message renvoie vers l'équipe.
- **Rattachement en conflit** : le demandeur est connecté à son compte, le jeton de l'invitation
  est invalidé, et une action système `invitation_non_rattachee` apparaît sur le dossier invité.
- **Doublon déjà formé** : `pnpm fix:fusionner-invite` ramène sur le compte FranceConnect les
  actions et la simulation de l'agent, puis supprime le dossier invité. La décision AMO reste à
  l'AMO, qui ré-ouvre ou accepte depuis l'espace agent.

## Options envisagées

### Option A — Garder le compte FranceConnect et y ramener le travail de l'agent (retenue)

- Avantages : c'est le seul compte où le demandeur peut se connecter ; la fusion ne déplace que
  des actions et une simulation ; la décision d'éligibilité passe par les écrans habituels (audit,
  mails, changement d'étape).
- Inconvénients : la décision de l'AMO est à reprendre à la main sur le compte FranceConnect.

### Option B — Transférer l'identité FranceConnect sur le dossier invité

- Avantages : le dossier de l'agent reste intact, décision AMO comprise.
- Inconvénients : écarte le compte que le demandeur utilise, laisse une décision orpheline sur un
  dossier abandonné, et touche à `fc_id`, la donnée d'identité la plus sensible de la base.

### Option C — Rattacher automatiquement l'invitation au compte existant

- Avantages : aucun geste d'agent ni d'opérateur.
- Inconvénients : fusionner deux dossiers sans regard humain, alors que la seule preuve du lien est
  un email ou une adresse saisis par un tiers.

### Option D — Bloquer aussi sur le logement

- Avantages : aurait évité le cas de production, où les emails différaient.
- Inconvénients : deux propriétaires successifs, ou deux demandes au même logement, deviendraient
  impossibles à créer.

## Conséquences

### Positives

- Les 8 doublons au même email n'auraient pas pu être créés, et le cas de production aurait déclenché l'alerte « même logement ».
- Le demandeur n'est plus bloqué par une erreur au clic sur une invitation.
- Les logs du callback FranceConnect ne portent plus de données personnelles.

### Négatives / Risques

- Un agent apprend qu'un email a déjà un compte, même hors de son périmètre. C'est assumé : il ne
  voit ni le dossier ni son contenu, et l'alternative est un dossier qu'il ne pourra jamais suivre.
- Un email différent saisi par l'agent, à une adresse orthographiée autrement, échappe encore à la
  détection : la trace `invitation_non_rattachee` reste le filet.

### Migration

Les 8 paires existantes et le cas de production se traitent au cas par cas avec
`pnpm fix:fusionner-invite`, après `pnpm fix:codes-geo` (cf. `docs/SUJETS-A-TRAITER.md`).

## Liens

- `src/features/backoffice/espace-agent/creation-dossier/services/doublon-demandeur.service.ts`
- `src/features/backoffice/espace-agent/creation-dossier/domain/doublon.ts`
- `src/shared/database/repositories/user.repository.ts` (`upsertFromFranceConnect`)
- `src/features/auth/adapters/franceconnect/franceconnect.service.ts`
- `scripts/ops/fix/fusionner-dossier-invite.ts`, `scripts/ops/fix/normaliser-codes-geo.ts`
- `src/shared/database/repositories/parcours-prevention.repository.ts` (`matchesTerritoire`)
