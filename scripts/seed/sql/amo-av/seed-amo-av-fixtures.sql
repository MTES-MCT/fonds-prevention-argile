-- =============================================================================
-- Fixtures AMO + Allers-vers — structures de test
-- =============================================================================
-- SEED STAGING ONLY — ne JAMAIS jouer en production.
-- Le script orchestrateur `seed-staging.ts` refuse de tourner si
-- NEXT_PUBLIC_APP_ENV=production (cf. assertNotProduction).
--
-- Aucune coordonnée réelle ici : emails en `@example.org` (RFC 2606, jamais
-- délivrable), téléphones en `0X XX 00 00 00`, SIRET en série `999999999000XX`.
-- Ce fichier est issu d'un dump du staging, mais les contacts des structures
-- partenaires en ont été retirés : ils sont **utilisés par l'application**, qui
-- écrit à l'AMO du territoire à l'auto-attribution — un test de staging aurait
-- envoyé de vrais emails à de vraies structures. Pour recevoir ces invitations
-- pendant une session de test, passer `SEED_STRUCTURES_EMAIL` : le seed dérive un
-- alias par structure à partir du slug ci-dessous (cf. README).
--
-- Noms et périmètres territoriaux sont conservés : ils sont publics (l'app les
-- affiche aux demandeurs) et les checklists de test s'y réfèrent.
--
-- Contenu :
--   - 13 entreprises AMO (incluant `dedd84de-…` utilisé par fake-parcours/03,
--     et les 3 AMOs `99999999*` que fake-parcours/13 attend déjà présents)
--   - 13 Allers-vers (incluant `88888888-…01/02` que fake-parcours/13 attend
--     déjà présents)
--   - 13 liaisons AV ↔ département
--   - 30 liaisons AV ↔ EPCI
--   - 39 liaisons AMO ↔ EPCI (dont un EPCI couvert par deux AMO, cf. § 5)
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
-- 1. Entreprises AMO (13 lignes)
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('3fe0b9e7-4371-40b4-b03f-da6d560b71ea'::uuid, 'Alohé', '99999999900004', 'Meurthe-et-Moselle 54', 'alohe@example.org', '03 83 00 00 00', '1 rue de Nancy, 54000 Nancy') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('a83baa10-9522-4f05-a604-8ecd5e9f6038'::uuid, 'ALTE (amo)', '99999999900005', 'Alpes de Haute provence 04', 'alte@example.org', '0102030405', '12 rue de la Construction, 75001 Paris') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-4999-8999-999999999901'::uuid, 'AMO du Berry Profond (seed test)', '99999999900001', 'Indre 36', 'amo-berry@example.org', '02 54 00 00 00', '42 rue de la Châtaigne, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('5833143c-9397-4a80-a7fc-3c5eb37c7a28'::uuid, 'AMO Maison Tranquille', '99999999900006', 'Indre 36', 'maison-tranquille@example.org', '0607080910', '78 impasse du Repos Assuré, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-4999-8999-999999999903'::uuid, 'AMO Tarn-et-Garonne (seed test)', '99999999900003', 'Tarn-et-Garonne 82', 'amo-82@example.org', '05 63 00 00 00', '1 rue de Montauban, 82000 Montauban') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('dedd84de-da92-4825-aba3-6f2ee43803fe'::uuid, 'Anti-Fissure Express', '99999999900007', 'Gers 32', 'anti-fissure-express@example.org', '0607080910', '34 place du Renforcement, 31000 Toulouse') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('adf89b45-d875-4840-a0f6-15d7fd72e79d'::uuid, 'Argile & Compagnie', '99999999900008', 'Gers 32', 'argile-compagnie@example.org', '0102030405', '8 impasse de la Terre, 32000 Ville') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('6e9de6e7-3d5d-4149-9e33-c06755cc4da0'::uuid, 'Cabinet Terre Solide', '99999999900009', 'Gers 32', 'terre-solide@example.org', '0607080910', '67 avenue de la Stabilité, 36000 Châteauroux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('9bf88991-f647-4661-8096-19c62d223186'::uuid, 'Soliha', '99999999900010', 'Meurthe-et-Moselle 54', 'soliha-54@example.org', '03 83 00 00 00', '2 rue de Nancy, 54000 Nancy') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('066731d8-a0f7-4c2e-97b3-1bf4ef598d87'::uuid, 'Soliha 24', '99999999900011', 'Dordogne 24', 'soliha-24@example.org', '05 53 00 00 00', '1 rue de Périgueux, 24000 Périgueux') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('99999999-9999-4999-8999-999999999902'::uuid, 'Soliha 54 (seed test)', '99999999900002', 'Meurthe-et-Moselle 54', 'soliha-54-seed@example.org', '03 83 00 00 00', '1 rue de Nancy, 54000 Nancy') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
-- Deux AMO sur le même EPCI (CA de Cambrai) : seul territoire où le demandeur doit choisir.
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('dc467f8e-6bc5-408f-a263-1474b03387f9'::uuid, 'Habitat Cambrésis (seed test)', '99999999900012', 'Nord 59', 'habitat-cambresis@example.org', '03 27 00 00 01', '3 rue de Noyon, 59400 Cambrai') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse) VALUES ('6a4403e5-1c9d-4e3e-b2b1-77ed657467a6'::uuid, 'Argiles du Nord (seed test)', '99999999900013', 'Nord 59', 'argiles-du-nord@example.org', '03 27 00 00 02', '8 place Aristide Briand, 59400 Cambrai') ON CONFLICT (siret) DO UPDATE SET nom = EXCLUDED.nom, departements = EXCLUDED.departements, emails = EXCLUDED.emails, telephone = EXCLUDED.telephone, adresse = EXCLUDED.adresse, updated_at = now();

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

INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('5c4b8ec3-eff8-4b19-9a64-eeb4ee6c9a35'::uuid, 'Adil 32', '{adil-32@example.org}'::text[], '05 62 00 00 00', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid, 'Adil 36', '{adil-36@example.org}'::text[], '02 54 00 00 00', '1 place de Châteauroux, 36000 Châteauroux');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('88888888-8888-8888-8888-888888888801'::uuid, 'Allers-Vers Centre Indre (seed test)', '{av-centre-indre@example.org}'::text[], '02 54 11 11 11', '7 place du Marché, 36100 Issoudun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid, 'Alohé', '{alohe-av@example.org}'::text[], '03 83 00 00 00', '78 impasse du Repos Assuré, 36000 Châteauroux');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('87fa62a7-8250-4656-86a5-9235a88e12b4'::uuid, 'Alte', '{alte-av@example.org}'::text[], '04 92 00 00 00', '2 rue de la Fondation Solide, 77000 Melun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('3ab67d9d-3841-4b46-bc96-f4785aac0b1b'::uuid, 'Caue', '{caue-82@example.org}'::text[], '05 63 00 00 00', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, 'Soliha', '{soliha-54-av@example.org}'::text[], '03 83 00 00 00', '');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('795697ef-c9f6-4a0d-8028-60096072309e'::uuid, 'Soliha', '{soliha-24-av@example.org,urgence-24@example.org}'::text[], '0102030405', '2 rue de la Fondation Solide, 77000 Melun');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('88888888-8888-8888-8888-888888888802'::uuid, 'Soliha 54 AV (seed test)', '{soliha-54-seed-av@example.org}'::text[], '03 83 00 00 00', '1 rue de Nancy, 54000 Nancy');
-- Les 4 Soliha Hauts-de-France partagent volontairement une seule adresse : c'est le cas
-- « une adresse dans plusieurs listes de diffusion » (cf. listes-diffusion.service, ADR-0029).
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('86e60959-8a55-4d20-bff5-3c601981facd'::uuid, 'Soliha Douaisis', '{soliha-nord@example.org}'::text[], '03 27 00 00 00', '1 rue de Douai, 59450 Sin-le-Noble');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('ae9cb9ec-ee5e-48b6-8d06-91c053759ff7'::uuid, 'Soliha Hainaut Cambrésis', '{soliha-nord@example.org}'::text[], '03 27 00 00 00', '1 rue de Valenciennes, 59300 Valenciennes');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('5c9da89c-456c-4efd-ab39-77a06e84bf2a'::uuid, 'Soliha Hauts-de-France', '{soliha-nord@example.org}'::text[], '03 20 00 00 00', '1 rue de Lille, 59000 Lille');
INSERT INTO allers_vers (id, nom, emails, telephone, adresse) VALUES ('bb984000-bf97-4284-b62d-c58485c134fa'::uuid, 'Soliha Sambre Avesnois', '{soliha-nord@example.org}'::text[], '03 27 00 00 00', '1 rue de Maubeuge, 59600 Maubeuge');

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
-- 5. Liaisons AMO ↔ EPCI (39 lignes)
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

-- CA de Cambrai (200068500) : les deux AMO du Nord, pour tester le choix du demandeur.
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('dc467f8e-6bc5-408f-a263-1474b03387f9'::uuid, '200068500') ON CONFLICT DO NOTHING;
INSERT INTO entreprises_amo_epci (entreprise_amo_id, code_epci) VALUES ('6a4403e5-1c9d-4e3e-b2b1-77ed657467a6'::uuid, '200068500') ON CONFLICT DO NOTHING;
