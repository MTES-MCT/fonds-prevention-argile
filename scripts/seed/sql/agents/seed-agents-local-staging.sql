-- =============================================================================
-- Agents — fixtures local / staging
-- =============================================================================
-- Aucune identité réelle ici : ce fichier est commité, donc public. Les
-- super-administrateurs de l'équipe sont insérés par l'orchestrateur à partir de
-- SEED_AGENTS_SUPERADMINS (cf. scripts/seed/README.md) — jamais depuis ce SQL.
--
-- Tous les rôles métier sont rattachés à une structure : un AMO sans entreprise, ou un
-- aller-vers sans structure, rend l'espace agent inexploitable (scope qui lève ou listing national).
--
-- Idempotent : ON CONFLICT (email) DO UPDATE — on ne touche pas à `sub` car
-- conserver le `sub` existant en local permet de garder une session ProConnect
-- active après une re-seed.
--
-- La désactivation est en revanche remise à zéro : un agent désactivé est refusé à la
-- connexion sans aucun message (ADR-0029), et sa ligne survivait au re-seed — un compte
-- de test devenait injoignable sans que rien ne le signale.
--
-- Les `sub` sont des marqueurs `seed_*` et non de vrais identifiants ProConnect :
-- `authenticateFromProConnect` retombe sur l'email quand le sub ne correspond pas,
-- puis écrit le vrai sub (cf. agents.repository.ts).
--
-- Doit s'exécuter APRÈS amo-av et parcours (les FK entreprise_amo_id et
-- allers_vers_id pointent sur des UUIDs créés par ces étapes — en particulier
-- fake-parcours/13 fait DELETE+INSERT sur les AMOs 99999999*, ce qui annule
-- les FK des agents si l'ordre est inversé).
-- =============================================================================

-- Agents fictifs utilisés par fake-parcours/07-commentaires.sql
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_geraldine', 'geraldine.moulin@amo-berry.fr', 'Géraldine', 'Moulin', 'amo'::agent_role, '99999999-9999-4999-8999-999999999901'::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_jeanpatrick', 'jeanpatrick.duval@allers-vers-indre.fr', 'Jean-Patrick', 'Duval', 'allers_vers'::agent_role, NULL::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;

-- Comptes du bac à sable ProConnect (cf. README, « Se connecter en tant qu'agent en local »).
-- Ce sont les seules identités réellement connectables en local et sur staging : sans ces
-- lignes, le re-seed les laisse sans structure et l'espace agent bascule sur le listing
-- national au lieu de leur périmètre.
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_user14', 'user14@yopmail.com', 'Testeur', 'AMO', 'amo'::agent_role, '5833143c-9397-4a80-a7fc-3c5eb37c7a28'::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_user', 'user@yopmail.com', 'Testeur', 'Aller-vers', 'allers_vers'::agent_role, NULL::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;

-- Fixtures de couverture : le rôle cumulé AMO + Aller-vers doit exister dans le jeu de
-- test (union des périmètres), même si ces comptes ne sont pas connectables.
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_hybride_1', 'agent-hybride-1@example.org', 'Agent', 'Hybride 1', 'amo_et_allers_vers'::agent_role, '5833143c-9397-4a80-a7fc-3c5eb37c7a28'::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_hybride_2', 'agent-hybride-2@example.org', 'Agent', 'Hybride 2', 'amo_et_allers_vers'::agent_role, '99999999-9999-4999-8999-999999999901'::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name, desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL;
