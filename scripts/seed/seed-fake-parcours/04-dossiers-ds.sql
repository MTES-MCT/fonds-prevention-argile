-- =============================================================================
-- 04-DOSSIERS-DS : Création des dossiers Démarches Simplifiées
-- =============================================================================

INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, created_at, updated_at)
VALUES
  -- Dossiers EN_INSTRUCTION
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222202', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '23 days', NOW()),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222205', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '16 days', NOW()),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222207', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '33 days', NOW()),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222208', 'factures', 'demarche-factures', 'en_instruction', NOW() - INTERVAL '68 days', NOW()),
  ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222211', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '24 days', NOW()),
  ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222212', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '48 days', NOW()),
  ('44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222233', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '43 days', NOW()),

  -- Dossier ACCEPTE
  ('44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222231', 'factures', 'demarche-factures', 'accepte', NOW() - INTERVAL '58 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT COUNT(*) as dossiers_ds_crees FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';
