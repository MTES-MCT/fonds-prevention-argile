-- =============================================================================
-- 02-PARCOURS : Création des parcours de prévention
-- =============================================================================
-- Répartition : eligibilite(8), diagnostic(10), devis(7), factures(5), choix_amo(10)
-- updated_at varié pour afficher le badge "X jours depuis dernière action"
-- =============================================================================

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- ===== CHÂTEAUROUX (5 demandeurs) =====
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "12 rue de la République", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T10:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days'),

  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "45 avenue de la Gare", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8100,1.6900", "clef_ban": "36044_0002", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 5000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 12000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-15T14:30:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days'),

  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "8 rue du Château", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8200,1.6750", "clef_ban": "36044_0003", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 32000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-20T09:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days'),

  ('22222222-2222-2222-2222-222222222231', '11111111-1111-1111-1111-111111111131', 'factures', 'valide',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "22 boulevard de Cluis", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8150,1.6800", "clef_ban": "36044_0004", "commune_denormandie": false, "annee_de_construction": "1990", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": true, "sinistres": "saine"}, "menage": {"revenu_rga": 52000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-01T11:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days'),

  ('22222222-2222-2222-2222-222222222232', '11111111-1111-1111-1111-111111111132', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "15 impasse des Roses", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8180,1.6820", "clef_ban": "36044_0005", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-10T08:00:00Z"}',
   NOW() - INTERVAL '5 days', NOW()),

  -- ===== ISSOUDUN (4 demandeurs) =====
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "5 avenue Jean Jaurès", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9500,1.9833", "clef_ban": "36088_0001", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 14500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-25T16:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '12 days'),

  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111105', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "18 rue de la Liberté", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9480,1.9800", "clef_ban": "36088_0002", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 3500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 28000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-05T10:30:00Z"}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '3 days'),

  ('22222222-2222-2222-2222-222222222233', '11111111-1111-1111-1111-111111111133', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "33 place du Marché", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9520,1.9850", "clef_ban": "36088_0003", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-01T14:00:00Z"}',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '4 days'),

  ('22222222-2222-2222-2222-222222222234', '11111111-1111-1111-1111-111111111134', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "7 rue des Acacias", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9460,1.9780", "clef_ban": "36088_0004", "commune_denormandie": false, "annee_de_construction": "1995", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 45000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-12T09:30:00Z"}',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

  -- ===== LE BLANC (3 demandeurs) =====
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111106', 'factures', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "8 place de la Mairie", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6333,1.0667", "clef_ban": "36018_0001", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 12000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 16000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-15T11:00:00Z"}',
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days'),

  ('22222222-2222-2222-2222-222222222235', '11111111-1111-1111-1111-111111111135', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "25 rue du Commerce", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6350,1.0700", "clef_ban": "36018_0002", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 11000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-10T15:00:00Z"}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days'),

  ('22222222-2222-2222-2222-222222222236', '11111111-1111-1111-1111-111111111136', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "4 impasse du Moulin", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6300,1.0650", "clef_ban": "36018_0003", "commune_denormandie": false, "annee_de_construction": "1962", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 38000, "personnes": 5}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-20T08:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),

  -- ===== ARGENTON-SUR-CREUSE (3 demandeurs) =====
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111107', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "22 rue du Moulin", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5833,1.5167", "clef_ban": "36006_0001", "commune_denormandie": false, "annee_de_construction": "1955", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 21000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-10T13:00:00Z"}',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days'),

  ('22222222-2222-2222-2222-222222222237', '11111111-1111-1111-1111-111111111137', 'devis', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "11 avenue de la Gare", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5850,1.5200", "clef_ban": "36006_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 6000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 13500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-28T10:00:00Z"}',
   NOW() - INTERVAL '28 days', NOW() - INTERVAL '14 days'),

  ('22222222-2222-2222-2222-222222222238', '11111111-1111-1111-1111-111111111138', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "6 rue des Tilleuls", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5800,1.5150", "clef_ban": "36006_0003", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 26000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-08T14:00:00Z"}',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),

  -- ===== LA CHÂTRE (2 demandeurs) =====
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111108', 'factures', 'en_instruction',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "3 boulevard George Sand", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5833,1.9833", "clef_ban": "36046_0001", "commune_denormandie": false, "annee_de_construction": "1960", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 15000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 24000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-09-20T09:00:00Z"}',
   NOW() - INTERVAL '70 days', NOW() - INTERVAL '60 days'),

  ('22222222-2222-2222-2222-222222222239', '11111111-1111-1111-1111-111111111139', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "17 rue Nationale", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5850,1.9800", "clef_ban": "36046_0002", "commune_denormandie": false, "annee_de_construction": "1988", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 58000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-15T11:30:00Z"}',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),

  -- ===== DÉOLS (2 demandeurs) =====
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111109', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "15 rue de l''Abbaye", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8333,1.7000", "clef_ban": "36063_0001", "commune_denormandie": false, "annee_de_construction": "1973", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 17500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-08T16:00:00Z"}',
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '9 days'),

  ('22222222-2222-2222-2222-222222222240', '11111111-1111-1111-1111-111111111140', 'devis', 'todo',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "28 avenue Marcel Dassault", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8350,1.7050", "clef_ban": "36063_0002", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 4000, "sinistres": "saine"}, "menage": {"revenu_rga": 35000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-22T10:00:00Z"}',
   NOW() - INTERVAL '32 days', NOW() - INTERVAL '18 days'),

  -- ===== AUTRES COMMUNES =====
  -- Buzançais
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111110', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "7 rue du Commerce", "commune": "36031", "code_region": "24", "epci": "243600327", "coordonnees": "46.8833,1.4167", "clef_ban": "36031_0001", "commune_denormandie": false, "annee_de_construction": "1967", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T14:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '11 days'),

  -- Levroux
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111111', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Levroux", "code_departement": "36", "adresse": "1 place de la Collégiale", "commune": "36093", "code_region": "24", "epci": "200030385", "coordonnees": "47.0000,1.6167", "clef_ban": "36093_0001", "commune_denormandie": false, "annee_de_construction": "1952", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 7500, "sinistres": "endommagée"}, "menage": {"revenu_rga": 9500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-30T09:00:00Z"}',
   NOW() - INTERVAL '26 days', NOW() - INTERVAL '16 days'),

  -- Valençay
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111112', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Valençay", "code_departement": "36", "adresse": "4 rue du Château", "commune": "36228", "code_region": "24", "epci": "200030369", "coordonnees": "47.1500,1.5667", "clef_ban": "36228_0001", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 42000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-25T15:00:00Z"}',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '25 days'),

  -- ===== PARCOURS POUR DEMANDES EN_ATTENTE (8 demandeurs) =====
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111113', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Marcel", "code_departement": "36", "adresse": "18 rue des Lilas", "commune": "36200", "code_region": "24", "epci": "243600327", "coordonnees": "46.8000,1.5000", "clef_ban": "36200_0001", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 23000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-05T10:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111114', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "25 avenue de la Liberté", "commune": "36005", "code_region": "24", "epci": "243600327", "coordonnees": "46.7500,1.8333", "clef_ban": "36005_0001", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 4500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 31000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-07T14:30:00Z"}',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days'),

  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111115', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Montierchaume", "code_departement": "36", "adresse": "3 impasse du Clos", "commune": "36126", "code_region": "24", "epci": "243600327", "coordonnees": "46.8500,1.7500", "clef_ban": "36126_0001", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 48000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-09T09:00:00Z"}',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

  ('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111116', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Luçay-le-Mâle", "code_departement": "36", "adresse": "9 chemin des Vignes", "commune": "36100", "code_region": "24", "epci": "200030369", "coordonnees": "47.1333,1.4500", "clef_ban": "36100_0001", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 15500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-11T11:00:00Z"}',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '14 days'),

  ('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111117', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Écueillé", "code_departement": "36", "adresse": "14 rue du Château", "commune": "36068", "code_region": "24", "epci": "200030369", "coordonnees": "47.0833,1.3500", "clef_ban": "36068_0001", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 2000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 27500, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-13T08:30:00Z"}',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

  ('22222222-2222-2222-2222-222222222218', '11111111-1111-1111-1111-111111111118', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "42 rue de Belle Isle", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8120,1.6880", "clef_ban": "36044_0006", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 12500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-14T15:00:00Z"}',
   NOW() - INTERVAL '1 day', NOW()),

  ('22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111119', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "56 rue Ledru-Rollin", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9470,1.9820", "clef_ban": "36088_0005", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 9000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T10:00:00Z"}',
   NOW() - INTERVAL '12 hours', NOW() - INTERVAL '9 days'),

  ('22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111120', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "12 avenue Gambetta", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6320,1.0680", "clef_ban": "36018_0004", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 36000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T16:00:00Z"}',
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '3 days'),

  -- ===== PARCOURS POUR DEMANDES REFUSÉES - LOGEMENT_NON_ELIGIBLE (6 demandeurs) =====
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111121', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Chabris", "code_departement": "36", "adresse": "10 rue de la Loire", "commune": "36034", "code_region": "24", "epci": "200030369", "coordonnees": "47.2500,1.6500", "clef_ban": "36034_0001", "commune_denormandie": false, "annee_de_construction": "2005", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": false}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 65000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T10:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),

  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111122', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Vatan", "code_departement": "36", "adresse": "6 place du Marché", "commune": "36230", "code_region": "24", "epci": "200030385", "coordonnees": "47.0667,1.8000", "clef_ban": "36230_0001", "commune_denormandie": false, "annee_de_construction": "2010", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": true, "proprietaire_occupant": false}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": false, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 28000, "personnes": 2}, "vous": {"proprietaire_condition": false, "proprietaire_occupant_rga": false}, "simulatedAt": "2024-11-20T14:00:00Z"}',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'),

  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111123', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Reuilly", "code_departement": "36", "adresse": "2 avenue de la Gare", "commune": "36171", "code_region": "24", "epci": "200030385", "coordonnees": "47.0833,2.0500", "clef_ban": "36171_0001", "commune_denormandie": false, "annee_de_construction": "2015", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "appartement", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 55000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-15T09:00:00Z"}',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '43 days'),

  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111124', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châtillon-sur-Indre", "code_departement": "36", "adresse": "8 rue des Remparts", "commune": "36045", "code_region": "24", "epci": "200030369", "coordonnees": "46.9833,1.1667", "clef_ban": "36045_0001", "commune_denormandie": false, "annee_de_construction": "1998", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": false}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 72000, "personnes": 5}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-10T11:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days'),

  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111125', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "100 avenue de Verdun", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8050,1.6950", "clef_ban": "36044_0007", "commune_denormandie": false, "annee_de_construction": "2008", "rnb": "", "niveaux": 3, "zone_dexposition": "faible", "type": "appartement", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 43000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-25T16:00:00Z"}',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days'),

  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111126', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "78 boulevard Stalingrad", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9550,1.9900", "clef_ban": "36088_0006", "commune_denormandie": false, "annee_de_construction": "2012", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": false}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 38000, "personnes": 3}, "vous": {"proprietaire_condition": false, "proprietaire_occupant_rga": false}, "simulatedAt": "2024-12-05T13:00:00Z"}',
   NOW() - INTERVAL '28 days', NOW() - INTERVAL '26 days'),

  -- ===== PARCOURS POUR DEMANDES REFUSÉES - ACCOMPAGNEMENT_REFUSE (4 demandeurs) =====
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111127', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "35 rue Grande", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5870,1.5180", "clef_ban": "36006_0004", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-10T10:00:00Z"}',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days'),

  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111128', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "21 rue de la Promenade", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5820,1.9780", "clef_ban": "36046_0003", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 5500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 29000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-18T15:00:00Z"}',
   NOW() - INTERVAL '42 days', NOW() - INTERVAL '40 days'),

  ('22222222-2222-2222-2222-222222222229', '11111111-1111-1111-1111-111111111129', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "50 rue Victor Hugo", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6280,1.0720", "clef_ban": "36018_0005", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-02T11:00:00Z"}',
   NOW() - INTERVAL '32 days', NOW() - INTERVAL '30 days'),

  ('22222222-2222-2222-2222-222222222230', '11111111-1111-1111-1111-111111111130', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "15 rue de la Fontaine", "commune": "36031", "code_region": "24", "epci": "243600327", "coordonnees": "46.8850,1.4200", "clef_ban": "36031_0002", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 3000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 14000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-28T14:00:00Z"}',
   NOW() - INTERVAL '38 days', NOW() - INTERVAL '36 days')
ON CONFLICT (id) DO NOTHING;

-- ===== DOSSIERS ARCHIVÉS (3 parcours) =====
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at, archived_at, archive_reason)
VALUES
  -- Archivé à l'étape diagnostic (Châteauroux)
  ('22222222-2222-2222-2222-222222222241', '11111111-1111-1111-1111-111111111171', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "5 rue des Peupliers", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8190,1.6870", "clef_ban": "36044_0008", "commune_denormandie": false, "annee_de_construction": "1971", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-09-15T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days',
   NOW() - INTERVAL '10 days', 'Le demandeur ne souhaite plus poursuivre les travaux'),

  -- Archivé à l'étape devis (Issoudun)
  ('22222222-2222-2222-2222-222222222242', '11111111-1111-1111-1111-111111111172', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "30 rue du Pont", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9490,1.9810", "clef_ban": "36088_0007", "commune_denormandie": false, "annee_de_construction": "1966", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 8000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 25000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-08-20T14:00:00Z"}',
   NOW() - INTERVAL '120 days', NOW() - INTERVAL '45 days',
   NOW() - INTERVAL '5 days', 'Dossier inactif depuis plus de 3 mois'),

  -- Archivé à l'étape factures (Le Blanc)
  ('22222222-2222-2222-2222-222222222243', '11111111-1111-1111-1111-111111111173', 'factures', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "18 rue de la Paix", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6340,1.0690", "clef_ban": "36018_0006", "commune_denormandie": false, "annee_de_construction": "1959", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_avant_juillet_2025": true, "indemnise_avant_juillet_2015": false, "indemnise_montant_indemnite": 11000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 16500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-07-10T09:00:00Z"}',
   NOW() - INTERVAL '150 days', NOW() - INTERVAL '30 days',
   NOW() - INTERVAL '2 days', 'Vente du logement en cours')
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT COUNT(*) as parcours_crees FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%';
