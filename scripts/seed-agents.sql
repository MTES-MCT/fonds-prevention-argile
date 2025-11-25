-- Script pour créer les premiers agents administrateurs
-- À exécuter manuellement après la migration de la table agents
-- 
-- Commande : psql -d fonds_prevention_argile -f scripts/seed-agents.sql

INSERT INTO agents (sub, email, given_name, usual_name, role) VALUES
  ('test-admin-samir', 'samir.benfares@beta.gouv.fr', 'Samir', 'Benfares', 'ADMIN'),
  ('test-admin-guillaume', 'guillaume.bertrand@beta.gouv.fr', 'Guillaume', 'Bertrand', 'ADMIN'),
  ('test-admin-maxime', 'maxime.amieux@beta.gouv.fr', 'Maxime', 'Amieux', 'ADMIN'),
  ('test-admin-martin', 'martin.letellier@beta.gouv.fr', 'Martin', 'Letellier', 'ADMIN')
ON CONFLICT (sub) DO NOTHING;