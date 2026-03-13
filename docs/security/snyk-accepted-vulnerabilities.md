# Vulnérabilités Snyk — Acceptées

Date d'audit : mars 2026
Auditeur : Samir + Claude

## Décision

Après upgrade des dépendances (mars 2026), les vulnérabilités restantes sont **acceptées** :

- **Toutes sont des devDependencies ou transitives** sans path d'exploitation directe
- **Les vulnérabilités critiques ont été résolues** (fast-xml-parser via @types/nodemailer, axios via @getbrevo/brevo v4)
- **0 exploit mature** connu
- **Aucun fix disponible** sans upgrade majeur breaking (Next 16, ESLint 10)

## Vulnérabilités détaillées

| Dépendance | Sous-dep vulnérable | Sévérité | Type | Justification |
|---|---|---|---|---|
| eslint@9.39.0 | minimatch@3.1.2, ajv@6.12.6, js-yaml | High/Medium | devDep | Non déployé en prod |
| eslint-config-next@15.5.6 | minimatch@9.x | High | devDep | Non déployé en prod |
| ts-node@10.9.2 | diff@4.0.2 | Medium | devDep | Non déployé en prod |
| drizzle-kit@0.31.9 | esbuild (via @esbuild-kit) | Medium | devDep | Non déployé en prod |
| exceljs@4.4.0 | minimatch@5.1.6 | High | runtime | Pas d'input utilisateur sur glob patterns |
| @vitejs/plugin-react@5.1.4 | rollup@4.x | High | devDep | Non déployé en prod |
| next@15.5.10 | (direct) | High | runtime | CWE-770 mitigé par les limites Scalingo |

## Upgrades effectués (mars 2026)

- `@getbrevo/brevo` 3.0.1 → 4.0.1 (résout vuln axios high)
- `@sentry/nextjs` supprimé (non utilisé, résout vuln minimatch high)
- `@types/nodemailer` 7.0.3 → 7.0.11 (résout vuln fast-xml-parser critical)
- `@react-email/components` 0.5.7 → 1.0.8, `@react-email/render` 1.4.0 → 2.0.4
- `@types/exceljs` supprimé (deprecated)
- 19 packages patch/minor mis à jour

## Prochaine revue

- **Lors de l'upgrade Next 16** : réévaluer next, eslint-config-next
- **Lors de l'upgrade ESLint 10** : réévaluer eslint (minimatch, ajv, js-yaml)
- **Vérifier trimestriellement** si des fix upstream sont disponibles pour exceljs
