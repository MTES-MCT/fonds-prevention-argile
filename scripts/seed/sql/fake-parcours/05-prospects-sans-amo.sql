-- =============================================================================
-- 05-PROSPECTS SANS AMO : Création de prospects (particuliers sans AMO assigné)
-- =============================================================================
-- Ces parcours n'ont PAS de validation AMO et sont visibles par les agents Allers-Vers
-- Répartition : choix_amo (tous), dates variées pour tester les filtres
-- =============================================================================

-- Vérification préalable : S'assurer qu'il existe au moins un territoire Allers-Vers
-- SELECT id, nom FROM allers_vers LIMIT 1;

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- ===== PROSPECTS RÉCENTS (dernière action < 7 jours) - 10 prospects =====

  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111141', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "12 rue des Moulins", "commune": "36006", "code_region": "24", "epci": "243600285", "coordonnees": "46.5833,1.5167", "clef_ban": "36006_0001", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 21000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-02T10:00:00Z"}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111142', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "8 avenue de la République", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8333,1.7000", "clef_ban": "36063_0001", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 35000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-01T14:30:00Z"}',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

  ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111143', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "15 rue du Commerce", "commune": "36031", "code_region": "24", "epci": "243600285", "coordonnees": "46.8833,1.4167", "clef_ban": "36031_0001", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 18000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-31T09:00:00Z"}',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

  ('55555555-5555-5555-5555-555555555504', '11111111-1111-1111-1111-111111111144', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Maur", "code_departement": "36", "adresse": "22 route de Tours", "commune": "36200", "code_region": "24", "epci": "243600327", "coordonnees": "46.7917,1.6333", "clef_ban": "36200_0001", "commune_denormandie": false, "annee_de_construction": "1990", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 4000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 42000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-30T16:00:00Z"}',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

  ('55555555-5555-5555-5555-555555555505', '11111111-1111-1111-1111-111111111145', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Levroux", "code_departement": "36", "adresse": "3 place du Marché", "commune": "36091", "code_region": "24", "epci": "200071991", "coordonnees": "46.9833,1.6167", "clef_ban": "36091_0001", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 16500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-29T11:30:00Z"}',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days'),

  ('55555555-5555-5555-5555-555555555506', '11111111-1111-1111-1111-111111111146', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Vatan", "code_departement": "36", "adresse": "7 rue de la Poste", "commune": "36230", "code_region": "24", "epci": "200071991", "coordonnees": "47.0667,1.8000", "clef_ban": "36230_0001", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 28000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-28T08:00:00Z"}',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days'),

  ('55555555-5555-5555-5555-555555555507', '11111111-1111-1111-1111-111111111147', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Écueillé", "code_departement": "36", "adresse": "18 rue des Écoles", "commune": "36070", "code_region": "24", "epci": "243600285", "coordonnees": "46.9833,1.4333", "clef_ban": "36070_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 24000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-27T15:00:00Z"}',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 days'),

  ('55555555-5555-5555-5555-555555555508', '11111111-1111-1111-1111-111111111148', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "5 avenue Jean Jaurès", "commune": "36005", "code_region": "24", "epci": "243600327", "coordonnees": "46.7333,1.8333", "clef_ban": "36005_0001", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-26T10:30:00Z"}',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '5 days'),

  ('55555555-5555-5555-5555-555555555509', '11111111-1111-1111-1111-111111111149', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "11 place du Marché", "commune": "36046", "code_region": "24", "epci": "243600327", "coordonnees": "46.5833,1.9833", "clef_ban": "36046_0001", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 6500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 38000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-25T13:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days'),

  ('55555555-5555-5555-5555-555555555510', '11111111-1111-1111-1111-111111111150', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Neuvy-Saint-Sépulchre", "code_departement": "36", "adresse": "25 rue de la Basilique", "commune": "36141", "code_region": "24", "epci": "200071991", "coordonnees": "46.5944,1.8111", "clef_ban": "36141_0001", "commune_denormandie": false, "annee_de_construction": "1987", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 31000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-24T09:30:00Z"}',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '7 days'),


  -- ===== PROSPECTS MOYENS (dernière action 7-30 jours) - 10 prospects =====

  ('55555555-5555-5555-5555-555555555511', '11111111-1111-1111-1111-111111111151', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Gaultier", "code_departement": "36", "adresse": "9 rue de la Gare", "commune": "36193", "code_region": "24", "epci": "243600285", "coordonnees": "46.6333,1.4167", "clef_ban": "36193_0001", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-20T14:00:00Z"}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days'),

  ('55555555-5555-5555-5555-555555555512', '11111111-1111-1111-1111-111111111152', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Valençay", "code_departement": "36", "adresse": "14 avenue du Château", "commune": "36228", "code_region": "24", "epci": "200071991", "coordonnees": "47.1667,1.5667", "clef_ban": "36228_0001", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 26000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-18T11:00:00Z"}',
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days'),

  ('55555555-5555-5555-5555-555555555513', '11111111-1111-1111-1111-111111111153', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Niherne", "code_departement": "36", "adresse": "6 impasse des Tilleuls", "commune": "36142", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.5500", "clef_ban": "36142_0001", "commune_denormandie": false, "annee_de_construction": "1988", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 33000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T16:30:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days'),

  ('55555555-5555-5555-5555-555555555514', '11111111-1111-1111-1111-111111111154', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Cluis", "code_departement": "36", "adresse": "20 rue du Centre", "commune": "36058", "code_region": "24", "epci": "200071991", "coordonnees": "46.5500,1.7667", "clef_ban": "36058_0001", "commune_denormandie": false, "annee_de_construction": "1963", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": true, "sinistres": "endommagée"}, "menage": {"revenu_rga": 15000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-12T09:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '14 days'),

  ('55555555-5555-5555-5555-555555555515', '11111111-1111-1111-1111-111111111155', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Montgivray", "code_departement": "36", "adresse": "4 place de l''Église", "commune": "36127", "code_region": "24", "epci": "200071991", "coordonnees": "46.6833,1.9000", "clef_ban": "36127_0001", "commune_denormandie": false, "annee_de_construction": "1976", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 29000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-10T12:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '16 days'),

  ('55555555-5555-5555-5555-555555555516', '11111111-1111-1111-1111-111111111156', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Pouligny-Saint-Pierre", "code_departement": "36", "adresse": "12 route de Tournon", "commune": "36163", "code_region": "24", "epci": "243600343", "coordonnees": "46.6333,0.9833", "clef_ban": "36163_0001", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-08T10:30:00Z"}',
   NOW() - INTERVAL '27 days', NOW() - INTERVAL '18 days'),

  ('55555555-5555-5555-5555-555555555517', '11111111-1111-1111-1111-111111111157', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Mézières-en-Brenne", "code_departement": "36", "adresse": "8 rue de la Brenne", "commune": "36123", "code_region": "24", "epci": "200072346", "coordonnees": "46.8167,1.2000", "clef_ban": "36123_0001", "commune_denormandie": false, "annee_de_construction": "1990", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 41000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-05T15:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days'),

  ('55555555-5555-5555-5555-555555555518', '11111111-1111-1111-1111-111111111158', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châtillon-sur-Indre", "code_departement": "36", "adresse": "16 place Pasteur", "commune": "36045", "code_region": "24", "epci": "200071991", "coordonnees": "46.9833,1.1667", "clef_ban": "36045_0001", "commune_denormandie": false, "annee_de_construction": "1967", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-28T08:30:00Z"}',
   NOW() - INTERVAL '38 days', NOW() - INTERVAL '22 days'),

  ('55555555-5555-5555-5555-555555555519', '11111111-1111-1111-1111-111111111159', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Bélâbre", "code_departement": "36", "adresse": "10 rue de la Mairie", "commune": "36016", "code_region": "24", "epci": "243600343", "coordonnees": "46.5500,1.1500", "clef_ban": "36016_0001", "commune_denormandie": false, "annee_de_construction": "1973", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 8000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 27000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-25T14:00:00Z"}',
   NOW() - INTERVAL '41 days', NOW() - INTERVAL '25 days'),

  ('55555555-5555-5555-5555-555555555520', '11111111-1111-1111-1111-111111111160', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Luçay-le-Mâle", "code_departement": "36", "adresse": "5 chemin des Vignes", "commune": "36104", "code_region": "24", "epci": "200071991", "coordonnees": "47.1333,1.4333", "clef_ban": "36104_0001", "commune_denormandie": false, "annee_de_construction": "1995", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 36000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-20T11:00:00Z"}',
   NOW() - INTERVAL '46 days', NOW() - INTERVAL '28 days'),


  -- ===== PROSPECTS ANCIENS (dernière action > 30 jours) - 10 prospects =====

  ('55555555-5555-5555-5555-555555555521', '11111111-1111-1111-1111-111111111161', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Eguzon-Chantôme", "code_departement": "36", "adresse": "18 rue du Barrage", "commune": "36071", "code_region": "24", "epci": "200071991", "coordonnees": "46.4500,1.5833", "clef_ban": "36071_0001", "commune_denormandie": false, "annee_de_construction": "1960", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 14000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-10T09:30:00Z"}',
   NOW() - INTERVAL '56 days', NOW() - INTERVAL '35 days'),

  ('55555555-5555-5555-5555-555555555522', '11111111-1111-1111-1111-111111111162', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Benoît-du-Sault", "code_departement": "36", "adresse": "7 place du Puits", "commune": "36181", "code_region": "24", "epci": "243600285", "coordonnees": "46.4333,1.3833", "clef_ban": "36181_0001", "commune_denormandie": false, "annee_de_construction": "1971", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 25000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-05T15:00:00Z"}',
   NOW() - INTERVAL '61 days', NOW() - INTERVAL '40 days'),

  ('55555555-5555-5555-5555-555555555523', '11111111-1111-1111-1111-111111111163', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Azay-le-Ferron", "code_departement": "36", "adresse": "22 avenue du Château", "commune": "36010", "code_region": "24", "epci": "243600343", "coordonnees": "46.8500,1.0667", "clef_ban": "36010_0001", "commune_denormandie": false, "annee_de_construction": "1984", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 32000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-28T10:00:00Z"}',
   NOW() - INTERVAL '68 days', NOW() - INTERVAL '45 days'),

  ('55555555-5555-5555-5555-555555555524', '11111111-1111-1111-1111-111111111164', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Baudres", "code_departement": "36", "adresse": "3 impasse des Champs", "commune": "36013", "code_region": "24", "epci": "243600327", "coordonnees": "46.7667,1.7333", "clef_ban": "36013_0001", "commune_denormanisme": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 5500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 39000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-20T13:30:00Z"}',
   NOW() - INTERVAL '76 days', NOW() - INTERVAL '52 days'),

  ('55555555-5555-5555-5555-555555555525', '11111111-1111-1111-1111-111111111165', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Villedieu-sur-Indre", "code_departement": "36", "adresse": "11 rue de la Fontaine", "commune": "36241", "code_region": "24", "epci": "200071991", "coordonnees": "46.8500,1.5333", "clef_ban": "36241_0001", "commune_denormandie": false, "annee_de_construction": "1966", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-15T09:00:00Z"}',
   NOW() - INTERVAL '81 days', NOW() - INTERVAL '58 days'),

  ('55555555-5555-5555-5555-555555555526', '11111111-1111-1111-1111-111111111166', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Sainte-Sévère-sur-Indre", "code_departement": "36", "adresse": "15 place de la Liberté", "commune": "36206", "code_region": "24", "epci": "200071991", "coordonnees": "46.5000,1.8333", "clef_ban": "36206_0001", "commune_denormandie": false, "annee_de_construction": "1989", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 30000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-08T14:00:00Z"}',
   NOW() - INTERVAL '88 days', NOW() - INTERVAL '65 days'),

  ('55555555-5555-5555-5555-555555555527', '11111111-1111-1111-1111-111111111167', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Prissac", "code_departement": "36", "adresse": "8 route de Vijon", "commune": "36166", "code_region": "24", "epci": "200071991", "coordonnees": "46.5500,1.7000", "clef_ban": "36166_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 23000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-01T11:30:00Z"}',
   NOW() - INTERVAL '95 days', NOW() - INTERVAL '72 days'),

  ('55555555-5555-5555-5555-555555555528', '11111111-1111-1111-1111-111111111168', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Pellevoisin", "code_departement": "36", "adresse": "19 rue du Sanctuaire", "commune": "36153", "code_region": "24", "epci": "200071991", "coordonnees": "46.9667,1.4167", "clef_ban": "36153_0001", "commune_denormandie": false, "annee_de_construction": "1981", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 7000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 26500, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-25T10:00:00Z"}',
   NOW() - INTERVAL '102 days', NOW() - INTERVAL '80 days'),

  ('55555555-5555-5555-5555-555555555529', '11111111-1111-1111-1111-111111111169', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Ciron", "code_departement": "36", "adresse": "6 place de la Mairie", "commune": "36056", "code_region": "24", "epci": "200072346", "coordonnees": "47.0333,0.9500", "clef_ban": "36056_0001", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 44000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-18T15:30:00Z"}',
   NOW() - INTERVAL '109 days', NOW() - INTERVAL '88 days'),

  ('55555555-5555-5555-5555-555555555530', '11111111-1111-1111-1111-111111111170', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Mers-sur-Indre", "code_departement": "36", "adresse": "14 rue de la Rivière", "commune": "36120", "code_region": "24", "epci": "243600285", "coordonnees": "47.0167,1.5167", "clef_ban": "36120_0001", "commune_denormanisme": false, "annee_de_construction": "1969", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-10T12:00:00Z"}',
   NOW() - INTERVAL '117 days', NOW() - INTERVAL '95 days');

-- ===== PROSPECTS ÉLIGIBLES (5 prospects) =====

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, situation_particulier, rga_simulation_data, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555531', '11111111-1111-1111-1111-111111111181', 'choix_amo', 'todo', 'eligible',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "30 rue Victor Hugo", "commune": "36006", "code_region": "24", "epci": "243600285", "coordonnees": "46.5833,1.5167", "clef_ban": "36006_0002", "commune_denormandie": false, "annee_de_construction": "1974", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-10T10:00:00Z"}',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),

  ('55555555-5555-5555-5555-555555555532', '11111111-1111-1111-1111-111111111182', 'choix_amo', 'todo', 'eligible',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "25 rue de la Paix", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8333,1.7000", "clef_ban": "36063_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 28000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-08T14:30:00Z"}',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),

  ('55555555-5555-5555-5555-555555555533', '11111111-1111-1111-1111-111111111183', 'choix_amo', 'todo', 'eligible',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "7 allée des Roses", "commune": "36031", "code_region": "24", "epci": "243600285", "coordonnees": "46.8833,1.4167", "clef_ban": "36031_0002", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-02-05T09:00:00Z"}',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '6 days'),

  ('55555555-5555-5555-5555-555555555534', '11111111-1111-1111-1111-111111111184', 'choix_amo', 'todo', 'eligible',
   '{"logement": {"commune_nom": "Levroux", "code_departement": "36", "adresse": "18 boulevard du Nord", "commune": "36091", "code_region": "24", "epci": "200071991", "coordonnees": "46.9833,1.6167", "clef_ban": "36091_0002", "commune_denormandie": false, "annee_de_construction": "1983", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 3500, "sinistres": "endommagée"}, "menage": {"revenu_rga": 34000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-28T16:00:00Z"}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days'),

  ('55555555-5555-5555-5555-555555555535', '11111111-1111-1111-1111-111111111185', 'choix_amo', 'todo', 'eligible',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "5 rue George Sand", "commune": "36046", "code_region": "24", "epci": "243600327", "coordonnees": "46.5833,1.9833", "clef_ban": "36046_0002", "commune_denormandie": false, "annee_de_construction": "1991", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 25000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-25T11:30:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '14 days');


-- ===== PROSPECTS ARCHIVÉS (3 prospects) =====

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, situation_particulier, archived_at, archive_reason, rga_simulation_data, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555536', '11111111-1111-1111-1111-111111111186', 'choix_amo', 'todo', 'archive',
   NOW() - INTERVAL '10 days', 'Hors zone éligible',
   '{"logement": {"commune_nom": "Vatan", "code_departement": "36", "adresse": "21 rue de la Liberté", "commune": "36230", "code_region": "24", "epci": "200071991", "coordonnees": "47.0667,1.8000", "clef_ban": "36230_0002", "commune_denormandie": false, "annee_de_construction": "1977", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-20T09:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days'),

  ('55555555-5555-5555-5555-555555555537', '11111111-1111-1111-1111-111111111187', 'choix_amo', 'todo', 'archive',
   NOW() - INTERVAL '15 days', 'Le demandeur ne donne pas de réponse',
   '{"logement": {"commune_nom": "Écueillé", "code_departement": "36", "adresse": "9 place de la Halle", "commune": "36070", "code_region": "24", "epci": "243600285", "coordonnees": "46.9833,1.4333", "clef_ban": "36070_0002", "commune_denormandie": false, "annee_de_construction": "1986", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 31000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T14:00:00Z"}',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '15 days'),

  ('55555555-5555-5555-5555-555555555538', '11111111-1111-1111-1111-111111111188', 'choix_amo', 'todo', 'archive',
   NOW() - INTERVAL '20 days', 'Le demandeur a abandonné le projet',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "13 rue du Moulin", "commune": "36005", "code_region": "24", "epci": "243600327", "coordonnees": "46.7333,1.8333", "clef_ban": "36005_0002", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-10T10:30:00Z"}',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '20 days');


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- Compter les prospects créés par situation
SELECT
  'Prospects sans AMO' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN situation_particulier = 'prospect' THEN 1 END) as prospects,
  COUNT(CASE WHEN situation_particulier = 'eligible' THEN 1 END) as eligibles,
  COUNT(CASE WHEN situation_particulier = 'archive' THEN 1 END) as archives
FROM parcours_prevention
WHERE id::text LIKE '55555555%';
