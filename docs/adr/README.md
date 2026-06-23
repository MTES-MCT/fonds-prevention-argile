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

| N°   | Titre                                                                                                                                   | Statut  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0000 | [_Template_](0000-template.md)                                                                                                          | —       |
| 0001 | [Next.js 15 (App Router) + React 19](0001-nextjs-15-app-router.md)                                                                      | Accepté |
| 0002 | [PostgreSQL + Drizzle ORM](0002-postgresql-drizzle-orm.md)                                                                              | Accepté |
| 0003 | [DSFR comme système de design, Tailwind pour l'appoint](0003-dsfr-tailwind-ui.md)                                                       | Accepté |
| 0004 | [Démarches Simplifiées comme socle des dossiers](0004-demarches-simplifiees-backbone.md)                                                | Accepté |
| 0005 | [Authentification OIDC — FranceConnect + ProConnect](0005-auth-oidc-franceconnect-proconnect.md)                                        | Accepté |
| 0006 | [Architecture DDD-lite organisée par features](0006-architecture-ddd-lite-par-features.md)                                              | Accepté |
| 0007 | [Modèle d'état du parcours et synchronisation DS par CRON](0007-modele-etat-parcours-sync-ds.md)                                        | Accepté |
| 0008 | [Robustesse du tracking Matomo du simulateur et critère d'acceptation](0008-tracking-matomo-simulateur-deduplication.md)                | Accepté |
| 0009 | [Sémantique du statut DS — `en_construction` = déposé, `ds_status` nullable, dates](0009-semantique-statut-ds-depose-vs-brouillon.md)   | Accepté |
| 0010 | [Actions typées sur les parcours (remplacement des commentaires libres)](0010-actions-typees-parcours.md)                               | Accepté |
| 0011 | [Instance unique DS (demarche.numerique.gouv.fr) et permissions du token par démarche](0011-instance-unique-ds-et-permissions-token.md) | Accepté |
| 0012 | [URL de reprise du dossier DS basée sur la date de dépôt (et non le statut)](0012-url-reprise-dossier-basee-sur-depot.md)               | Accepté |
| 0013 | [Remédiation des dossiers DN en sync-erreur (vérification DN, erreur active)](0013-remediation-dossiers-dn-sync-erreur.md)              | Accepté |
| 0014 | [Périmètre de données du rôle ANALYSTE (national vs DDT départemental)](0014-perimetre-donnees-role-analyste.md)                        | Accepté |
| 0015 | [Navigation backoffice unifiée (deux rangées pilotées par rôle)](0015-navigation-backoffice-unifiee.md)                                 | Accepté |

<!-- Ajouter chaque nouvel ADR ici -->
