# 🧪 Guide de Tests Manuels - Authentification

Ce document contient les checklists de tests manuels à effectuer avant chaque déploiement pour valider le bon fonctionnement de l'authentification.

## 📋 Prérequis

- [ ] Application lancée en local ou sur l'environnement de staging
- [ ] Variables d'environnement configurées (`ADMIN_PASSWORD`, FranceConnect, etc.)
- [ ] Base de données accessible
- [ ] Navigateur en navigation privée (pour tester sans cache)

---

## 🔐 Tests Authentification Admin

### ✅ Connexion Admin - Cas nominal

**URL :** `/connexion/admin`

- [ ] La page de connexion admin s'affiche correctement
- [ ] Le formulaire contient un champ mot de passe
- [ ] Le bouton "Se connecter" est présent
- [ ] Entrer le bon mot de passe (`ADMIN_PASSWORD`)
- [ ] Cliquer sur "Se connecter"
- [ ] ✅ **Succès attendu :** Redirection vers `/administration`
- [ ] ✅ Le header affiche "Administration" avec un lien vers la page `/administration`
- [ ] ✅ On consulte la page d'administration (Administration - Fonds de Prévention)

### ❌ Connexion Admin - Mot de passe incorrect

**URL :** `/connexion/admin`

- [ ] Entrer un mauvais mot de passe
- [ ] Cliquer sur "Se connecter"
- [ ] ✅ **Erreur attendue :** Message "Mot de passe incorrect" affiché
- [ ] ✅ Reste sur la page `/connexion/admin`
- [ ] ✅ Pas de redirection

### ❌ Connexion Admin - Champ vide

**URL :** `/connexion/admin`

- [ ] Laisser le champ vide
- [ ] Cliquer sur "Se connecter"
- [ ] ✅ **Erreur attendue :** Validation du formulaire empêche la soumission ou message d'erreur

### 🔒 Protection des routes Admin

**Prérequis :** Se connecter en tant qu'admin

- [ ] Naviguer vers `/administration`
- [ ] ✅ **Succès attendu :** Page accessible

**Prérequis :** Ne PAS être connecté

- [ ] Essayer d'accéder directement à `/administration`
- [ ] ✅ **Redirection attendue :** Vers `/connexion`

### 🚫 Blocage des routes Particulier pour Admin

**Prérequis :** Connecté en tant qu'admin

- [ ] Essayer d'accéder à `/mon-compte`
- [ ] ✅ **Blocage attendu :** Redirection vers `/administration` ou message d'erreur
- [ ] Essayer d'accéder à `/mes-dossiers`
- [ ] ✅ **Blocage attendu :** Accès refusé

### 🔓 Déconnexion Admin

**Prérequis :** Connecté en tant qu'admin

- [ ] Cliquer sur le bouton "Se déconnecter"
- [ ] ✅ **Succès attendu :** Redirection vers `/` (page d'accueil)
- [ ] ✅ Le header ne montre plus "Administrateur"
- [ ] Essayer d'accéder à `/administration`
- [ ] ✅ **Redirection attendue :** Vers `/connexion`

---

## 👤 Tests Authentification FranceConnect (Particulier)

### ✅ Connexion FranceConnect - Première connexion

**URL :** `/connexion`

- [ ] La page de connexion affiche le bouton FranceConnect
- [ ] Cliquer sur "S'identifier avec FranceConnect"
- [ ] ✅ **Redirection attendue :** Vers la page FranceConnect
- [ ] Se connecter avec un compte FranceConnect de test
- [ ] ✅ **Redirection attendue :** Retour vers l'application
- [ ] ✅ **Succès attendu :** Redirection vers `/mon-compte`
- [ ] ✅ Le header affiche le prénom et nom de l'utilisateur
- [ ] ✅ L'utilisateur est bien créé en base de données

### ✅ Connexion FranceConnect - Connexion existante

**URL :** `/connexion`

**Prérequis :** Utilisateur déjà connecté une fois avec FranceConnect

- [ ] Se déconnecter
- [ ] Retourner sur `/connexion`
- [ ] Cliquer sur "S'identifier avec FranceConnect"
- [ ] Se connecter avec le même compte FranceConnect
- [ ] ✅ **Succès attendu :** Redirection vers `/mon-compte`
- [ ] ✅ Les données utilisateur sont les mêmes qu'avant

### ✅ Connexion avec redirection vers page cible

**URL :** `/mon-compte` (sans être connecté)

- [ ] Essayer d'accéder à `/mon-compte` (ou `/mes-dossiers`) sans être connecté
- [ ] ✅ **Redirection attendue :** Vers `/connexion`
- [ ] Se connecter avec FranceConnect
- [ ] ✅ **Redirection attendue :** Retour vers la page initialement demandée (`/mon-compte`)

### 🔒 Protection des routes Particulier

**Prérequis :** Connecté avec FranceConnect

- [ ] Naviguer vers `/mon-compte`
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Naviguer vers `/mes-dossiers`
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Naviguer vers `/mes-demandes`
- [ ] ✅ **Succès attendu :** Page accessible

**Prérequis :** Ne PAS être connecté

- [ ] Essayer d'accéder directement à `/mon-compte`
- [ ] ✅ **Redirection attendue :** Vers `/connexion`
- [ ] Essayer d'accéder à `/mes-dossiers`
- [ ] ✅ **Redirection attendue :** Vers `/connexion`

### 🚫 Blocage des routes Admin pour Particulier

**Prérequis :** Connecté avec FranceConnect

- [ ] Essayer d'accéder à `/administration`
- [ ] ✅ **Blocage attendu :** Redirection vers `/mon-compte` ou message d'erreur
- [ ] Essayer d'accéder à `/test`
- [ ] ✅ **Blocage attendu :** Accès refusé

### 🔓 Déconnexion FranceConnect

**Prérequis :** Connecté avec FranceConnect

- [ ] Cliquer sur le bouton "Se déconnecter"
- [ ] ✅ **Succès attendu :** Redirection vers la page de déconnexion FranceConnect
- [ ] ✅ Puis redirection vers `/` (page d'accueil de l'app)
- [ ] ✅ Le header ne montre plus le nom de l'utilisateur
- [ ] Essayer d'accéder à `/mon-compte`
- [ ] ✅ **Redirection attendue :** Vers `/connexion`

### ❌ Erreur FranceConnect - Annulation

**URL :** `/connexion`

- [ ] Cliquer sur "S'identifier avec FranceConnect"
- [ ] Sur la page FranceConnect, cliquer sur "Annuler" ou fermer la fenêtre
- [ ] ✅ **Comportement attendu :** Retour sur `/connexion` avec un message d'erreur ou d'information

### ❌ Erreur FranceConnect - État invalide

**URL :** `/oidc-callback?code=xxx&state=invalid`

- [ ] Modifier manuellement l'URL du callback avec un state invalide
- [ ] ✅ **Erreur attendue :** Message d'erreur "État invalide" ou redirection vers `/connexion`

---

## 🔀 Tests Simulateur et FranceConnect

### 🚫 Blocage du simulateur après connexion FranceConnect

**Prérequis :** Connecté avec FranceConnect

- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Blocage attendu :** Message "Accès restreint" affiché
- [ ] ✅ Explication : "Le simulateur n'est pas accessible après une connexion FranceConnect"
- [ ] ✅ Bouton "Accéder à mon dossier" présent
- [ ] ✅ L'iframe du simulateur n'est PAS visible

**Prérequis :** Connecté en tant qu'admin

- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Blocage attendu :** Même comportement (message d'erreur)

**Prérequis :** Ne PAS être connecté

- [ ] Naviguer vers `/simulateur`
- [ ] ✅ **Succès attendu :** L'iframe du simulateur s'affiche correctement

### ✅ Parcours complet Simulateur → Connexion

**URL :** `/simulateur`

- [ ] Ne PAS être connecté
- [ ] Remplir le simulateur jusqu'au bout
- [ ] Cliquer sur "Demander l'aide"
- [ ] ✅ **Comportement attendu :** Overlay "Traitement en cours..." s'affiche
- [ ] ✅ **Redirection attendue :** Vers `/connexion` après 1 seconde
- [ ] ✅ Les données RGA sont sauvegardées en sessionStorage
- [ ] Se connecter avec FranceConnect
- [ ] ✅ **Succès attendu :** Accès au parcours de demande avec les données pré-remplies

---

## 🔄 Tests de Session

### ⏱️ Expiration de session

**Prérequis :** Connecté (admin ou particulier)

- [ ] Se connecter
- [ ] Attendre l'expiration de la session (délai selon config : 1h admin, 7 jours particulier)
- [ ] Rafraîchir la page
- [ ] ✅ **Comportement attendu :** Redirection vers `/connexion`
- [ ] ✅ Message "Session expirée" (optionnel)

### 🔁 Persistance de session

**Prérequis :** Connecté

- [ ] Se connecter
- [ ] Fermer le navigateur
- [ ] Rouvrir le navigateur
- [ ] Retourner sur l'application
- [ ] ✅ **Succès attendu (Particulier) :** Session toujours active (cookie persistant 7j)
- [ ] ✅ **Échec attendu (Admin) :** Session expirée si sessionStorage (1h)

### 🍪 Suppression manuelle des cookies

**Prérequis :** Connecté

- [ ] Se connecter
- [ ] Ouvrir les DevTools → Application → Cookies
- [ ] Supprimer manuellement les cookies `session`, `session_role`
- [ ] Rafraîchir la page
- [ ] ✅ **Redirection attendue :** Vers `/connexion`

---

## 🌐 Tests Multi-onglets

### 📑 Déconnexion dans un onglet

**Prérequis :** Connecté

- [ ] Ouvrir l'application dans 2 onglets
- [ ] Se déconnecter dans l'onglet 1
- [ ] Rafraîchir l'onglet 2
- [ ] ✅ **Comportement attendu :** Redirection vers `/connexion` dans l'onglet 2

### 📑 Connexion dans un onglet

**Prérequis :** Non connecté

- [ ] Ouvrir l'application dans 2 onglets
- [ ] Se connecter dans l'onglet 1
- [ ] Rafraîchir l'onglet 2
- [ ] ✅ **Comportement attendu :** Session active dans l'onglet 2

---

## 🛠️ Tests de Middleware

### 🔍 Routes publiques accessibles sans authentification

- [ ] Accéder à `/` (page d'accueil)
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Accéder à `/mentions-legales`
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Accéder à `/cgu`
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Accéder à `/politique-confidentialite`
- [ ] ✅ **Succès attendu :** Page accessible
- [ ] Accéder à `/connexion`
- [ ] ✅ **Succès attendu :** Page accessible

### 🔍 Callback FranceConnect accessible

- [ ] Vérifier que `/oidc-callback` est accessible (même sans params)
- [ ] ✅ **Comportement attendu :** Pas de redirection immédiate vers `/connexion`
- [ ] Vérifier que `/api/auth/fc/callback` est accessible
- [ ] ✅ **Comportement attendu :** Retour 200 ou gestion d'erreur appropriée

---

## 📊 Checklist de Déploiement

Avant chaque déploiement en production, valider :

### Environnement de Staging

- [ ] Tous les tests Admin (10 scénarios)
- [ ] Tous les tests FranceConnect (10 scénarios)
- [ ] Tests Simulateur (3 scénarios)
- [ ] Tests de Session (3 scénarios)
- [ ] Tests Multi-onglets (2 scénarios)

### Environnement de Production (après déploiement)

- [ ] Connexion Admin fonctionne
- [ ] Connexion FranceConnect fonctionne
- [ ] Routes protégées sont bien bloquées
- [ ] Déconnexion fonctionne
- [ ] Simulateur → Connexion fonctionne

---

## 🐛 Reporting de Bugs

En cas de problème détecté, noter :

- **URL concernée :**
- **Action effectuée :**
- **Résultat attendu :**
- **Résultat obtenu :**
- **Rôle utilisateur :** (Admin / Particulier / Non connecté)
- **Environnement :** (Local / Staging / Production)
- **Navigateur :** (Chrome / Firefox / Safari / Edge)
- **Capture d'écran :** (si applicable)
- **Logs console :** (si applicable)

---

## 📝 Notes

- **Fréquence recommandée :** Avant chaque déploiement + 1x/semaine en staging
- **Durée estimée :** 15-20 minutes pour la checklist complète
- **Automatisation future :** Ces tests pourront être automatisés avec Playwright en V2

---
