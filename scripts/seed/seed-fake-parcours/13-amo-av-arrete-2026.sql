-- =============================================================================
-- 13 - SEED : AMO / Aller-Vers de test pour l'arrêté 2026 (AMO facultatif/obligatoire)
-- =============================================================================
-- Crée TOUTES les structures nécessaires pour tester les 3 modes côté /mon-compte
-- (le script est auto-suffisant : pas de dépendance sur 07-commentaires.sql).
--
--   - Mode OBLIGATOIRE (dept 36)         : AMO Indre + AV Indre liés au dept
--   - Mode AV_AMO_FUSIONNES (dept 54)    : 1 AMO Soliha + 1 AV Soliha liés au dept 54
--   - Mode FACULTATIF + AMO (dept 82)    : 1 AMO disponible
--   - Mode FACULTATIF SANS AMO (dept 75) : rien à seeder, l'absence est testée d'office
--
-- Idempotent : DELETE préalable + ON CONFLICT DO NOTHING.
-- =============================================================================

-- =============================================================================
-- NETTOYAGE des structures de test introduites par ce script
-- =============================================================================
DELETE FROM allers_vers_departements
  WHERE allers_vers_id IN (
    '88888888-8888-8888-8888-888888888801', -- AV Indre 36
    '88888888-8888-8888-8888-888888888802'  -- AV Soliha 54
  );

DELETE FROM allers_vers
  WHERE id IN (
    '88888888-8888-8888-8888-888888888801',
    '88888888-8888-8888-8888-888888888802'
  );

DELETE FROM entreprises_amo
  WHERE siret IN ('99999999900001', '99999999900002', '99999999900003');

-- =============================================================================
-- MODE OBLIGATOIRE (dept 36)
-- 1 AMO + 1 AV liés au dept 36 (l'AV permet aussi de tester `AllerVersLocal`)
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse)
VALUES (
  '99999999-9999-9999-9999-999999999901',
  'AMO du Berry Profond (seed test)',
  '99999999900001',
  'Indre 36',
  'geraldine@amo-berry.fr',
  '02 54 00 00 00',
  '42 rue de la Châtaigne, 36000 Châteauroux'
)
ON CONFLICT (siret) DO NOTHING;

INSERT INTO allers_vers (id, nom, emails, telephone, adresse)
VALUES (
  '88888888-8888-8888-8888-888888888801',
  'Allers-Vers Centre Indre (seed test)',
  ARRAY['jeanpatrick@allers-vers-indre.fr'],
  '02 54 11 11 11',
  '7 place du Marché, 36100 Issoudun'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO allers_vers_departements (allers_vers_id, code_departement)
VALUES ('88888888-8888-8888-8888-888888888801', '36')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODE AV_AMO_FUSIONNES (dept 54)
-- 1 AMO Soliha + 1 AV Soliha (mêmes coordonnées : c'est la même structure qui
-- joue les deux rôles, conformément à la spec arrêté 2026).
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse)
VALUES (
  '99999999-9999-9999-9999-999999999902',
  'Soliha 54 (seed test)',
  '99999999900002',
  'Meurthe-et-Moselle 54',
  'soliha54@test.fr',
  '03 83 00 00 00',
  '1 rue de Nancy, 54000 Nancy'
)
ON CONFLICT (siret) DO NOTHING;

INSERT INTO allers_vers (id, nom, emails, telephone, adresse)
VALUES (
  '88888888-8888-8888-8888-888888888802',
  'Soliha 54 AV (seed test)',
  ARRAY['soliha54@test.fr'],
  '03 83 00 00 00',
  '1 rue de Nancy, 54000 Nancy'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO allers_vers_departements (allers_vers_id, code_departement)
VALUES ('88888888-8888-8888-8888-888888888802', '54')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODE FACULTATIF + AMO disponible (dept 82)
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse)
VALUES (
  '99999999-9999-9999-9999-999999999903',
  'AMO Tarn-et-Garonne (seed test)',
  '99999999900003',
  'Tarn-et-Garonne 82',
  'amo82@test.fr',
  '05 63 00 00 00',
  '1 rue de Montauban, 82000 Montauban'
)
ON CONFLICT (siret) DO NOTHING;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
SELECT 'AMO de test (arrêté 2026) :' AS info, count(*) AS total
FROM entreprises_amo
WHERE siret IN ('99999999900001', '99999999900002', '99999999900003');

SELECT 'AV liés à des départements :' AS info, count(*) AS total
FROM allers_vers_departements
WHERE allers_vers_id IN (
  '88888888-8888-8888-8888-888888888801',
  '88888888-8888-8888-8888-888888888802'
);
