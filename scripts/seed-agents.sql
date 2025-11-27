-- Script pour créer les premiers agents super administrateurs
-- À exécuter manuellement après la migration de la table agents
-- 
-- Commande : psql -d fonds_prevention_argile -f scripts/seed-agents.sql

INSERT INTO agents (sub, email, given_name, usual_name, role) VALUES
  ('pending_samir', 'samir.benfares@beta.gouv.fr', 'Samir', 'Benfares', 'super_administrateur'),
  ('pending_guillaume', 'guillaume.bertrand@beta.gouv.fr', 'Guillaume', 'Bertrand', 'super_administrateur'),
  ('pending_maxime', 'maxime.amieux@beta.gouv.fr', 'Maxime', 'Amieux', 'super_administrateur'),
  ('pending_martin', 'martin.letellier@beta.gouv.fr', 'Martin', 'Letellier', 'super_administrateur'),
  ('pending_yopmail', 'user@yopmail.com', 'User', 'Yop', 'super_administrateur')
ON CONFLICT (email) DO UPDATE SET role = 'super_administrateur';