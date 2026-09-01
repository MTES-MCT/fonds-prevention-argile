-- =============================================================================
-- 00-INIT : Sélection ID AMO et nettoyage
-- =============================================================================

-- Récupérer l'ID de votre entreprise AMO
SELECT id, nom FROM entreprises_amo;

-- IMPORTANT: Copier l'ID et remplacer XXXXXXXXXXXXXXXXXXX dans 03-validations-amo.sql

-- =============================================================================
-- NETTOYAGE des anciennes données de test (si existantes)
-- =============================================================================
DELETE FROM prospect_qualifications WHERE id::text LIKE '66666666-6666-4666-8666-6666666666%';
DELETE FROM prospect_qualifications WHERE agent_id IN (SELECT id FROM agents WHERE sub IN ('seed_geraldine', 'seed_jeanpatrick'));
DELETE FROM parcours_actions WHERE id::text LIKE '77777777-7777-4777-8777-7777777777%';
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-8444-4444444444%';
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-8444-44444444a%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-4333-8333-3333333333%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-4333-8333-333333333a%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-4222-8222-2222222222%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-4222-8222-222222222a%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-4222-8222-222222222c%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-4111-8111-1111111111%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-4111-8111-111111111a%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-4111-8111-111111111c%';
DELETE FROM agents WHERE sub IN ('seed_geraldine', 'seed_jeanpatrick');
DELETE FROM entreprises_amo WHERE siret = '99999999900001';
DELETE FROM allers_vers WHERE id = '88888888-8888-8888-8888-888888888801';

-- LEGACY-UUID-DEBUT
-- =============================================================================
-- NETTOYAGE des données seedées AVANT la normalisation RFC des uuid (PR #332)
-- =============================================================================
-- Les motifs de nettoyage ci-dessus portent les nibbles normalisés et ne voient donc plus
-- les lignes de l'ancien format. Restées en base, elles font échouer les INSERT sur
-- `users_fc_id_unique`. On cible ici les seuls ids de seed (familles à chiffre répété)
-- encore NON conformes à la RFC : les ids déjà valides et les vrais uuid sont épargnés.
-- Bloc temporaire, à retirer une fois tous les environnements re-seedés.
DELETE FROM prospect_qualifications
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
DELETE FROM parcours_actions
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
DELETE FROM dossiers_demarches_simplifiees
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
DELETE FROM parcours_amo_validations
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
DELETE FROM parcours_prevention
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
DELETE FROM users
  WHERE id::text ~ '^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-'
    AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
-- LEGACY-UUID-FIN

-- Vérification du nettoyage
SELECT 'Nettoyage terminé' as status;
