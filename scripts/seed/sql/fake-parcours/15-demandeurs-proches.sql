-- =============================================================================
-- 15 - Cas de test de l'encart « Demandeurs proches »
-- =============================================================================
-- Trois dossiers en autonomie autour de Châteauroux, dont l'Aller-vers de l'Indre est
-- responsable : sans eux, aucun de ses dossiers ne s'ouvrait sur la fiche d'un dossier suivi.
-- Étrechet n'a pas de point GPS, pour le repli au centre de la commune.
--
-- Un dossier de l'AMO du Berry Profond au diagnostic, à 250 m de Mickey Mousse (Maison
-- Tranquille) : le plus proche voisin possible, qu'une AMO de Maison Tranquille ne doit jamais voir.
--
-- Joué après 14 : l'AMO du Berry Profond est recréée par 13. Nettoyage dans 00-init.sql.
-- =============================================================================

INSERT INTO users (id, fc_id, email, prenom, nom, last_login, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111d01', 'fc-test-d01', 'yoda.sagesse@test.fr', 'Yoda', 'Sagesse', NOW(), NOW() - INTERVAL '40 days', NOW()),
  ('11111111-1111-4111-8111-111111111d02', 'fc-test-d02', 'leia.organa@test.fr', 'Leia', 'Organa', NOW(), NOW() - INTERVAL '20 days', NOW()),
  ('11111111-1111-4111-8111-111111111d03', 'fc-test-d03', 'han.solitaire@test.fr', 'Han', 'Solitaire', NOW(), NOW() - INTERVAL '12 days', NOW()),
  ('11111111-1111-4111-8111-111111111d04', 'fc-test-d04', 'mulan.fa@test.fr', 'Mulan', 'Fa', NOW(), NOW() - INTERVAL '35 days', NOW());

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  ('22222222-2222-4222-8222-222222222d01', '11111111-1111-4111-8111-111111111d01', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Le Poinçonnet", "code_departement": "36", "adresse": "14 rue des Bruyères", "commune": "36159", "code_region": "24", "epci": "243600327", "coordonnees": "46.7560,1.7230", "clef_ban": "36159_0001", "commune_denormandie": false, "annee_de_construction": "1979", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-03T10:00:00Z"}',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '6 days'),

  ('22222222-2222-4222-8222-222222222d02', '11111111-1111-4111-8111-111111111d02', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "3 rue du Stade", "commune": "36005", "code_region": "24", "epci": "243600327", "coordonnees": "46.7410,1.8290", "clef_ban": "36005_0001", "commune_denormandie": false, "annee_de_construction": "1984", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 24000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-10T09:30:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '4 days'),

  ('22222222-2222-4222-8222-222222222d03', '11111111-1111-4111-8111-111111111d03', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Étrechet", "code_departement": "36", "adresse": "9 chemin des Vignes", "commune": "36071", "code_region": "24", "epci": "243600327", "coordonnees": "", "clef_ban": "36071_0001", "commune_denormandie": false, "annee_de_construction": "1971", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 15500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-14T14:00:00Z"}',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days'),

  ('22222222-2222-4222-8222-222222222d04', '11111111-1111-4111-8111-111111111d04', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "52 avenue de la Gare", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8115,1.6880", "clef_ban": "36044_0101", "commune_denormandie": false, "annee_de_construction": "1966", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 13000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-20T11:00:00Z"}',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '9 days');

INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, user_email, user_telephone, adresse_logement, commentaire, validee_at, choisie_at, created_at, updated_at)
VALUES
  ('33333333-3333-4333-8333-333333333d01', '22222222-2222-4222-8222-222222222d01', NULL, 'sans_amo', 'Yoda', 'Sagesse', 'yoda.sagesse@test.fr', '06 11 00 00 01', '14 rue des Bruyères, 36330 Le Poinçonnet', NULL, NULL, NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days', NOW()),
  ('33333333-3333-4333-8333-333333333d02', '22222222-2222-4222-8222-222222222d02', NULL, 'sans_amo', 'Leia', 'Organa', 'leia.organa@test.fr', '06 11 00 00 02', '3 rue du Stade, 36120 Ardentes', NULL, NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW()),
  ('33333333-3333-4333-8333-333333333d03', '22222222-2222-4222-8222-222222222d03', NULL, 'sans_amo', 'Han', 'Solitaire', 'han.solitaire@test.fr', '06 11 00 00 03', '9 chemin des Vignes, 36250 Étrechet', NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('33333333-3333-4333-8333-333333333d04', '22222222-2222-4222-8222-222222222d04', '99999999-9999-4999-8999-999999999901', 'logement_eligible', 'Mulan', 'Fa', 'mulan.fa@test.fr', '06 11 00 00 04', '52 avenue de la Gare, 36000 Châteauroux', NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days', NOW());

-- Ardentes est déposé et attend la DDT : badge « Chez la DDT » côté Aller-vers.
INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, submitted_at, created_at, updated_at)
VALUES
  ('44444444-4444-4444-8444-44444444d001', '22222222-2222-4222-8222-222222222d01', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '25 days', NOW() - INTERVAL '30 days', NOW()),
  ('44444444-4444-4444-8444-44444444d002', '22222222-2222-4222-8222-222222222d02', 'eligibilite', 'demarche-eligibilite', 'en_construction', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 days', NOW()),
  ('44444444-4444-4444-8444-44444444d004', '22222222-2222-4222-8222-222222222d04', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '20 days', NOW() - INTERVAL '28 days', NOW());
