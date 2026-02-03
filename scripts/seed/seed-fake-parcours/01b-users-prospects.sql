-- =============================================================================
-- 01B-USERS PROSPECTS : Création des utilisateurs pour les prospects (30 users)
-- =============================================================================
-- À exécuter après 01-users.sql
-- Ces utilisateurs correspondent aux parcours sans AMO (prospects Allers-Vers)
-- =============================================================================

INSERT INTO users (id, fc_id, email, prenom, nom, last_login, created_at, updated_at)
VALUES
  -- Utilisateurs pour prospects sans AMO (30 utilisateurs avec IDs de 141 à 170)
  ('11111111-1111-1111-1111-111111111141', 'fc-test-141', 'pierre.dupont@test.fr', 'Pierre', 'Dupont', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111142', 'fc-test-142', 'marie.martin@test.fr', 'Marie', 'Martin', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111143', 'fc-test-143', 'jean.bernard@test.fr', 'Jean', 'Bernard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111144', 'fc-test-144', 'sophie.petit@test.fr', 'Sophie', 'Petit', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111145', 'fc-test-145', 'luc.robert@test.fr', 'Luc', 'Robert', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111146', 'fc-test-146', 'claire.dubois@test.fr', 'Claire', 'Dubois', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111147', 'fc-test-147', 'thomas.moreau@test.fr', 'Thomas', 'Moreau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111148', 'fc-test-148', 'julie.laurent@test.fr', 'Julie', 'Laurent', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111149', 'fc-test-149', 'paul.simon@test.fr', 'Paul', 'Simon', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111150', 'fc-test-150', 'anne.michel@test.fr', 'Anne', 'Michel', NOW(), NOW(), NOW()),

  ('11111111-1111-1111-1111-111111111151', 'fc-test-151', 'francois.lefebvre@test.fr', 'François', 'Lefebvre', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111152', 'fc-test-152', 'isabelle.leroy@test.fr', 'Isabelle', 'Leroy', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111153', 'fc-test-153', 'david.roux@test.fr', 'David', 'Roux', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111154', 'fc-test-154', 'catherine.vincent@test.fr', 'Catherine', 'Vincent', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111155', 'fc-test-155', 'alain.fournier@test.fr', 'Alain', 'Fournier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111156', 'fc-test-156', 'nathalie.girard@test.fr', 'Nathalie', 'Girard', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111157', 'fc-test-157', 'patrick.bonnet@test.fr', 'Patrick', 'Bonnet', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111158', 'fc-test-158', 'valerie.dupuis@test.fr', 'Valérie', 'Dupuis', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111159', 'fc-test-159', 'bruno.lambert@test.fr', 'Bruno', 'Lambert', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111160', 'fc-test-160', 'sandrine.fontaine@test.fr', 'Sandrine', 'Fontaine', NOW(), NOW(), NOW()),

  ('11111111-1111-1111-1111-111111111161', 'fc-test-161', 'olivier.rousseau@test.fr', 'Olivier', 'Rousseau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111162', 'fc-test-162', 'veronique.blanc@test.fr', 'Véronique', 'Blanc', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111163', 'fc-test-163', 'christophe.guerin@test.fr', 'Christophe', 'Guérin', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111164', 'fc-test-164', 'sylvie.muller@test.fr', 'Sylvie', 'Muller', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111165', 'fc-test-165', 'laurent.meyer@test.fr', 'Laurent', 'Meyer', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111166', 'fc-test-166', 'martine.lopez@test.fr', 'Martine', 'Lopez', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111167', 'fc-test-167', 'daniel.garcia@test.fr', 'Daniel', 'Garcia', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111168', 'fc-test-168', 'michele.rodriguez@test.fr', 'Michèle', 'Rodriguez', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111169', 'fc-test-169', 'marc.perez@test.fr', 'Marc', 'Perez', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111170', 'fc-test-170', 'brigitte.sanchez@test.fr', 'Brigitte', 'Sanchez', NOW(), NOW(), NOW());

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
   OR id::text LIKE '11111111-1111-1111-1111-11111111117%';
