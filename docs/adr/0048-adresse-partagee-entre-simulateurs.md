# ADR-0048 : Une adresse partagée entre les deux simulateurs publics

**Date** : 2026-10-14
**Statut** : Accepté

## Contexte

Le simulateur de vulnérabilité ([ADR-0030](0030-simulateur-vulnerabilite-rga.md)) devient un prolongement du
simulateur d'éligibilité : proposé sur l'écran « non éligible », sur la home et dans « Ma liste » du compte
demandeur. Dans les deux sens, l'usager devait ressaisir son adresse et reclasser son bâtiment sur la carte, alors
que les deux étapes adresse font exactement la même chose. Elles ne partagent pourtant ni store ni format : les
réponses de l'éligibilité portent `logement.{adresse, commune, epci, clef_ban, rnb…}`, celles de la vulnérabilité
`{label, communeNom, codeDepartement, clefBan, rnb, aleaRga}`, sans code INSEE ni EPCI.

## Décision

> Les deux étapes adresse lisent et écrivent une même adresse, dans un store dédié, en `sessionStorage`.

1. **Un format neutre.** `AdresseChoisie` (`shared/adapters/ban/adresse-choisie.ts`) : libellé BAN, coordonnées du
   bâtiment, clef BAN, code INSEE, département, RNB, EPCI si connu.
2. **Un store à part** (`shared/stores/adresse-choisie.store.ts`), écrit à la validation de chaque étape adresse
   et lu une fois, à son montage. Aucun store de simulateur ne lit l'autre.
3. **Ce qui est repris est l'adresse et le bâtiment, jamais l'aléa.** Le RNB présélectionne le bâtiment sur la
   carte, qui recalcule l'aléa depuis la BDNB : `zone_dexposition` de l'éligibilité ne distingue pas tous les degrés
   de la vulnérabilité. L'usager valide l'étape d'un clic au lieu de la sauter, l'aléa exigeant cette sélection.
4. **L'EPCI se retrouve à l'arrivée sur l'éligibilité** (API Geo), le simulateur de vulnérabilité n'en ayant pas
   besoin. Sans lui, l'AMO du territoire ne se retrouve pas.
5. **Le parcours public seul partage.** Le mode édition et le wizard agent embarqué ne lisent ni n'écrivent rien :
   l'adresse d'un demandeur ne doit pas apparaître chez l'agent qui saisit pour un autre.
6. **Depuis le compte**, l'adresse de la simulation d'éligibilité (correction d'agent complète d'abord, comme
   `getMaSimulation`) est posée dans le store au clic sur « Faire le test ».

## Options envisagées

### Option A — Store dédié (retenue)

- Avantages : aucun couplage entre les deux features, un seul format à maintenir, et « Précédent » restaure enfin
  l'adresse dans le simulateur de vulnérabilité, qui ne la gardait que comme texte.
- Inconvénients : un troisième store, et une adresse qui survit à « Recommencer la simulation ».

### Option B — Un simulateur lit le store de l'autre

- Avantages : pas de store de plus.
- Inconvénients : couple deux features par leurs détails internes, et suppose des conversions avec perte (aléa, EPCI).

### Option C — Passer l'adresse dans l'URL

- Avantages : aucun stockage.
- Inconvénients : une adresse dans l'URL, donc dans les journaux, l'historique et Matomo. Écartée par les règles de
  sécurité du projet.

## Conséquences

### Positives

- Passer d'un simulateur à l'autre ne coûte plus qu'un clic sur la carte.
- La même mécanique sert la home, l'écran « non éligible » et le compte.

### Négatives / Risques

- L'adresse reste dans l'onglet jusqu'à sa fermeture. Même durée et même support que les stores des simulateurs,
  aucune donnée n'est envoyée au serveur.
- Un parcours public avec plusieurs adresses successives reprend la dernière validée, pas celle de ses réponses en
  cours : `initialValue` d'une étape garde la priorité quand il porte déjà une adresse.

## Liens

- [ADR-0036](0036-simulation-unique-par-compte.md) : une simulation par compte
- [ADR-0040](0040-tunnel-simulateur-adresse-en-deux-ecrans.md) : tunnel sans navigation, désormais partagé par `/vulnerabilite-rga`
- Documentation : [SIMULATEUR-VULNERABILITE-RGA.md](../vulnerabilite/SIMULATEUR-VULNERABILITE-RGA.md)
