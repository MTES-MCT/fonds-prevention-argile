-- =============================================================================
-- 07-COMMENTAIRES : Agents fictifs AMO / Allers-Vers + commentaires décalés
-- =============================================================================
-- Crée :
--   - 1 entreprise AMO fictive
--   - 1 structure Allers-Vers fictive
--   - 1 agent AMO (Géraldine Moulin)
--   - 1 agent Allers-Vers (Jean-Patrick Duval)
--   - Des commentaires drôles sur les parcours existants
--
-- Ces agents ne sont pas connectables (sub = 'seed_xxx', pas de vrai ProConnect)
-- Utile pour tester que l'on ne peut pas modifier/supprimer les commentaires d'autrui
-- =============================================================================

-- Nettoyage des anciennes données de seed commentaires
DELETE FROM parcours_commentaires WHERE id::text LIKE '77777777-7777-7777-7777-7777777777%';
DELETE FROM agents WHERE sub IN ('seed_geraldine', 'seed_jeanpatrick');
DELETE FROM entreprises_amo WHERE siret = '99999999900001';
DELETE FROM allers_vers WHERE id = '88888888-8888-8888-8888-888888888801';

-- =============================================================================
-- 1. Créer une entreprise AMO fictive
-- =============================================================================
INSERT INTO entreprises_amo (id, nom, siret, departements, emails, telephone, adresse)
VALUES (
  '99999999-9999-9999-9999-999999999901',
  'AMO du Berry Profond',
  '99999999900001',
  'Indre 36',
  'geraldine@amo-berry.fr',
  '02 54 00 00 00',
  '42 rue de la Châtaigne, 36000 Châteauroux'
)
ON CONFLICT (siret) DO NOTHING;

-- =============================================================================
-- 2. Créer une structure Allers-Vers fictive
-- =============================================================================
INSERT INTO allers_vers (id, nom, emails, telephone, adresse)
VALUES (
  '88888888-8888-8888-8888-888888888801',
  'Allers-Vers Centre Indre',
  ARRAY['jeanpatrick@allers-vers-indre.fr'],
  '02 54 11 11 11',
  '7 place du Marché, 36100 Issoudun'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Créer les agents fictifs
-- =============================================================================
INSERT INTO agents (id, sub, email, given_name, usual_name, role, entreprise_amo_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  'seed_geraldine',
  'geraldine.moulin@amo-berry.fr',
  'Géraldine',
  'Moulin',
  'amo',
  '99999999-9999-9999-9999-999999999901'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO agents (id, sub, email, given_name, usual_name, role, allers_vers_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'seed_jeanpatrick',
  'jeanpatrick.duval@allers-vers-indre.fr',
  'Jean-Patrick',
  'Duval',
  'allers_vers',
  '88888888-8888-8888-8888-888888888801'
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 4. Commentaires sur les parcours AMO (22222222-...)
-- =============================================================================
INSERT INTO parcours_commentaires (id, parcours_id, agent_id, author_name, author_structure, author_structure_type, message, created_at, updated_at)
VALUES
  -- Parcours 01 - Mario Brosse (Châteauroux, eligibilite)
  ('77777777-7777-7777-7777-777777777701', '22222222-2222-2222-2222-222222222201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Le demandeur m''a appelé pour me dire que ses portes ne fermaient plus. J''ai failli lui répondre que c''était peut-être juste le vent, mais bon, professionnalisme oblige.',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

  ('77777777-7777-7777-7777-777777777702', '22222222-2222-2222-2222-222222222201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Passage sur site effectué. La maison bouge tellement que le chat du voisin refuse d''y entrer. Diagnostic RGA confirmé.',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),

  -- Parcours 02 - (Châteauroux, diagnostic)
  ('77777777-7777-7777-7777-777777777703', '22222222-2222-2222-2222-222222222202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Le propriétaire m''a offert un café pendant la visite. Excellent café d''ailleurs. Ah oui, les fissures : elles sont bien là, surtout dans le salon.',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

  ('77777777-7777-7777-7777-777777777704', '22222222-2222-2222-2222-222222222202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'J''ai transmis le dossier au géotechnicien. Il m''a dit qu''il n''avait jamais vu un sol aussi capricieux. Le Berry, terre de caractère.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  -- Parcours 03 - (Châteauroux, devis)
  ('77777777-7777-7777-7777-777777777705', '22222222-2222-2222-2222-222222222203', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Devis reçu de l''entreprise Bâti-Berry. 15 000 euros pour micropieux. Le demandeur a failli s''évanouir. Je l''ai rassuré sur les aides.',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

  -- Parcours 04 - (Issoudun, diagnostic)
  ('77777777-7777-7777-7777-777777777706', '22222222-2222-2222-2222-222222222204', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Visite terrain à Issoudun. Le sol est tellement argileux que mes chaussures y sont restées. Je facture une paire de mocassins.',
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),

  ('77777777-7777-7777-7777-777777777707', '22222222-2222-2222-2222-222222222204', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Note : le voisin du demandeur a aussi des fissures mais refuse de déposer un dossier car il pense que c''est "le charme de l''ancien". Chacun ses goûts.',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

  -- Parcours 05 - (Issoudun, eligibilite)
  ('77777777-7777-7777-7777-777777777708', '22222222-2222-2222-2222-222222222205', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Première prise de contact. Le demandeur est très inquiet. Ses murs ont plus de fissures que mon écran de téléphone. C''est dire.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  ('77777777-7777-7777-7777-777777777709', '22222222-2222-2222-2222-222222222205', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'J''ai vérifié la zone d''exposition RGA : classée "moyen". Moyen comme la motivation du demandeur à remplir les formulaires en ligne.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Parcours 31 - (Châteauroux, factures)
  ('77777777-7777-7777-7777-777777777710', '22222222-2222-2222-2222-222222222231', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Travaux terminés ! La maison ne bouge plus. Par contre le demandeur a pris goût aux visites de chantier et veut qu''on revienne prendre le café.',
   NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days'),

  -- Parcours 32 - (Châteauroux, choix_amo)
  ('77777777-7777-7777-7777-777777777711', '22222222-2222-2222-2222-222222222232', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Nouveau prospect repéré. Pas encore d''AMO choisi. J''ai glissé subtilement la plaquette de l''AMO du Berry Profond sous sa porte. Marketing terrain.',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- =============================================================================
-- 5. Commentaires sur les parcours prospects (55555555-...)
-- =============================================================================

  -- Prospect 01 - Argenton-sur-Creuse
  ('77777777-7777-7777-7777-777777777712', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Appel du prospect. Il m''a demandé si l''argile c''était comme la pâte à modeler. Après 20 minutes d''explication pédagogique, je pense qu''il a compris. Enfin, j''espère.',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('77777777-7777-7777-7777-777777777713', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Suite à l''appel de Jean-Patrick : oui, l''argile c''est un peu comme la pâte à modeler, sauf que ça détruit les maisons. Nuance importante.',
   NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),

  -- Prospect 02 - Déols
  ('77777777-7777-7777-7777-777777777714', '55555555-5555-5555-5555-555555555502', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Prospect à Déols. Son jardin ressemble au Grand Canyon en miniature après la sécheresse de cet été. Photos à l''appui dans le dossier.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Prospect 03 - Buzançais
  ('77777777-7777-7777-7777-777777777715', '55555555-5555-5555-5555-555555555503', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Prospect très motivé. Il a déjà imprimé 47 pages du site georisques.gouv.fr. Il connaît la carte d''aléa mieux que moi. Respect.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  ('77777777-7777-7777-7777-777777777716', '55555555-5555-5555-5555-555555555503', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Confirmation : le prospect de Buzançais a effectivement mémorisé la carte d''aléa. Il m''a corrigé sur le classement de sa parcelle. Moment humiliant mais formateur.',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Prospect 04 - Saint-Maur
  ('77777777-7777-7777-7777-777777777717', '55555555-5555-5555-5555-555555555504', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'Visite à Saint-Maur. Le prospect m''a montré fièrement sa collection de fissures numérotées au marqueur sur les murs. Méthodique, j''approuve.',
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- Prospect 05
  ('77777777-7777-7777-7777-777777777718', '55555555-5555-5555-5555-555555555505', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'Le prospect m''a envoyé un SMS à 23h pour me dire qu''il entendait "sa maison craquer". Je l''ai rassuré : c''était probablement la dilatation thermique. Ou un fantôme. L''un des deux.',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  ('77777777-7777-7777-7777-777777777719', '55555555-5555-5555-5555-555555555505', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
   'Jean-Patrick Duval', 'Allers-Vers Centre Indre', 'ALLERS_VERS',
   'J''ai rappelé le prospect pour confirmer que les fantômes ne relèvent pas du fonds prévention argile. Il a ri. Moi aussi. Puis on a parlé sérieusement de son dossier.',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

  -- Prospect 06
  ('77777777-7777-7777-7777-777777777720', '55555555-5555-5555-5555-555555555506', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
   'Géraldine Moulin', 'AMO du Berry Profond', 'AMO',
   'RDV pris avec le prospect. Il veut absolument me montrer sa cave. J''ai dit oui. J''espère que c''est bien de la cave dont on parle et pas de sa collection de vins. Quoique.',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
SELECT 'Agents créés :' as info, count(*) as total FROM agents WHERE sub LIKE 'seed_%';
SELECT 'Commentaires créés :' as info, count(*) as total FROM parcours_commentaires WHERE id::text LIKE '77777777-7777-7777-7777-7777777777%';
