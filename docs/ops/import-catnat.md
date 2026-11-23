# Import des arrêtés de catastrophe naturelle

Les pages `/rga/commune/…`, `/rga/epci/…` et `/rga/departement/…` affichent les sécheresses reconnues
en catastrophe naturelle. Elles lisent la table `catastrophes_naturelles`, remplie depuis l'API
Géorisques (base GASPAR) pour les 1 650 communes du cocon SEO.

## Quand l'import tourne

- **Chaque lundi matin**, par le workflow GitHub Actions
  [`cron-import-catnat.yml`](../../.github/workflows/cron-import-catnat.yml), sur staging et sur
  production. Il appelle `POST /api/cron/import-catnat` avec `CRON_SECRET`, le même secret que la
  synchronisation des parcours : rien de plus à configurer.
- **À la demande** : Actions → CRON import catnat → « Run workflow », ou dans un one-off :

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 run "pnpm seo:import-catnat"
```

L'import dure un peu plus d'une minute. Il est rejouable : une ligne déjà connue est mise à jour, pas
dupliquée. Les pages sont en cache 24 h, un nouvel arrêté y apparaît le lendemain au plus tard.

## Lire le bilan

La route répond 202 tout de suite et travaille en arrière-plan : le bilan est dans les logs de
l'application, pas dans ceux du workflow.

```bash
scalingo --app fonds-argile --region osc-secnum-fr1 logs --lines 5000 | grep "CRON import-catnat"
```

→ `communes=1650 echecs=0 lignes=7408 ajoutees=12` : `ajoutees` est le nombre de lignes nouvelles en
base. Un `echecs` non nul sort en erreur avec la première cause ; les communes du lot en échec gardent
leurs anciennes lignes et sont reprises à l'import suivant.

## Ce qu'il faut savoir de Géorisques

- **Un arrêté n'y arrive pas le jour de sa parution.** Le 23 novembre 2026, l'arrêté du 16 octobre y
  figurait, celui paru le week-end du 21 novembre pas encore pour nos communes.
- **Sa pagination perd des lignes.** D'une page à l'autre, des doublons prennent la place de lignes
  manquantes, sans que le total annoncé change : 9 lots sur 12 étaient incomplets le 23 novembre 2026.
  L'import demande donc chaque lot de 10 communes en une seule page (`page_size=1000`), et refuse une
  réponse dont le nombre de lignes ne correspond pas au total annoncé.
- **Un même arrêté peut reconnaître plusieurs périodes pour une commune** (335 cas) : la clé de la
  table est l'arrêté, la commune et la date de début. Avant novembre 2026 elle s'arrêtait à la
  commune, et 377 périodes manquaient.
- **Une date corrigée à la source remplace l'ancienne.** Pour chaque couple arrêté-commune reçu,
  l'import retire les périodes que Géorisques ne donne plus, dans la même transaction que l'écriture.
  Il ne retire jamais un arrêté entier, et rien du tout pour un lot dont une ligne a été écartée
  comme invalide.
- **Les dates des arrêtés publiés depuis 2025 sont décalées d'un jour** (période « 31/12/2024 –
  30/12/2025 » pour l'année 2025) : voir [SUJETS-A-TRAITER](../SUJETS-A-TRAITER.md).
