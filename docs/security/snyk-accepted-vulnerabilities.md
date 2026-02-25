# Vulnérabilités Snyk — Acceptées

Date d'audit : février 2026
Auditeur : Samir + Claude

## Décision

Les 10 vulnérabilités remontées par Snyk (6 High, 4 Medium) sont **acceptées** pour les raisons suivantes :

- **Reachability** : Snyk confirme "No path found" sur les 10 issues
- **6/10 sont des devDependencies** (eslint, ts-node, @types/*) — absentes du bundle de production
- **4/10 sont transitives runtime** sans input utilisateur exposé (minimatch, ajv, inflight, diff)
- **0 exploit mature** connu
- **Aucun fix disponible** sans upgrade majeur breaking (Next 16, ESLint 10)

## Vulnérabilités détaillées

| Dépendance | Sous-dep vulnérable | Sévérité | Type | Justification |
|---|---|---|---|---|
| eslint@9.39.0 | minimatch@3.1.2, ajv@6.12.6 | High | devDep | Non déployé en prod |
| eslint-config-next@15.5.6 | minimatch, ajv, js-yaml | High/Medium | devDep | Non déployé en prod |
| ts-node@10.9.2 | diff@4.0.2 | Medium | devDep | Non déployé en prod |
| @types/nodemailer@7.0.3 | fast-xml-parser@5.2.5 | High | devDep (types) | Non déployé en prod |
| @types/exceljs@1.3.2 | minimatch, inflight | High/Medium | devDep (types) | Non déployé en prod |
| exceljs@4.4.0 | minimatch@5.1.6, inflight | High/Medium | runtime | Pas d'input utilisateur sur glob patterns |
| @getbrevo/brevo@3.0.1 | minimatch, axios, ajv | High | runtime | Pas d'input utilisateur sur les paths vulnérables |
| @sentry/nextjs@9.46.0 | minimatch, next | High | runtime | Monitoring only, pas d'input utilisateur |
| @socialgouv/matomo-next | next@15.5.10 | High | runtime | Analytics only |
| next@15.5.10 | (direct) | High | runtime | CWE-770 mitigé par les limites Scalingo |

## Prochaine revue

- **Lors de l'upgrade Next 16** : réévaluer next, @sentry/nextjs, @socialgouv/matomo-next
- **Lors de l'upgrade ESLint 10** : réévaluer eslint, eslint-config-next
- **Vérifier trimestriellement** si des fix upstream sont disponibles pour brevo et exceljs
