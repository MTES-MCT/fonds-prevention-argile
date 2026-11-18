# Contrôles de sécurité automatisés

Registre des contrôles qui tournent sans intervention humaine : ce que chacun vérifie, quel risque
il couvre, quand il tourne et s'il bloque. À mettre à jour dans la PR qui ajoute, modifie ou retire
un contrôle.

> Ce registre ne décrit que l'automatique. Les rôles et périmètres sont dans
> [RBAC-ROLES.md](RBAC-ROLES.md), les données personnelles dans
> [DONNEES-PERSONNELLES.md](DONNEES-PERSONNELLES.md), les vulnérabilités acceptées dans
> [snyk-accepted-vulnerabilities.md](snyk-accepted-vulnerabilities.md).

---

## 1. Chaîne d'intégration

| Contrôle                   | Risque couvert                                                       | Où                                          | Quand                         | Bloque                   |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------- | ----------------------------- | ------------------------ |
| Détection de secrets       | Clé, jeton ou mot de passe commité par erreur                        | `ci.yml`, job `Security Checks` (Talisman)  | Chaque push, chaque PR        | Oui                      |
| Typage, lint, tests, build | Régression fonctionnelle, garde d'accès retirée (cf. § 2)            | `ci.yml`, job `Test, Lint & Build`          | Chaque push, chaque PR        | Oui                      |
| Revue des dépendances      | PR qui introduit une dépendance vulnérable (High, Critical)          | `revue-dependances.yml`                     | Chaque PR                     | Oui                      |
| Revue des licences         | PR qui introduit une licence absente de la liste                     | `revue-dependances.yml`                     | Chaque PR                     | Oui                      |
| Audit des dépendances      | Faille publiée sur une dépendance déjà en place                      | `veille-dependances.yml`, job `audit`       | Chaque lundi, et à la demande | Ouvre une issue          |
| Inventaire des composants  | Ne pas savoir si l'on est concerné par une faille annoncée           | `veille-dependances.yml`, job `sbom`        | Chaque évolution de `main`    | Non (artefact, 90 jours) |
| Mises à jour proposées     | Dépendance ou action GitHub restée sur une version sans correctif    | `dependabot.yml` (npm et `github-actions`)  | Chaque semaine                | Non (ouvre des PR)       |
| Délai avant adoption       | Version malveillante d'un paquet, retirée dans les jours qui suivent | `pnpm-workspace.yaml` (`minimumReleaseAge`) | Chaque installation           | Oui                      |
| Scripts d'installation     | Code exécuté à l'installation d'une dépendance                       | `.npmrc` (`ignore-scripts`), `allowBuilds`  | Chaque installation           | Oui                      |

« Bloque » suppose que les jobs sont requis pour fusionner : voir § 4.

### Durcissement des workflows eux-mêmes

- **Aucun droit par défaut** : chaque workflow commence par `permissions: {}`, chaque job déclare
  les siens. Seul l'audit hebdomadaire a un droit d'écriture (`issues: write`).
- **Actions figées par empreinte de commit**, la version en commentaire : une étiquette (`v4`) peut
  être déplacée par son auteur, pas une empreinte. Dependabot propose les montées de version.
- **`persist-credentials: false`** à chaque checkout : le jeton du job ne reste pas dans `.git`.
- **Talisman est téléchargé dans une version fixée et son empreinte SHA-256 est vérifiée.**
  Dependabot ne suit pas ce binaire : pour le monter de version, changer `TALISMAN_VERSION` et
  `TALISMAN_SHA256` dans `ci.yml` (fichier `checksums` de la release).
- **Aucune expression `${{ … }}` venant d'un évènement n'est interpolée dans un script** : elle
  passe par `env`.

### Ce que scanne Talisman

En CI, Talisman lit les commits de la PR (ou du push) en mode `pre-push`. Le mode `pre-commit` ne
lit que l'index git, vide dans une CI : il passait toujours, quoi que contienne le dépôt. Le hook
local (`.husky/pre-commit`) garde, lui, le mode `pre-commit`, qui est le bon avant un commit.

`pnpm-lock.yaml` n'a plus d'empreinte dans `.talismanrc` : un lockfile n'est fait que de hachés
sha512, et l'empreinte à recalculer à chaque montée de version faisait échouer toute PR Dependabot.

---

## 2. Garde-fous dans la suite de tests

Ils tournent avec `pnpm test`, donc à chaque push. Chacun échoue en nommant le fichier fautif.

| Test                                                      | Ce qu'il refuse                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `auth/permissions/garde-server-actions.test.ts`           | Une server action sans garde, ou qui lit le rôle du JWT                        |
| `backoffice/espace-agent/garde-actions.test.ts`           | Une action de l'espace agent dont la garde n'est pas la première instruction   |
| `app/(backoffice)/espace-agent/garde-pages.test.ts`       | Une page ou un `generateMetadata` de l'espace agent sans garde                 |
| `shared/database/inventaire-donnees-personnelles.test.ts` | Une colonne absente de l'inventaire ou non traitée à la restauration d'un dump |
| `vulnerabilite-rga/garde-hors-production.test.ts`         | Une surface du simulateur de vulnérabilité ouverte en production               |

Détail et limites : [RBAC-TEST-PLAN.md § 5](RBAC-TEST-PLAN.md).

---

## 3. Accepter une vulnérabilité

Une faille High ou Critical sans correctif applicable se déclare à trois endroits, dans la même PR :

1. `docs/security/snyk-accepted-vulnerabilities.md` : sévérité, chemin transitif, justification ;
2. `auditConfig.ignoreGhsas` dans `pnpm-workspace.yaml`, lu par l'audit hebdomadaire ;
3. `allow-ghsas` dans `.github/workflows/revue-dependances.yml`, lu par la revue des PR.

L'entrée sort des trois dès que le correctif est appliqué. Une faille Moderate ou Low ne bloque
rien : elle se trace dans le document seul.

Une licence nouvelle se traite de même : après relecture, l'ajouter à `allow-licenses` dans
`revue-dependances.yml`.

---

## 4. Réglages du dépôt (hors code)

Ils se règlent dans GitHub, pas dans un fichier. État relevé le 18 novembre 2026.

| Réglage                                             | État       |
| --------------------------------------------------- | ---------- |
| Revue obligatoire avant fusion sur `main`           | Actif      |
| Force-push et suppression de `main` interdits       | Actif      |
| Détection de secrets par GitHub (secret scanning)   | Actif      |
| Détection de secrets par GitGuardian, sur chaque PR | Actif      |
| Analyse de qualité du code (GitHub Code Quality)    | Actif      |
| Analyse de sécurité du code (CodeQL, code scanning) | **Absent** |
| Correctifs de sécurité Dependabot                   | Actif      |
| Jobs de CI requis pour fusionner                    | **Absent** |
| Blocage des secrets au push (push protection)       | **Absent** |

Tant que les jobs ne sont pas requis, une PR peut être fusionnée avec une CI rouge : les contrôles
du § 1 informent, ils ne bloquent pas. Suivi dans [SUJETS-A-TRAITER.md](../SUJETS-A-TRAITER.md).

---

## 5. Ce que la CI ne vérifie pas

- Les en-têtes HTTP servis et la garde des routes d'API (`route.ts`).
- Les failles dans le code lui-même : l'analyse en place (Code Quality) juge la maintenabilité, pas
  la sécurité, et le code scanning CodeQL n'est pas configuré.
- Le comportement de l'application déployée : aucun scan dynamique.
- La logique métier et le cloisonnement entre rôles au-delà des tests du § 2 : c'est l'objet d'un
  audit manuel.
