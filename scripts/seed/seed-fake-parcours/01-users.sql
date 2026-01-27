-- =============================================================================
-- 01-USERS : Création des utilisateurs de test (40 utilisateurs)
-- =============================================================================

INSERT INTO users (id, fc_id, email, prenom, nom, last_login, created_at, updated_at)
VALUES
  -- Dossiers suivis LOGEMENT_ELIGIBLE (12 utilisateurs)
  ('11111111-1111-1111-1111-111111111101', 'fc-test-101', 'mario.brosse@test.fr', 'Mario', 'Brosse', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102', 'fc-test-102', 'mickey.mousse@test.fr', 'Mickey', 'Mousse', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103', 'fc-test-103', 'harry.pottier@test.fr', 'Harry', 'Pottier', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111104', 'fc-test-104', 'jean.neige@test.fr', 'Jean', 'Neige', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111105', 'fc-test-105', 'luke.marcheur@test.fr', 'Luke', 'Marcheur', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111106', 'fc-test-106', 'bob.leponge@test.fr', 'Bob', 'Leponge', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111107', 'fc-test-107', 'hermione.grognon@test.fr', 'Hermione', 'Grognon', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111108', 'fc-test-108', 'kylian.mbapied@test.fr', 'Kylian', 'Mbapied', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111109', 'fc-test-109', 'dark.vador@test.fr', 'Dark', 'Vador', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111110', 'fc-test-110', 'shrek.loignon@test.fr', 'Shrek', 'Loignon', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'fc-test-111', 'elsa.gelato@test.fr', 'Elsa', 'Gelato', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111112', 'fc-test-112', 'gandalf.legris@test.fr', 'Gandalf', 'Legris', NOW(), NOW(), NOW()),

  -- Demandes EN_ATTENTE (8 utilisateurs)
  ('11111111-1111-1111-1111-111111111113', 'fc-test-113', 'obiwan.kenoubi@test.fr', 'Obiwan', 'Kenoubi', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111114', 'fc-test-114', 'homer.sympson@test.fr', 'Homer', 'Sympson', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111115', 'fc-test-115', 'spiderman.tisseur@test.fr', 'Peter', 'Tisseur', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111116', 'fc-test-116', 'tony.stork@test.fr', 'Tony', 'Stork', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111117', 'fc-test-117', 'wonder.femme@test.fr', 'Diana', 'Princesse', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111118', 'fc-test-118', 'batman.chevalier@test.fr', 'Bruce', 'Chauvesouris', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111119', 'fc-test-119', 'zelda.hyrule@test.fr', 'Zelda', 'Hyrule', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111120', 'fc-test-120', 'sonic.herisson@test.fr', 'Sonic', 'Hérisson', NOW(), NOW(), NOW()),

  -- Demandes REFUSÉES - LOGEMENT_NON_ELIGIBLE (6 utilisateurs)
  ('11111111-1111-1111-1111-111111111121', 'fc-test-121', 'wolverine.griffu@test.fr', 'Logan', 'Griffu', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111122', 'fc-test-122', 'thor.marteau@test.fr', 'Thor', 'Marteau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111123', 'fc-test-123', 'pikachu.voltage@test.fr', 'Pikachu', 'Voltage', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111124', 'fc-test-124', 'donkey.banane@test.fr', 'Donkey', 'Banane', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111125', 'fc-test-125', 'lara.tombe@test.fr', 'Lara', 'Tombe', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111126', 'fc-test-126', 'james.lien@test.fr', 'James', 'Lien', NOW(), NOW(), NOW()),

  -- Demandes REFUSÉES - ACCOMPAGNEMENT_REFUSE (4 utilisateurs)
  ('11111111-1111-1111-1111-111111111127', 'fc-test-127', 'indiana.jones@test.fr', 'Indiana', 'Cailloux', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111128', 'fc-test-128', 'jack.moineau@test.fr', 'Jack', 'Moineau', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111129', 'fc-test-129', 'katniss.fleche@test.fr', 'Katniss', 'Flèche', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111130', 'fc-test-130', 'neo.matrice@test.fr', 'Néo', 'Matrice', NOW(), NOW(), NOW()),

  -- Utilisateurs supplémentaires (10 utilisateurs)
  ('11111111-1111-1111-1111-111111111131', 'fc-test-131', 'yoda.maitre@test.fr', 'Yoda', 'Maître', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111132', 'fc-test-132', 'groot.arbuste@test.fr', 'Groot', 'Arbuste', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111133', 'fc-test-133', 'dora.explore@test.fr', 'Dora', 'Explore', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111134', 'fc-test-134', 'asterix.gaulois@test.fr', 'Astérix', 'Gaulois', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111135', 'fc-test-135', 'obelix.menhir@test.fr', 'Obélix', 'Menhir', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111136', 'fc-test-136', 'tintin.reporter@test.fr', 'Tintin', 'Reporter', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111137', 'fc-test-137', 'lucky.luke@test.fr', 'Lucky', 'Luc', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111138', 'fc-test-138', 'gaston.lagaffe@test.fr', 'Gaston', 'Lagaffe', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111139', 'fc-test-139', 'mortadelle.jambon@test.fr', 'Mortadelle', 'Jambon', NOW(), NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111140', 'fc-test-140', 'idefix.chien@test.fr', 'Idéfix', 'Chien', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT COUNT(*) as users_crees FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%';
