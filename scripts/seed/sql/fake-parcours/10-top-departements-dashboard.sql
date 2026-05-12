-- =============================================================================
-- 10-TOP-DEPARTEMENTS-DASHBOARD : Parcours multi-departements pour le top 5
-- =============================================================================
-- Ajoute des parcours avec simulations dans plusieurs departements pour tester
-- le composant "Top 5 departements" du tableau de bord.
-- Departements utilises : 03 (Allier), 24 (Dordogne), 32 (Gers),
--                         47 (Lot-et-Garonne), 81 (Tarn), 82 (Tarn-et-Garonne)
-- UUID pattern : 99999999-9999-9999-9999-9999999999XX (users)
--                AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA (parcours)
--                BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB (dossiers DS)
-- =============================================================================

-- ===== UTILISATEURS =====
INSERT INTO users (id, fc_id, email, nom, prenom, created_at)
VALUES
  -- Allier (03) - 20 users
  ('99999999-9999-9999-9999-999999999901', 'fc-dept-901', 'pierre.allier01@test.fr', 'Dupuis', 'Pierre', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999902', 'fc-dept-902', 'marie.allier02@test.fr', 'Blanc', 'Marie', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999903', 'fc-dept-903', 'jean.allier03@test.fr', 'Perrot', 'Jean', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999904', 'fc-dept-904', 'sophie.allier04@test.fr', 'Roche', 'Sophie', NOW() - INTERVAL '22 days'),
  ('99999999-9999-9999-9999-999999999905', 'fc-dept-905', 'laurent.allier05@test.fr', 'Moulin', 'Laurent', NOW() - INTERVAL '21 days'),
  ('99999999-9999-9999-9999-999999999906', 'fc-dept-906', 'nathalie.allier06@test.fr', 'Gauthier', 'Nathalie', NOW() - INTERVAL '20 days'),
  ('99999999-9999-9999-9999-999999999907', 'fc-dept-907', 'philippe.allier07@test.fr', 'Besse', 'Philippe', NOW() - INTERVAL '19 days'),
  ('99999999-9999-9999-9999-999999999908', 'fc-dept-908', 'sylvie.allier08@test.fr', 'Fabre', 'Sylvie', NOW() - INTERVAL '18 days'),
  ('99999999-9999-9999-9999-999999999909', 'fc-dept-909', 'michel.allier09@test.fr', 'Cros', 'Michel', NOW() - INTERVAL '17 days'),
  ('99999999-9999-9999-9999-999999999910', 'fc-dept-910', 'valerie.allier10@test.fr', 'Vacher', 'Valérie', NOW() - INTERVAL '16 days'),
  ('99999999-9999-9999-9999-999999999911', 'fc-dept-911', 'alain.allier11@test.fr', 'Arnaud', 'Alain', NOW() - INTERVAL '15 days'),
  ('99999999-9999-9999-9999-999999999912', 'fc-dept-912', 'catherine.allier12@test.fr', 'Bonhomme', 'Catherine', NOW() - INTERVAL '14 days'),
  ('99999999-9999-9999-9999-999999999913', 'fc-dept-913', 'eric.allier13@test.fr', 'Chapuis', 'Éric', NOW() - INTERVAL '13 days'),
  ('99999999-9999-9999-9999-999999999914', 'fc-dept-914', 'isabelle.allier14@test.fr', 'Dumas', 'Isabelle', NOW() - INTERVAL '12 days'),
  ('99999999-9999-9999-9999-999999999915', 'fc-dept-915', 'didier.allier15@test.fr', 'Fournier', 'Didier', NOW() - INTERVAL '11 days'),
  ('99999999-9999-9999-9999-999999999916', 'fc-dept-916', 'florence.allier16@test.fr', 'Guillot', 'Florence', NOW() - INTERVAL '10 days'),
  ('99999999-9999-9999-9999-999999999917', 'fc-dept-917', 'franck.allier17@test.fr', 'Herve', 'Franck', NOW() - INTERVAL '9 days'),
  ('99999999-9999-9999-9999-999999999918', 'fc-dept-918', 'anne.allier18@test.fr', 'Imbert', 'Anne', NOW() - INTERVAL '8 days'),
  ('99999999-9999-9999-9999-999999999919', 'fc-dept-919', 'bruno.allier19@test.fr', 'Jourdain', 'Bruno', NOW() - INTERVAL '7 days'),
  ('99999999-9999-9999-9999-999999999920', 'fc-dept-920', 'colette.allier20@test.fr', 'Lacroix', 'Colette', NOW() - INTERVAL '6 days'),
  -- Dordogne (24) - 12 users
  ('99999999-9999-9999-9999-999999999921', 'fc-dept-921', 'marc.dordogne01@test.fr', 'Peyroux', 'Marc', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999922', 'fc-dept-922', 'dominique.dordogne02@test.fr', 'Lascaux', 'Dominique', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999923', 'fc-dept-923', 'patrick.dordogne03@test.fr', 'Bergerat', 'Patrick', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999924', 'fc-dept-924', 'monique.dordogne04@test.fr', 'Sarlat', 'Monique', NOW() - INTERVAL '22 days'),
  ('99999999-9999-9999-9999-999999999925', 'fc-dept-925', 'daniel.dordogne05@test.fr', 'Montpon', 'Daniel', NOW() - INTERVAL '21 days'),
  ('99999999-9999-9999-9999-999999999926', 'fc-dept-926', 'helene.dordogne06@test.fr', 'Razac', 'Hélène', NOW() - INTERVAL '20 days'),
  ('99999999-9999-9999-9999-999999999927', 'fc-dept-927', 'thierry.dordogne07@test.fr', 'Villamblard', 'Thierry', NOW() - INTERVAL '19 days'),
  ('99999999-9999-9999-9999-999999999928', 'fc-dept-928', 'veronique.dordogne08@test.fr', 'Castels', 'Véronique', NOW() - INTERVAL '18 days'),
  ('99999999-9999-9999-9999-999999999929', 'fc-dept-929', 'claude.dordogne09@test.fr', 'Excideuil', 'Claude', NOW() - INTERVAL '17 days'),
  ('99999999-9999-9999-9999-999999999930', 'fc-dept-930', 'martine.dordogne10@test.fr', 'Nontron', 'Martine', NOW() - INTERVAL '16 days'),
  ('99999999-9999-9999-9999-999999999931', 'fc-dept-931', 'yves.dordogne11@test.fr', 'Terrasson', 'Yves', NOW() - INTERVAL '15 days'),
  ('99999999-9999-9999-9999-999999999932', 'fc-dept-932', 'corinne.dordogne12@test.fr', 'Daglan', 'Corinne', NOW() - INTERVAL '14 days'),
  -- Gers (32) - 8 users
  ('99999999-9999-9999-9999-999999999933', 'fc-dept-933', 'rene.gers01@test.fr', 'Armagnac', 'René', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999934', 'fc-dept-934', 'mireille.gers02@test.fr', 'Lectoure', 'Mireille', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999935', 'fc-dept-935', 'henri.gers03@test.fr', 'Condom', 'Henri', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999936', 'fc-dept-936', 'josette.gers04@test.fr', 'Fleurance', 'Josette', NOW() - INTERVAL '22 days'),
  ('99999999-9999-9999-9999-999999999937', 'fc-dept-937', 'gerard.gers05@test.fr', 'Mirande', 'Gérard', NOW() - INTERVAL '21 days'),
  ('99999999-9999-9999-9999-999999999938', 'fc-dept-938', 'arlette.gers06@test.fr', 'Lombez', 'Arlette', NOW() - INTERVAL '20 days'),
  ('99999999-9999-9999-9999-999999999939', 'fc-dept-939', 'robert.gers07@test.fr', 'Gimont', 'Robert', NOW() - INTERVAL '19 days'),
  ('99999999-9999-9999-9999-999999999940', 'fc-dept-940', 'paulette.gers08@test.fr', 'Samatan', 'Paulette', NOW() - INTERVAL '18 days'),
  -- Lot-et-Garonne (47) - 6 users
  ('99999999-9999-9999-9999-999999999941', 'fc-dept-941', 'jacques.lot01@test.fr', 'Agen', 'Jacques', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999942', 'fc-dept-942', 'genevieve.lot02@test.fr', 'Marmande', 'Geneviève', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999943', 'fc-dept-943', 'andre.lot03@test.fr', 'Villeneuve', 'André', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999944', 'fc-dept-944', 'odette.lot04@test.fr', 'Tonneins', 'Odette', NOW() - INTERVAL '22 days'),
  ('99999999-9999-9999-9999-999999999945', 'fc-dept-945', 'raymond.lot05@test.fr', 'Nerac', 'Raymond', NOW() - INTERVAL '21 days'),
  ('99999999-9999-9999-9999-999999999946', 'fc-dept-946', 'lucienne.lot06@test.fr', 'Fumel', 'Lucienne', NOW() - INTERVAL '20 days'),
  -- Tarn (81) - 5 users
  ('99999999-9999-9999-9999-999999999947', 'fc-dept-947', 'bernard.tarn01@test.fr', 'Albi', 'Bernard', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999948', 'fc-dept-948', 'jeanne.tarn02@test.fr', 'Castres', 'Jeanne', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999949', 'fc-dept-949', 'maurice.tarn03@test.fr', 'Gaillac', 'Maurice', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999950', 'fc-dept-950', 'denise.tarn04@test.fr', 'Mazamet', 'Denise', NOW() - INTERVAL '22 days'),
  ('99999999-9999-9999-9999-999999999951', 'fc-dept-951', 'leon.tarn05@test.fr', 'Lavaur', 'Léon', NOW() - INTERVAL '21 days'),
  -- Tarn-et-Garonne (82) - 4 users
  ('99999999-9999-9999-9999-999999999952', 'fc-dept-952', 'fernand.teg01@test.fr', 'Montauban', 'Fernand', NOW() - INTERVAL '25 days'),
  ('99999999-9999-9999-9999-999999999953', 'fc-dept-953', 'yvette.teg02@test.fr', 'Moissac', 'Yvette', NOW() - INTERVAL '24 days'),
  ('99999999-9999-9999-9999-999999999954', 'fc-dept-954', 'gaston.teg03@test.fr', 'Castelsarrasin', 'Gaston', NOW() - INTERVAL '23 days'),
  ('99999999-9999-9999-9999-999999999955', 'fc-dept-955', 'germaine.teg04@test.fr', 'Caussade', 'Germaine', NOW() - INTERVAL '22 days')
ON CONFLICT (id) DO NOTHING;

-- ===== PARCOURS - ALLIER (03) : 20 simulations =====
-- Simulation eligible : zone_dexposition=fort, type=maison, niveaux=1, proprietaire_occupant=true,
--   assure=true, indemnise=false, sinistres=saine, revenus OK
-- Simulation non eligible (appartement) : type=appartement
INSERT INTO parcours_prevention (id, user_id, current_step, current_status, rga_simulation_data, created_at, updated_at)
VALUES
  -- 12 eligibles
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa901', '99999999-9999-9999-9999-999999999901', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "1 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa902', '99999999-9999-9999-9999-999999999902', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "2 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa903', '99999999-9999-9999-9999-999999999903', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Montlucon", "code_departement": "03", "adresse": "3 rue de Montlucon", "commune": "03185", "code_region": "84", "epci": "200071363", "coordonnees": "46.3333,2.6", "clef_ban": "03185_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa904', '99999999-9999-9999-9999-999999999904', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "4 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0004", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa905', '99999999-9999-9999-9999-999999999905', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "5 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0005", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 18000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-24T10:00:00Z"}',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa906', '99999999-9999-9999-9999-999999999906', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "6 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0006", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 23000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-25T10:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa907', '99999999-9999-9999-9999-999999999907', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "7 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0007", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 17000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-26T10:00:00Z"}',
   NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa908', '99999999-9999-9999-9999-999999999908', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Montlucon", "code_departement": "03", "adresse": "8 rue de Montlucon", "commune": "03185", "code_region": "84", "epci": "200071363", "coordonnees": "46.3333,2.6", "clef_ban": "03185_0008", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 25000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-27T10:00:00Z"}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa909', '99999999-9999-9999-9999-999999999909', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "9 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0009", "commune_denormandie": false, "annee_de_construction": "1982", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19500, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-28T10:00:00Z"}',
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa910', '99999999-9999-9999-9999-999999999910', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "10 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0010", "commune_denormandie": false, "annee_de_construction": "1990", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 16000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-01T10:00:00Z"}',
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa911', '99999999-9999-9999-9999-999999999911', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "11 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0011", "commune_denormandie": false, "annee_de_construction": "1976", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 24000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-02T10:00:00Z"}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa912', '99999999-9999-9999-9999-999999999912', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "12 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0012", "commune_denormandie": false, "annee_de_construction": "1988", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-03T10:00:00Z"}',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
  -- 8 non eligibles (appartement)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa913', '99999999-9999-9999-9999-999999999913', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "13 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0013", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-04T10:00:00Z"}',
   NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa914', '99999999-9999-9999-9999-999999999914', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "14 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0014", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-05T10:00:00Z"}',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa915', '99999999-9999-9999-9999-999999999915', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Montlucon", "code_departement": "03", "adresse": "15 rue de Montlucon", "commune": "03185", "code_region": "84", "epci": "200071363", "coordonnees": "46.3333,2.6", "clef_ban": "03185_0015", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-06T10:00:00Z"}',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa916', '99999999-9999-9999-9999-999999999916', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "16 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0016", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-07T10:00:00Z"}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa917', '99999999-9999-9999-9999-999999999917', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "17 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0017", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-08T10:00:00Z"}',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa918', '99999999-9999-9999-9999-999999999918', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Montlucon", "code_departement": "03", "adresse": "18 rue de Montlucon", "commune": "03185", "code_region": "84", "epci": "200071363", "coordonnees": "46.3333,2.6", "clef_ban": "03185_0018", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-09T10:00:00Z"}',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa919', '99999999-9999-9999-9999-999999999919', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moulins", "code_departement": "03", "adresse": "19 rue de Moulins", "commune": "03190", "code_region": "84", "epci": "200071363", "coordonnees": "46.5667,3.3333", "clef_ban": "03190_0019", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-10T10:00:00Z"}',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa920', '99999999-9999-9999-9999-999999999920', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Vichy", "code_departement": "03", "adresse": "20 rue de Vichy", "commune": "03310", "code_region": "84", "epci": "200071363", "coordonnees": "46.1333,3.4167", "clef_ban": "03310_0020", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-11T10:00:00Z"}',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

  -- ===== DORDOGNE (24) : 12 simulations, 8 eligibles =====
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa921', '99999999-9999-9999-9999-999999999921', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Perigueux", "code_departement": "24", "adresse": "1 rue de Perigueux", "commune": "24322", "code_region": "75", "epci": "242400661", "coordonnees": "45.1833,0.7167", "clef_ban": "24322_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa922', '99999999-9999-9999-9999-999999999922', 'diagnostic', 'todo',
   '{"logement": {"commune_nom": "Bergerac", "code_departement": "24", "adresse": "2 rue de Bergerac", "commune": "24037", "code_region": "75", "epci": "242400661", "coordonnees": "44.85,0.4833", "clef_ban": "24037_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa923', '99999999-9999-9999-9999-999999999923', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Sarlat", "code_departement": "24", "adresse": "3 rue de Sarlat", "commune": "24520", "code_region": "75", "epci": "242400661", "coordonnees": "44.8833,1.2167", "clef_ban": "24520_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa924', '99999999-9999-9999-9999-999999999924', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Perigueux", "code_departement": "24", "adresse": "4 rue de Perigueux", "commune": "24322", "code_region": "75", "epci": "242400661", "coordonnees": "45.1833,0.7167", "clef_ban": "24322_0004", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa925', '99999999-9999-9999-9999-999999999925', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Bergerac", "code_departement": "24", "adresse": "5 rue de Bergerac", "commune": "24037", "code_region": "75", "epci": "242400661", "coordonnees": "44.85,0.4833", "clef_ban": "24037_0005", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 18000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-24T10:00:00Z"}',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa926', '99999999-9999-9999-9999-999999999926', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Sarlat", "code_departement": "24", "adresse": "6 rue de Sarlat", "commune": "24520", "code_region": "75", "epci": "242400661", "coordonnees": "44.8833,1.2167", "clef_ban": "24520_0006", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 23000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-25T10:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa927', '99999999-9999-9999-9999-999999999927', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Perigueux", "code_departement": "24", "adresse": "7 rue de Perigueux", "commune": "24322", "code_region": "75", "epci": "242400661", "coordonnees": "45.1833,0.7167", "clef_ban": "24322_0007", "commune_denormandie": false, "annee_de_construction": "1965", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 17000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-26T10:00:00Z"}',
   NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa928', '99999999-9999-9999-9999-999999999928', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Bergerac", "code_departement": "24", "adresse": "8 rue de Bergerac", "commune": "24037", "code_region": "75", "epci": "242400661", "coordonnees": "44.85,0.4833", "clef_ban": "24037_0008", "commune_denormandie": false, "annee_de_construction": "1978", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 25000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-27T10:00:00Z"}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  -- 4 non eligibles (appartement)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa929', '99999999-9999-9999-9999-999999999929', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Perigueux", "code_departement": "24", "adresse": "9 rue de Perigueux", "commune": "24322", "code_region": "75", "epci": "242400661", "coordonnees": "45.1833,0.7167", "clef_ban": "24322_0009", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-28T10:00:00Z"}',
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa930', '99999999-9999-9999-9999-999999999930', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Bergerac", "code_departement": "24", "adresse": "10 rue de Bergerac", "commune": "24037", "code_region": "75", "epci": "242400661", "coordonnees": "44.85,0.4833", "clef_ban": "24037_0010", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-01T10:00:00Z"}',
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa931', '99999999-9999-9999-9999-999999999931', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Sarlat", "code_departement": "24", "adresse": "11 rue de Sarlat", "commune": "24520", "code_region": "75", "epci": "242400661", "coordonnees": "44.8833,1.2167", "clef_ban": "24520_0011", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-02T10:00:00Z"}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa932', '99999999-9999-9999-9999-999999999932', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Perigueux", "code_departement": "24", "adresse": "12 rue de Perigueux", "commune": "24322", "code_region": "75", "epci": "242400661", "coordonnees": "45.1833,0.7167", "clef_ban": "24322_0012", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-03-03T10:00:00Z"}',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

  -- ===== GERS (32) : 8 simulations, 6 eligibles =====
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa933', '99999999-9999-9999-9999-999999999933', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "1 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa934', '99999999-9999-9999-9999-999999999934', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "2 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa935', '99999999-9999-9999-9999-999999999935', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "3 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa936', '99999999-9999-9999-9999-999999999936', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "4 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0004", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa937', '99999999-9999-9999-9999-999999999937', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "5 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0005", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 18000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-24T10:00:00Z"}',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa938', '99999999-9999-9999-9999-999999999938', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "6 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0006", "commune_denormandie": false, "annee_de_construction": "1972", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 23000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-25T10:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  -- 2 non eligibles
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa939', '99999999-9999-9999-9999-999999999939', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "7 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0007", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-26T10:00:00Z"}',
   NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa940', '99999999-9999-9999-9999-999999999940', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Auch", "code_departement": "32", "adresse": "8 rue d Auch", "commune": "32013", "code_region": "76", "epci": "243200516", "coordonnees": "43.65,0.5833", "clef_ban": "32013_0008", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-27T10:00:00Z"}',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),

  -- ===== LOT-ET-GARONNE (47) : 6 simulations, 4 eligibles =====
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa941', '99999999-9999-9999-9999-999999999941', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Agen", "code_departement": "47", "adresse": "1 rue d Agen", "commune": "47001", "code_region": "75", "epci": "244700765", "coordonnees": "44.2,0.6167", "clef_ban": "47001_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa942', '99999999-9999-9999-9999-999999999942', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Marmande", "code_departement": "47", "adresse": "2 rue de Marmande", "commune": "47157", "code_region": "75", "epci": "244700765", "coordonnees": "44.5,0.1667", "clef_ban": "47157_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa943', '99999999-9999-9999-9999-999999999943', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Agen", "code_departement": "47", "adresse": "3 rue d Agen", "commune": "47001", "code_region": "75", "epci": "244700765", "coordonnees": "44.2,0.6167", "clef_ban": "47001_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa944', '99999999-9999-9999-9999-999999999944', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Marmande", "code_departement": "47", "adresse": "4 rue de Marmande", "commune": "47157", "code_region": "75", "epci": "244700765", "coordonnees": "44.5,0.1667", "clef_ban": "47157_0004", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  -- 2 non eligibles
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa945', '99999999-9999-9999-9999-999999999945', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Agen", "code_departement": "47", "adresse": "5 rue d Agen", "commune": "47001", "code_region": "75", "epci": "244700765", "coordonnees": "44.2,0.6167", "clef_ban": "47001_0005", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-24T10:00:00Z"}',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa946', '99999999-9999-9999-9999-999999999946', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Marmande", "code_departement": "47", "adresse": "6 rue de Marmande", "commune": "47157", "code_region": "75", "epci": "244700765", "coordonnees": "44.5,0.1667", "clef_ban": "47157_0006", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-25T10:00:00Z"}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

  -- ===== TARN (81) : 5 simulations, toutes eligibles =====
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa947', '99999999-9999-9999-9999-999999999947', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Albi", "code_departement": "81", "adresse": "1 rue d Albi", "commune": "81004", "code_region": "76", "epci": "248100737", "coordonnees": "43.9333,2.15", "clef_ban": "81004_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa948', '99999999-9999-9999-9999-999999999948', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Castres", "code_departement": "81", "adresse": "2 rue de Castres", "commune": "81065", "code_region": "76", "epci": "248100737", "coordonnees": "43.6,2.25", "clef_ban": "81065_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa949', '99999999-9999-9999-9999-999999999949', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Albi", "code_departement": "81", "adresse": "3 rue d Albi", "commune": "81004", "code_region": "76", "epci": "248100737", "coordonnees": "43.9333,2.15", "clef_ban": "81004_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa950', '99999999-9999-9999-9999-999999999950', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Castres", "code_departement": "81", "adresse": "4 rue de Castres", "commune": "81065", "code_region": "76", "epci": "248100737", "coordonnees": "43.6,2.25", "clef_ban": "81065_0004", "commune_denormandie": false, "annee_de_construction": "1968", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 21000, "personnes": 4}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa951', '99999999-9999-9999-9999-999999999951', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Albi", "code_departement": "81", "adresse": "5 rue d Albi", "commune": "81004", "code_region": "76", "epci": "248100737", "coordonnees": "43.9333,2.15", "clef_ban": "81004_0005", "commune_denormandie": false, "annee_de_construction": "1985", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 18000, "personnes": 1}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-24T10:00:00Z"}',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),

  -- ===== TARN-ET-GARONNE (82) : 4 simulations, 3 eligibles =====
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa952', '99999999-9999-9999-9999-999999999952', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Montauban", "code_departement": "82", "adresse": "1 rue de Montauban", "commune": "82121", "code_region": "76", "epci": "248200552", "coordonnees": "44.0167,1.35", "clef_ban": "82121_0001", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-20T10:00:00Z"}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa953', '99999999-9999-9999-9999-999999999953', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moissac", "code_departement": "82", "adresse": "2 rue de Moissac", "commune": "82112", "code_region": "76", "epci": "248200552", "coordonnees": "44.1,1.0833", "clef_ban": "82112_0002", "commune_denormandie": false, "annee_de_construction": "1980", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 22000, "personnes": 3}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-21T10:00:00Z"}',
   NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa954', '99999999-9999-9999-9999-999999999954', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Montauban", "code_departement": "82", "adresse": "3 rue de Montauban", "commune": "82121", "code_region": "76", "epci": "248200552", "coordonnees": "44.0167,1.35", "clef_ban": "82121_0003", "commune_denormandie": false, "annee_de_construction": "1970", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "maison", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 19000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-22T10:00:00Z"}',
   NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  -- 1 non eligible
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa955', '99999999-9999-9999-9999-999999999955', 'eligibilite', 'todo',
   '{"logement": {"commune_nom": "Moissac", "code_departement": "82", "adresse": "4 rue de Moissac", "commune": "82112", "code_region": "76", "epci": "248200552", "coordonnees": "44.1,1.0833", "clef_ban": "82112_0004", "commune_denormandie": false, "annee_de_construction": "1975", "rnb": "", "niveaux": 1, "zone_dexposition": "fort", "type": "appartement", "mitoyen": false, "proprietaire_occupant": true}, "taxeFonciere": {"commune_eligible": true}, "rga": {"assure": true, "indemnise_indemnise_rga": false, "sinistres": "saine"}, "menage": {"revenu_rga": 20000, "personnes": 2}, "vous": {"proprietaire_condition": true, "proprietaire_occupant_rga": true}, "simulatedAt": "2026-02-23T10:00:00Z"}',
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days')
ON CONFLICT (id) DO NOTHING;

-- ===== DOSSIERS DEMARCHES SIMPLIFIEES =====
-- Allier : 6 dossiers DN (sur 20 simulations = 30% transfo)
-- Dordogne : 3 dossiers DN (sur 12 = 25%)
-- Gers : 2 dossiers DN (sur 8 = 25%)
-- Lot-et-Garonne : 1 dossier DN (sur 6 = 16.67%)
-- Tarn : 2 dossiers DN (sur 5 = 40%)
-- Tarn-et-Garonne : 1 dossier DN (sur 4 = 25%)

INSERT INTO dossiers_demarches_simplifiees (id, parcours_id, step, ds_demarche_id, ds_status, submitted_at, created_at, updated_at)
VALUES
  -- Allier
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb901', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa901', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb902', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa902', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb903', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa903', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb904', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa904', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb905', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa905', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb906', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa906', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', NOW()),
  -- Dordogne
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb907', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa921', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb908', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa922', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb909', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa923', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW()),
  -- Gers
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb910', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa933', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb911', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa934', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),
  -- Lot-et-Garonne
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb912', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa941', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  -- Tarn
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb913', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa947', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb914', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa948', 'eligibilite', 'demarche-eligibilite', 'en_instruction', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', NOW()),
  -- Tarn-et-Garonne
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb915', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa952', 'eligibilite', 'demarche-eligibilite', 'accepte', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ===== Verification =====
SELECT
  rga_simulation_data->'logement'->>'code_departement' AS dept,
  COUNT(*) AS nb_parcours
FROM parcours_prevention
WHERE id::text LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-%'
GROUP BY dept
ORDER BY nb_parcours DESC;
