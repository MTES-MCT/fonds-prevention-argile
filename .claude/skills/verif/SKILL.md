---
name: verif
description: Vérification post-implémentation (lint, typecheck, tests, build)
---

# Vérification complète

## 1. Format
Lance `pnpm format` pour corriger le formatage.

## 2. Lint
Lance `pnpm lint` et corrige les erreurs.

## 3. TypeScript
Lance `pnpm typecheck` et corrige les erreurs de types.

## 4. Tests
Lance `pnpm test` et corrige les tests en échec.

## 5. Build
Lance `pnpm build` pour vérifier la compilation production.

## 6. Résumé
Affiche le statut final : OK ou KO avec détails des erreurs restantes.
