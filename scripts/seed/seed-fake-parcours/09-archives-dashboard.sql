-- =============================================================================
-- 09-ARCHIVES-DASHBOARD : Parcours archivés pour tester le tableau de bord
-- =============================================================================
-- Ajoute ~33 parcours archivés (période courante J-30/J) et ~23 (période
-- précédente J-60/J-30) avec des archive_reason variés.
-- Département 36 (Indre) pour cohérence avec les seeds existants.
-- UUID pattern : 88888888-8888-8888-8888-8888888888XX
-- =============================================================================

-- ===== UTILISATEURS pour les parcours archivés =====
INSERT INTO users (id, fc_id, email, nom, prenom, created_at)
VALUES
  ('77777777-7777-7777-7777-777777777701', 'fc-archive-701', 'sophie.bernard@test.fr', 'Bernard', 'Sophie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777702', 'fc-archive-702', 'lucas.moreau@test.fr', 'Moreau', 'Lucas', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777703', 'fc-archive-703', 'camille.petit@test.fr', 'Petit', 'Camille', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777704', 'fc-archive-704', 'thomas.roux@test.fr', 'Roux', 'Thomas', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777705', 'fc-archive-705', 'julie.fournier@test.fr', 'Fournier', 'Julie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777706', 'fc-archive-706', 'nicolas.girard@test.fr', 'Girard', 'Nicolas', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777707', 'fc-archive-707', 'emma.bonnet@test.fr', 'Bonnet', 'Emma', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777708', 'fc-archive-708', 'antoine.dupont@test.fr', 'Dupont', 'Antoine', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777709', 'fc-archive-709', 'lea.lambert@test.fr', 'Lambert', 'Léa', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777710', 'fc-archive-710', 'maxime.fontaine@test.fr', 'Fontaine', 'Maxime', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777711', 'fc-archive-711', 'chloe.mercier@test.fr', 'Mercier', 'Chloé', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777712', 'fc-archive-712', 'hugo.rousseau@test.fr', 'Rousseau', 'Hugo', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777713', 'fc-archive-713', 'manon.vincent@test.fr', 'Vincent', 'Manon', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777714', 'fc-archive-714', 'paul.lefevre@test.fr', 'Lefèvre', 'Paul', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777715', 'fc-archive-715', 'ines.muller@test.fr', 'Muller', 'Inès', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777716', 'fc-archive-716', 'alexandre.simon@test.fr', 'Simon', 'Alexandre', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777717', 'fc-archive-717', 'clara.laurent@test.fr', 'Laurent', 'Clara', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777718', 'fc-archive-718', 'mathieu.leroy@test.fr', 'Leroy', 'Mathieu', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777719', 'fc-archive-719', 'alice.david@test.fr', 'David', 'Alice', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777720', 'fc-archive-720', 'romain.bertrand@test.fr', 'Bertrand', 'Romain', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777721', 'fc-archive-721', 'oceane.garnier@test.fr', 'Garnier', 'Océane', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777722', 'fc-archive-722', 'valentin.chevalier@test.fr', 'Chevalier', 'Valentin', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777723', 'fc-archive-723', 'sarah.nguyen@test.fr', 'Nguyen', 'Sarah', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777724', 'fc-archive-724', 'adrien.garcia@test.fr', 'Garcia', 'Adrien', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777725', 'fc-archive-725', 'lucie.martinez@test.fr', 'Martinez', 'Lucie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777726', 'fc-archive-726', 'benjamin.lopez@test.fr', 'Lopez', 'Benjamin', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777727', 'fc-archive-727', 'marine.hernandez@test.fr', 'Hernandez', 'Marine', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777728', 'fc-archive-728', 'florian.blanc@test.fr', 'Blanc', 'Florian', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777729', 'fc-archive-729', 'charlotte.guerin@test.fr', 'Guérin', 'Charlotte', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777730', 'fc-archive-730', 'quentin.boyer@test.fr', 'Boyer', 'Quentin', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777731', 'fc-archive-731', 'jean-eudes.dugenoux@test.fr', 'Dugenoux', 'Jean-Eudes', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777732', 'fc-archive-732', 'marie.lefebvre@test.fr', 'Lefebvre', 'Marie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777733', 'fc-archive-733', 'pierre.martin@test.fr', 'Martin', 'Pierre', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777734', 'fc-archive-734', 'nathalie.robin@test.fr', 'Robin', 'Nathalie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777735', 'fc-archive-735', 'jerome.faure@test.fr', 'Faure', 'Jérôme', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777736', 'fc-archive-736', 'stephanie.henry@test.fr', 'Henry', 'Stéphanie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777737', 'fc-archive-737', 'kevin.morel@test.fr', 'Morel', 'Kévin', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777738', 'fc-archive-738', 'aurelie.lemaire@test.fr', 'Lemaire', 'Aurélie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777739', 'fc-archive-739', 'sebastien.masson@test.fr', 'Masson', 'Sébastien', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777740', 'fc-archive-740', 'emilie.duval@test.fr', 'Duval', 'Émilie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777741', 'fc-archive-741', 'david.denis@test.fr', 'Denis', 'David', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777742', 'fc-archive-742', 'isabelle.lemoine@test.fr', 'Lemoine', 'Isabelle', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777743', 'fc-archive-743', 'christophe.durand@test.fr', 'Durand', 'Christophe', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777744', 'fc-archive-744', 'caroline.picard@test.fr', 'Picard', 'Caroline', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777745', 'fc-archive-745', 'mathias.clement@test.fr', 'Clément', 'Mathias', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777746', 'fc-archive-746', 'virginie.perrin@test.fr', 'Perrin', 'Virginie', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777747', 'fc-archive-747', 'franck.renard@test.fr', 'Renard', 'Franck', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777748', 'fc-archive-748', 'audrey.noel@test.fr', 'Noël', 'Audrey', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777749', 'fc-archive-749', 'guillaume.adam@test.fr', 'Adam', 'Guillaume', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777750', 'fc-archive-750', 'sandrine.riviere@test.fr', 'Rivière', 'Sandrine', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777751', 'fc-archive-751', 'yann.marchand@test.fr', 'Marchand', 'Yann', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777752', 'fc-archive-752', 'delphine.colin@test.fr', 'Colin', 'Delphine', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777753', 'fc-archive-753', 'fabien.vidal@test.fr', 'Vidal', 'Fabien', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777754', 'fc-archive-754', 'laetitia.brun@test.fr', 'Brun', 'Laëtitia', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777755', 'fc-archive-755', 'philippe.caron@test.fr', 'Caron', 'Philippe', NOW() - INTERVAL '90 days'),
  ('77777777-7777-7777-7777-777777777756', 'fc-archive-756', 'mylene.gaillard@test.fr', 'Gaillard', 'Mylène', NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Donnée de simulation commune (Châteauroux, département 36)
-- Utilisée pour tous les parcours archivés

-- ===== PÉRIODE COURANTE : J-30 à J (33 archivages) =====
-- Répartition :
--   "Le demandeur n'est pas éligible"               : 18
--   "Reste à charge trop élevé"                     : 7
--   "Le demandeur a abandonné le projet"            : 3
--   "Le demandeur ne donne pas de réponse"          : 2
--   "Fausse déclaration / documents falsifiés"      : 1
--   "Manque la CNI du demandeur"                     : 1
--   "Maison trop endommagée pour les travaux..."     : 1
-- Total = 33

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at, archived_at, archive_reason)
VALUES
  -- "Le demandeur n'est pas éligible" x18 (période courante)
  ('88888888-8888-8888-8888-888888888801', '77777777-7777-7777-7777-777777777701', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "1 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '25 days',
   NOW() - INTERVAL '25 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888802', '77777777-7777-7777-7777-777777777702', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "2 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9002", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '24 days',
   NOW() - INTERVAL '24 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888803', '77777777-7777-7777-7777-777777777703', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "3 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9003", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '22 days',
   NOW() - INTERVAL '22 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888804', '77777777-7777-7777-7777-777777777704', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "4 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9004", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '20 days',
   NOW() - INTERVAL '20 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888805', '77777777-7777-7777-7777-777777777705', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "5 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9005", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '18 days',
   NOW() - INTERVAL '18 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888806', '77777777-7777-7777-7777-777777777706', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "6 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9006", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '16 days',
   NOW() - INTERVAL '16 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888807', '77777777-7777-7777-7777-777777777707', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "7 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9007", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '14 days',
   NOW() - INTERVAL '14 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888808', '77777777-7777-7777-7777-777777777708', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "8 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9008", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '12 days',
   NOW() - INTERVAL '12 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888809', '77777777-7777-7777-7777-777777777709', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "9 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9009", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '10 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888810', '77777777-7777-7777-7777-777777777710', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "10 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9010", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '8 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888811', '77777777-7777-7777-7777-777777777711', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "11 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9011", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '6 days',
   NOW() - INTERVAL '6 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888812', '77777777-7777-7777-7777-777777777712', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "12 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9012", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '5 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888813', '77777777-7777-7777-7777-777777777713', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "13 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9013", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '4 days',
   NOW() - INTERVAL '4 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888814', '77777777-7777-7777-7777-777777777714', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "14 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9014", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days',
   NOW() - INTERVAL '3 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888815', '77777777-7777-7777-7777-777777777715', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "15 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9015", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days',
   NOW() - INTERVAL '2 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888816', '77777777-7777-7777-7777-777777777716', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "16 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9016", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 days',
   NOW() - INTERVAL '1 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888817', '77777777-7777-7777-7777-777777777717', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "17 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9017", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 days',
   NOW() - INTERVAL '1 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888818', '77777777-7777-7777-7777-777777777718', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "18 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9018", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 days',
   NOW() - INTERVAL '1 days', 'Le demandeur n''est pas éligible'),

  -- "Reste à charge trop élevé" x7 (période courante)
  ('88888888-8888-8888-8888-888888888819', '77777777-7777-7777-7777-777777777719', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "19 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9019", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '20 days',
   NOW() - INTERVAL '20 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888820', '77777777-7777-7777-7777-777777777720', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "20 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9020", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '18 days',
   NOW() - INTERVAL '18 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888821', '77777777-7777-7777-7777-777777777721', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "21 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9021", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '15 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888822', '77777777-7777-7777-7777-777777777722', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "22 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9022", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '12 days',
   NOW() - INTERVAL '12 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888823', '77777777-7777-7777-7777-777777777723', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "23 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9023", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '8 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888824', '77777777-7777-7777-7777-777777777724', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "24 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9024", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '5 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888825', '77777777-7777-7777-7777-777777777725', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "25 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9025", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days',
   NOW() - INTERVAL '2 days', 'Reste à charge trop élevé'),

  -- "Le demandeur a abandonné le projet" x3 (période courante)
  ('88888888-8888-8888-8888-888888888826', '77777777-7777-7777-7777-777777777726', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "26 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9026", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '15 days', 'Le demandeur a abandonné le projet'),

  ('88888888-8888-8888-8888-888888888827', '77777777-7777-7777-7777-777777777727', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "27 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9027", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '10 days', 'Le demandeur a abandonné le projet'),

  ('88888888-8888-8888-8888-888888888828', '77777777-7777-7777-7777-777777777728', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "28 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9028", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '5 days', 'Le demandeur a abandonné le projet'),

  -- "Le demandeur ne donne pas de réponse" x2 (période courante)
  ('88888888-8888-8888-8888-888888888829', '77777777-7777-7777-7777-777777777729', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "29 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9029", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '12 days',
   NOW() - INTERVAL '12 days', 'Le demandeur ne donne pas de réponse'),

  ('88888888-8888-8888-8888-888888888830', '77777777-7777-7777-7777-777777777730', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "30 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9030", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '7 days',
   NOW() - INTERVAL '7 days', 'Le demandeur ne donne pas de réponse'),

  -- "Fausse déclaration / documents falsifiés" x1 (période courante)
  ('88888888-8888-8888-8888-888888888831', '77777777-7777-7777-7777-777777777731', 'factures', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "31 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9031", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '10 days', 'Fausse déclaration / documents falsifiés'),

  -- "Manque la CNI du demandeur" x1 (période courante, motif hors top 5)
  ('88888888-8888-8888-8888-888888888832', '77777777-7777-7777-7777-777777777732', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "32 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9032", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '6 days',
   NOW() - INTERVAL '6 days', 'Manque la CNI du demandeur'),

  -- "Maison trop endommagée pour les travaux de prévention" x1 (période courante, motif hors top 5 -> drawer)
  ('88888888-8888-8888-8888-888888888833', '77777777-7777-7777-7777-777777777733', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "33 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9033", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days',
   NOW() - INTERVAL '3 days', 'Maison trop endommagée pour les travaux de prévention')

ON CONFLICT (id) DO NOTHING;


-- ===== PÉRIODE PRÉCÉDENTE : J-60 à J-30 (23 archivages) =====
-- Répartition :
--   "Le demandeur n'est pas éligible"               : 12
--   "Reste à charge trop élevé"                     : 4
--   "Le demandeur a abandonné le projet"            : 4
--   "Le demandeur ne donne pas de réponse"          : 2
--   "Fausse déclaration / documents falsifiés"      : 1
-- Total = 23

INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at, archived_at, archive_reason)
VALUES
  -- "Le demandeur n'est pas éligible" x12 (période précédente)
  ('88888888-8888-8888-8888-888888888834', '77777777-7777-7777-7777-777777777734', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "34 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9034", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '55 days',
   NOW() - INTERVAL '55 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888835', '77777777-7777-7777-7777-777777777735', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "35 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9035", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '53 days',
   NOW() - INTERVAL '53 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888836', '77777777-7777-7777-7777-777777777736', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "36 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9036", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '50 days',
   NOW() - INTERVAL '50 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888837', '77777777-7777-7777-7777-777777777737', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "37 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9037", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '48 days',
   NOW() - INTERVAL '48 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888838', '77777777-7777-7777-7777-777777777738', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "38 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9038", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '45 days',
   NOW() - INTERVAL '45 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888839', '77777777-7777-7777-7777-777777777739', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "39 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9039", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '42 days',
   NOW() - INTERVAL '42 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888840', '77777777-7777-7777-7777-777777777740', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "40 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9040", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '40 days',
   NOW() - INTERVAL '40 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888841', '77777777-7777-7777-7777-777777777741', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "41 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9041", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '38 days',
   NOW() - INTERVAL '38 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888842', '77777777-7777-7777-7777-777777777742', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "42 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9042", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '36 days',
   NOW() - INTERVAL '36 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888843', '77777777-7777-7777-7777-777777777743', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "43 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9043", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '34 days',
   NOW() - INTERVAL '34 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888844', '77777777-7777-7777-7777-777777777744', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "44 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9044", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '32 days',
   NOW() - INTERVAL '32 days', 'Le demandeur n''est pas éligible'),

  ('88888888-8888-8888-8888-888888888845', '77777777-7777-7777-7777-777777777745', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "45 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9045", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '31 days',
   NOW() - INTERVAL '31 days', 'Le demandeur n''est pas éligible'),

  -- "Reste à charge trop élevé" x4 (période précédente)
  ('88888888-8888-8888-8888-888888888846', '77777777-7777-7777-7777-777777777746', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "46 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9046", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '50 days',
   NOW() - INTERVAL '50 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888847', '77777777-7777-7777-7777-777777777747', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "47 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9047", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '45 days',
   NOW() - INTERVAL '45 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888848', '77777777-7777-7777-7777-777777777748', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "48 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9048", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '40 days',
   NOW() - INTERVAL '40 days', 'Reste à charge trop élevé'),

  ('88888888-8888-8888-8888-888888888849', '77777777-7777-7777-7777-777777777749', 'devis', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "49 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9049", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '35 days',
   NOW() - INTERVAL '35 days', 'Reste à charge trop élevé'),

  -- "Le demandeur a abandonné le projet" x4 (période précédente)
  ('88888888-8888-8888-8888-888888888850', '77777777-7777-7777-7777-777777777750', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "50 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9050", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '55 days',
   NOW() - INTERVAL '55 days', 'Le demandeur a abandonné le projet'),

  ('88888888-8888-8888-8888-888888888851', '77777777-7777-7777-7777-777777777751', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "51 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9051", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '48 days',
   NOW() - INTERVAL '48 days', 'Le demandeur a abandonné le projet'),

  ('88888888-8888-8888-8888-888888888852', '77777777-7777-7777-7777-777777777752', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "52 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9052", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '42 days',
   NOW() - INTERVAL '42 days', 'Le demandeur a abandonné le projet'),

  ('88888888-8888-8888-8888-888888888853', '77777777-7777-7777-7777-777777777753', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "53 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9053", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '35 days',
   NOW() - INTERVAL '35 days', 'Le demandeur a abandonné le projet'),

  -- "Le demandeur ne donne pas de réponse" x2 (période précédente)
  ('88888888-8888-8888-8888-888888888854', '77777777-7777-7777-7777-777777777754', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "54 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9054", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '50 days',
   NOW() - INTERVAL '50 days', 'Le demandeur ne donne pas de réponse'),

  ('88888888-8888-8888-8888-888888888855', '77777777-7777-7777-7777-777777777755', 'choix_amo', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "55 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9055", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '40 days',
   NOW() - INTERVAL '40 days', 'Le demandeur ne donne pas de réponse'),

  -- "Fausse déclaration / documents falsifiés" x1 (période précédente)
  ('88888888-8888-8888-8888-888888888856', '77777777-7777-7777-7777-777777777756', 'factures', 'todo',
   '{"logement": {"commune_nom": "Châteauroux", "code_departement": "36", "adresse": "56 rue Seed Archive", "commune": "36044", "code_region": "24", "epci": "243600327", "coordonnees": "46.8167,1.6833", "clef_ban": "36044_9056", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "moyen", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "endommagée"}, "menage": {"revenu_rga": 18500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2025-01-01T10:00:00Z"}',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '45 days',
   NOW() - INTERVAL '45 days', 'Fausse déclaration / documents falsifiés')

ON CONFLICT (id) DO NOTHING;


-- ===== VALIDATIONS AMO pour les parcours "autres" motifs (drawer) =====
-- Rattache les parcours 31, 32, 33 à l'entreprise AMO existante
-- pour afficher le nom de la structure dans le drawer
INSERT INTO parcours_amo_validations (id, parcours_id, entreprise_amo_id, statut, user_prenom, user_nom, user_email, adresse_logement, choisie_at, validee_at, created_at, updated_at)
VALUES
  ('88888888-8888-8888-8888-aaaaaaaaa031', '88888888-8888-8888-8888-888888888831', 'dedd84de-da92-4825-aba3-6f2ee43803fe', 'logement_eligible', 'Jean-Eudes', 'Dugenoux', 'jean-eudes.dugenoux@test.fr', '31 rue Seed Archive, 36000 Châteauroux', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NOW() - INTERVAL '30 days', NOW()),
  ('88888888-8888-8888-8888-aaaaaaaaa032', '88888888-8888-8888-8888-888888888832', 'dedd84de-da92-4825-aba3-6f2ee43803fe', 'logement_eligible', 'Marie', 'Lefebvre', 'marie.lefebvre@test.fr', '32 rue Seed Archive, 36000 Châteauroux', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days', NOW()),
  ('88888888-8888-8888-8888-aaaaaaaaa033', '88888888-8888-8888-8888-888888888833', 'dedd84de-da92-4825-aba3-6f2ee43803fe', 'logement_eligible', 'Pierre', 'Martin', 'pierre.martin@test.fr', '33 rue Seed Archive, 36000 Châteauroux', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== RENSEIGNER archived_by sur les parcours "autres" (drawer) =====
-- Utilise l'agent AMO seed (Géraldine Moulin) pour les parcours 31-33
UPDATE parcours_prevention SET archived_by = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001'
WHERE id IN (
  '88888888-8888-8888-8888-888888888831',
  '88888888-8888-8888-8888-888888888832',
  '88888888-8888-8888-8888-888888888833'
);

-- ===== PROSPECT_QUALIFICATIONS pour les parcours "Le demandeur n'est pas éligible" =====
-- Chaque parcours archivé avec ce motif obtient une qualification non_eligible
-- avec des raisons_ineligibilite variées pour alimenter la carte "Demandes inéligibles".
--
-- Distribution cible (période courante, 18 parcours, ~30 raisons au total car multi-raisons) :
--   maison_trop_endommagee     : ~12 (présent dans beaucoup de parcours)
--   nombre_etages_sup_2        : ~6
--   pas_zone_alea_fort         : ~4
--   locataire_non_occupant     : ~3
--   appartement                : ~2
--   hors_zone_perimetre        : ~2
--   maison_moins_15_ans        : ~1
--
-- Distribution cible (période précédente, 12 parcours, ~16 raisons au total) :
--   maison_trop_endommagee     : ~8
--   nombre_etages_sup_2        : ~3
--   pas_zone_alea_fort         : ~3
--   locataire_non_occupant     : ~1
--   appartement                : ~1

INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, created_at)
VALUES
  -- === Période courante (parcours 01-18) ===
  ('99999999-9999-9999-9999-999999999901', '88888888-8888-8888-8888-888888888801', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '26 days'),

  ('99999999-9999-9999-9999-999999999902', '88888888-8888-8888-8888-888888888802', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee', 'nombre_etages_sup_2'], NOW() - INTERVAL '25 days'),

  ('99999999-9999-9999-9999-999999999903', '88888888-8888-8888-8888-888888888803', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '23 days'),

  ('99999999-9999-9999-9999-999999999904', '88888888-8888-8888-8888-888888888804', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique', 'email_envoye'], ARRAY['pas_zone_alea_fort'], NOW() - INTERVAL '21 days'),

  ('99999999-9999-9999-9999-999999999905', '88888888-8888-8888-8888-888888888805', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee', 'locataire_non_occupant'], NOW() - INTERVAL '19 days'),

  ('99999999-9999-9999-9999-999999999906', '88888888-8888-8888-8888-888888888806', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['nombre_etages_sup_2'], NOW() - INTERVAL '17 days'),

  ('99999999-9999-9999-9999-999999999907', '88888888-8888-8888-8888-888888888807', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '15 days'),

  ('99999999-9999-9999-9999-999999999908', '88888888-8888-8888-8888-888888888808', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['appartement'], NOW() - INTERVAL '13 days'),

  ('99999999-9999-9999-9999-999999999909', '88888888-8888-8888-8888-888888888809', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee', 'nombre_etages_sup_2'], NOW() - INTERVAL '11 days'),

  ('99999999-9999-9999-9999-999999999910', '88888888-8888-8888-8888-888888888810', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['email_envoye'], ARRAY['pas_zone_alea_fort', 'hors_zone_perimetre'], NOW() - INTERVAL '9 days'),

  ('99999999-9999-9999-9999-999999999911', '88888888-8888-8888-8888-888888888811', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '7 days'),

  ('99999999-9999-9999-9999-999999999912', '88888888-8888-8888-8888-888888888812', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee', 'nombre_etages_sup_2'], NOW() - INTERVAL '6 days'),

  ('99999999-9999-9999-9999-999999999913', '88888888-8888-8888-8888-888888888813', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['locataire_non_occupant'], NOW() - INTERVAL '5 days'),

  ('99999999-9999-9999-9999-999999999914', '88888888-8888-8888-8888-888888888814', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '4 days'),

  ('99999999-9999-9999-9999-999999999915', '88888888-8888-8888-8888-888888888815', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['pas_zone_alea_fort', 'maison_trop_endommagee'], NOW() - INTERVAL '3 days'),

  ('99999999-9999-9999-9999-999999999916', '88888888-8888-8888-8888-888888888816', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['nombre_etages_sup_2', 'hors_zone_perimetre'], NOW() - INTERVAL '2 days'),

  ('99999999-9999-9999-9999-999999999917', '88888888-8888-8888-8888-888888888817', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee', 'locataire_non_occupant'], NOW() - INTERVAL '2 days'),

  ('99999999-9999-9999-9999-999999999918', '88888888-8888-8888-8888-888888888818', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['email_envoye'], ARRAY['appartement', 'maison_moins_15_ans'], NOW() - INTERVAL '2 days'),

  -- === Période précédente (parcours 34-45) ===
  ('99999999-9999-9999-9999-999999999934', '88888888-8888-8888-8888-888888888834', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '56 days'),

  ('99999999-9999-9999-9999-999999999935', '88888888-8888-8888-8888-888888888835', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee', 'nombre_etages_sup_2'], NOW() - INTERVAL '54 days'),

  ('99999999-9999-9999-9999-999999999936', '88888888-8888-8888-8888-888888888836', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['pas_zone_alea_fort'], NOW() - INTERVAL '51 days'),

  ('99999999-9999-9999-9999-999999999937', '88888888-8888-8888-8888-888888888837', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '49 days'),

  ('99999999-9999-9999-9999-999999999938', '88888888-8888-8888-8888-888888888838', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee', 'locataire_non_occupant'], NOW() - INTERVAL '46 days'),

  ('99999999-9999-9999-9999-999999999939', '88888888-8888-8888-8888-888888888839', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['email_envoye'], ARRAY['nombre_etages_sup_2'], NOW() - INTERVAL '43 days'),

  ('99999999-9999-9999-9999-999999999940', '88888888-8888-8888-8888-888888888840', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '41 days'),

  ('99999999-9999-9999-9999-999999999941', '88888888-8888-8888-8888-888888888841', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['maison_trop_endommagee', 'pas_zone_alea_fort'], NOW() - INTERVAL '39 days'),

  ('99999999-9999-9999-9999-999999999942', '88888888-8888-8888-8888-888888888842', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee'], NOW() - INTERVAL '37 days'),

  ('99999999-9999-9999-9999-999999999943', '88888888-8888-8888-8888-888888888843', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['visite_domicile'], ARRAY['pas_zone_alea_fort'], NOW() - INTERVAL '35 days'),

  ('99999999-9999-9999-9999-999999999944', '88888888-8888-8888-8888-888888888844', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['appel_telephonique'], ARRAY['maison_trop_endommagee', 'nombre_etages_sup_2'], NOW() - INTERVAL '33 days'),

  ('99999999-9999-9999-9999-999999999945', '88888888-8888-8888-8888-888888888845', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'non_eligible',
   ARRAY['email_envoye'], ARRAY['appartement'], NOW() - INTERVAL '32 days')
ON CONFLICT (id) DO NOTHING;

-- Vérification raisons d'inéligibilité
SELECT
  r.raison,
  COUNT(*) as total
FROM prospect_qualifications pq
CROSS JOIN LATERAL unnest(pq.raisons_ineligibilite) AS r(raison)
WHERE pq.id::text LIKE '99999999-9999-9999-9999-%'
  AND pq.decision = 'non_eligible'
GROUP BY r.raison
ORDER BY total DESC;

-- Vérification archivage
SELECT
  archive_reason,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL '30 days') as periode_courante,
  COUNT(*) FILTER (WHERE archived_at >= NOW() - INTERVAL '60 days' AND archived_at < NOW() - INTERVAL '30 days') as periode_precedente
FROM parcours_prevention
WHERE id::text LIKE '88888888-8888-8888-8888-%'
  AND archived_at IS NOT NULL
GROUP BY archive_reason
ORDER BY total DESC;
