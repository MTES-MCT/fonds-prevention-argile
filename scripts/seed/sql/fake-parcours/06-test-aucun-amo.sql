-- =============================================================================
-- 06-TEST-AUCUN-AMO : Simule l'absence d'AMO dans un département
-- =============================================================================
-- Ce script permet de tester l'alerte "Aucun AMO disponible" sur la page prospects
--
-- USAGE :
--   1. Exécuter la requête UPDATE ci-dessous dans Drizzle Studio
--   2. Se connecter en tant qu'agent Allers-Vers sur le département 36
--   3. Vérifier que l'alerte "Aucun AMO disponible" s'affiche
--
-- IMPORTANT : Exécuter les requêtes UNE PAR UNE dans Drizzle Studio

-- =============================================================================
-- ÉTAPE 1 : Vider le champ départements pour toutes les AMO couvrant le 36
-- =============================================================================
UPDATE entreprises_amo
SET departements = '',
    updated_at = NOW()
WHERE departements LIKE '%36%';

-- =============================================================================
-- VÉRIFICATION : Aucune AMO ne devrait couvrir le 36
-- =============================================================================
SELECT id, nom, departements FROM entreprises_amo WHERE departements LIKE '%36%';
-- Devrait retourner 0 lignes

-- =============================================================================
-- ROLLBACK : Restaurer 'Indre 36' sur les AMO dont le champ est vide
-- =============================================================================
-- UPDATE entreprises_amo
-- SET departements = 'Indre 36',
--     updated_at = NOW()
-- WHERE departements = '';
