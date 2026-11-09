-- Experts RGA fictifs (ADR-0052) : contacts en example.org, SIRET fictifs à clé valide.
-- Couvre l'Indre (36), le Cher (18), l'Allier (03, code stocké parfois en « 3 ») et le Nord (59, CA de Cambrai),
-- un expert désactivé qui ne doit apparaître que dans l'administration, et une société à la fois AMO et
-- experte : deux structures du même SIRET, une structure expert ne portant que l'expertise (ADR-0053).
-- Comme les AMO et Aller-vers de l'étape amo-av : tous les experts repartent du seed, recette comprise.
DELETE FROM experts;

INSERT INTO structures (id, nom, type) VALUES
  ('66666666-6666-4666-8666-666666666601', 'Géotechnique du Berry (seed test)', 'expert'),
  ('66666666-6666-4666-8666-666666666602', 'Expertise Sols Centre (seed test)', 'expert'),
  ('66666666-6666-4666-8666-666666666603', 'Ancien Expert Argile (seed test)', 'expert'),
  ('66666666-6666-4666-8666-666666666604', 'AMO Maison Tranquille', 'expert')
ON CONFLICT (id) DO NOTHING;

INSERT INTO experts (id, nom, siret, date_validation_dhup, contact_interne_nom, contact_interne_email,
  contact_interne_telephone, structure_id, desactive_at, desactive_raison) VALUES
  ('55555555-5555-4555-8555-555555555501', 'Géotechnique du Berry (seed test)', '88888888800003', '2026-05-15',
   'Claire Interne', 'interne-berry@example.org', '0600000001', '66666666-6666-4666-8666-666666666601', NULL, NULL),
  ('55555555-5555-4555-8555-555555555502', 'Expertise Sols Centre (seed test)', '88888888800011', '2026-06-02',
   NULL, NULL, NULL, '66666666-6666-4666-8666-666666666602', NULL, NULL),
  ('55555555-5555-4555-8555-555555555503', 'Ancien Expert Argile (seed test)', '88888888800029', '2026-05-15',
   'Paul Interne', 'interne-ancien@example.org', NULL, '66666666-6666-4666-8666-666666666603',
   now() - interval '10 days', 'Cessation d''activité (seed test)');

-- La société de l'AMO Maison Tranquille est aussi experte : sa structure expert reprend le SIRET de l'AMO.
INSERT INTO experts (id, nom, siret, date_validation_dhup, structure_id) VALUES
  ('55555555-5555-4555-8555-555555555504', 'AMO Maison Tranquille', '99999999900006', '2026-07-01',
   '66666666-6666-4666-8666-666666666604');

INSERT INTO experts_departements (expert_id, code_departement, email, telephone) VALUES
  ('55555555-5555-4555-8555-555555555501', '36', 'berry-indre@example.org', '02 54 00 00 01'),
  ('55555555-5555-4555-8555-555555555501', '18', 'berry-cher@example.org', '02 48 00 00 01'),
  ('55555555-5555-4555-8555-555555555502', '36', 'sols-centre@example.org', NULL),
  ('55555555-5555-4555-8555-555555555502', '03', 'sols-allier@example.org', '04 70 00 00 01'),
  ('55555555-5555-4555-8555-555555555502', '59', NULL, '03 27 00 00 01'),
  ('55555555-5555-4555-8555-555555555503', '36', 'ancien@example.org', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO experts_departements (expert_id, code_departement, email)
SELECT id, '36', 'maison-tranquille-expert@example.org' FROM experts WHERE id = '55555555-5555-4555-8555-555555555504'
ON CONFLICT DO NOTHING;

-- Une structure expert vidée par le DELETE ci-dessus (seed précédent, ou expert séparé de son AMO par la
-- migration 0061) ne doit pas rester sans habilitation.
DELETE FROM structures s
 WHERE s.type = 'expert'
   AND NOT EXISTS (SELECT 1 FROM experts e WHERE e.structure_id = s.id)
   AND NOT EXISTS (SELECT 1 FROM agents a WHERE a.structure_id = s.id);
