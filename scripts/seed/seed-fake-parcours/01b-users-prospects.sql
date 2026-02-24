-- =============================================================================
-- 01B-USERS PROSPECTS : Création des utilisateurs pour les prospects (30 users)
-- =============================================================================
-- À exécuter après 01-users.sql
-- Ces utilisateurs correspondent aux parcours sans AMO (prospects Allers-Vers)
-- =============================================================================

INSERT INTO users (id, fc_id, email, prenom, nom, telephone, last_login, created_at, updated_at)
VALUES
  -- Utilisateurs pour prospects sans AMO (30 utilisateurs avec IDs de 141 à 170)
  ('11111111-1111-1111-1111-111111111141', 'fc-test-141', 'pierre.dupont@test.fr', 'Pierre', 'Dupont', '06 11 22 33 41', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111142', 'fc-test-142', 'marie.martin@test.fr', 'Marie', 'Martin', '06 11 22 33 42', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111143', 'fc-test-143', 'jean.bernard@test.fr', 'Jean', 'Bernard', '06 11 22 33 43', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111144', 'fc-test-144', 'sophie.petit@test.fr', 'Sophie', 'Petit', '06 33 25 56 55', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111145', 'fc-test-145', 'luc.robert@test.fr', 'Luc', 'Robert', '06 11 22 33 45', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111146', 'fc-test-146', 'claire.dubois@test.fr', 'Claire', 'Dubois', '06 11 22 33 46', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111147', 'fc-test-147', 'thomas.moreau@test.fr', 'Thomas', 'Moreau', '06 11 22 33 47', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111148', 'fc-test-148', 'julie.laurent@test.fr', 'Julie', 'Laurent', '06 11 22 33 48', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111149', 'fc-test-149', 'paul.simon@test.fr', 'Paul', 'Simon', '06 11 22 33 49', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111150', 'fc-test-150', 'anne.michel@test.fr', 'Anne', 'Michel', '06 11 22 33 50', NOW(), NOW(), NOW()),

  ('11111111-1111-1111-1111-111111111151', 'fc-test-151', 'francois.lefebvre@test.fr', 'François', 'Lefebvre', '06 11 22 33 51', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111152', 'fc-test-152', 'isabelle.leroy@test.fr', 'Isabelle', 'Leroy', '06 11 22 33 52', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111153', 'fc-test-153', 'david.roux@test.fr', 'David', 'Roux', '06 11 22 33 53', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111154', 'fc-test-154', 'catherine.vincent@test.fr', 'Catherine', 'Vincent', '06 11 22 33 54', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111155', 'fc-test-155', 'alain.fournier@test.fr', 'Alain', 'Fournier', '06 11 22 33 55', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111156', 'fc-test-156', 'nathalie.girard@test.fr', 'Nathalie', 'Girard', '06 11 22 33 56', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111157', 'fc-test-157', 'patrick.bonnet@test.fr', 'Patrick', 'Bonnet', '06 11 22 33 57', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111158', 'fc-test-158', 'valerie.dupuis@test.fr', 'Valérie', 'Dupuis', '06 11 22 33 58', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111159', 'fc-test-159', 'bruno.lambert@test.fr', 'Bruno', 'Lambert', '06 11 22 33 59', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111160', 'fc-test-160', 'sandrine.fontaine@test.fr', 'Sandrine', 'Fontaine', '06 11 22 33 60', NOW(), NOW(), NOW()),

  ('11111111-1111-1111-1111-111111111161', 'fc-test-161', 'olivier.rousseau@test.fr', 'Olivier', 'Rousseau', '06 11 22 33 61', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111162', 'fc-test-162', 'veronique.blanc@test.fr', 'Véronique', 'Blanc', '06 11 22 33 62', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111163', 'fc-test-163', 'christophe.guerin@test.fr', 'Christophe', 'Guérin', '06 11 22 33 63', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111164', 'fc-test-164', 'sylvie.muller@test.fr', 'Sylvie', 'Muller', '06 11 22 33 64', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111165', 'fc-test-165', 'laurent.meyer@test.fr', 'Laurent', 'Meyer', '06 11 22 33 65', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111166', 'fc-test-166', 'martine.lopez@test.fr', 'Martine', 'Lopez', '06 11 22 33 66', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111167', 'fc-test-167', 'daniel.garcia@test.fr', 'Daniel', 'Garcia', '06 11 22 33 67', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111168', 'fc-test-168', 'michele.rodriguez@test.fr', 'Michèle', 'Rodriguez', '06 11 22 33 68', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111169', 'fc-test-169', 'marc.perez@test.fr', 'Marc', 'Perez', '06 11 22 33 69', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111170', 'fc-test-170', 'brigitte.sanchez@test.fr', 'Brigitte', 'Sanchez', '06 11 22 33 70', NOW(), NOW(), NOW()),

  -- Utilisateurs supplémentaires pour prospects éligibles et archivés (IDs 181-188)
  -- NB: 171-173 déjà pris dans 01-users.sql (dossiers archivés AMO)
  ('11111111-1111-1111-1111-111111111181', 'fc-test-181', 'rene.faure@test.fr', 'René', 'Faure', '06 11 22 33 81', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111182', 'fc-test-182', 'monique.mercier@test.fr', 'Monique', 'Mercier', '06 11 22 33 82', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111183', 'fc-test-183', 'yves.lecomte@test.fr', 'Yves', 'Lecomte', '06 11 22 33 83', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111184', 'fc-test-184', 'colette.duval@test.fr', 'Colette', 'Duval', '06 11 22 33 84', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111185', 'fc-test-185', 'gerard.masson@test.fr', 'Gérard', 'Masson', '06 11 22 33 85', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111186', 'fc-test-186', 'helene.chevalier@test.fr', 'Hélène', 'Chevalier', '06 11 22 33 86', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111187', 'fc-test-187', 'jacques.fleury@test.fr', 'Jacques', 'Fleury', '06 11 22 33 87', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111188', 'fc-test-188', 'denise.barbier@test.fr', 'Denise', 'Barbier', '06 11 22 33 88', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
SELECT
  'Utilisateurs prospects' as type,
  COUNT(*) as total
FROM users
WHERE id::text LIKE '11111111-1111-1111-1111-11111111114%'
   OR id::text LIKE '11111111-1111-1111-1111-11111111115%'
   OR id::text LIKE '11111111-1111-1111-1111-11111111116%'
   OR id::text LIKE '11111111-1111-1111-1111-11111111118%';
