-- =============================================================================
-- 11-STATISTIQUES-DEMANDES : Seed pour l'onglet Statistiques demandes
-- =============================================================================
-- Parcours récents (< 30 jours) avec AMO validées, dossiers DS variés,
-- pour que les stats soient visibles sur la période "30 derniers jours"
-- Adresses et points GPS réels (Base Adresse Nationale), comme en production
-- =============================================================================

-- 15 nouveaux users
INSERT INTO users (id, fc_id, email, prenom, nom, created_at, updated_at, last_login)
VALUES
  ('11111111-1111-4111-8111-111111111a01', 'fc-stats-01', 'stats01@test.fr', 'Alice', 'Durand', NOW() - INTERVAL '25 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a02', 'fc-stats-02', 'stats02@test.fr', 'Bruno', 'Martin', NOW() - INTERVAL '22 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a03', 'fc-stats-03', 'stats03@test.fr', 'Claire', 'Petit', NOW() - INTERVAL '20 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a04', 'fc-stats-04', 'stats04@test.fr', 'David', 'Robert', NOW() - INTERVAL '18 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a05', 'fc-stats-05', 'stats05@test.fr', 'Emma', 'Richard', NOW() - INTERVAL '15 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a06', 'fc-stats-06', 'stats06@test.fr', 'François', 'Simon', NOW() - INTERVAL '14 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a07', 'fc-stats-07', 'stats07@test.fr', 'Gaëlle', 'Laurent', NOW() - INTERVAL '12 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a08', 'fc-stats-08', 'stats08@test.fr', 'Hugo', 'Michel', NOW() - INTERVAL '10 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a09', 'fc-stats-09', 'stats09@test.fr', 'Inès', 'Garcia', NOW() - INTERVAL '8 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a10', 'fc-stats-10', 'stats10@test.fr', 'Jules', 'Thomas', NOW() - INTERVAL '7 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a11', 'fc-stats-11', 'stats11@test.fr', 'Karima', 'Dupont', NOW() - INTERVAL '5 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a12', 'fc-stats-12', 'stats12@test.fr', 'Louis', 'Morel', NOW() - INTERVAL '4 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a13', 'fc-stats-13', 'stats13@test.fr', 'Marie', 'Fournier', NOW() - INTERVAL '3 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a14', 'fc-stats-14', 'stats14@test.fr', 'Nathan', 'Girard', NOW() - INTERVAL '2 days', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111a15', 'fc-stats-15', 'stats15@test.fr', 'Olivia', 'Bonnet', NOW() - INTERVAL '1 day', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 15 parcours récents (tous created < 30 jours, répartis sur les 5 étapes)
-- 3 choix_amo, 4 eligibilite, 3 diagnostic, 3 devis, 2 factures
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- 3x choix_amo (récents, pas d'AMO encore)
  ('22222222-2222-4222-8222-222222222a01', '11111111-1111-4111-8111-111111111a13', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "35 Rue Louis Blanc", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.804449,1.692970", "clef_ban": "36044_1780_00035", "annee_de_construction": "1975", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

  ('22222222-2222-4222-8222-222222222a02', '11111111-1111-4111-8111-111111111a14', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "41 Chemin de Barmont", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.944428,2.015440", "clef_ban": "36088_0217_00041", "annee_de_construction": "1980", "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '2 days', NOW()),

  ('22222222-2222-4222-8222-222222222a03', '11111111-1111-4111-8111-111111111a15', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "9bis Chemin des Vignes", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.634263,1.090209", "clef_ban": "36018_1444_00009_bis", "annee_de_construction": "1968", "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 15000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '1 day', NOW()),

  -- 4x eligibilite (AMO validée récemment)
  ('22222222-2222-4222-8222-222222222a04', '11111111-1111-4111-8111-111111111a01', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "20 Rue des Frères Seron", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.807210,1.696506", "clef_ban": "36044_zkegu7_00020", "annee_de_construction": "1972", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),

  ('22222222-2222-4222-8222-222222222a05', '11111111-1111-4111-8111-111111111a02', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "35 Rue de la Pomme", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.951364,2.017905", "clef_ban": "36088_2430_00035", "annee_de_construction": "1965", "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 14000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '8 days'),

  ('22222222-2222-4222-8222-222222222a06', '11111111-1111-4111-8111-111111111a09', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "3 Chemin de Fontfurat", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.580769,1.496044", "clef_ban": "36006_0429_00003", "annee_de_construction": "1978", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 25000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),

  ('22222222-2222-4222-8222-222222222a07', '11111111-1111-4111-8111-111111111a10', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "32 Rue du Faubourg Saint-Abdon", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.573543,1.991945", "clef_ban": "36046_0540_00032", "annee_de_construction": "1960", "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 30000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),

  -- 3x diagnostic (AMO validée + dossier éligibilité accepté)
  ('22222222-2222-4222-8222-222222222a08', '11111111-1111-4111-8111-111111111a03', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "7 Avenue des Marins", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.810177,1.686960", "clef_ban": "36044_1915_00007", "annee_de_construction": "1970", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days'),

  ('22222222-2222-4222-8222-222222222a09', '11111111-1111-4111-8111-111111111a04', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "12 Rue des Riaux", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.637398,1.092629", "clef_ban": "36018_1291_00012", "annee_de_construction": "1958", "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "sinistres": "endommagée"}, "menage": {"revenu_rga": 16000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 days'),

  ('22222222-2222-4222-8222-222222222a10', '11111111-1111-4111-8111-111111111a11', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "40 Avenue Jean Moulin", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.835263,1.715274", "clef_ban": "36063_0379_00040", "annee_de_construction": "1985", "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 28000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

  -- 3x devis (AMO validée + éligibilité accepté + diagnostic accepté)
  ('22222222-2222-4222-8222-222222222a11', '11111111-1111-4111-8111-111111111a05', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "19 Route de la Pomme", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.950068,2.009469", "clef_ban": "36088_2433_00019", "annee_de_construction": "1975", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 21000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),

  ('22222222-2222-4222-8222-222222222a12', '11111111-1111-4111-8111-111111111a06', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "3 Rue des 100 000 Chemises", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.813337,1.701986", "clef_ban": "36044_0526_00003", "annee_de_construction": "1982", "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 35000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '4 days'),

  ('22222222-2222-4222-8222-222222222a13', '11111111-1111-4111-8111-111111111a12', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "27 Route des Narrons", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.583808,1.499042", "clef_ban": "36006_0652_00027", "annee_de_construction": "1968", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "sinistres": "endommagée"}, "menage": {"revenu_rga": 13000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),

  -- 2x factures (parcours complets)
  ('22222222-2222-4222-8222-222222222a14', '11111111-1111-4111-8111-111111111a07', 'factures', 'en_instruction',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "12 Impasse de la Grand Maison", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.576961,1.996249", "clef_ban": "36046_0801_00012", "annee_de_construction": "1962", "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),

  ('22222222-2222-4222-8222-222222222a15', '11111111-1111-4111-8111-111111111a08', 'factures', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "3 Habilly", "commune": "36031", "code_region": "24", "epci": "243600327", "coordonnees": "46.876554,1.421386", "clef_ban": "36031_0aoqmz_00003", "annee_de_construction": "1955", "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "sinistres": "endommagée"}, "menage": {"revenu_rga": 12000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Validations AMO pour les 12 parcours qui ont dépassé choix_amo
INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, user_email, adresse_logement, choisie_at, validee_at, created_at, updated_at)
VALUES
  -- eligibilite (4)
  ('33333333-3333-4333-8333-333333333a04', '22222222-2222-4222-8222-222222222a04', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Alice', 'D.', 'stats01@test.fr', '20 Rue des Frères Seron, 36000 Châteauroux', NOW() - INTERVAL '23 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '23 days', NOW()),
  ('33333333-3333-4333-8333-333333333a05', '22222222-2222-4222-8222-222222222a05', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Bruno', 'M.', 'stats02@test.fr', '35 Rue de la Pomme, 36100 Issoudun', NOW() - INTERVAL '20 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '20 days', NOW()),
  ('33333333-3333-4333-8333-333333333a06', '22222222-2222-4222-8222-222222222a06', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Inès', 'G.', 'stats09@test.fr', '3 Chemin de Fontfurat, 36200 Argenton-sur-Creuse', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days', NOW()),
  ('33333333-3333-4333-8333-333333333a07', '22222222-2222-4222-8222-222222222a07', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Jules', 'T.', 'stats10@test.fr', '32 Rue du Faubourg Saint-Abdon, 36400 La Châtre', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days', NOW()),
  -- diagnostic (3)
  ('33333333-3333-4333-8333-333333333a08', '22222222-2222-4222-8222-222222222a08', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Claire', 'P.', 'stats03@test.fr', '7 Avenue des Marins, 36000 Châteauroux', NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '18 days', NOW()),
  ('33333333-3333-4333-8333-333333333a09', '22222222-2222-4222-8222-222222222a09', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'David', 'R.', 'stats04@test.fr', '12 Rue des Riaux, 36300 Le Blanc', NOW() - INTERVAL '16 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '16 days', NOW()),
  ('33333333-3333-4333-8333-333333333a10', '22222222-2222-4222-8222-222222222a10', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Karima', 'D.', 'stats11@test.fr', '40 Avenue Jean Moulin, 36130 Déols', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days', NOW()),
  -- devis (3)
  ('33333333-3333-4333-8333-333333333a11', '22222222-2222-4222-8222-222222222a11', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Emma', 'R.', 'stats05@test.fr', '19 Route de la Pomme, 36100 Issoudun', NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '14 days', NOW()),
  ('33333333-3333-4333-8333-333333333a12', '22222222-2222-4222-8222-222222222a12', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'François', 'S.', 'stats06@test.fr', '3 Rue des 100 000 Chemises, 36000 Châteauroux', NOW() - INTERVAL '13 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '13 days', NOW()),
  ('33333333-3333-4333-8333-333333333a13', '22222222-2222-4222-8222-222222222a13', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Louis', 'M.', 'stats12@test.fr', '27 Route des Narrons, 36200 Argenton-sur-Creuse', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days', NOW()),
  -- factures (2)
  ('33333333-3333-4333-8333-333333333a14', '22222222-2222-4222-8222-222222222a14', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Gaëlle', 'L.', 'stats07@test.fr', '12 Impasse de la Grand Maison, 36400 La Châtre', NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '11 days', NOW()),
  ('33333333-3333-4333-8333-333333333a15', '22222222-2222-4222-8222-222222222a15', '5833143c-9397-4a80-a7fc-3c5eb37c7a28', 'logement_eligible', 'Hugo', 'M.', 'stats08@test.fr', '3 Habilly, 36500 Buzançais', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '9 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Dossiers DS pour les parcours avancés
INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, submitted_at, created_at, updated_at)
VALUES
  -- eligibilite: 4 dossiers en_instruction
  ('44444444-4444-4444-8444-444444444a04', '22222222-2222-4222-8222-222222222a04', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '19 days', NOW() - INTERVAL '20 days', NOW()),
  ('44444444-4444-4444-8444-444444444a05', '22222222-2222-4222-8222-222222222a05', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '16 days', NOW() - INTERVAL '17 days', NOW()),
  ('44444444-4444-4444-8444-444444444a06', '22222222-2222-4222-8222-222222222a06', 'eligibilite', 'demarche-eligibilite', 'en_construction', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW()),
  ('44444444-4444-4444-8444-444444444a07', '22222222-2222-4222-8222-222222222a07', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days', NOW()),

  -- diagnostic: éligibilité accepté + diagnostic en cours
  ('44444444-4444-4444-8444-44444444a801', '22222222-2222-4222-8222-222222222a08', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '16 days', NOW() - INTERVAL '17 days', NOW()),
  ('44444444-4444-4444-8444-44444444a802', '22222222-2222-4222-8222-222222222a08', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW()),
  ('44444444-4444-4444-8444-44444444a901', '22222222-2222-4222-8222-222222222a09', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '14 days', NOW() - INTERVAL '15 days', NOW()),
  ('44444444-4444-4444-8444-44444444a902', '22222222-2222-4222-8222-222222222a09', 'diagnostic', 'demarche-diagnostic', 'en_instruction', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW()),
  ('44444444-4444-4444-8444-44444444aa01', '22222222-2222-4222-8222-222222222a10', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days', NOW()),
  ('44444444-4444-4444-8444-44444444aa02', '22222222-2222-4222-8222-222222222a10', 'diagnostic', 'demarche-diagnostic', 'en_construction', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),

  -- devis: éligibilité + diagnostic acceptés + devis en cours
  ('44444444-4444-4444-8444-44444444ab01', '22222222-2222-4222-8222-222222222a11', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '13 days', NOW() - INTERVAL '14 days', NOW()),
  ('44444444-4444-4444-8444-44444444ab02', '22222222-2222-4222-8222-222222222a11', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '11 days', NOW() - INTERVAL '12 days', NOW()),
  ('44444444-4444-4444-8444-44444444ab03', '22222222-2222-4222-8222-222222222a11', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', NOW()),
  ('44444444-4444-4444-8444-44444444ac01', '22222222-2222-4222-8222-222222222a12', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '12 days', NOW() - INTERVAL '13 days', NOW()),
  ('44444444-4444-4444-8444-44444444ac02', '22222222-2222-4222-8222-222222222a12', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '10 days', NOW() - INTERVAL '11 days', NOW()),
  ('44444444-4444-4444-8444-44444444ac03', '22222222-2222-4222-8222-222222222a12', 'devis', 'demarche-devis', 'en_instruction', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW()),
  ('44444444-4444-4444-8444-44444444ad01', '22222222-2222-4222-8222-222222222a13', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
  ('44444444-4444-4444-8444-44444444ad02', '22222222-2222-4222-8222-222222222a13', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
  ('44444444-4444-4444-8444-44444444ad03', '22222222-2222-4222-8222-222222222a13', 'devis', 'demarche-devis', 'en_construction', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),

  -- factures: tous dossiers complétés + factures en cours
  ('44444444-4444-4444-8444-44444444ae01', '22222222-2222-4222-8222-222222222a14', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '10 days', NOW() - INTERVAL '11 days', NOW()),
  ('44444444-4444-4444-8444-44444444ae02', '22222222-2222-4222-8222-222222222a14', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days', NOW()),
  ('44444444-4444-4444-8444-44444444ae03', '22222222-2222-4222-8222-222222222a14', 'devis', 'demarche-devis', 'accepte', NOW() - INTERVAL '6 days', NOW() - INTERVAL '7 days', NOW()),
  ('44444444-4444-4444-8444-44444444ae04', '22222222-2222-4222-8222-222222222a14', 'factures', 'demarche-factures', 'en_instruction', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW()),
  ('44444444-4444-4444-8444-44444444af01', '22222222-2222-4222-8222-222222222a15', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days', NOW()),
  ('44444444-4444-4444-8444-44444444af02', '22222222-2222-4222-8222-222222222a15', 'diagnostic', 'demarche-diagnostic', 'accepte', NOW() - INTERVAL '6 days', NOW() - INTERVAL '7 days', NOW()),
  ('44444444-4444-4444-8444-44444444af03', '22222222-2222-4222-8222-222222222a15', 'devis', 'demarche-devis', 'accepte', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW()),
  ('44444444-4444-4444-8444-44444444af04', '22222222-2222-4222-8222-222222222a15', 'factures', 'demarche-factures', 'en_construction', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT 'Stats seed' as seed,
  (SELECT COUNT(*) FROM parcours_prevention WHERE id::text LIKE '22222222-2222-4222-8222-222222222a%') as parcours,
  (SELECT COUNT(*) FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-4333-8333-333333333a%') as validations,
  (SELECT COUNT(*) FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-8444-444444444a%') as dossiers;
