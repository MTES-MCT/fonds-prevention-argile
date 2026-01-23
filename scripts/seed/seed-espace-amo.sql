-- =============================================================================
-- SCRIPT DE SEED POUR L'ESPACE AMO (Backoffice)
-- =============================================================================
-- Ce script crée des données de test pour tester toutes les fonctionnalités
-- de l'espace AMO : Accueil, Dossiers, Statistiques
--
-- À exécuter dans Drizzle Studio ou via psql
-- =============================================================================

-- =============================================================================
-- CONFIGURATION : Remplacer par l'ID d'entreprise AMO souhaité
-- =============================================================================
-- Pour trouver l'ID de l'entreprise AMO :
-- SELECT id, nom FROM entreprises_amo LIMIT 10;
--
-- Puis remplacer toutes les occurrences de 'ENTREPRISE_AMO_ID' ci-dessous

-- =============================================================================
-- NETTOYAGE : Supprimer les anciennes données de test (si existantes)
-- =============================================================================
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-44444444440%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-33333333330%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-22222222220%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-11111111110%';

-- =============================================================================
-- ÉTAPE 1 : Créer les utilisateurs de test (particuliers)
-- =============================================================================
INSERT INTO users (id, fc_id, email, prenom, nom, last_login, created_at, updated_at)
VALUES
  -- Utilisateurs pour dossiers suivis (LOGEMENT_ELIGIBLE)
  ('11111111-1111-1111-1111-111111111101', 'fc-test-101', 'marie.dupont@test.fr', 'Marie', 'Dupont', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102', 'fc-test-102', 'jean.martin@test.fr', 'Jean', 'Martin', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103', 'fc-test-103', 'sophie.bernard@test.fr', 'Sophie', 'Bernard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111104', 'fc-test-104', 'pierre.durand@test.fr', 'Pierre', 'Durand', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111105', 'fc-test-105', 'claire.moreau@test.fr', 'Claire', 'Moreau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111106', 'fc-test-106', 'lucas.petit@test.fr', 'Lucas', 'Petit', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111107', 'fc-test-107', 'emma.robert@test.fr', 'Emma', 'Robert', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111108', 'fc-test-108', 'hugo.richard@test.fr', 'Hugo', 'Richard', NOW(), NOW(), NOW()),
  -- Utilisateurs pour cas REFUSE (dossiers avec DS refusé)
  ('11111111-1111-1111-1111-111111111109', 'fc-test-109', 'alice.leroy@test.fr', 'Alice', 'Leroy', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111110', 'fc-test-110', 'thomas.garcia@test.fr', 'Thomas', 'Garcia', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'fc-test-111', 'lea.martinez@test.fr', 'Léa', 'Martinez', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111112', 'fc-test-112', 'nathan.lopez@test.fr', 'Nathan', 'Lopez', NOW(), NOW(), NOW()),
  -- Utilisateurs pour demandes EN_ATTENTE (page Accueil)
  ('11111111-1111-1111-1111-111111111113', 'fc-test-113', 'camille.roux@test.fr', 'Camille', 'Roux', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111114', 'fc-test-114', 'antoine.fournier@test.fr', 'Antoine', 'Fournier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111115', 'fc-test-115', 'julie.morel@test.fr', 'Julie', 'Morel', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111116', 'fc-test-116', 'maxime.girard@test.fr', 'Maxime', 'Girard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111117', 'fc-test-117', 'laura.bonnet@test.fr', 'Laura', 'Bonnet', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 2 : Créer les parcours de prévention
-- =============================================================================

-- Parcours pour DOSSIERS SUIVIS (différentes étapes et statuts)
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- Étape Éligibilité - TODO
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "12 rue de la République"}}',
   NOW() - INTERVAL '30 days', NOW()),

  -- Étape Éligibilité - EN_INSTRUCTION
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "5 avenue Jean Jaurès"}}',
   NOW() - INTERVAL '25 days', NOW()),

  -- Étape Diagnostic - TODO
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "8 place de la Mairie"}}',
   NOW() - INTERVAL '20 days', NOW()),

  -- Étape Diagnostic - EN_INSTRUCTION
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "22 rue du Moulin"}}',
   NOW() - INTERVAL '15 days', NOW()),

  -- Étape Devis - TODO
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111105', 'devis', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "3 boulevard George Sand"}}',
   NOW() - INTERVAL '10 days', NOW()),

  -- Étape Devis - EN_INSTRUCTION
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111106', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "15 rue de l''Abbaye"}}',
   NOW() - INTERVAL '8 days', NOW()),

  -- Étape Factures - TODO
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111107', 'factures', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "7 rue du Commerce"}}',
   NOW() - INTERVAL '5 days', NOW()),

  -- Étape Factures - VALIDE (terminé)
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111108', 'factures', 'valide',
   '{"logement": {"commune_nom": "Levroux", "code_departement": "36", "adresse": "1 place de la Collégiale"}}',
   NOW() - INTERVAL '2 days', NOW()),

  -- Parcours pour cas REFUSE (DS refusé à différentes étapes)
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111109', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Valençay", "code_departement": "36", "adresse": "4 rue du Château"}}',
   NOW() - INTERVAL '35 days', NOW()),

  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111110', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Chabris", "code_departement": "36", "adresse": "10 rue de la Loire"}}',
   NOW() - INTERVAL '32 days', NOW()),

  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111111', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Vatan", "code_departement": "36", "adresse": "6 place du Marché"}}',
   NOW() - INTERVAL '28 days', NOW()),

  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111112', 'factures', 'en_instruction',
   '{"logement": {"commune_nom": "Reuilly", "code_departement": "36", "adresse": "2 avenue de la Gare"}}',
   NOW() - INTERVAL '22 days', NOW()),

  -- Parcours pour demandes EN_ATTENTE (page Accueil)
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111113', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Marcel", "code_departement": "36", "adresse": "18 rue des Lilas"}}',
   NOW() - INTERVAL '7 days', NOW()),

  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111114', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "25 avenue de la Liberté"}}',
   NOW() - INTERVAL '5 days', NOW()),

  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111115', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Montierchaume", "code_departement": "36", "adresse": "3 impasse du Clos"}}',
   NOW() - INTERVAL '3 days', NOW()),

  ('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111116', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Luçay-le-Mâle", "code_departement": "36", "adresse": "9 chemin des Vignes"}}',
   NOW() - INTERVAL '2 days', NOW()),

  ('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111117', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Écueillé", "code_departement": "36", "adresse": "14 rue du Château"}}',
   NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 3 : Créer les validations AMO
-- =============================================================================
-- IMPORTANT : Remplacer 'ENTREPRISE_AMO_ID' par l'ID réel de votre entreprise AMO

-- Validations LOGEMENT_ELIGIBLE (dossiers suivis)
INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, user_email, validee_at, choisie_at, created_at, updated_at)
VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Marie', 'Dupont', 'marie.dupont@test.fr', NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Jean', 'Martin', 'jean.martin@test.fr', NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Sophie', 'Bernard', 'sophie.bernard@test.fr', NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Pierre', 'Durand', 'pierre.durand@test.fr', NOW() - INTERVAL '13 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW()),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222205', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Claire', 'Moreau', 'claire.moreau@test.fr', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222206', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Lucas', 'Petit', 'lucas.petit@test.fr', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW()),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222207', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Emma', 'Robert', 'emma.robert@test.fr', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW()),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222208', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Hugo', 'Richard', 'hugo.richard@test.fr', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
  -- Cas REFUSE
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222209', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Alice', 'Leroy', 'alice.leroy@test.fr', NOW() - INTERVAL '33 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW()),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222210', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Thomas', 'Garcia', 'thomas.garcia@test.fr', NOW() - INTERVAL '30 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', NOW()),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222211', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Léa', 'Martinez', 'lea.martinez@test.fr', NOW() - INTERVAL '26 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW()),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222212', 'ENTREPRISE_AMO_ID', 'logement_eligible', 'Nathan', 'Lopez', 'nathan.lopez@test.fr', NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW()),
  -- Demandes EN_ATTENTE (page Accueil)
  ('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222213', 'ENTREPRISE_AMO_ID', 'en_attente', 'Camille', 'Roux', 'camille.roux@test.fr', NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW()),
  ('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222214', 'ENTREPRISE_AMO_ID', 'en_attente', 'Antoine', 'Fournier', 'antoine.fournier@test.fr', NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW()),
  ('33333333-3333-3333-3333-333333333315', '22222222-2222-2222-2222-222222222215', 'ENTREPRISE_AMO_ID', 'en_attente', 'Julie', 'Morel', 'julie.morel@test.fr', NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
  ('33333333-3333-3333-3333-333333333316', '22222222-2222-2222-2222-222222222216', 'ENTREPRISE_AMO_ID', 'en_attente', 'Maxime', 'Girard', 'maxime.girard@test.fr', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
  ('33333333-3333-3333-3333-333333333317', '22222222-2222-2222-2222-222222222217', 'ENTREPRISE_AMO_ID', 'en_attente', 'Laura', 'Bonnet', 'laura.bonnet@test.fr', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 4 : Créer les dossiers DS (Démarches Simplifiées)
-- =============================================================================
INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, created_at, updated_at)
VALUES
  -- Dossiers EN_INSTRUCTION
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222202', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '24 days', NOW()),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222204', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '14 days', NOW()),
  ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222206', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '7 days', NOW()),
  -- Dossier ACCEPTE
  ('44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222208', 'factures', 'demarche-factures', 'accepte', NOW() - INTERVAL '1 day', NOW()),
  -- Dossiers REFUSE (pour tester les messages de précision)
  ('44444444-4444-4444-4444-444444444409', '22222222-2222-2222-2222-222222222209', 'eligibilite', 'demarche-eligibilite', 'refuse', NOW() - INTERVAL '34 days', NOW()),
  ('44444444-4444-4444-4444-444444444410', '22222222-2222-2222-2222-222222222210', 'diagnostic', 'demarche-diagnostic', 'refuse', NOW() - INTERVAL '31 days', NOW()),
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222211', 'devis', 'demarche-devis', 'refuse', NOW() - INTERVAL '27 days', NOW()),
  ('44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222212', 'factures', 'demarche-factures', 'refuse', NOW() - INTERVAL '21 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VÉRIFICATIONS
-- =============================================================================

-- 1. Résumé des données créées
SELECT '=== RÉSUMÉ DES DONNÉES DE TEST ===' as info;

SELECT 'Utilisateurs créés' as type, COUNT(*) as nombre
FROM users WHERE id::text LIKE '11111111-1111-1111-1111-11111111110%';

SELECT 'Parcours créés' as type, COUNT(*) as nombre
FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-22222222220%';

SELECT 'Validations AMO créées' as type, COUNT(*) as nombre
FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-33333333330%';

SELECT 'Dossiers DS créés' as type, COUNT(*) as nombre
FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-44444444440%';

-- 2. Page Accueil : Demandes en attente
SELECT '=== PAGE ACCUEIL : DEMANDES EN ATTENTE ===' as info;

SELECT
  pav.user_prenom || ' ' || pav.user_nom as demandeur,
  pp.rga_simulation_data->'logement'->>'commune_nom' as commune,
  pp.rga_simulation_data->'logement'->>'code_departement' as departement,
  pav.created_at as date_demande
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-33333333330%'
  AND pav.statut = 'en_attente'
ORDER BY pav.created_at ASC;

-- 3. Page Dossiers : Dossiers suivis
SELECT '=== PAGE DOSSIERS : DOSSIERS SUIVIS ===' as info;

SELECT
  pav.user_prenom || ' ' || pav.user_nom as demandeur,
  pp.rga_simulation_data->'logement'->>'commune_nom' as commune,
  pp.current_step as etape,
  pp.current_status as statut,
  dds.ds_status as ds_status,
  pav.validee_at as date_validation
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
LEFT JOIN dossiers_demarches_simplifiees dds ON dds.parcours_id = pp.id AND dds.step = pp.current_step
WHERE pav.id::text LIKE '33333333-3333-3333-3333-33333333330%'
  AND pav.statut = 'logement_eligible'
ORDER BY pav.validee_at ASC;

-- 4. Statistiques : Répartition par étape
SELECT '=== STATISTIQUES : RÉPARTITION PAR ÉTAPE ===' as info;

SELECT
  pp.current_step as etape,
  pp.current_status as statut,
  COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-33333333330%'
  AND pav.statut = 'logement_eligible'
GROUP BY pp.current_step, pp.current_status
ORDER BY pp.current_step, pp.current_status;

-- 5. Statistiques : Compteurs globaux
SELECT '=== STATISTIQUES : COMPTEURS ===' as info;

SELECT
  'Demandes en attente' as metrique,
  COUNT(*) as valeur
FROM parcours_amo_validations
WHERE id::text LIKE '33333333-3333-3333-3333-33333333330%'
  AND statut = 'en_attente'
UNION ALL
SELECT
  'Dossiers suivis' as metrique,
  COUNT(*) as valeur
FROM parcours_amo_validations
WHERE id::text LIKE '33333333-3333-3333-3333-33333333330%'
  AND statut = 'logement_eligible';

-- =============================================================================
-- SCRIPT DE NETTOYAGE (à décommenter pour supprimer les données de test)
-- =============================================================================
/*
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-44444444440%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-33333333330%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-22222222220%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-11111111110%';
*/
