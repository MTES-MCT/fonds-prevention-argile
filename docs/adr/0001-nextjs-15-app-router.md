# ADR-0001 : Next.js 15 (App Router) + React 19

**Date** : 2025-08-26
**Statut** : Accepté

## Contexte

L'application doit servir à la fois un site public (landing, pages SEO, simulateur RGA), un espace demandeur authentifié et un back-office agents/admin. Elle a besoin de rendu serveur pour le SEO, de routes API pour les intégrations externes (Démarches Simplifiées, FranceConnect, CRON) et d'une bonne intégration avec l'écosystème React. Le projet est initialisé depuis un socle Beta.gouv (`init from MDSO Frontend`).

## Décision

Nous utilisons **Next.js 15 avec l'App Router** et **React 19** comme framework full-stack unique (front + routes API + Server Actions).

> Nous utilisons Next.js App Router pour mutualiser front, rendu serveur et logique backend dans un seul déploiement.

## Options envisagées

### Option A — Next.js 15 App Router (retenue)

- Avantages : SSR/SSG natif pour le SEO, Server Actions pour la logique backend sans API REST séparée, Route Handlers pour les webhooks/CRON, déploiement unique, écosystème React mûr, socle Beta.gouv existant.
- Inconvénients : App Router encore récent (pièges RSC/Client Components), couplage fort au framework.

### Option B — SPA React (Vite) + API backend séparée (NestJS/Express)

- Avantages : séparation nette front/back, liberté sur le backend.
- Inconvénients : deux déploiements, pas de SSR sans effort, SEO plus difficile, plus de glue.

### Option C — Remix / autre méta-framework

- Avantages : bon SSR, conventions claires.
- Inconvénients : écosystème plus restreint, pas de socle Beta.gouv réutilisable.

## Conséquences

### Positives

- Un seul codebase et un seul déploiement (Scalingo).
- Server Actions utilisées comme points d'entrée métier (`*.actions.ts`).
- Pages SEO rendues côté serveur.

### Négatives / Risques

- Nécessite de maîtriser la frontière Server/Client Components (sources de bugs : voir gotchas Matomo, modales DSFR).
- Montées de version Next.js parfois cassantes (plusieurs commits `upgrade nextjs`).

## Liens

- Next.js : https://nextjs.org/
- Routes : `src/app/`
- Server Actions : `src/features/**/actions/*.actions.ts`
