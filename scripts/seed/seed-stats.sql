-- Script SQL pour seeder la base de données avec des données de test
-- À exécuter via Docker : docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile < seed-stats.sql

-- Nettoyer les données existantes (optionnel, décommenter si besoin)
-- TRUNCATE TABLE users, parcours_prevention, parcours_amo_validations, dossiers_demarches_simplifiees CASCADE;

-- ============================================
-- 1. CRÉER DES UTILISATEURS (15 comptes)
-- ============================================
INSERT INTO users (id, fc_id, code_insee, last_login, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'fc_user_001', '75001', NOW(), NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'fc_user_002', '75002', NOW(), NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), 'fc_user_003', '77001', NOW(), NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  (gen_random_uuid(), 'fc_user_004', '91001', NOW(), NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  (gen_random_uuid(), 'fc_user_005', '92001', NOW(), NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'fc_user_006', '93001', NOW(), NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  (gen_random_uuid(), 'fc_user_007', '94001', NOW(), NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'fc_user_008', '95001', NOW(), NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), 'fc_user_009', '75003', NOW(), NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'fc_user_010', '75004', NOW(), NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'fc_user_011', '77002', NOW(), NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'fc_user_012', '91002', NOW(), NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'fc_user_013', '92002', NOW(), NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'fc_user_014', '93002', NOW(), NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'fc_user_015', '94002', NOW(), NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (fc_id) DO NOTHING;

-- ============================================
-- 2. CRÉER DES ENTREPRISES AMO (5 entreprises)
-- ============================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'AMO Paris Centre', '12345678901234', '75', 'contact@amo-paris.fr', '0123456789', '1 rue de Paris 75001', NOW(), NOW()),
  (gen_random_uuid(), 'AMO Île-de-France', '23456789012345', '75,77,91,92', 'contact@amo-idf.fr', '0123456788', '2 rue IDF 92000', NOW(), NOW()),
  (gen_random_uuid(), 'AMO Seine-et-Marne', '34567890123456', '77', 'contact@amo-77.fr', '0123456787', '3 rue Marne 77000', NOW(), NOW()),
  (gen_random_uuid(), 'AMO Essonne', '45678901234567', '91', 'contact@amo-91.fr', '0123456786', '4 rue Essonne 91000', NOW(), NOW()),
  (gen_random_uuid(), 'AMO Hauts-de-Seine', '56789012345678', '92', 'contact@amo-92.fr', '0123456785', '5 rue HDS 92000', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CRÉER DES PARCOURS (12 parcours sur 15 utilisateurs)
-- ============================================
WITH user_ids AS (
  SELECT id, created_at, updated_at FROM users ORDER BY created_at LIMIT 12
)
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  'CHOIX_AMO',
  'TODO',
  user_ids.created_at,
  user_ids.updated_at
FROM user_ids
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 4. CRÉER DES VALIDATIONS AMO (10 demandes dont 4 en attente)
-- ============================================
WITH parcours_with_amo AS (
  SELECT 
    pp.id as parcours_id,
    (SELECT id FROM entreprises_amo ORDER BY random() LIMIT 1) as amo_id,
    ROW_NUMBER() OVER (ORDER BY pp.created_at) as rn
  FROM parcours_prevention pp
  LIMIT 10
)
INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, adresse_logement, choisie_at, validee_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  parcours_id,
  amo_id,
  CASE 
    WHEN rn <= 4 THEN 'en_attente'::statut_validation_amo
    WHEN rn <= 9 THEN 'logement_eligible'::statut_validation_amo
    ELSE 'accompagnement_refuse'::statut_validation_amo
  END,
  'Prénom',
  'Nom',
  'Adresse test',
  NOW() - INTERVAL '5 days',
  CASE WHEN rn > 4 THEN NOW() - INTERVAL '2 days' ELSE NULL END,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
FROM parcours_with_amo
ON CONFLICT (parcours_id) DO NOTHING;

-- ============================================
-- 5. CRÉER DES DOSSIERS DS (8 dossiers : 3 brouillon + 5 envoyés)
-- ============================================
WITH parcours_with_validation AS (
  SELECT 
    pp.id as parcours_id,
    ROW_NUMBER() OVER (ORDER BY pp.created_at) as rn
  FROM parcours_prevention pp
  INNER JOIN parcours_amo_validations pav ON pav.parcours_id = pp.id
  WHERE pav.statut = 'logement_eligible'::statut_validation_amo
  LIMIT 8
)
INSERT INTO dossiers_demarches_simplifiees (
  id, 
  parcours_id, 
  step, 
  ds_number, 
  ds_id, 
  ds_demarche_id, 
  ds_status,
  submitted_at,
  ds_url,
  created_at, 
  updated_at,
  last_sync_at
)
SELECT
  gen_random_uuid(),
  parcours_id,
  'ELIGIBILITE',
  CASE WHEN rn > 3 THEN 'DS-' || (1000000 + rn)::text ELSE NULL END,
  CASE WHEN rn > 3 THEN 'dossier_' || rn::text ELSE NULL END,
  'demarche_123',
  CASE 
    WHEN rn <= 3 THEN 'en_construction'::ds_status
    WHEN rn <= 5 THEN 'en_instruction'::ds_status
    WHEN rn <= 7 THEN 'accepte'::ds_status
    ELSE 'refuse'::ds_status
  END,
  -- IMPORTANT: submitted_at est NULL uniquement pour les 3 premiers (brouillon)
  CASE WHEN rn > 3 THEN NOW() - INTERVAL '3 days' ELSE NULL END,
  CASE WHEN rn > 3 THEN 'https://demarches-simplifiees.fr/dossiers/' || (1000000 + rn)::text ELSE NULL END,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM parcours_with_validation
-- Éviter les doublons si on relance le script
WHERE NOT EXISTS (
  SELECT 1 FROM dossiers_demarches_simplifiees ds 
  WHERE ds.parcours_id = parcours_with_validation.parcours_id
);

-- ============================================
-- VÉRIFICATION DES RÉSULTATS
-- ============================================
SELECT '=== RÉSUMÉ DES STATISTIQUES ===' as info;

SELECT 'Nombre de comptes créés' as stat, COUNT(*) as valeur FROM users;
SELECT 'Nombre de demandes AMO' as stat, COUNT(*) as valeur FROM parcours_amo_validations;
SELECT 'Nombre de demandes AMO en attente' as stat, COUNT(*) as valeur FROM parcours_amo_validations WHERE statut = 'en_attente'::statut_validation_amo;
SELECT 'Nombre total de dossiers DS' as stat, COUNT(*) as valeur FROM dossiers_demarches_simplifiees;
SELECT 'Nombre de dossiers DS brouillon' as stat, COUNT(*) as valeur FROM dossiers_demarches_simplifiees WHERE submitted_at IS NULL;
SELECT 'Nombre de dossiers DS envoyés' as stat, COUNT(*) as valeur FROM dossiers_demarches_simplifiees WHERE submitted_at IS NOT NULL;
