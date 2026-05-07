# Suivi des partenaires (iframe + funnel)

Comment l'application identifie les utilisateurs venant de partenaires (MAIF, etc.) et comment exposer leurs statistiques dans le backoffice.

## Vue d'ensemble

Un **partenaire** est un site tiers qui intègre notre simulateur d'éligibilité via iframe (route `/embed-simulateur`). On veut savoir, dans le backoffice :

1. Combien de **simulations** Matomo proviennent du partenaire (segmentées via le referrer)
2. Combien d'utilisateurs ont créé un compte (BDD) après être passés par le partenaire — ce qui suppose de **persister l'origine** au-delà de l'iframe (sortie vers FranceConnect dans une nouvelle fenêtre).

## Architecture

```
┌─────────────────────────────┐
│  iframe partenaire           │
│  /embed-simulateur           │
│  ?partner=maif (optionnel)   │
└────────────┬────────────────┘
             │ détection :
             │  1. ?partner= (priorité)
             │  2. document.referrer (fallback auto)
             ▼
   resolvePartner() → "maif"
             │
             │ append &partner=maif à la nouvelle fenêtre
             ▼
┌─────────────────────────────┐
│  /connexion?partner=maif     │
│  → pose cookie first-party   │
│    partner_source=maif (30j) │
└────────────┬────────────────┘
             ▼ FranceConnect (state cookie survit)
┌─────────────────────────────┐
│  /api/auth/fc/callback       │
│  → lit cookie partner_source │
│  → upsertFromFranceConnect   │
│    (set users.partner_source)│
│  → delete cookie             │
└─────────────────────────────┘
             │
             ▼
        users table
        partner_source = "maif"
             │
             ▼
   Backoffice → filtre "MAIF"
   (Matomo segment + BDD JOIN)
```

## Deux sources d'identification du partenaire

| Source | Comportement | Couverture |
|--------|--------------|------------|
| `?partner=<slug>` dans l'URL d'embed | Prioritaire, validé contre la liste des partenaires connus | 100% si le partenaire a mis à jour son URL |
| `document.referrer` | Fallback automatique (map `host → slug`) | ~90% (selon `Referrer-Policy` + extensions navigateur) |

**Conséquence** : tracking automatique dès qu'un partenaire intègre l'iframe — même sans changer son URL. Le param URL est uniquement utile pour fiabiliser à 100%.

## Stockage

- **Matomo** : segmentation native via `referrerName==<host>` (aucune dimension custom requise pour le filtrage referrer).
- **BDD** : colonne `users.partner_source` (varchar 50, nullable).
  - Renseignée à la création du user via le cookie `partner_source` posé sur la page `/connexion`.
  - **Ne se réécrit pas** sur les login suivants (préserve l'attribution d'origine).
  - Backfill autorisé si `partner_source` est null sur un user existant qui revient depuis l'iframe partenaire.

## Filtrage backoffice

Le filtre "Partenaire" sur `/administration/acquisition` applique :

- **Stats Matomo** : segment `referrerName==<host_partenaire>` sur tous les calls Matomo (visites, événements simulateur, top départements/communes).
- **Stats BDD** : condition `EXISTS (SELECT 1 FROM users WHERE id = parcours.user_id AND partner_source = '<slug>')` sur toutes les fonctions count (`countComptesCrees`, `countDemandesAmo`, `countDossiersDN`, etc.).
- **Limitation Matomo Funnels** : l'API `Funnels.getFunnelFlowTable` ne supporte pas le segment → le funnel détaillé est masqué quand un filtre partenaire est actif.

Les parcours **anonymes** (sans `userId`) sont automatiquement exclus du filtrage BDD partenaire — c'est le rôle de Matomo de les compter via le referrer.

---

## Lien à partager avec MAIF

```
https://fonds-prevention-argile.beta.gouv.fr/embed-simulateur?partner=maif
```

À intégrer dans leur iframe avec le `referrerpolicy="no-referrer-when-downgrade"` déjà documenté sur `/documentation/integration-iframe`.

**Remarque** : grâce à la détection automatique via `document.referrer` (host `auxalentours.maif.fr` → `maif`), le tracking fonctionne déjà même sans le `?partner=maif`. Le param URL est recommandé pour fiabiliser à 100% (~10% des navigateurs masquent le referrer).

---

## Ajouter un nouveau partenaire — exemple : `partenaire-test`

Scénario : un partenaire fictif `partenaire-test` qui héberge `https://test-partenaire.example.com/` et veut intégrer notre iframe.

### 1. Déclarer le slug côté code

**Deux fichiers** doivent rester en synchro (limitation actuelle — pas de source unique partagée client/server pour cette map).

#### a) Map referrer côté simulateur (client)

`src/features/simulateur/utils/partner-detection.ts` :

```ts
const PARTNER_REFERRER_HOSTS: Record<string, string> = {
  "auxalentours.maif.fr": "maif",
  "test-partenaire.example.com": "partenaire-test", // ← ajouter
};
```

#### b) Map referrer + label côté backoffice

`src/features/backoffice/administration/acquisition/domain/types/partner.types.ts` :

```ts
export type PartnerKey = "maif" | "partenaire-test"; // ← étendre l'union

export const PARTNER_REFERRERS: Record<PartnerKey, string> = {
  maif: "auxalentours.maif.fr",
  "partenaire-test": "test-partenaire.example.com", // ← ajouter
};

export const PARTNER_LABELS: Record<PartnerKey, string> = {
  maif: "MAIF (auxalentours)",
  "partenaire-test": "Partenaire Test", // ← libellé affiché dans le filtre
};
```

C'est tout. Aucune migration BDD, aucune env var, aucun déploiement Matomo.

### 2. URL à partager au partenaire

```
https://fonds-prevention-argile.beta.gouv.fr/embed-simulateur?partner=partenaire-test
```

Et le snippet d'intégration (identique à celui de `/documentation/integration-iframe`) :

```html
<iframe
  src="https://fonds-prevention-argile.beta.gouv.fr/embed-simulateur?partner=partenaire-test"
  title="Simulateur d'éligibilité au Fonds prévention argile"
  style="width: 100%; height: 800px; border: none;"
  referrerpolicy="no-referrer-when-downgrade">
</iframe>
```

### 3. Ce qui se passe ensuite (scénario complet)

1. **Visiteur arrive** sur `https://test-partenaire.example.com/page-rga` qui contient l'iframe.
2. **L'iframe charge** `/embed-simulateur?partner=partenaire-test`.
   - `EmbedSimulateurPage` (Server Component) lit `searchParams.partner = "partenaire-test"` et le passe à `<SimulateurFormulaire>`.
   - `resolvePartner("partenaire-test", document.referrer)` retourne `"partenaire-test"` (priorité au param URL).
3. **Le visiteur fait sa simulation** dans l'iframe. Matomo capture déjà le referrer `test-partenaire.example.com` automatiquement → toutes ses visites/événements sont taggés côté Matomo.
4. **Clic "Continuer"** → `handleContinueToFC()` ouvre une nouvelle fenêtre :
   - URL : `/connexion?redirect=/parcours&partner=partenaire-test`
5. **Page `/connexion`** lit le param `partner` et pose un cookie first-party :
   ```
   Set-Cookie: partner_source=partenaire-test; path=/; max-age=2592000; SameSite=Lax
   ```
6. **Clic FranceConnect** → flow OAuth standard. Le cookie `partner_source` survit aux redirects (first-party, SameSite=Lax).
7. **Callback `/api/auth/fc/callback`** :
   - Lit le cookie via `request.cookies.get("partner_source")`.
   - Valide via `normalizePartnerSlug()` (rejette les valeurs inconnues).
   - Passe à `handleFranceConnectCallback(code, state, { partnerSource: "partenaire-test" })`.
   - `userRepo.upsertFromFranceConnect(userInfo, { partnerSource: "partenaire-test" })` :
     - Si user nouveau : `INSERT users (..., partner_source = 'partenaire-test')`.
     - Si user existant sans `partner_source` : backfill.
     - Si user existant avec `partner_source` : on ne touche pas (préserve l'origine).
   - Supprime le cookie après consommation.
8. **L'utilisateur arrive sur `/parcours`**, identifié, avec `users.partner_source = "partenaire-test"` en base.

### 4. Stats observables dans le backoffice

`/administration/acquisition` → filtre **"Partenaire Test"** :

| Métrique | Source | Filtré ? |
|---|---|---|
| Visites totales | Matomo (`referrerName==test-partenaire.example.com`) | ✅ |
| Visiteurs uniques | Matomo segmenté | ✅ |
| Taux de rebond | Matomo segmenté | ✅ |
| Simulations terminées (events) | Matomo events segmentés | ✅ |
| Simulations éligibles / non éligibles | Matomo events segmentés | ✅ |
| Top départements / communes | Matomo custom dimensions segmentées | ✅ |
| Comptes créés | BDD : `EXISTS users.partner_source='partenaire-test'` | ✅ |
| Demandes AMO / Dossiers DN / Archivées | BDD avec EXISTS partner_source | ✅ |
| Taux de transformation | Calculé : comptes BDD / simulations Matomo | ✅ |
| Funnel détaillé Matomo | _non disponible_ — l'API Funnels ne supporte pas les segments | ❌ |

### 5. Vérification end-to-end

1. **Local** : ajouter `partenaire-test` dans les deux maps, lancer `pnpm start:dev`, ouvrir `http://localhost:3000/embed-simulateur?partner=partenaire-test`, faire une simulation complète, login FC, vérifier en DB :
   ```sql
   SELECT id, email, partner_source FROM users ORDER BY created_at DESC LIMIT 1;
   ```
2. **Backoffice** : aller sur `/administration/acquisition`, sélectionner "Partenaire Test" dans le filtre, vérifier que les chiffres baissent par rapport à "Toutes les sources".

---

## Décision : pas de custom dimension Matomo dédiée

Une alternative envisagée était d'exposer le slug partenaire (`"maif"`) via une **custom dimension Matomo** poussée explicitement depuis le simulateur (`pushCustomDimension(id, "maif")` avant chaque event).

**Choix retenu : ne pas l'implémenter.** Justification :

| Cas d'usage | Mécanisme actuel suffisant |
|---|---|
| Filtrer les visites Matomo par partenaire | `referrerName==<host>` natif Matomo (segments + rapports Acquisition) |
| Filtrer les events simulateur par partenaire | Le segment Matomo fonctionne sur les events aussi |
| Filtrer les comptes/parcours BDD par partenaire | `users.partner_source` (Phase B) |

La custom dimension serait **redondante** avec `referrerName` pour la couche Matomo, et n'apporterait rien pour la couche BDD.

**Cas marginaux où elle deviendrait utile** (à réévaluer si observés en prod) :

- Le partenaire change sa `Referrer-Policy` en `no-referrer` → le host n'est plus transmis dans le `Referer` HTTP. Détectable globalement (chute brutale du trafic référent).
- Plusieurs hosts du même partenaire à agréger sous un slug unique. Solution intermédiaire : étendre la map `PARTNER_REFERRER_HOSTS` côté client + `PARTNER_REFERRERS` côté server avec tous les hosts pointant vers le même slug. La custom dimension ne serait nécessaire que si l'agrégation devient ingérable en map statique.

Si le besoin émerge, l'ajout est straightforward (~30 min) :
1. Créer une dimension "Partner" (scope Visit) dans l'admin Matomo
2. Ajouter `NEXT_PUBLIC_MATOMO_DIMENSION_PARTNER_ID` dans `env.config.ts`
3. Push `["setCustomDimension", id, partner]` dans `SimulateurFormulaire` avant chaque `trackEvent`
4. Côté backoffice, la fonction `buildPartnerSegment` peut être étendue pour combiner `referrerName==... OR dimensionN==...` (via `,` Matomo OR).

## Limites et évolutions possibles

- **Slug `PartnerKey` typé** : la liste des slugs est dupliquée client/server (`partner-detection.ts` + `partner.types.ts`). Possibilité future : exposer une seule source via un module shared.
- **Pas d'attribution multi-touch** : on capture uniquement l'origine au moment de la création du compte. Un user qui passe par MAIF puis revient via un autre canal reste attribué à MAIF.
- **Funnels Matomo non segmentables** : limitation de l'API Matomo, hors de notre contrôle. Workaround : utiliser les events `SIMULATEUR_STEP_*` qui sont segmentables.
- **Cookie tiers en cas d'iframe sans navigation** : si un user ne clique jamais "Continuer" (reste dans l'iframe), aucun cookie n'est posé sur notre domaine — ce qui est conforme aux attentes (pas de compte créé = rien à attribuer).
