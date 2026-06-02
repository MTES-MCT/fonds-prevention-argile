---
name: adr
description: Créer un Architecture Decision Record pour une décision technique
---

# Créer un ADR

Génère un Architecture Decision Record dans `docs/adr/` en suivant le template du projet.

## Étape 1 — Identifier le prochain numéro

Lister les fichiers dans `docs/adr/` et déterminer le prochain numéro séquentiel (format 4 chiffres : 0001, 0002, etc.).

## Étape 2 — Collecter le contexte

Si l'utilisateur n'a pas fourni tous les détails, analyser le code pertinent pour comprendre :
- Le problème ou le besoin qui motive la décision
- Les alternatives envisagées (au moins 2)
- Les conséquences positives et négatives

## Étape 3 — Rédiger l'ADR

Créer le fichier `docs/adr/XXXX-titre-en-kebab-case.md` en suivant le template `docs/adr/0000-template.md` :

- **Date** : date du jour
- **Statut** : Accepté (sauf indication contraire)
- **Contexte** : problème concret, pourquoi maintenant
- **Décision** : formulation claire et directe
- **Options envisagées** : au moins 2 options avec avantages/inconvénients, marquer la retenue
- **Conséquences** : positives, négatives/risques, migration si applicable
- **Liens** : fichiers du projet concernés, documentation, issues/PRs

Règles :
- Rédiger en **français** avec les accents
- Référencer les **chemins de fichiers** du projet concernés
- Être **concis** mais précis
- Ne PAS utiliser d'emojis

## Étape 4 — Confirmer

Afficher un résumé : numéro, titre, fichier créé.
