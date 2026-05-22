-- =============================================================================
-- 08-PROSPECT-QUALIFICATIONS : Qualifications de prospects par l'agent allers-vers
-- =============================================================================
-- Agent allers-vers : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002 (Jean-Patrick Duval)
-- Prospects éligibles : 555...531 à 535 (situation_particulier = 'eligible')
-- Prospects archivés : 555...536 à 538 (situation_particulier = 'archive')
-- Prospects récents : 555...501 à 510 (situation_particulier = 'prospect')
-- UUID prefix qualifications : 66666666-6666-6666-6666-6666666666xx

-- =============================================================================
-- 3 prospects qualifiés "éligible"
-- =============================================================================

-- Prospect 531 : éligible après appel + email
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666601',
  '55555555-5555-5555-5555-555555555531',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'eligible',
  '{"appel_telephonique","email_envoye"}',
  NULL,
  'Très motivé, maison éligible confirmée. A déjà repéré des fissures.',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
);

-- Prospect 532 : éligible après visite à domicile (pas de note)
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666602',
  '55555555-5555-5555-5555-555555555532',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'eligible',
  '{"visite_domicile"}',
  NULL,
  NULL,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- Prospect 533 : éligible après appel + rendez-vous
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666603',
  '55555555-5555-5555-5555-555555555533',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'eligible',
  '{"appel_telephonique","rendez_vous_structure"}',
  NULL,
  'RAS',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- =============================================================================
-- 2 prospects qualifiés "non_eligible" (déjà archivés dans 05-prospects)
-- =============================================================================

-- Prospect 536 : non éligible — appartement
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666604',
  '55555555-5555-5555-5555-555555555536',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'non_eligible',
  '{"appel_telephonique"}',
  '{"appartement"}',
  'Appartement T3 en copropriété, ne rentre pas dans le dispositif.',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
);

-- Prospect 537 : non éligible — hors zone + maison trop endommagée
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666605',
  '55555555-5555-5555-5555-555555555537',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'non_eligible',
  '{"email_envoye","appel_telephonique"}',
  '{"hors_zone_perimetre","maison_trop_endommagee"}',
  NULL,
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
);

-- =============================================================================
-- 1 prospect qualifié "à qualifier" (reste en situation_particulier = 'prospect')
-- =============================================================================

-- Prospect 501 : à qualifier — pas joignable
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666606',
  '55555555-5555-5555-5555-555555555501',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'a_qualifier',
  '{"appel_telephonique"}',
  NULL,
  'Pas joignable au premier appel, réessayer la semaine prochaine.',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

-- =============================================================================
-- 1 prospect avec historique : d'abord non_eligible, puis re-qualifié eligible
-- (prospect 534, actuellement situation_particulier = 'eligible')
-- =============================================================================

-- Première qualification : non éligible (il y a 15 jours)
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666607',
  '55555555-5555-5555-5555-555555555534',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'non_eligible',
  '{"appel_telephonique"}',
  '{"hors_plafonds_ressources"}',
  'Revenus déclarés au-dessus des plafonds, mais demandeur conteste.',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
);

-- Deuxième qualification : re-qualifié éligible après vérification (il y a 4 jours)
INSERT INTO prospect_qualifications (id, parcours_id, agent_id, decision, actions_realisees, raisons_ineligibilite, note, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666608',
  '55555555-5555-5555-5555-555555555534',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'eligible',
  '{"appel_telephonique","visite_domicile"}',
  NULL,
  'Après vérification avis d''imposition, les revenus sont bien sous le plafond. Erreur initiale.',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
);

-- =============================================================================
-- Vérification
-- =============================================================================
SELECT
  decision,
  COUNT(*) as total
FROM prospect_qualifications
WHERE id::text LIKE '66666666-6666-6666-6666-6666666666%'
GROUP BY decision
ORDER BY decision;
