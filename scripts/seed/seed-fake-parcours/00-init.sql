-- =============================================================================
-- 00-INIT : Sélection ID AMO et nettoyage
-- =============================================================================

-- Récupérer l'ID de votre entreprise AMO
SELECT id, nom FROM entreprises_amo;

-- IMPORTANT: Copier l'ID et remplacer XXXXXXXXXXXXXXXXXXX dans 03-validations-amo.sql

-- =============================================================================
-- NETTOYAGE des anciennes données de test (si existantes)
-- =============================================================================
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%';

-- Vérification du nettoyage
SELECT 'Nettoyage terminé' as status;
