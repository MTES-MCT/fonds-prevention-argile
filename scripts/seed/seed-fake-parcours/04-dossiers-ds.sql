    -- =============================================================================
    -- 04-DOSSIERS-DS : Création des dossiers Démarches Simplifiées
    -- =============================================================================
    -- Ajout de TOUS les dossiers DS pour toutes les étapes complétées
    -- Pour chaque parcours, on crée les dossiers DS pour toutes les étapes précédentes
    -- =============================================================================

    INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, submitted_at, created_at, updated_at)
    VALUES
      -- ===== Mario Brosse (eligibilite - en cours) =====
      -- Pas de dossier car étape en cours

      -- ===== Mickey Mousse (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222202', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '25 days', NOW()),
      ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222202', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),

      -- ===== Harry Pottier (devis - en cours) =====
      ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222203', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '19 days', NOW() - INTERVAL '20 days', NOW()),
      ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222203', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '18 days', NOW() - INTERVAL '19 days', NOW()),
      ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222203', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', NOW()),

      -- ===== Jean Neige (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222204', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '21 days', NOW() - INTERVAL '22 days', NOW()),
      ('44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222204', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),

      -- ===== Luke Marcheur (eligibilite - en cours) =====
      ('44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222205', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', NOW()),

      -- ===== Bob Leponge (factures - en cours) =====
      ('44444444-4444-4444-4444-444444444409', '22222222-2222-2222-2222-222222222206', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '54 days', NOW() - INTERVAL '55 days', NOW()),
      ('44444444-4444-4444-4444-444444444410', '22222222-2222-2222-2222-222222222206', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '52 days', NOW() - INTERVAL '53 days', NOW()),
      ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222206', 'devis', 'demarche-devis', 'accepte', NOW() - INTERVAL '50 days', NOW() - INTERVAL '51 days', NOW()),
      ('44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222206', 'factures', 'demarche-factures', 'en_instruction', NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days', NOW()),

      -- ===== Hermione Grognon (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444413', '22222222-2222-2222-2222-222222222207', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '34 days', NOW() - INTERVAL '35 days', NOW()),
      ('44444444-4444-4444-4444-444444444414', '22222222-2222-2222-2222-222222222207', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days', NOW()),

      -- ===== Kylian Mbapied (factures - en cours) =====
      ('44444444-4444-4444-4444-444444444415', '22222222-2222-2222-2222-222222222208', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '69 days', NOW() - INTERVAL '70 days', NOW()),
      ('44444444-4444-4444-4444-444444444416', '22222222-2222-2222-2222-222222222208', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '67 days', NOW() - INTERVAL '68 days', NOW()),
      ('44444444-4444-4444-4444-444444444417', '22222222-2222-2222-2222-222222222208', 'devis', 'demarche-devis', 'accepte', NOW() - INTERVAL '65 days', NOW() - INTERVAL '66 days', NOW()),
      ('44444444-4444-4444-4444-444444444418', '22222222-2222-2222-2222-222222222208', 'factures', 'demarche-factures', 'en_instruction', NOW() - INTERVAL '63 days', NOW() - INTERVAL '63 days', NOW()),

      -- ===== Dark Vador (eligibilite - en cours) =====
      ('44444444-4444-4444-4444-444444444419', '22222222-2222-2222-2222-222222222209', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW()),

      -- ===== Shrek Loignon (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444420', '22222222-2222-2222-2222-222222222210', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '23 days', NOW() - INTERVAL '24 days', NOW()),
      ('44444444-4444-4444-4444-444444444421', '22222222-2222-2222-2222-222222222210', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW()),

      -- ===== Elsa Gelato (eligibilite - en cours) =====
      ('44444444-4444-4444-4444-444444444422', '22222222-2222-2222-2222-222222222211', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),

      -- ===== Gandalf Legris (devis - en cours) =====
      ('44444444-4444-4444-4444-444444444423', '22222222-2222-2222-2222-222222222212', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '49 days', NOW() - INTERVAL '50 days', NOW()),
      ('44444444-4444-4444-4444-444444444424', '22222222-2222-2222-2222-222222222212', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '47 days', NOW() - INTERVAL '48 days', NOW()),
      ('44444444-4444-4444-4444-444444444425', '22222222-2222-2222-2222-222222222212', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW()),

      -- ===== Yoda Maître (factures - complété/validé) =====
      ('44444444-4444-4444-4444-444444444426', '22222222-2222-2222-2222-222222222231', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '59 days', NOW() - INTERVAL '60 days', NOW()),
      ('44444444-4444-4444-4444-444444444427', '22222222-2222-2222-2222-222222222231', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '57 days', NOW() - INTERVAL '58 days', NOW()),
      ('44444444-4444-4444-4444-444444444428', '22222222-2222-2222-2222-222222222231', 'devis', 'demarche-devis', 'accepte', NOW() - INTERVAL '55 days', NOW() - INTERVAL '56 days', NOW()),
      ('44444444-4444-4444-4444-444444444429', '22222222-2222-2222-2222-222222222231', 'factures', 'demarche-factures', 'accepte', NOW() - INTERVAL '53 days', NOW() - INTERVAL '53 days', NOW()),

      -- ===== Dora Explore (devis - en cours) =====
      ('44444444-4444-4444-4444-444444444430', '22222222-2222-2222-2222-222222222233', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '44 days', NOW() - INTERVAL '45 days', NOW()),
      ('44444444-4444-4444-4444-444444444431', '22222222-2222-2222-2222-222222222233', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '42 days', NOW() - INTERVAL '43 days', NOW()),
      ('44444444-4444-4444-4444-444444444432', '22222222-2222-2222-2222-222222222233', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW()),

      -- ===== Obélix Menhir (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444433', '22222222-2222-2222-2222-222222222235', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '14 days', NOW() - INTERVAL '15 days', NOW()),
      ('44444444-4444-4444-4444-444444444434', '22222222-2222-2222-2222-222222222235', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', NOW()),

      -- ===== Tintin Reporter (eligibilite - en cours) =====
      ('44444444-4444-4444-4444-444444444435', '22222222-2222-2222-2222-222222222236', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW()),

      -- ===== Lucky Luc (devis - en cours) =====
      ('44444444-4444-4444-4444-444444444436', '22222222-2222-2222-2222-222222222237', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '27 days', NOW() - INTERVAL '28 days', NOW()),
      ('44444444-4444-4444-4444-444444444437', '22222222-2222-2222-2222-222222222237', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '25 days', NOW() - INTERVAL '26 days', NOW()),
      ('44444444-4444-4444-4444-444444444438', '22222222-2222-2222-2222-222222222237', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),

      -- ===== Mortadelle Jambon (diagnostic - en cours) =====
      ('44444444-4444-4444-4444-444444444439', '22222222-2222-2222-2222-222222222239', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '11 days', NOW() - INTERVAL '12 days', NOW()),
      ('44444444-4444-4444-4444-444444444440', '22222222-2222-2222-2222-222222222239', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),

      -- ===== Idéfix Chien (devis - en cours) =====
      ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222240', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '31 days', NOW() - INTERVAL '32 days', NOW()),
      ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222240', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '29 days', NOW() - INTERVAL '30 days', NOW()),
      ('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222240', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days', NOW())

    ON CONFLICT (id) DO NOTHING;

    -- Vérification
    SELECT COUNT(*) as dossiers_ds_crees FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';
