# ADR-0003 : DSFR comme système de design, Tailwind pour l'appoint

**Date** : 2025-08-26
**Statut** : Accepté

## Contexte

C'est un service public de l'État (Beta.gouv). Les services de l'État doivent respecter le Système de Design de l'État Français (DSFR) pour l'accessibilité, la cohérence visuelle et la conformité réglementaire.

## Décision

Nous utilisons le **DSFR** (`@gouvfr/dsfr`, `@gouvfr/dsfr-chart`) comme système de design de référence, complété par **Tailwind CSS v4** pour la mise en page et les ajustements ponctuels. Pas de CSS custom ad hoc quand un composant DSFR existe.

> Nous utilisons les composants et tokens DSFR par défaut, Tailwind uniquement pour le layout d'appoint.

## Options envisagées

### Option A — DSFR + Tailwind (retenue)

- Avantages : conformité Beta.gouv, accessibilité et cohérence garanties, composants prêts à l'emploi ; Tailwind couvre les besoins de layout que le DSFR ne prévoit pas.
- Inconvénients : deux systèmes de styles à articuler, certains comportements DSFR en JS impératif (gotcha : les modales s'ouvrent via `window.dsfr(...).modal.disclose()`, pas l'attribut `open`).

### Option B — DSFR seul

- Avantages : un seul système, conformité maximale.
- Inconvénients : layout et espacements fins fastidieux sans utilitaires.

### Option C — Librairie UI tierce (MUI, etc.)

- Avantages : riche.
- Inconvénients : non conforme à l'obligation DSFR pour un service de l'État. Écartée d'office.

## Conséquences

### Positives

- Accessibilité et identité de l'État respectées.
- Mode clair forcé (`force white mode`), composants DSFR réutilisés.

### Négatives / Risques

- Certaines interactions DSFR nécessitent l'API JS DSFR (modales).
- Articulation DSFR / Tailwind à surveiller pour éviter les conflits de styles.

## Liens

- DSFR : https://www.systeme-de-design.gouv.fr/
- Composants partagés : `src/shared/components/`
