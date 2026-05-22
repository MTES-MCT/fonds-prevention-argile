-- =============================================================================
-- Fixtures AMO + Allers-vers — dump du staging au 12 mai 2026
-- =============================================================================
-- SEED STAGING ONLY — ne JAMAIS jouer en production.
-- Le script orchestrateur `seed-staging.ts` refuse de tourner si
-- NEXT_PUBLIC_APP_ENV=production (cf. assertNotProduction).
--
-- Contenu :
--   - 11 entreprises AMO (incluant `dedd84de-…` utilisé par fake-parcours/03,
--     et les 3 AMOs `99999999*` que fake-parcours/13 attend déjà présents)
--   - 13 Allers-vers (incluant `88888888-…01/02` que fake-parcours/13 attend
--     déjà présents)
--   - 13 liaisons AV ↔ département
--   - 30 liaisons AV ↔ EPCI
--   - 37 liaisons AMO ↔ EPCI
--
-- Idempotence :
--   - AMO : ON CONFLICT (siret) DO UPDATE
--   - AV : DELETE par UUID puis INSERT (pas d'UNIQUE sur `nom`, deux Soliha)
--   - liaisons : ON CONFLICT DO NOTHING sur les PK composites
-- =============================================================================

-- =============================================================================
-- 0. Cleanup destructif (staging only)
-- =============================================================================
-- On wipe les tables AMO/AV pour que les INSERTs ci-dessous aient des IDs
-- propres, alignés sur ceux du dump staging. Sans ça, un re-seed sur une BDD
-- ayant déjà des AMOs avec des UUIDs différents mais le même siret aboutit à
-- des FK violations sur entreprises_amo_epci (ON CONFLICT siret ne met pas
-- l'id à jour : PostgreSQL n'autorise pas la mise à jour d'une PK référencée).
--
-- Dépendances :
--   - `parcours_amo_validations` (ON DELETE RESTRICT) → suppression explicite
--     (sera recréé par fake-parcours/03 plus tard dans le pipeline)
--   - `entreprises_amo_epci`, `entreprises_amo_communes` (ON DELETE CASCADE)
--   - `allers_vers_departements`, `allers_vers_epci` (ON DELETE CASCADE)
--   - `agents.entreprise_amo_id`, `agents.allers_vers_id` (ON DELETE SET NULL)
--     → les liens agents seront rétablis par l'étape `agents` (après amo-av).
DELETE FROM parcours_amo_validations;
DELETE FROM entreprises_amo;
DELETE FROM allers_vers;

-- =============================================================================
-- 1. Entreprises AMO (11 lignes)
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('3fe0b9e7-4371-40b4-b03f-da6d560b71ea'::uuid, 'Alohé', '78334556400042', 'Meurthe-et-Moselle 54', 'martin.letellier+alohe@beta.gouv.fr', '03 83 37 20 24', 'Esplanade Philippe Séguin 22-24 viaduc Kennedy BP 90380 54007 Nancy Cedex') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('a83baa10-9522-4f05-a604-8ecd5e9f6038'::uuid, 'ALTE (amo)', '13002526500013', 'Alpes de Haute provence 04', 'martin+futur@beta.gouv.fr', '0102030405', '12 rue de la Construction, 75001 Paris') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-9999-9999-999999999901'::uuid, 'AMO du Berry Profond (seed test)', '99999999900001', 'Indre 36', 'geraldine@amo-berry.fr', '02 54 00 00 00', '42 rue de la Châtaigne, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('5833143c-9397-4a80-a7fc-3c5eb37c7a28'::uuid, 'AMO Maison Tranquille', '34217127500329', 'Indre 36', 'samir.benfares@beta.gouv.fr', '0607080910', '78 impasse du Repos Assuré, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-9999-9999-999999999903'::uuid, 'AMO Tarn-et-Garonne (seed test)', '99999999900003', 'Tarn-et-Garonne 82', 'amo82@test.fr', '05 63 00 00 00', '1 rue de Montauban, 82000 Montauban') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, 'Anti-Fissure Express', '47250090600146', 'Gers 32', 'martin+express2@beta.gouv.fr', '0607080910', '34 place du Renforcement, 31000 Toulouse') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('adf89b45-d875-4840-a0f6-15d7fd72e79d'::uuid, 'Argile & Compagnie', '55204954702513', 'Gers 32', 'martin+argile@beta.gouv.fr', '0102030405', '8 impasse de la Terre, 32000 Ville') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, 'Cabinet Terre Solide', '35238011900034', 'Gers 32', 'martin+terre@beta.gouv.fr', '0607080910', '67 avenue de la Stabilité, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, 'Soliha', '53035701100010', 'Meurthe-et-Moselle 54', 'martin.letellier+soliha@beta.gouv.fr', '03 83 30 80 60', '12 Rue de la Monnaie, 54000 Nancy') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('066731d8-a0f7-4c2e-97b3-1bf4ef598d87'::uuid, 'Soliha 24', '38039570700033', 'Dordogne 24', 'martin+soliha@beta.gouv.fr', '09 78 67 35 62', '175 Rue Martha Desrumaux - 24000 PERIGUEUX') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-9999-9999-999999999902'::uuid, 'Soliha 54 (seed test)', '99999999900002', 'Meurthe-et-Moselle 54', 'soliha54@test.fr', '03 83 00 00 00', '1 rue de Nancy, 54000 Nancy') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();

-- =============================================================================
-- 2. Allers-vers (13 lignes)
-- =============================================================================
-- Pas d'UNIQUE sur `nom` (deux structures "Soliha"). DELETE par UUID puis INSERT.

DELETE FROM allers_vers WHERE id IN (
  '5c4b8ec3-eff8-4b19-9a64-eeb4ee6c9a35'::uuid,
  '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid,
  '88888888-8888-8888-8888-888888888801'::uuid,
  '665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid,
  '87fa62a7-8250-4656-86a5-9235a88e12b4'::uuid,
  '3ab67d9d-3841-4b46-bc96-f4785aac0b1b'::uuid,
  'c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid,
  '795697ef-c9f6-4a0d-8028-60096072309e'::uuid,
  '88888888-8888-8888-8888-888888888802'::uuid,
  '86e60959-8a55-4d20-bff5-3c601981facd'::uuid,
  'ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid,
  '5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid,
  'bb984000-bf97-4284-b62d-c58485c134fa'::uuid
);

INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('5c4b8ec3-eff8-4b19-9a64-eeb4ee6c9a35'::uuid, 'Adil 32', '{direction@adil32.org}'::text[], '0581323505', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid, 'Adil 36', '{contact@adil36.org}'::text[], '0254273737', 'Centre Colbert 1 place Eugène Rolland - Bât. I 36000 CHÂTEAUROUX');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('88888888-8888-8888-8888-888888888801'::uuid, 'Allers-Vers Centre Indre (seed test)', '{jeanpatrick@allers-vers-indre.fr}'::text[], '02 54 11 11 11', '7 place du Marché, 36100 Issoudun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid, 'Alohé', '{Contact@alohe.com}'::text[], '07867834', '78 impasse du Repos Assuré, 36000 Châteauroux');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('87fa62a7-8250-4656-86a5-9235a88e12b4'::uuid, 'Alte', '{contact@alte-provence.org}'::text[], '0299898765', '2 rue de la Fondation Solide, 77000 Melun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('3ab67d9d-3841-4b46-bc96-f4785aac0b1b'::uuid, 'Caue', '{preventionrga@tarnetgaronne.fr}'::text[], '0563036092', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, 'Soliha', '{contact@soliha54.fr}'::text[], '08786544', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('795697ef-c9f6-4a0d-8028-60096072309e'::uuid, 'Soliha', '{contact@sol-stable.fr,urgence@sol-stable.fr}'::text[], '0102030405', '2 rue de la Fondation Solide, 77000 Melun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('88888888-8888-8888-8888-888888888802'::uuid, 'Soliha 54 AV (seed test)', '{soliha54@test.fr}'::text[], '03 83 00 00 00', '1 rue de Nancy, 54000 Nancy');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, 'Soliha Douaisis', '{prevention-rga-nord@soliha.fr}'::text[], '0327958910', '1038 Rue de Douai, 59450 Sin-le-Noble');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid, 'Soliha Hainaut Cambrésis', '{prevention-rga-nord@soliha.fr}'::text[], '0327450964', '133 rue Déportés du Train de Loos, 59 300 Valenciennes');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, 'Soliha Hauts-de-France', '{prevention-rga-nord@soliha.fr}'::text[], '0675725239', '73 boulevard de la Moselle 59 000 LILLE');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('bb984000-bf97-4284-b62d-c58485c134fa'::uuid, 'Soliha Sambre Avesnois', '{prevention-rga-nord@soliha.fr}'::text[], '0788618311', '4 rue de la Croix,  59600 Maubeuge');

-- =============================================================================
-- 3. Liaisons AV ↔ département (13 lignes)
-- =============================================================================
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid, '36') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('3ab67d9d-3841-4b46-bc96-f4785aac0b1b'::uuid, '82') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('5c4b8ec3-eff8-4b19-9a64-eeb4ee6c9a35'::uuid, '32') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, '59') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid, '54') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('795697ef-c9f6-4a0d-8028-60096072309e'::uuid, '24') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, '59') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('87fa62a7-8250-4656-86a5-9235a88e12b4'::uuid, '04') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('88888888-8888-8888-8888-888888888801'::uuid, '36') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('88888888-8888-8888-8888-888888888802'::uuid, '54') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid, '59') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('bb984000-bf97-4284-b62d-c58485c134fa'::uuid, '59') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_departements (allers_vers_id, code_departement) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '54') ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. Liaisons AV ↔ EPCI (30 lignes)
-- =============================================================================
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, '200040947') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, '200040954') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, '245900758') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid, '245400676') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, '200041960') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, '200044618') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, '245901152') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid, '200042190') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid, '200068500') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('bb984000-bf97-4284-b62d-c58485c134fa'::uuid, '200043321') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('bb984000-bf97-4284-b62d-c58485c134fa'::uuid, '200043396') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200035772') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200041515') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200043693') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200067643') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200069433') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070290') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070324') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070563') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070589') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070738') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200070845') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '200071066') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400171') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400189') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400262') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400510') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400601') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245400759') ON CONFLICT DO NOTHING;
INSERT INTO allers_vers_epci (allers_vers_id, code_epci) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '245701404') ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. Liaisons AMO ↔ EPCI (37 lignes)
-- =============================================================================
-- Table `entreprises_amo_communes` (code_insee) : vide en staging — non seeded.

INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('3fe0b9e7-4371-40b4-b03f-da6d560b71ea'::uuid, '245400676') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '200023620') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '200034726') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '200042372') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '200066926') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '243200391') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '243200599') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, '248200016') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200035772') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200041515') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200043693') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200067643') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200069433') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070290') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070324') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070563') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070589') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070738') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200070845') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '200071066') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400171') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400189') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400262') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400510') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400601') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245400759') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, '245701404') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('adf89b45-d875-4840-a0f6-15d7fd72e79d'::uuid, '200035756') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('adf89b45-d875-4840-a0f6-15d7fd72e79d'::uuid, '200072320') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('adf89b45-d875-4840-a0f6-15d7fd72e79d'::uuid, '243200425') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '200030435') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '200035632') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '243200409') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '243200417') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '243200458') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '243200508') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, '243200607') ON CONFLICT DO NOTHING;
