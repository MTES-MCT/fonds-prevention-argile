-- Cleanup staging : supprime tous les particuliers et leur historique de sync.
-- Les agents (table `agents`) ne sont pas touchés.

-- 1. Vider l'historique des sync_runs (pas de FK vers users, donc pas cascadé)
DELETE FROM sync_run_entries;
DELETE FROM sync_runs;

-- 2. Supprimer tous les particuliers (cascade vers parcours, dossiers, validations AMO, tokens)
DELETE FROM users;

-- 3. Vérifications
SELECT COUNT(*) AS users_restants FROM users;                          -- attendu : 0
SELECT COUNT(*) AS agents_intouchés FROM agents;                       -- attendu :  nombre d'agents
SELECT COUNT(*) AS parcours_restants FROM parcours_prevention;         -- attendu : 0 (cascadé)
SELECT COUNT(*) AS dossiers_restants FROM dossiers_demarches_simplifiees; -- attendu : 0 (cascadé)
SELECT COUNT(*) AS validations_amo_restantes FROM parcours_amo_validations; -- attendu : 0 (cascadé)
SELECT COUNT(*) AS sync_runs_restants FROM sync_runs;                  -- attendu : 0