# Sujets à traiter plus tard

Sujets identifiés et volontairement reportés : ce qu'on sait du problème, ce qui reste à décider,
et ce qu'il faut faire avant de s'y mettre. Le détail reste dans la doc de référence, vers laquelle
chaque entrée renvoie.

> Ajouter une entrée quand un sujet est écarté d'une PR (revue, périmètre, arbitrage en attente) ;
> la retirer dans la PR qui le traite. Une entrée dit **pourquoi** c'est reporté et **quel préalable**
> la débloque, sinon elle ne sert à rien.

---

## Synchronisation DN

### Rattraper les dossiers classés sans suite des parcours archivés ou complétés

- **Constat** : avant la PR #392, la synchro recopiait l'état DN `sans_suite`, refusé par l'enum
  `ds_status`. Les dossiers concernés sont restés figés à leur ancien état, sans `processed_at`.
  Le CRON rattrape les parcours actifs à son premier passage, mais `findActiveForSync` exclut les
  parcours archivés ou complétés, et `pnpm ds:backfill-processed-at` ne sélectionne que les dossiers
  déjà finaux en base. Ceux-là restent donc faux.
- **Préalable** : mesurer en production avec `pnpm ds:analyser-ecarts` (cause « état DN absent de
  l'enum ds_status »), après le déploiement de #392 et un premier run du CRON. Ce script vit sur la
  branche `feat/audit-ecarts-dn`, pas encore mergée : il faut la merger d'abord.
- **À faire si des dossiers restent** : un script ops ponctuel, dry-run par défaut, qui écrit le
  statut traduit (`dsStatusFromEtatDn`) et les dates DN, **sans** progression ni réouverture du
  parcours.
- **Référence** : [FLOW-AND-SYNC §3.2](parcours/FLOW-AND-SYNC.md#32-mapping-ds--interne).

### Transition d'étape conditionnée à l'étape attendue

- **Constat** : la synchro (CRON comme demandeur) relit l'étape avant d'appeler `moveToNextStep`,
  mais une progression concurrente peut encore s'intercaler entre cette relecture et l'écriture. Le
  parcours avancerait alors depuis une étape dont le dossier n'a pas été relu, voire serait marqué
  complété.
- **Pourquoi reporté** : la fenêtre est de quelques millisecondes (CRON trois fois par jour contre une
  synchro demandeur), et la fermer change le contrat de `moveToNextStep` et du repository.
- **À faire** : passer l'étape attendue à `moveToNextStep` et conditionner l'UPDATE
  (`WHERE current_step = <attendue>`), sur le modèle de `markAsCompleted` (`WHERE completed_at IS NULL`).
- **Référence** : [FLOW-AND-SYNC §6.1](parcours/FLOW-AND-SYNC.md#61-auto-progression-automatique-cron--sync-ui-demandeur).

### Purge de l'historique des synchros et flag « parcours complété »

- Dette déjà décrite dans [FLOW-AND-SYNC §6.10](parcours/FLOW-AND-SYNC.md#610-non-décisions--dette-technique-connue).

---

## Sécurité et dépendances

### Vulnérabilité High `source-map-js` (`pnpm audit --prod`)

- **Constat** : `source-map-js` <1.2.2 (GHSA-68fv-2mgg-jv7q, DoS), transitif via
  `@socialgouv/matomo-next > next > postcss`, apparu après le refresh d'octobre 2026 et non tracé.
- **À faire** : override `source-map-js: ^1.2.2`, checksum `.talismanrc`, section « Refresh » de
  [snyk-accepted-vulnerabilities.md](security/snyk-accepted-vulnerabilities.md).

### Migration Next 16, ESLint 10, `@vitejs/plugin-react` 6, remplacement de `@react-email/components`

- Détail dans la section « Prochaine revue » de
  [snyk-accepted-vulnerabilities.md](security/snyk-accepted-vulnerabilities.md#prochaine-revue).
