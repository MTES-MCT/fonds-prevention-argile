-- =============================================================================
-- 12 - SEED : Données d'éligibilité variées
-- Parcours avec micro-fissures, indemnisations, revenus variés, multi-départements
-- =============================================================================

-- Nettoyage spécifique à ce seed
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-222222222c%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-111111111c%';

-- =============================================================================
-- USERS (20 users)
-- =============================================================================
INSERT INTO users (id, sub, email, given_name, family_name, email_contact, created_at, updated_at)
VALUES
  -- Allier (03)
  ('11111111-1111-1111-1111-111111111c01', 'sub_elig_01', 'elig01@test.fr', 'Lucas',    'Martin',    'elig01@test.fr', NOW() - INTERVAL '15 days', NOW()),
  ('11111111-1111-1111-1111-111111111c02', 'sub_elig_02', 'elig02@test.fr', 'Emma',     'Bernard',   'elig02@test.fr', NOW() - INTERVAL '15 days', NOW()),
  ('11111111-1111-1111-1111-111111111c03', 'sub_elig_03', 'elig03@test.fr', 'Hugo',     'Petit',     'elig03@test.fr', NOW() - INTERVAL '15 days', NOW()),
  ('11111111-1111-1111-1111-111111111c04', 'sub_elig_04', 'elig04@test.fr', 'Chloe',    'Robert',    'elig04@test.fr', NOW() - INTERVAL '15 days', NOW()),
  -- Indre (36)
  ('11111111-1111-1111-1111-111111111c05', 'sub_elig_05', 'elig05@test.fr', 'Louis',    'Richard',   'elig05@test.fr', NOW() - INTERVAL '10 days', NOW()),
  ('11111111-1111-1111-1111-111111111c06', 'sub_elig_06', 'elig06@test.fr', 'Lea',      'Durand',    'elig06@test.fr', NOW() - INTERVAL '10 days', NOW()),
  ('11111111-1111-1111-1111-111111111c07', 'sub_elig_07', 'elig07@test.fr', 'Nathan',   'Moreau',    'elig07@test.fr', NOW() - INTERVAL '10 days', NOW()),
  -- Dordogne (24)
  ('11111111-1111-1111-1111-111111111c08', 'sub_elig_08', 'elig08@test.fr', 'Manon',    'Simon',     'elig08@test.fr', NOW() - INTERVAL '12 days', NOW()),
  ('11111111-1111-1111-1111-111111111c09', 'sub_elig_09', 'elig09@test.fr', 'Jules',    'Laurent',   'elig09@test.fr', NOW() - INTERVAL '12 days', NOW()),
  ('11111111-1111-1111-1111-111111111c10', 'sub_elig_10', 'elig10@test.fr', 'Camille',  'Lefebvre',  'elig10@test.fr', NOW() - INTERVAL '12 days', NOW()),
  -- Gers (32)
  ('11111111-1111-1111-1111-111111111c11', 'sub_elig_11', 'elig11@test.fr', 'Tom',      'Leroy',     'elig11@test.fr', NOW() - INTERVAL '8 days',  NOW()),
  ('11111111-1111-1111-1111-111111111c12', 'sub_elig_12', 'elig12@test.fr', 'Jade',     'Roux',      'elig12@test.fr', NOW() - INTERVAL '8 days',  NOW()),
  -- Nord (59) - non éligible département
  ('11111111-1111-1111-1111-111111111c13', 'sub_elig_13', 'elig13@test.fr', 'Gabriel',  'David',     'elig13@test.fr', NOW() - INTERVAL '5 days',  NOW()),
  ('11111111-1111-1111-1111-111111111c14', 'sub_elig_14', 'elig14@test.fr', 'Alice',    'Bertrand',  'elig14@test.fr', NOW() - INTERVAL '5 days',  NOW()),
  -- Période précédente (40-50j ago) pour les variations
  ('11111111-1111-1111-1111-111111111c15', 'sub_elig_15', 'elig15@test.fr', 'Raphael',  'Morel',     'elig15@test.fr', NOW() - INTERVAL '45 days', NOW()),
  ('11111111-1111-1111-1111-111111111c16', 'sub_elig_16', 'elig16@test.fr', 'Ines',     'Fournier',  'elig16@test.fr', NOW() - INTERVAL '45 days', NOW()),
  ('11111111-1111-1111-1111-111111111c17', 'sub_elig_17', 'elig17@test.fr', 'Adam',     'Girard',    'elig17@test.fr', NOW() - INTERVAL '42 days', NOW()),
  ('11111111-1111-1111-1111-111111111c18', 'sub_elig_18', 'elig18@test.fr', 'Lina',     'Andre',     'elig18@test.fr', NOW() - INTERVAL '42 days', NOW()),
  -- Revenus élevés
  ('11111111-1111-1111-1111-111111111c19', 'sub_elig_19', 'elig19@test.fr', 'Arthur',   'Mercier',   'elig19@test.fr', NOW() - INTERVAL '7 days',  NOW()),
  ('11111111-1111-1111-1111-111111111c20', 'sub_elig_20', 'elig20@test.fr', 'Louise',   'Dupont',    'elig20@test.fr', NOW() - INTERVAL '7 days',  NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PARCOURS (20 parcours)
-- Eligible: maison, zone fort, dept éligible, non mitoyen, assure, proprio occupant, <2 niveaux, construction ancienne
-- =============================================================================

-- 1. Allier - Eligible, saine (sans micro-fissures), non indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c01', '11111111-1111-1111-1111-111111111c01', 'eligibilite', 'todo',
  '{"logement":{"adresse":"10 rue de la Paix, 03000 Moulins","code_region":"84","code_departement":"03","epci":"200071082","commune":"03190","commune_nom":"Moulins","coordonnees":"46.5656,3.3325","clef_ban":"03190_0001","commune_denormandie":false,"annee_de_construction":"1975","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":14000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-01T10:00:00Z"}',
  NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Allier - Eligible, très peu endommagée (avec micro-fissures), non indemnisé, modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c02', '11111111-1111-1111-1111-111111111c02', 'eligibilite', 'todo',
  '{"logement":{"adresse":"5 avenue Victor Hugo, 03200 Vichy","code_region":"84","code_departement":"03","epci":"200071082","commune":"03310","commune_nom":"Vichy","coordonnees":"46.1273,3.4263","clef_ban":"03310_0001","commune_denormandie":false,"annee_de_construction":"1980","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":20000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-02T10:00:00Z"}',
  NOW() - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Allier - Eligible, très peu endommagée (avec micro-fissures), déjà indemnisé, intermédiaire
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c03', '11111111-1111-1111-1111-111111111c03', 'eligibilite', 'todo',
  '{"logement":{"adresse":"12 place de la Gare, 03100 Montlucon","code_region":"84","code_departement":"03","epci":"200071082","commune":"03185","commune_nom":"Montluçon","coordonnees":"46.3402,2.6040","clef_ban":"03185_0001","commune_denormandie":false,"annee_de_construction":"1970","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":35000,"personnes":3},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-03T10:00:00Z"}',
  NOW() - INTERVAL '14 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Allier - Non éligible (appartement), revenus supérieurs
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c04', '11111111-1111-1111-1111-111111111c04', 'eligibilite', 'todo',
  '{"logement":{"adresse":"3 rue Blatin, 03000 Moulins","code_region":"84","code_departement":"03","epci":"200071082","commune":"03190","commune_nom":"Moulins","coordonnees":"46.5656,3.3325","clef_ban":"03190_0002","commune_denormandie":false,"annee_de_construction":"1985","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"appartement","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":65000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-04T10:00:00Z"}',
  NOW() - INTERVAL '14 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Indre - Eligible, saine, non indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c05', '11111111-1111-1111-1111-111111111c05', 'eligibilite', 'todo',
  '{"logement":{"adresse":"8 rue de la Gare, 36000 Chateauroux","code_region":"24","code_departement":"36","epci":"200071082","commune":"36044","commune_nom":"Châteauroux","coordonnees":"46.8100,1.6913","clef_ban":"36044_0001","commune_denormandie":false,"annee_de_construction":"1968","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":15000,"personnes":3},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-05T10:00:00Z"}',
  NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Indre - Eligible, très peu endommagée, déjà indemnisé, modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c06', '11111111-1111-1111-1111-111111111c06', 'eligibilite', 'todo',
  '{"logement":{"adresse":"15 rue de la Liberté, 36100 Issoudun","code_region":"24","code_departement":"36","epci":"200071082","commune":"36088","commune_nom":"Issoudun","coordonnees":"46.9472,1.9930","clef_ban":"36088_0001","commune_denormandie":false,"annee_de_construction":"1972","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":28000,"personnes":4},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-06T10:00:00Z"}',
  NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Indre - Eligible, saine, non indemnisé, intermédiaire
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c07', '11111111-1111-1111-1111-111111111c07', 'eligibilite', 'todo',
  '{"logement":{"adresse":"3 rue du Château, 36300 Le Blanc","code_region":"24","code_departement":"36","epci":"200071082","commune":"36018","commune_nom":"Le Blanc","coordonnees":"46.6328,1.0645","clef_ban":"36018_0001","commune_denormandie":false,"annee_de_construction":"1965","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":42000,"personnes":4},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-07T10:00:00Z"}',
  NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. Dordogne - Eligible, très peu endommagée, non indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c08', '11111111-1111-1111-1111-111111111c08', 'eligibilite', 'todo',
  '{"logement":{"adresse":"7 rue de la Mairie, 24000 Périgueux","code_region":"75","code_departement":"24","epci":"200071082","commune":"24322","commune_nom":"Périgueux","coordonnees":"45.1842,0.7211","clef_ban":"24322_0001","commune_denormandie":false,"annee_de_construction":"1978","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":12000,"personnes":1},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-08T10:00:00Z"}',
  NOW() - INTERVAL '12 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 9. Dordogne - Eligible, saine, déjà indemnisé, modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c09', '11111111-1111-1111-1111-111111111c09', 'eligibilite', 'todo',
  '{"logement":{"adresse":"22 boulevard Montaigne, 24100 Bergerac","code_region":"75","code_departement":"24","epci":"200071082","commune":"24037","commune_nom":"Bergerac","coordonnees":"44.8529,0.4836","clef_ban":"24037_0001","commune_denormandie":false,"annee_de_construction":"1982","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"saine"},"menage":{"revenu_rga":25000,"personnes":3},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-09T10:00:00Z"}',
  NOW() - INTERVAL '12 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 10. Dordogne - Non éligible (revenus trop élevés), supérieure
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c10', '11111111-1111-1111-1111-111111111c10', 'eligibilite', 'todo',
  '{"logement":{"adresse":"1 allée des Tilleuls, 24200 Sarlat","code_region":"75","code_departement":"24","epci":"200071082","commune":"24520","commune_nom":"Sarlat-la-Canéda","coordonnees":"44.8892,1.2156","clef_ban":"24520_0001","commune_denormandie":false,"annee_de_construction":"1990","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":70000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-10T10:00:00Z"}',
  NOW() - INTERVAL '12 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 11. Gers - Eligible, très peu endommagée, non indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c11', '11111111-1111-1111-1111-111111111c11', 'eligibilite', 'todo',
  '{"logement":{"adresse":"4 place de la Halle, 32000 Auch","code_region":"76","code_departement":"32","epci":"200071082","commune":"32013","commune_nom":"Auch","coordonnees":"43.6460,0.5856","clef_ban":"32013_0001","commune_denormandie":false,"annee_de_construction":"1960","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":10000,"personnes":1},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-11T10:00:00Z"}',
  NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 12. Gers - Eligible, saine, déjà indemnisé, modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c12', '11111111-1111-1111-1111-111111111c12', 'eligibilite', 'todo',
  '{"logement":{"adresse":"9 rue de Verdun, 32100 Condom","code_region":"76","code_departement":"32","epci":"200071082","commune":"32107","commune_nom":"Condom","coordonnees":"43.9583,0.3728","clef_ban":"32107_0001","commune_denormandie":false,"annee_de_construction":"1955","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"saine"},"menage":{"revenu_rga":22000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-12T10:00:00Z"}',
  NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 13. Nord (59) - Non éligible département, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c13', '11111111-1111-1111-1111-111111111c13', 'eligibilite', 'todo',
  '{"logement":{"adresse":"6 rue de Lille, 59000 Lille","code_region":"32","code_departement":"59","epci":"200071082","commune":"59350","commune_nom":"Lille","coordonnees":"50.6292,3.0573","clef_ban":"59350_0001","commune_denormandie":false,"annee_de_construction":"1970","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":13000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-13T10:00:00Z"}',
  NOW() - INTERVAL '5 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 14. Nord - Non éligible département, intermédiaire
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c14', '11111111-1111-1111-1111-111111111c14', 'eligibilite', 'todo',
  '{"logement":{"adresse":"18 avenue Foch, 59100 Roubaix","code_region":"32","code_departement":"59","epci":"200071082","commune":"59512","commune_nom":"Roubaix","coordonnees":"50.6942,3.1746","clef_ban":"59512_0001","commune_denormandie":false,"annee_de_construction":"1965","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"endommagée"},"menage":{"revenu_rga":38000,"personnes":3},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-14T10:00:00Z"}',
  NOW() - INTERVAL '5 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 15-18. Période précédente (40-50j ago) pour générer des variations
-- 15. Allier - Eligible, saine, non indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c15', '11111111-1111-1111-1111-111111111c15', 'eligibilite', 'todo',
  '{"logement":{"adresse":"20 rue Nationale, 03000 Moulins","code_region":"84","code_departement":"03","epci":"200071082","commune":"03190","commune_nom":"Moulins","coordonnees":"46.5656,3.3325","clef_ban":"03190_0003","commune_denormandie":false,"annee_de_construction":"1958","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":16000,"personnes":3},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-11-01T10:00:00Z"}',
  NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 16. Indre - Eligible, très peu endommagée, déjà indemnisé, modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c16', '11111111-1111-1111-1111-111111111c16', 'eligibilite', 'todo',
  '{"logement":{"adresse":"11 avenue de la République, 36000 Châteauroux","code_region":"24","code_departement":"36","epci":"200071082","commune":"36044","commune_nom":"Châteauroux","coordonnees":"46.8100,1.6913","clef_ban":"36044_0002","commune_denormandie":false,"annee_de_construction":"1974","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":23000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-11-02T10:00:00Z"}',
  NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 17. Dordogne - Eligible, très peu endommagée, non indemnisé, intermédiaire
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c17', '11111111-1111-1111-1111-111111111c17', 'eligibilite', 'todo',
  '{"logement":{"adresse":"5 rue des Remparts, 24000 Périgueux","code_region":"75","code_departement":"24","epci":"200071082","commune":"24322","commune_nom":"Périgueux","coordonnees":"45.1842,0.7211","clef_ban":"24322_0002","commune_denormandie":false,"annee_de_construction":"1969","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":40000,"personnes":4},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-11-03T10:00:00Z"}',
  NOW() - INTERVAL '42 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 18. Gers - Non éligible (appartement), très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c18', '11111111-1111-1111-1111-111111111c18', 'eligibilite', 'todo',
  '{"logement":{"adresse":"2 place de la Cathédrale, 32000 Auch","code_region":"76","code_departement":"32","epci":"200071082","commune":"32013","commune_nom":"Auch","coordonnees":"43.6460,0.5856","clef_ban":"32013_0002","commune_denormandie":false,"annee_de_construction":"1988","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"appartement","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":11000,"personnes":1},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-11-04T10:00:00Z"}',
  NOW() - INTERVAL '42 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 19. Allier - Non éligible (revenus trop élevés), supérieure
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c19', '11111111-1111-1111-1111-111111111c19', 'eligibilite', 'todo',
  '{"logement":{"adresse":"14 rue du Marché, 03200 Vichy","code_region":"84","code_departement":"03","epci":"200071082","commune":"03310","commune_nom":"Vichy","coordonnees":"46.1273,3.4263","clef_ban":"03310_0002","commune_denormandie":false,"annee_de_construction":"1962","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":false,"sinistres":"saine"},"menage":{"revenu_rga":55000,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-15T10:00:00Z"}',
  NOW() - INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 20. Indre - Eligible, très peu endommagée, déjà indemnisé, très modeste
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222c20', '11111111-1111-1111-1111-111111111c20', 'eligibilite', 'todo',
  '{"logement":{"adresse":"6 impasse des Roses, 36000 Châteauroux","code_region":"24","code_departement":"36","epci":"200071082","commune":"36044","commune_nom":"Châteauroux","coordonnees":"46.8100,1.6913","clef_ban":"36044_0003","commune_denormandie":false,"annee_de_construction":"1971","rnb":"","niveaux":1,"zone_dexposition":"fort","type":"maison","mitoyen":false,"proprietaire_occupant":true},"taxeFonciere":{"commune_eligible":true},"rga":{"assure":true,"indemnise_indemnise_rga":true,"indemnise_avant_juillet_2015":true,"sinistres":"très peu endommagée"},"menage":{"revenu_rga":14500,"personnes":2},"vous":{"proprietaire_condition":true,"proprietaire_occupant_rga":true},"simulatedAt":"2025-12-16T10:00:00Z"}',
  NOW() - INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT 'Seed 12 - Données éligibilité : 20 parcours insérés' as status;
