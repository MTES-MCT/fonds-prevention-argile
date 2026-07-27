# ADR-0023 : Remplacement de Crisp par le widget « Messages » de La Suite numérique

**Date** : 2026-07-27
**Statut** : Accepté

## Contexte

Le site public embarquait le widget de chat Crisp (`src/shared/components/Crisp`), affiché
uniquement en production, pour permettre à un visiteur d'ouvrir une conversation en direct
avec l'équipe. Or l'équipe n'est plus assez nombreuse pour assurer un suivi en temps réel de
ce chat : les messages restaient sans réponse, ce qui dégradait l'expérience plutôt que de
l'améliorer.

En parallèle, l'ANCT propose « Messages », un service de La Suite numérique (suite
d'outils de l'État), avec un widget embarquable (`feedback`) qui fonctionne en mode
asynchrone (formulaire de contact plutôt que chat en direct) : mieux adapté à une équipe qui
ne peut pas garantir une présence continue.

## Décision

> Nous retirons le widget Crisp et le remplaçons par le widget `feedback` de La Suite
> Messages (ANCT), chargé côté client de la même manière (script tiers asynchrone injecté
> dans le layout `(main)`), avec un `channel_id` porté par une variable d'environnement
> (`NEXT_PUBLIC_LASUITE_MESSAGES_CHANNEL_ID`) plutôt qu'en dur dans le code, pour permettre un
> channel différent par environnement (staging / production) sans changement de code.

Composant `LaSuiteMessages` (`src/shared/components/LaSuiteMessages/LaSuiteMessages.tsx`),
qui reprend le pattern du composant `Crisp` retiré : injection du script au montage,
protection contre la double initialisation, et désactivation en local/docker (pas de
channel dédié à ces environnements). Contrairement à Crisp (production uniquement), le
widget est actif dès la **staging**, un channel dédié y étant prévu pour la validation avant
mise en production.

## Options envisagées

### Option A — Widget La Suite Messages, channel en variable d'env (retenue)

- Avantages : mode asynchrone adapté à la disponibilité réelle de l'équipe ; outil de la
  suite étatique (cohérent avec le reste de la stack : FranceConnect/ProConnect) ; le
  `channel_id` en variable d'environnement suit le pattern déjà utilisé pour Matomo
  (`NEXT_PUBLIC_MATOMO_SITE_ID`, etc.), et évite de coder en dur une valeur différente par
  environnement.
- Inconvénients : nouvelle dépendance externe (domaine `suite.anct.gouv.fr`) à surveiller ;
  pas de historique de conversation in-app comme avec Crisp (formulaire de contact simple).

### Option B — Garder Crisp mais désactiver le mode chat en direct (mode asynchrone Crisp)

- Avantages : pas de changement de fournisseur, configuration déjà en place.
- Inconvénients : Crisp reste un service tiers non étatique (moins aligné avec la politique
  de sobriété numérique / souveraineté) ; ne résout pas le problème de fond (outil pensé pour
  le temps réel, mode asynchrone moins naturel qu'un widget dédié).

### Option C — Simple lien mailto en remplacement du chat, sans widget

- Avantages : aucune dépendance externe, le plus simple à maintenir.
- Inconvénients : régression d'UX (un email de contact existe déjà en complément du chat) ;
  perd l'avantage d'un formulaire de contact contextualisé (widget visible sur toutes les
  pages, pas seulement les callouts « Besoin d'aide ? »).

## Conséquences

### Positives

- Plus de messages laissés sans réponse : le canal correspond à la disponibilité réelle de
  l'équipe.
- Un seul composant/variable à faire évoluer par environnement (pas de `if (isProduction())
channel = "..."` en dur) : le `channel_id` de staging et celui de production vivent
  chacun dans les variables d'environnement Scalingo de leur app respective.

### Négatives / Risques

- Nouveau domaine tiers à charger (`static.suite.anct.gouv.fr`, `messages.suite.anct.gouv.fr`) :
  à ajouter à une éventuelle CSP si le projet en adopte une plus stricte à l'avenir (pas de CSP
  stricte en place actuellement).
- Si La Suite Messages a une disponibilité différente de Crisp, un incident sur ce service
  tiers désactive le widget (dégradation silencieuse déjà présente avec Crisp : simple `try/
catch` + log console, pas de fallback UI).
- **Le nom de variable globale documenté par l'ANCT est erroné.** L'exemple fourni utilise
  `window._lasuite_widget`, mais le `loader.js` réellement servi (vérifié en lisant son code
  source) lit/écrit exclusivement `window._stmsg_widget` — sans quoi le widget ne s'initialise
  jamais (aucune erreur console, bouton absent). Corrigé dans le composant ; à surveiller si
  l'ANCT fait évoluer le contrat du loader sans le documenter.
- **Libellés en français passés explicitement.** Le widget est en anglais par défaut
  (aucune détection de langue navigateur/serveur côté loader.js/feedback.js) : les libellés
  (bouton rond, titre, placeholders, bouton d'envoi) sont surchargés en dur via les
  paramètres `label`/`closeLabel` (niveau loader) et `title`/`placeholder`/
  `emailPlaceholder`/`submitText`/`successText`/`closeLabel` (niveau widget feedback).

### Migration (si applicable)

- Suppression : `src/shared/components/Crisp/` (`Crisp.tsx`, `useCrisp.ts`, non utilisé
  ailleurs dans le code), `src/shared/types/crisp.types.ts`, variable
  `NEXT_PUBLIC_CRISP_WEBSITE_ID`.
- Ajout : `src/shared/components/LaSuiteMessages/LaSuiteMessages.tsx`,
  `src/shared/types/lasuite-widget.types.ts`, variable
  `NEXT_PUBLIC_LASUITE_MESSAGES_CHANNEL_ID` (à définir dans les variables d'environnement
  Scalingo staging et production — valeurs différentes par environnement).
- Bump `1.38.1 → 1.39.0`.

## Liens

- Composant : `src/shared/components/LaSuiteMessages/LaSuiteMessages.tsx`
- Layout d'intégration : `src/app/(main)/layout.tsx`
- Configuration : `src/shared/config/env.config.ts` (`NEXT_PUBLIC_LASUITE_MESSAGES_CHANNEL_ID`)
- Documentation : `docs/testing/TESTING-SIMULATEUR.md` (checklist QA mise à jour)
