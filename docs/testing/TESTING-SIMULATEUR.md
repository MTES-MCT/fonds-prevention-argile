# 🧪 Guide de Tests Manuels - Simulateur RGA

Ce document contient les checklists de tests manuels pour valider le bon fonctionnement du simulateur RGA et du parcours de demande d'aide.

## 📋 Prérequis

- [ ] Application lancée (local ou staging)
- [ ] Variable `NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL` configurée
- [ ] Iframe MesAidesRénov accessible
- [ ] Navigation privée activée (pour tester sans cache)

---

## 🎯 Vue d'ensemble du Parcours Métier

Le simulateur RGA permet à un particulier de :

1. **Vérifier son éligibilité** via l'iframe MesAidesRénov
2. **Recevoir et parser** les données du simulateur
3. **Valider** les données essentielles
4. **Sauvegarder** en session pour continuité
5. **Se connecter** via FranceConnect
6. **Poursuivre** son parcours de demande

---

## 🏗️ Tests par Couche DDD

### 📦 Couche Domain - Entités et Règles Métier

#### ✅ Structure des données RGA (RGAFormData)

**Objectif :** Vérifier que les données reçues respectent le modèle métier

- [ ] Ouvrir la console DevTools
- [ ] Naviguer vers `/simulateur`
- [ ] Remplir le simulateur jusqu'à "Demander l'aide"
- [ ] Observer les logs de parsing dans la console
- [ ] ✅ **Validation :** Structure JSON contient les 5 sections :
  - `logement` (adresse, type, commune, etc.)
  - `taxeFonciere` (commune_eligible)
  - `rga` (assure, indemnise_rga, sinistres)
  - `menage` (revenu_rga, personnes)
  - `vous` (proprietaire_condition, proprietaire_occupant_rga)

#### ✅ Règles de validation métier

**Objectif :** Vérifier que les règles métier essentielles sont appliquées

**Scénario 1 : Données valides**

- [ ] Remplir le simulateur avec des données complètes et valides
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Succès attendu :** Aucun message d'erreur de validation
- [ ] ✅ Redirection vers `/connexion`

**Scénario 2 : Adresse manquante**

- [ ] Remplir le simulateur SANS adresse (si possible dans l'iframe)
- [ ] Observer les erreurs de validation
- [ ] ✅ **Erreur attendue :** "Adresse du logement manquante"

**Scénario 3 : Revenu invalide**

- [ ] Simuler des données avec revenu à 0 ou négatif
- [ ] ✅ **Erreur attendue :** "Revenu du ménage invalide"

**Scénario 4 : Nombre de personnes invalide**

- [ ] Simuler des données avec 0 personnes
- [ ] ✅ **Erreur attendue :** "Nombre de personnes invalide"

**Scénario 5 : Type de logement manquant**

- [ ] Simuler des données sans type de logement
- [ ] ✅ **Erreur attendue :** "Type de logement manquant"

---

### ⚙️ Couche Services - Logique Métier

#### ✅ Service de Parsing (parseRGAParams)

**Objectif :** Vérifier que les paramètres URL sont correctement transformés

- [ ] Observer les logs "📋 Tous les paramètres:" dans la console
- [ ] Vérifier les transformations suivantes :

**Conversion des valeurs booléennes :**

- [ ] `logement.mitoyen=oui*` → `mitoyen: true`
- [ ] `logement.mitoyen=non*` → `mitoyen: false`
- [ ] ✅ **Validation :** Les valeurs "oui"/"non" sont converties en boolean

**Conversion des nombres :**

- [ ] `logement.code_region="24"*` → `code_region: 24` (number)
- [ ] `menage.personnes=6*` → `personnes: 6` (number)
- [ ] ✅ **Validation :** Les nombres sont convertis en type number (pas string)

**Nettoyage des valeurs :**

- [ ] `logement.type="maison"*` → `type: "maison"` (sans guillemets ni astérisque)
- [ ] ✅ **Validation :** Guillemets et astérisques sont supprimés

**Nettoyage des clés :**

- [ ] `logement.propriétaire occupant=oui` → `proprietaire_occupant: true`
- [ ] ✅ **Validation :** Espaces remplacés par underscores, accents supprimés

**Gestion des sections :**

- [ ] `taxe foncière.commune.éligible` → `taxeFonciere.commune_eligible`
- [ ] ✅ **Validation :** Sections correctement identifiées et nommées (camelCase)

#### ✅ Service de Validation (validateRGAData)

**Objectif :** Vérifier que la validation métier fonctionne correctement

- [ ] Remplir le simulateur complètement
- [ ] Observer l'overlay "Traitement en cours..."
- [ ] ✅ **Succès attendu :** Aucune erreur affichée si données valides
- [ ] ✅ Redirection après 1 seconde

**Test avec données partielles :**

- [ ] Modifier manuellement sessionStorage pour retirer l'adresse
- [ ] Rafraîchir la page et essayer de continuer
- [ ] ✅ **Comportement attendu :** Validation détecte les données manquantes

---

### 🔌 Couche Adapters - Persistance

#### ✅ Storage Adapter (sessionStorage)

**Objectif :** Vérifier la sauvegarde et récupération des données

**Test de sauvegarde :**

- [ ] Remplir le simulateur jusqu'au bout
- [ ] Cliquer sur "Demander l'aide"
- [ ] Ouvrir DevTools → Application → Session Storage
- [ ] ✅ **Validation :** Clé `fonds-argile-rga-data` existe
- [ ] ✅ Structure JSON contient :
  - `data` (les données RGA)
  - `timestamp` (horodatage)
  - `version` (actuellement "1.0")

**Test de récupération :**

- [ ] Après sauvegarde, rafraîchir la page
- [ ] ✅ **Succès attendu :** Les données sont toujours présentes
- [ ] Se connecter avec FranceConnect
- [ ] ✅ **Succès attendu :** Les données RGA sont disponibles pour le parcours

**Test d'expiration (24h) :**

- [ ] Modifier manuellement le `timestamp` dans sessionStorage (mettre une date > 24h dans le passé)
- [ ] Rafraîchir la page
- [ ] ✅ **Comportement attendu :** Données considérées comme expirées et supprimées

**Test de nettoyage :**

- [ ] Sauvegarder des données RGA
- [ ] Se déconnecter ou vider manuellement
- [ ] ✅ **Comportement attendu :** Session storage est bien nettoyé

---

### 🖥️ Couche Présentation - Composants UI

#### ✅ Composant SimulateurClient

**Test d'affichage de l'iframe :**

- [ ] Naviguer vers `/simulateur` (sans être connecté)
- [ ] ✅ **Succès attendu :** L'iframe MesAidesRénov s'affiche
- [ ] ✅ Hauteur de l'iframe : 800px (ou valeur configurée)
- [ ] ✅ L'iframe est responsive

**Test du fil d'Ariane :**

- [ ] ✅ **Validation :** Le breadcrumb affiche "Accueil > Vérifier mon éligibilité"
- [ ] Cliquer sur "Accueil"
- [ ] ✅ **Redirection attendue :** Vers `/`

**Test du titre :**

- [ ] ✅ **Validation :** H1 affiche "Simulateur d'éligibilité au Fonds prévention argile"

**Test du call-to-action d'aide :**

- [ ] Descendre en bas de la page
- [ ] ✅ **Validation :** Callout "Besoin d'aide ?" visible
- [ ] ✅ Email de contact présent
- [ ] ✅ Mention du tchat Crisp

**Test de l'overlay de traitement :**

**État "processing" :**

- [ ] Remplir le simulateur
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Overlay visible avec :**
  - Titre "Traitement en cours..."
  - Message "Veuillez patienter..."
  - Texte "Redirection automatique vers la connexion..."
  - Loader (spinner) animé
  - Fond sombre (rgba)
  - Z-index 9999

**État "success" :**

- [ ] Attendre la fin du traitement
- [ ] ✅ **Overlay visible avec :**
  - Titre "Données enregistrées"
  - Message "Vos données ont été enregistrées avec succès"
  - Bouton "Continuer"

**État "error" :**

- [ ] Simuler une erreur (ex: bloquer l'accès sessionStorage)
- [ ] ✅ **Overlay visible avec :**
  - Titre "Erreur de traitement"
  - Liste des erreurs
  - Bouton "Fermer"

**Test du blocage après connexion FranceConnect :**

- [ ] Se connecter avec FranceConnect
- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Blocage attendu :** Composant ForbiddenSimulator affiché
- [ ] ✅ Message "Accès restreint" visible
- [ ] ✅ Explication : iframes non autorisées après connexion FC
- [ ] ✅ Bouton "Accéder à mon dossier" présent
- [ ] Cliquer sur "Accéder à mon dossier"
- [ ] ✅ **Redirection attendue :** Vers `/mon-compte`

**Test de configuration manquante :**

- [ ] Retirer temporairement `NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL`
- [ ] Redémarrer l'app
- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Erreur attendue :** Alert DSFR affichant "Erreur de configuration"
- [ ] ✅ Message explicite sur la variable manquante

---

### 🔐 Couche Context - Gestion d'État

#### ✅ RGAProvider et RGAContext

**Test de chargement initial :**

- [ ] Naviguer vers `/simulateur`
- [ ] Observer `isLoading` dans React DevTools
- [ ] ✅ **État initial :** `isLoading: true`
- [ ] ✅ **Après montage :** `isLoading: false`

**Test de `hasData` :**

- [ ] Avant de remplir le simulateur : `hasData: false`
- [ ] Après avoir sauvegardé : `hasData: true`
- [ ] ✅ **Validation :** État correctement mis à jour

**Test de `isValid` et `errors` :**

- [ ] Sauvegarder des données invalides
- [ ] Observer le contexte
- [ ] ✅ **État attendu :**
  - `isValid: false`
  - `errors: ["Adresse du logement manquante", ...]`

**Test des actions :**

**`saveRGA()` :**

- [ ] Appeler `saveRGA()` avec des données valides
- [ ] ✅ **Succès :** Retourne `true`
- [ ] ✅ État mis à jour avec les nouvelles données

**`updateRGA()` :**

- [ ] Sauvegarder des données
- [ ] Appeler `updateRGA()` avec des modifications partielles
- [ ] ✅ **Fusion correcte :** Les données sont mergées (pas écrasées)

**`clearRGA()` :**

- [ ] Appeler `clearRGA()`
- [ ] ✅ **État nettoyé :** `data: null`, `hasData: false`
- [ ] ✅ sessionStorage vidé

**`reloadFromStorage()` :**

- [ ] Modifier manuellement sessionStorage
- [ ] Appeler `reloadFromStorage()`
- [ ] ✅ **État synchronisé :** Données rechargées depuis le storage

---

## 🔄 Tests du Parcours Complet Utilisateur

### ✅ Parcours nominal : Simulateur → Connexion → Dossier

**Étape 1 : Simulateur**

- [ ] Se rendre sur `/` (non connecté)
- [ ] Cliquer sur "Vérifier mon éligibilité" ou naviguer vers `/simulateur`
- [ ] ✅ **Page simulateur :** Iframe MesAidesRénov visible

**Étape 2 : Remplissage**

- [ ] Remplir toutes les étapes du simulateur :
  - Adresse du logement
  - Informations logement (type, année, zone exposition, etc.)
  - Informations propriétaire
  - Informations taxe foncière
  - Informations RGA (assurance, sinistres)
  - Informations ménage (revenu, nombre de personnes)
- [ ] ✅ **Validation :** Toutes les étapes se passent correctement

**Étape 3 : Demande d'aide**

- [ ] Cliquer sur "Demander l'aide" (ou équivalent dans l'iframe)
- [ ] ✅ **Overlay "Traitement en cours..." :** Apparaît immédiatement
- [ ] ✅ **Dans la console :** Logs de parsing visibles
- [ ] ✅ **Redirection après ~1 seconde :** Vers `/connexion`

**Étape 4 : Connexion**

- [ ] Sur la page `/connexion`
- [ ] Cliquer sur "S'identifier avec FranceConnect"
- [ ] Se connecter avec un compte FranceConnect de test
- [ ] ✅ **Redirection :** Vers `/mon-compte` (ou page du parcours)

**Étape 5 : Vérification des données**

- [ ] Sur la page du parcours (mon-compte ou autre)
- [ ] Ouvrir React DevTools → Components → RGAProvider
- [ ] ✅ **Validation :** Les données RGA sont présentes et correctes
- [ ] ✅ **Données pré-remplies :** Formulaire de demande contient les infos du simulateur

---

### ❌ Parcours d'erreur : Données incomplètes

**Scénario : L'iframe envoie des données incomplètes**

- [ ] Remplir partiellement le simulateur (si possible)
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Overlay "Erreur de traitement" :** Visible
- [ ] ✅ **Liste d'erreurs :** Affichée avec messages clairs
  - "Adresse du logement manquante"
  - "Revenu du ménage invalide"
  - "Nombre de personnes invalide"
  - "Type de logement manquant"
- [ ] Cliquer sur "Fermer"
- [ ] ✅ **Comportement :** Overlay se ferme, reste sur `/simulateur`

---

### ❌ Parcours d'erreur : Échec de sauvegarde

**Scénario : sessionStorage plein ou bloqué**

- [ ] Bloquer l'accès à sessionStorage (via extensions ou DevTools)
- [ ] Remplir le simulateur
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Overlay "Erreur de traitement" :** Visible
- [ ] ✅ **Message d'erreur :** "Échec de la sauvegarde des données en session"

---

### ⚠️ Parcours alternatif : Utilisateur déjà connecté

**Scénario : Utilisateur connecté avec FranceConnect essaie d'accéder au simulateur**

- [ ] Se connecter avec FranceConnect
- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Blocage :** Composant ForbiddenSimulator affiché
- [ ] ✅ **Message :** "Le simulateur n'est pas accessible après une connexion FranceConnect"
- [ ] ✅ **Explication :** Raison de sécurité (iframes)
- [ ] ✅ **Bouton CTA :** "Accéder à mon dossier"

---

### ⚠️ Parcours alternatif : Admin essaie d'accéder au simulateur

**Scénario : Admin connecté tente d'accéder au simulateur**

- [ ] Se connecter en tant qu'admin
- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Blocage :** Même comportement que pour FranceConnect
- [ ] ✅ **Message d'avertissement :** Visible

---

## 🔍 Tests de Communication Iframe ↔ Parent

### ✅ PostMessage - Réception des données

**Objectif :** Vérifier que le parent reçoit bien les messages de l'iframe

- [ ] Ouvrir la console DevTools
- [ ] Remplir le simulateur
- [ ] Cliquer sur "Demander l'aide"
- [ ] Observer dans la console :
  - ✅ Log "📨 Données reçues de l'iframe"
  - ✅ Log "SearchParams string: ..." (URL encodée)
  - ✅ Log "📋 Tous les paramètres:" (tableau clé/valeur)
  - ✅ Log "🔄 Données après parsing:" (JSON structuré)

### ✅ Sécurité - Origine de l'iframe

**Objectif :** Vérifier que seules les origines autorisées sont acceptées

**Test d'origine valide :**

- [ ] L'iframe provient de `mesaides.renov.gouv.fr` ou l'URL configurée
- [ ] Envoyer un message
- [ ] ✅ **Succès :** Message accepté et traité

**Test d'origine invalide (simulation) :**

- [ ] Simuler un message depuis une origine non autorisée (via console)

```javascript
window.postMessage({
  type: "RGA_DEMANDE_AIDE",
  searchParams: "test=1"
}, "*");
```

- [ ] ✅ **Sécurité :** Message ignoré (pas de traitement)

### ✅ Protection contre le double processing

**Objectif :** Vérifier qu'on ne traite pas le même message 2 fois

- [ ] Remplir le simulateur
- [ ] Cliquer rapidement 2 fois sur "Demander l'aide"
- [ ] ✅ **Protection :** Le traitement ne s'exécute qu'une seule fois
- [ ] ✅ **isProcessingRef :** Empêche le double traitement

---

## 🧹 Tests de Nettoyage et Réinitialisation

### ✅ Nettoyage après déconnexion

- [ ] Remplir le simulateur → Sauvegarder données
- [ ] Se connecter avec FranceConnect
- [ ] Se déconnecter
- [ ] ✅ **Validation :** Données RGA toujours en sessionStorage (pas supprimées)
- [ ] Les données restent disponibles pour une nouvelle connexion

### ✅ Nettoyage après expiration

- [ ] Sauvegarder des données RGA
- [ ] Modifier le timestamp pour simuler l'expiration (>24h)
- [ ] Rafraîchir la page
- [ ] ✅ **Nettoyage automatique :** Données expirées supprimées

### ✅ Nettoyage manuel

- [ ] Sauvegarder des données RGA
- [ ] Ouvrir DevTools → Application → Session Storage
- [ ] Supprimer manuellement `fonds-argile-rga-data`
- [ ] Rafraîchir la page
- [ ] ✅ **État initial :** `hasData: false`, `data: null`

---

## 📊 Tests de Robustesse

### ⚠️ Iframe ne charge pas

**Scénario : L'iframe MesAidesRénov est inaccessible**

- [ ] Bloquer l'accès à `mesaides.renov.gouv.fr` (via hosts file ou extension)
- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Comportement :** Iframe ne charge pas (erreur réseau)
- [ ] ✅ **Graceful degradation :** Message d'aide reste visible en bas

### ⚠️ Données malformées de l'iframe

**Scénario : L'iframe envoie des données corrompues**

- [ ] Simuler un message avec des données invalides via console :

```javascript
window.postMessage({
  type: "RGA_DEMANDE_AIDE",
  searchParams: "invalid=data&&&broken"
}, window.location.origin);
```

- [ ] ✅ **Gestion d'erreur :** Message d'erreur approprié
- [ ] ✅ **Pas de crash :** Application reste stable

### ⚠️ SessionStorage désactivé

**Scénario : Le navigateur bloque sessionStorage**

- [ ] Désactiver sessionStorage (navigation privée stricte)
- [ ] Remplir le simulateur
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Erreur :** "Échec de la sauvegarde des données en session"
- [ ] ✅ **Message d'aide :** Expliquer comment activer le storage

---

## 🌐 Tests Multi-navigateurs

### ✅ Compatibilité

**Chrome/Edge :**

- [ ] Tous les tests passent
- [ ] Iframe s'affiche correctement
- [ ] PostMessage fonctionne

**Firefox :**

- [ ] Tous les tests passent
- [ ] Iframe s'affiche correctement
- [ ] PostMessage fonctionne

**Safari :**

- [ ] Tous les tests passent
- [ ] Attention aux restrictions de sessionStorage
- [ ] PostMessage fonctionne

---

## 📱 Tests Responsive

### ✅ Mobile (< 768px)

- [ ] Naviguer vers `/simulateur` sur mobile
- [ ] ✅ **Iframe responsive :** S'adapte à la largeur de l'écran
- [ ] ✅ **Overlay :** Correctement centré et adapté
- [ ] ✅ **Boutons :** Taille tactile appropriée

### ✅ Tablette (768px - 1024px)

- [ ] Test sur tablette
- [ ] ✅ **Layout :** Correctement adapté

### ✅ Desktop (> 1024px)

- [ ] Test sur desktop
- [ ] ✅ **Iframe :** Hauteur de 800px
- [ ] ✅ **Container :** Centré avec marges appropriées

---

## 📊 Checklist de Déploiement

Avant chaque déploiement, valider :

### Environnement de Staging

**Tests Domain (5 min) :**

- [ ] Structure des données RGA valide
- [ ] Règles de validation métier appliquées

**Tests Services (5 min) :**

- [ ] Parsing des paramètres URL correct
- [ ] Validation retourne les bonnes erreurs

**Tests Adapters (3 min) :**

- [ ] Sauvegarde en sessionStorage
- [ ] Récupération depuis sessionStorage
- [ ] Expiration après 24h

**Tests UI (5 min) :**

- [ ] Iframe s'affiche
- [ ] Overlay de traitement fonctionne
- [ ] Blocage après connexion FC

**Parcours complet (3 min) :**

- [ ] Simulateur → Connexion → Dossier

### Environnement de Production (après déploiement)

**Tests critiques (5 min) :**

- [ ] Iframe MesAidesRénov accessible
- [ ] Parsing et sauvegarde fonctionnent
- [ ] Redirection vers connexion fonctionne
- [ ] Blocage après connexion FC actif

---

## 🐛 Reporting de Bugs

En cas de problème détecté, noter :

- **Étape du parcours :**
- **Données saisies dans le simulateur :**
- **Action effectuée :**
- **Résultat attendu :**
- **Résultat obtenu :**
- **Logs console :** (obligatoire)
- **SessionStorage :** (contenu de `fonds-argile-rga-data`)
- **État connecté :** (Non connecté / Admin / Particulier FC)
- **Environnement :** (Local / Staging / Production)
- **Navigateur :**
- **Capture d'écran :**

---

## 📝 Notes

- **Fréquence recommandée :** Avant chaque déploiement + 1x/semaine en staging
- **Durée estimée :** 20-25 minutes pour la checklist complète
- **Tests unitaires :** Complémentent ces tests manuels (parser + validator)
- **Automatisation future :** Playwright pour le parcours complet en V2

---

## ✅ Signature de Test

**Date :**  
**Testeur :**  
**Environnement :**  
**Version :**  
**Résultat :** ✅ PASS / ❌ FAIL  
**Commentaires :**
