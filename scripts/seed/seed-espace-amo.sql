-- =============================================================================
-- SCRIPT DE SEED POUR L'ESPACE AMO (Backoffice)
-- =============================================================================
-- Ce script crée des données de test pour tester toutes les fonctionnalités
-- de l'espace AMO : Accueil, Dossiers, Statistiques
--
-- À exécuter étape par étape dans psql ou Drizzle Studio
-- =============================================================================

-- =============================================================================
-- ÉTAPE 0 : SELECTION ID AMO
-- =============================================================================
SELECT id, nom FROM entreprises_amo;
-- ID de l'entreprise AMO utilisé : XXXXXXXXXXXXXXXXXXX
-- Pour changer l'ID, faire un rechercher/remplacer de cette valeur dans tout le fichier

-- =============================================================================
-- ÉTAPE 1 : NETTOYAGE (optionnel)
-- Supprimer les anciennes données de test si existantes
-- =============================================================================
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%';

-- =============================================================================
-- ÉTAPE 2 : Créer les utilisateurs de test (40 utilisateurs)
-- =============================================================================
INSERT INTO users (id, fc_id, email, prenom, nom, last_login, created_at, updated_at)
VALUES
  -- Dossiers suivis LOGEMENT_ELIGIBLE (12 utilisateurs)
  ('11111111-1111-1111-1111-111111111101', 'fc-test-101', 'marie.dupont@test.fr', 'Marie', 'Dupont', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102', 'fc-test-102', 'jean.martin@test.fr', 'Jean', 'Martin', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103', 'fc-test-103', 'sophie.bernard@test.fr', 'Sophie', 'Bernard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111104', 'fc-test-104', 'pierre.durand@test.fr', 'Pierre', 'Durand', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111105', 'fc-test-105', 'claire.moreau@test.fr', 'Claire', 'Moreau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111106', 'fc-test-106', 'lucas.petit@test.fr', 'Lucas', 'Petit', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111107', 'fc-test-107', 'emma.robert@test.fr', 'Emma', 'Robert', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111108', 'fc-test-108', 'hugo.richard@test.fr', 'Hugo', 'Richard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111109', 'fc-test-109', 'alice.leroy@test.fr', 'Alice', 'Leroy', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111110', 'fc-test-110', 'thomas.garcia@test.fr', 'Thomas', 'Garcia', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'fc-test-111', 'lea.martinez@test.fr', 'Léa', 'Martinez', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111112', 'fc-test-112', 'nathan.lopez@test.fr', 'Nathan', 'Lopez', NOW(), NOW(), NOW()),
  -- Demandes EN_ATTENTE (8 utilisateurs)
  ('11111111-1111-1111-1111-111111111113', 'fc-test-113', 'camille.roux@test.fr', 'Camille', 'Roux', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111114', 'fc-test-114', 'antoine.fournier@test.fr', 'Antoine', 'Fournier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111115', 'fc-test-115', 'julie.morel@test.fr', 'Julie', 'Morel', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111116', 'fc-test-116', 'maxime.girard@test.fr', 'Maxime', 'Girard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111117', 'fc-test-117', 'laura.bonnet@test.fr', 'Laura', 'Bonnet', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111118', 'fc-test-118', 'romain.lambert@test.fr', 'Romain', 'Lambert', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111119', 'fc-test-119', 'chloe.fontaine@test.fr', 'Chloé', 'Fontaine', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111120', 'fc-test-120', 'florian.rousseau@test.fr', 'Florian', 'Rousseau', NOW(), NOW(), NOW()),
  -- Demandes REFUSÉES - LOGEMENT_NON_ELIGIBLE (6 utilisateurs)
  ('11111111-1111-1111-1111-111111111121', 'fc-test-121', 'pauline.mercier@test.fr', 'Pauline', 'Mercier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111122', 'fc-test-122', 'kevin.blanc@test.fr', 'Kévin', 'Blanc', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111123', 'fc-test-123', 'manon.guerin@test.fr', 'Manon', 'Guérin', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111124', 'fc-test-124', 'valentin.faure@test.fr', 'Valentin', 'Faure', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111125', 'fc-test-125', 'oceane.andre@test.fr', 'Océane', 'André', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111126', 'fc-test-126', 'alexandre.lefebvre@test.fr', 'Alexandre', 'Lefebvre', NOW(), NOW(), NOW()),
  -- Demandes REFUSÉES - ACCOMPAGNEMENT_REFUSE (4 utilisateurs)
  ('11111111-1111-1111-1111-111111111127', 'fc-test-127', 'sarah.lemoine@test.fr', 'Sarah', 'Lemoine', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111128', 'fc-test-128', 'quentin.chevalier@test.fr', 'Quentin', 'Chevalier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111129', 'fc-test-129', 'justine.gautier@test.fr', 'Justine', 'Gautier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111130', 'fc-test-130', 'nicolas.muller@test.fr', 'Nicolas', 'Muller', NOW(), NOW(), NOW()),
  -- Utilisateurs supplémentaires pour plus de variété (10 utilisateurs)
  ('11111111-1111-1111-1111-111111111131', 'fc-test-131', 'amelie.simon@test.fr', 'Amélie', 'Simon', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111132', 'fc-test-132', 'baptiste.laurent@test.fr', 'Baptiste', 'Laurent', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111133', 'fc-test-133', 'marine.michel@test.fr', 'Marine', 'Michel', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111134', 'fc-test-134', 'adrien.lefevre@test.fr', 'Adrien', 'Lefèvre', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111135', 'fc-test-135', 'elise.roux@test.fr', 'Élise', 'Roux', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111136', 'fc-test-136', 'mathieu.david@test.fr', 'Mathieu', 'David', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111137', 'fc-test-137', 'caroline.bertrand@test.fr', 'Caroline', 'Bertrand', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111138', 'fc-test-138', 'jeremy.morel@test.fr', 'Jérémy', 'Morel', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111139', 'fc-test-139', 'elodie.fournier@test.fr', 'Élodie', 'Fournier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111140', 'fc-test-140', 'guillaume.girard@test.fr', 'Guillaume', 'Girard', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 3 : Créer les parcours de prévention
-- Répartition : eligibilite(8), diagnostic(10), devis(7), factures(5), choix_amo(10)
-- Revenus variés : très modestes (<15000), modestes (15000-25000), intermédiaires (25000-40000), aisés (>40000)
-- Plusieurs demandeurs par commune (Châteauroux x5, Issoudun x4, Le Blanc x3, etc.)
-- =============================================================================
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- ===== CHÂTEAUROUX (5 demandeurs) =====
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "12 rue de la République", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T10:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW()),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "45 avenue de la Gare", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8100,1.6900", "clef_ban": "36044_0002", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 5000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 12000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-15T14:30:00Z"}',
   NOW() - INTERVAL '25 days', NOW()),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "8 rue du Château", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8200,1.6750", "clef_ban": "36044_0003", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 32000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-20T09:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW()),
  ('22222222-2222-2222-2222-222222222231', '11111111-1111-1111-1111-111111111131', 'factures', 'valide',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "22 boulevard de Cluis", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8150,1.6800", "clef_ban": "36044_0004", "commune_denormandie": false, "annee_de_construction": "1990", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 8000, "sinistres": "saine"}, "menage": {"revenu_rga": 52000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-01T11:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW()),
  ('22222222-2222-2222-2222-222222222232', '11111111-1111-1111-1111-111111111132', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "15 impasse des Roses", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8180,1.6820", "clef_ban": "36044_0005", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-10T08:00:00Z"}',
   NOW() - INTERVAL '5 days', NOW()),

  -- ===== ISSOUDUN (4 demandeurs) =====
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "5 avenue Jean Jaurès", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9500,1.9833", "clef_ban": "36088_0001", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 14500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-25T16:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW()),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111105', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "18 rue de la Liberté", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9480,1.9800", "clef_ban": "36088_0002", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 3500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 28000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-05T10:30:00Z"}',
   NOW() - INTERVAL '18 days', NOW()),
  ('22222222-2222-2222-2222-222222222233', '11111111-1111-1111-1111-111111111133', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "33 place du Marché", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9520,1.9850", "clef_ban": "36088_0003", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-01T14:00:00Z"}',
   NOW() - INTERVAL '45 days', NOW()),
  ('22222222-2222-2222-2222-222222222234', '11111111-1111-1111-1111-111111111134', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "7 rue des Acacias", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9460,1.9780", "clef_ban": "36088_0004", "commune_denormandie": false, "annee_de_construction": "1995", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 45000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-12T09:30:00Z"}',
   NOW() - INTERVAL '3 days', NOW()),

  -- ===== LE BLANC (3 demandeurs) =====
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111106', 'factures', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "8 place de la Mairie", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6333,1.0667", "clef_ban": "36018_0001", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 12000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 16000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-15T11:00:00Z"}',
   NOW() - INTERVAL '55 days', NOW()),
  ('22222222-2222-2222-2222-222222222235', '11111111-1111-1111-1111-111111111135', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "25 rue du Commerce", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6350,1.0700", "clef_ban": "36018_0002", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 11000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-10T15:00:00Z"}',
   NOW() - INTERVAL '15 days', NOW()),
  ('22222222-2222-2222-2222-222222222236', '11111111-1111-1111-1111-111111111136', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "4 impasse du Moulin", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6300,1.0650", "clef_ban": "36018_0003", "commune_denormandie": false, "annee_de_construction": "1962", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 38000, "personnes": 5}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-20T08:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW()),

  -- ===== ARGENTON-SUR-CREUSE (3 demandeurs) =====
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111107', 'diagnostic', 'en_instruction',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "22 rue du Moulin", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5833,1.5167", "clef_ban": "36006_0001", "commune_denormandie": false, "annee_de_construction": "1955", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 21000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-10T13:00:00Z"}',
   NOW() - INTERVAL '35 days', NOW()),
  ('22222222-2222-2222-2222-222222222237', '11111111-1111-1111-1111-111111111137', 'devis', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "11 avenue de la Gare", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5850,1.5200", "clef_ban": "36006_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 6000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 13500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-28T10:00:00Z"}',
   NOW() - INTERVAL '28 days', NOW()),
  ('22222222-2222-2222-2222-222222222238', '11111111-1111-1111-1111-111111111138', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "6 rue des Tilleuls", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5800,1.5150", "clef_ban": "36006_0003", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 26000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-08T14:00:00Z"}',
   NOW() - INTERVAL '7 days', NOW()),

  -- ===== LA CHÂTRE (2 demandeurs) =====
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111108', 'factures', 'en_instruction',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "3 boulevard George Sand", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5833,1.9833", "clef_ban": "36046_0001", "commune_denormandie": false, "annee_de_construction": "1960", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 15000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 24000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-09-20T09:00:00Z"}',
   NOW() - INTERVAL '70 days', NOW()),
  ('22222222-2222-2222-2222-222222222239', '11111111-1111-1111-1111-111111111139', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "17 rue Nationale", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5850,1.9800", "clef_ban": "36046_0002", "commune_denormandie": false, "annee_de_construction": "1988", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 58000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-15T11:30:00Z"}',
   NOW() - INTERVAL '12 days', NOW()),

  -- ===== DÉOLS (2 demandeurs) =====
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111109', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "15 rue de l''Abbaye", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8333,1.7000", "clef_ban": "36063_0001", "commune_denormandie": false, "annee_de_construction": "1973", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 17500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-08T16:00:00Z"}',
   NOW() - INTERVAL '17 days', NOW()),
  ('22222222-2222-2222-2222-222222222240', '11111111-1111-1111-1111-111111111140', 'devis', 'todo',
   '{"logement": {"commune_nom": "Déols", "code_departement": "36", "adresse": "28 avenue Marcel Dassault", "commune": "36063", "code_region": "24", "epci": "243600327", "coordonnees": "46.8350,1.7050", "clef_ban": "36063_0002", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 4000, "sinistres": "saine"}, "menage": {"revenu_rga": 35000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-22T10:00:00Z"}',
   NOW() - INTERVAL '32 days', NOW()),

  -- ===== AUTRES COMMUNES (1-2 demandeurs chacune) =====
  -- Buzançais
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111110', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "7 rue du Commerce", "commune": "36031", "code_region": "24", "epci": "243600327", "coordonnees": "46.8833,1.4167", "clef_ban": "36031_0001", "commune_denormandie": false, "annee_de_construction": "1967", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T14:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW()),
  -- Levroux
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111111', 'eligibilite', 'en_instruction',
   '{"logement": {"commune_nom": "Levroux", "code_departement": "36", "adresse": "1 place de la Collégiale", "commune": "36093", "code_region": "24", "epci": "200030385", "coordonnees": "47.0000,1.6167", "clef_ban": "36093_0001", "commune_denormandie": false, "annee_de_construction": "1952", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 7500, "sinistres": "endommagée"}, "menage": {"revenu_rga": 9500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-30T09:00:00Z"}',
   NOW() - INTERVAL '26 days', NOW()),
  -- Valençay
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111112', 'devis', 'en_instruction',
   '{"logement": {"commune_nom": "Valençay", "code_departement": "36", "adresse": "4 rue du Château", "commune": "36228", "code_region": "24", "epci": "200030369", "coordonnees": "47.1500,1.5667", "clef_ban": "36228_0001", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 42000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-10-25T15:00:00Z"}',
   NOW() - INTERVAL '50 days', NOW()),

  -- ===== PARCOURS POUR DEMANDES EN_ATTENTE (8 demandeurs) =====
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111113', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Saint-Marcel", "code_departement": "36", "adresse": "18 rue des Lilas", "commune": "36200", "code_region": "24", "epci": "243600327", "coordonnees": "46.8000,1.5000", "clef_ban": "36200_0001", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 23000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-05T10:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW()),
  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111114', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Ardentes", "code_departement": "36", "adresse": "25 avenue de la Liberté", "commune": "36005", "code_region": "24", "epci": "243600327", "coordonnees": "46.7500,1.8333", "clef_ban": "36005_0001", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 2, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 4500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 31000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-07T14:30:00Z"}',
   NOW() - INTERVAL '8 days', NOW()),
  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111115', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Montierchaume", "code_departement": "36", "adresse": "3 impasse du Clos", "commune": "36126", "code_region": "24", "epci": "243600327", "coordonnees": "46.8500,1.7500", "clef_ban": "36126_0001", "commune_denormandie": false, "annee_de_construction": "1992", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 48000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-09T09:00:00Z"}',
   NOW() - INTERVAL '6 days', NOW()),
  ('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111116', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Luçay-le-Mâle", "code_departement": "36", "adresse": "9 chemin des Vignes", "commune": "36100", "code_region": "24", "epci": "200030369", "coordonnees": "47.1333,1.4500", "clef_ban": "36100_0001", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 15500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-11T11:00:00Z"}',
   NOW() - INTERVAL '4 days', NOW()),
  ('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111117', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Écueillé", "code_departement": "36", "adresse": "14 rue du Château", "commune": "36068", "code_region": "24", "epci": "200030369", "coordonnees": "47.0833,1.3500", "clef_ban": "36068_0001", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 2000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 27500, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-13T08:30:00Z"}',
   NOW() - INTERVAL '2 days', NOW()),
  ('22222222-2222-2222-2222-222222222218', '11111111-1111-1111-1111-111111111118', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "42 rue de Belle Isle", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8120,1.6880", "clef_ban": "36044_0006", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 12500, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-14T15:00:00Z"}',
   NOW() - INTERVAL '1 day', NOW()),
  ('22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111119', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "56 rue Ledru-Rollin", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9470,1.9820", "clef_ban": "36088_0005", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 9000, "sinistres": "endommagée"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T10:00:00Z"}',
   NOW() - INTERVAL '12 hours', NOW()),
  ('22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111120', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "12 avenue Gambetta", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6320,1.0680", "clef_ban": "36018_0004", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 36000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-15T16:00:00Z"}',
   NOW() - INTERVAL '6 hours', NOW()),

  -- ===== PARCOURS POUR DEMANDES REFUSÉES - LOGEMENT_NON_ELIGIBLE (6 demandeurs) =====
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111121', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Chabris", "code_departement": "36", "adresse": "10 rue de la Loire", "commune": "36034", "code_region": "24", "epci": "200030369", "coordonnees": "47.2500,1.6500", "clef_ban": "36034_0001", "commune_denormandie": false, "annee_de_construction": "2005", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": false}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 65000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-01T10:00:00Z"}',
   NOW() - INTERVAL '30 days', NOW()),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111122', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Vatan", "code_departement": "36", "adresse": "6 place du Marché", "commune": "36230", "code_region": "24", "epci": "200030385", "coordonnees": "47.0667,1.8000", "clef_ban": "36230_0001", "commune_denormandie": false, "annee_de_construction": "2010", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": true, "proprietaire_occupant": false}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": false, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 28000, "personnes": 2}, "vous": {"proprietaire_condition": false, "proprietaire_occupant_rga": false}, "simulatedAt": "2024-11-20T14:00:00Z"}',
   NOW() - INTERVAL '40 days', NOW()),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111123', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Reuilly", "code_departement": "36", "adresse": "2 avenue de la Gare", "commune": "36171", "code_region": "24", "epci": "200030385", "coordonnees": "47.0833,2.0500", "clef_ban": "36171_0001", "commune_denormandie": false, "annee_de_construction": "2015", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "appartement", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 55000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-15T09:00:00Z"}',
   NOW() - INTERVAL '45 days', NOW()),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111124', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châtillon-sur-Indre", "code_departement": "36", "adresse": "8 rue des Remparts", "commune": "36045", "code_region": "24", "epci": "200030369", "coordonnees": "46.9833,1.1667", "clef_ban": "36045_0001", "commune_denormandie": false, "annee_de_construction": "1998", "rnb": "", "niveaux": 1, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": false}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 72000, "personnes": 5}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-10T11:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW()),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111125', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "100 avenue de Verdun", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8050,1.6950", "clef_ban": "36044_0007", "commune_denormandie": false, "annee_de_construction": "2008", "rnb": "", "niveaux": 3, "zone_dexposition": "faible", "type": "appartement", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 43000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-25T16:00:00Z"}',
   NOW() - INTERVAL '35 days', NOW()),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111126', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Issoudun", "code_departement": "36", "adresse": "78 boulevard Stalingrad", "commune": "36088", "code_region": "24", "epci": "243600319", "coordonnees": "46.9550,1.9900", "clef_ban": "36088_0006", "commune_denormandie": false, "annee_de_construction": "2012", "rnb": "", "niveaux": 2, "zone_dexposition": "faible", "type": "maison", "mitoyen": false, "proprietaire_occupant": false}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 38000, "personnes": 3}, "vous": {"proprietaire_condition": false, "proprietaire_occupant_rga": false}, "simulatedAt": "2024-12-05T13:00:00Z"}',
   NOW() - INTERVAL '28 days', NOW()),

  -- ===== PARCOURS POUR DEMANDES REFUSÉES - ACCOMPAGNEMENT_REFUSE (4 demandeurs) =====
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111127', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Argenton-sur-Creuse", "code_departement": "36", "adresse": "35 rue Grande", "commune": "36006", "code_region": "24", "epci": "243600350", "coordonnees": "46.5870,1.5180", "clef_ban": "36006_0004", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 22000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-10T10:00:00Z"}',
   NOW() - INTERVAL '50 days', NOW()),
  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111128', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "La Châtre", "code_departement": "36", "adresse": "21 rue de la Promenade", "commune": "36046", "code_region": "24", "epci": "243600368", "coordonnees": "46.5820,1.9780", "clef_ban": "36046_0003", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 2, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 5500, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 29000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-18T15:00:00Z"}',
   NOW() - INTERVAL '42 days', NOW()),
  ('22222222-2222-2222-2222-222222222229', '11111111-1111-1111-1111-111111111129', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Le Blanc", "code_departement": "36", "adresse": "50 rue Victor Hugo", "commune": "36018", "code_region": "24", "epci": "243600343", "coordonnees": "46.6280,1.0720", "clef_ban": "36018_0005", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": true, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 17000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-12-02T11:00:00Z"}',
   NOW() - INTERVAL '32 days', NOW()),
  ('22222222-2222-2222-2222-222222222230', '11111111-1111-1111-1111-111111111130', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Buzançais", "code_departement": "36", "adresse": "15 rue de la Fontaine", "commune": "36031", "code_region": "24", "epci": "243600327", "coordonnees": "46.8850,1.4200", "clef_ban": "36031_0002", "commune_denormandie": false, "annee_de_construction": "1958", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": true, "indemnise_montant_indemnite": 3000, "sinistres": "très peu endommagée"}, "menage": {"revenu_rga": 14000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2024-11-28T14:00:00Z"}',
   NOW() - INTERVAL '38 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 4 : Créer les validations AMO
-- Statuts : en_attente (8), logement_eligible (12), logement_non_eligible (6), accompagnement_refuse (4)
-- Inclut maintenant : user_telephone et adresse_logement pour les détails de demande
-- =============================================================================
INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, user_email, user_telephone, adresse_logement, commentaire, validee_at, choisie_at, created_at, updated_at)
VALUES
  -- ===== LOGEMENT_ELIGIBLE (12 dossiers suivis) =====
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Marie', 'Dupont', 'marie.dupont@test.fr', '06 12 34 56 78', '12 rue de la République, 36000 Châteauroux', NULL, NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Jean', 'Martin', 'jean.martin@test.fr', '06 23 45 67 89', '45 avenue de la Gare, 36000 Châteauroux', NULL, NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Sophie', 'Bernard', 'sophie.bernard@test.fr', '06 34 56 78 90', '8 rue du Château, 36000 Châteauroux', NULL, NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Pierre', 'Durand', 'pierre.durand@test.fr', '06 45 67 89 01', '5 avenue Jean Jaurès, 36100 Issoudun', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW()),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222205', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Claire', 'Moreau', 'claire.moreau@test.fr', '06 56 78 90 12', '18 rue de la Liberté, 36100 Issoudun', NULL, NOW() - INTERVAL '16 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW()),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222206', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Lucas', 'Petit', 'lucas.petit@test.fr', '06 67 89 01 23', '8 place de la Mairie, 36300 Le Blanc', NULL, NOW() - INTERVAL '53 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', NOW()),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222207', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Emma', 'Robert', 'emma.robert@test.fr', '06 78 90 12 34', '22 rue du Moulin, 36200 Argenton-sur-Creuse', NULL, NOW() - INTERVAL '33 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW()),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222208', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Hugo', 'Richard', 'hugo.richard@test.fr', '06 89 01 23 45', '3 boulevard George Sand, 36400 La Châtre', NULL, NOW() - INTERVAL '68 days', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days', NOW()),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222209', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Alice', 'Leroy', 'alice.leroy@test.fr', '06 90 12 34 56', '15 rue de l''Abbaye, 36130 Déols', NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', NOW()),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222210', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Thomas', 'Garcia', 'thomas.garcia@test.fr', '06 01 23 45 67', '7 rue du Commerce, 36500 Buzançais', NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222211', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Léa', 'Martinez', 'lea.martinez@test.fr', '06 11 22 33 44', '1 place de la Collégiale, 36110 Levroux', NULL, NOW() - INTERVAL '24 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', NOW()),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222212', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Nathan', 'Lopez', 'nathan.lopez@test.fr', '06 22 33 44 55', '4 rue du Château, 36600 Valençay', NULL, NOW() - INTERVAL '48 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW()),
  -- Dossiers supplémentaires LOGEMENT_ELIGIBLE
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222231', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Amélie', 'Simon', 'amelie.simon@test.fr', '06 33 44 55 66', '22 boulevard de Cluis, 36000 Châteauroux', NULL, NOW() - INTERVAL '58 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW()),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222233', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Marine', 'Michel', 'marine.michel@test.fr', '06 44 55 66 77', '33 place du Marché, 36100 Issoudun', NULL, NOW() - INTERVAL '43 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW()),
  ('33333333-3333-3333-3333-333333333335', '22222222-2222-2222-2222-222222222235', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Élise', 'Roux', 'elise.roux@test.fr', '06 55 66 77 88', '25 rue du Commerce, 36300 Le Blanc', NULL, NOW() - INTERVAL '13 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW()),
  ('33333333-3333-3333-3333-333333333336', '22222222-2222-2222-2222-222222222236', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Mathieu', 'David', 'mathieu.david@test.fr', '06 66 77 88 99', '4 impasse du Moulin, 36300 Le Blanc', NULL, NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('33333333-3333-3333-3333-333333333337', '22222222-2222-2222-2222-222222222237', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Caroline', 'Bertrand', 'caroline.bertrand@test.fr', '06 77 88 99 00', '11 avenue de la Gare, 36200 Argenton-sur-Creuse', NULL, NOW() - INTERVAL '26 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW()),
  ('33333333-3333-3333-3333-333333333339', '22222222-2222-2222-2222-222222222239', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Élodie', 'Fournier', 'elodie.fournier@test.fr', '06 88 99 00 11', '17 rue Nationale, 36400 La Châtre', NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW()),
  ('33333333-3333-3333-3333-333333333340', '22222222-2222-2222-2222-222222222240', 'XXXXXXXXXXXXXXXXXXX', 'logement_eligible', 'Guillaume', 'Girard', 'guillaume.girard@test.fr', '06 99 00 11 22', '28 avenue Marcel Dassault, 36130 Déols', NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', NOW()),

  -- ===== EN_ATTENTE (8 demandes en attente) =====
  ('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222213', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Camille', 'Roux', 'camille.roux@test.fr', '06 10 20 30 40', '18 rue des Lilas, 36000 Saint-Marcel', NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222214', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Antoine', 'Fournier', 'antoine.fournier@test.fr', '06 20 30 40 50', '25 avenue de la Liberté, 36120 Ardentes', NULL, NULL, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW()),
  ('33333333-3333-3333-3333-333333333315', '22222222-2222-2222-2222-222222222215', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Julie', 'Morel', 'julie.morel@test.fr', '06 30 40 50 60', '3 impasse du Clos, 36110 Montierchaume', NULL, NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW()),
  ('33333333-3333-3333-3333-333333333316', '22222222-2222-2222-2222-222222222216', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Maxime', 'Girard', 'maxime.girard@test.fr', '06 40 50 60 70', '9 chemin des Vignes, 36360 Luçay-le-Mâle', NULL, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW()),
  ('33333333-3333-3333-3333-333333333317', '22222222-2222-2222-2222-222222222217', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Laura', 'Bonnet', 'laura.bonnet@test.fr', '06 50 60 70 80', '14 rue du Château, 36240 Écueillé', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()),
  ('33333333-3333-3333-3333-333333333318', '22222222-2222-2222-2222-222222222218', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Romain', 'Lambert', 'romain.lambert@test.fr', '06 60 70 80 90', '42 rue de Belle Isle, 36000 Châteauroux', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()),
  ('33333333-3333-3333-3333-333333333319', '22222222-2222-2222-2222-222222222219', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Chloé', 'Fontaine', 'chloe.fontaine@test.fr', '06 70 80 90 01', '56 rue Ledru-Rollin, 36100 Issoudun', NULL, NULL, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', NOW()),
  ('33333333-3333-3333-3333-333333333320', '22222222-2222-2222-2222-222222222220', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Florian', 'Rousseau', 'florian.rousseau@test.fr', '06 80 90 01 12', '12 avenue Gambetta, 36300 Le Blanc', NULL, NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', NOW()),
  -- Demandes en attente supplémentaires
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222232', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Baptiste', 'Laurent', 'baptiste.laurent@test.fr', '06 91 02 13 24', '15 impasse des Roses, 36000 Châteauroux', NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW()),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222234', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Adrien', 'Lefèvre', 'adrien.lefevre@test.fr', '06 02 13 24 35', '7 rue des Acacias, 36100 Issoudun', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()),
  ('33333333-3333-3333-3333-333333333338', '22222222-2222-2222-2222-222222222238', 'XXXXXXXXXXXXXXXXXXX', 'en_attente', 'Jérémy', 'Morel', 'jeremy.morel@test.fr', '06 13 24 35 46', '6 rue des Tilleuls, 36200 Argenton-sur-Creuse', NULL, NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW()),

  -- ===== LOGEMENT_NON_ELIGIBLE (6 demandes refusées) =====
  ('33333333-3333-3333-3333-333333333321', '22222222-2222-2222-2222-222222222221', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Pauline', 'Mercier', 'pauline.mercier@test.fr', '06 24 35 46 57', '10 rue de la Loire, 36210 Chabris', 'Logement construit après 2000, non éligible au dispositif', NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222222', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Kévin', 'Blanc', 'kevin.blanc@test.fr', '06 35 46 57 68', '6 place du Marché, 36150 Vatan', 'Demandeur non propriétaire occupant', NOW() - INTERVAL '38 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', NOW()),
  ('33333333-3333-3333-3333-333333333323', '22222222-2222-2222-2222-222222222223', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Manon', 'Guérin', 'manon.guerin@test.fr', '06 46 57 68 79', '2 avenue de la Gare, 36260 Reuilly', 'Appartement en étage, non concerné par le RGA', NOW() - INTERVAL '43 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW()),
  ('33333333-3333-3333-3333-333333333324', '22222222-2222-2222-2222-222222222224', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Valentin', 'Faure', 'valentin.faure@test.fr', '06 57 68 79 80', '8 rue des Remparts, 36700 Châtillon-sur-Indre', 'Commune non éligible au dispositif', NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('33333333-3333-3333-3333-333333333325', '22222222-2222-2222-2222-222222222225', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Océane', 'André', 'oceane.andre@test.fr', '06 68 79 80 91', '100 avenue de Verdun, 36000 Châteauroux', 'Appartement, seules les maisons individuelles sont éligibles', NOW() - INTERVAL '33 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW()),
  ('33333333-3333-3333-3333-333333333326', '22222222-2222-2222-2222-222222222226', 'XXXXXXXXXXXXXXXXXXX', 'logement_non_eligible', 'Alexandre', 'Lefebvre', 'alexandre.lefebvre@test.fr', '06 79 80 91 02', '78 boulevard Stalingrad, 36100 Issoudun', 'Demandeur non propriétaire occupant du logement', NOW() - INTERVAL '26 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW()),

  -- ===== ACCOMPAGNEMENT_REFUSE (4 demandes refusées par l'AMO) =====
  ('33333333-3333-3333-3333-333333333327', '22222222-2222-2222-2222-222222222227', 'XXXXXXXXXXXXXXXXXXX', 'accompagnement_refuse', 'Sarah', 'Lemoine', 'sarah.lemoine@test.fr', '06 80 91 02 13', '35 rue Grande, 36200 Argenton-sur-Creuse', 'Zone d''intervention trop éloignée de notre périmètre habituel', NOW() - INTERVAL '48 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', NOW()),
  ('33333333-3333-3333-3333-333333333328', '22222222-2222-2222-2222-222222222228', 'XXXXXXXXXXXXXXXXXXX', 'accompagnement_refuse', 'Quentin', 'Chevalier', 'quentin.chevalier@test.fr', '06 91 02 13 24', '21 rue de la Promenade, 36400 La Châtre', 'Charge de travail actuelle ne nous permet pas de prendre de nouveaux dossiers', NOW() - INTERVAL '40 days', NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days', NOW()),
  ('33333333-3333-3333-3333-333333333329', '22222222-2222-2222-2222-222222222229', 'XXXXXXXXXXXXXXXXXXX', 'accompagnement_refuse', 'Justine', 'Gautier', 'justine.gautier@test.fr', '06 02 13 24 35', '50 rue Victor Hugo, 36300 Le Blanc', 'Conflit d''intérêt avec un autre projet en cours sur ce secteur', NOW() - INTERVAL '30 days', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', NOW()),
  ('33333333-3333-3333-3333-333333333330', '22222222-2222-2222-2222-222222222230', 'XXXXXXXXXXXXXXXXXXX', 'accompagnement_refuse', 'Nicolas', 'Muller', 'nicolas.muller@test.fr', '06 13 24 35 46', '15 rue de la Fontaine, 36500 Buzançais', 'Impossibilité de répondre aux contraintes de délai du demandeur', NOW() - INTERVAL '36 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ÉTAPE 5 : Créer les dossiers DS (Démarches Simplifiées)
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

-- =============================================================================
-- ÉTAPE 6 : VÉRIFICATIONS
-- =============================================================================

-- Résumé des données créées
SELECT 'Utilisateurs créés' as type, COUNT(*) as nombre FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%'
UNION ALL SELECT 'Parcours créés', COUNT(*) FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%'
UNION ALL SELECT 'Validations AMO créées', COUNT(*) FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%'
UNION ALL SELECT 'Dossiers DS créés', COUNT(*) FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';

-- Répartition par statut de validation
SELECT 'Répartition par statut' as info;
SELECT statut, COUNT(*) as nombre FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%' GROUP BY statut ORDER BY nombre DESC;

-- Répartition par étape (dossiers suivis uniquement)
SELECT 'Répartition par étape' as info;
SELECT pp.current_step as etape, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%' AND pav.statut = 'logement_eligible'
GROUP BY pp.current_step ORDER BY nombre DESC;

-- Répartition par commune
SELECT 'Répartition par commune' as info;
SELECT pp.rga_simulation_data->'logement'->>'commune_nom' as commune, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
GROUP BY pp.rga_simulation_data->'logement'->>'commune_nom' ORDER BY nombre DESC;

-- Répartition par tranche de revenus
SELECT 'Répartition par revenus' as info;
SELECT
  CASE
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 15000 THEN 'Très modestes (<15k)'
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 25000 THEN 'Modestes (15-25k)'
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 40000 THEN 'Intermédiaires (25-40k)'
    ELSE 'Aisés (>40k)'
  END as tranche_revenus,
  COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
GROUP BY tranche_revenus ORDER BY nombre DESC;

-- Vérification des données de contact (pour le détail des demandes)
SELECT 'Données de contact présentes' as info;
SELECT
  statut,
  COUNT(*) as total,
  COUNT(user_telephone) as avec_telephone,
  COUNT(adresse_logement) as avec_adresse,
  COUNT(commentaire) as avec_commentaire
FROM parcours_amo_validations
WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%'
GROUP BY statut ORDER BY total DESC;

-- Exemple de demande complète (pour vérifier les données du détail)
SELECT 'Exemple de demande complète' as info;
SELECT
  pav.id,
  pav.user_prenom || ' ' || pav.user_nom as demandeur,
  pav.user_email,
  pav.user_telephone,
  pav.adresse_logement,
  pav.statut,
  pav.commentaire,
  pp.rga_simulation_data->'logement'->>'commune_nom' as commune,
  pp.rga_simulation_data->'logement'->>'annee_de_construction' as annee_construction,
  pp.rga_simulation_data->'menage'->>'personnes' as nb_personnes,
  pp.rga_simulation_data->'menage'->>'revenu_rga' as revenu,
  pp.rga_simulation_data->'rga'->>'sinistres' as etat_maison,
  pp.rga_simulation_data->'logement'->>'rnb' as rnb_id
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id = '33333333-3333-3333-3333-333333333301';

-- =============================================================================
-- SCRIPT DE NETTOYAGE (à exécuter pour supprimer les données de test)
-- =============================================================================
/*
DELETE FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';
DELETE FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%';
DELETE FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%';
DELETE FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%';
*/
