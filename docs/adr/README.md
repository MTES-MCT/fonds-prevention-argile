# Architecture Decision Records (ADR)

Ce dossier contient les décisions d'architecture du projet Fonds Prévention Argile.

Un ADR documente une décision technique structurante : son contexte, les options
envisagées, la décision retenue et ses conséquences.

## Créer un ADR

Utiliser la skill `/adr` (voir `.claude/skills/adr/SKILL.md`) ou copier
`0000-template.md` manuellement.

- Numérotation séquentielle sur 4 chiffres : `0001`, `0002`, ...
- Nom de fichier : `XXXX-titre-en-kebab-case.md`
- Rédaction en français, avec accents, sans emojis
- Référencer les chemins de fichiers du projet concernés

## Quand créer un ADR ?

Créer un ADR pour : ajout d'une dépendance majeure, nouveau pattern transverse,
changement d'infrastructure, choix structurant impliquant un compromis.

Ne pas créer d'ADR pour : un bugfix, un refactoring mineur, un changement
purement cosmétique.

## Index

| N°   | Titre                                                                                            | Statut  |
| ---- | ------------------------------------------------------------------------------------------------ | ------- |
| 0000 | [_Template_](0000-template.md)                                                                   | —       |
| 0001 | [Next.js 15 (App Router) + React 19](0001-nextjs-15-app-router.md)                               | Accepté |
| 0002 | [PostgreSQL + Drizzle ORM](0002-postgresql-drizzle-orm.md)                                       | Accepté |
| 0003 | [DSFR comme système de design, Tailwind pour l'appoint](0003-dsfr-tailwind-ui.md)                | Accepté |
| 0004 | [Démarches Simplifiées comme socle des dossiers](0004-demarches-simplifiees-backbone.md)         | Accepté |
| 0005 | [Authentification OIDC — FranceConnect + ProConnect](0005-auth-oidc-franceconnect-proconnect.md) | Accepté |
| 0006 | [Architecture DDD-lite organisée par features](0006-architecture-ddd-lite-par-features.md)       | Accepté |
| 0007 | [Modèle d'état du parcours et synchronisation DS par CRON](0007-modele-etat-parcours-sync-ds.md) | Accepté |

<!-- Ajouter chaque nouvel ADR ici -->
