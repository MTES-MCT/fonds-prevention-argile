-- =============================================================================
-- Agents — dump du staging au 12 mai 2026
-- =============================================================================
-- 9 agents (4 super-admins + 2 seed fictifs Géraldine/Jean-Patrick utilisés par
-- fake-parcours/07-commentaires.sql + 3 testeurs réels rattachés à AMO/AV).
--
-- Idempotent : ON CONFLICT (email) DO UPDATE — on ne touche pas à `sub` car
-- conserver le `sub` existant en local permet de garder une session ProConnect
-- active après une re-seed.
--
-- Doit s'exécuter APRÈS amo-av et parcours (les FK entreprise_amo_id et
-- allers_vers_id pointent sur des UUIDs créés par ces étapes — en particulier
-- fake-parcours/13 fait DELETE+INSERT sur les AMOs 99999999*, ce qui annule
-- les FK des agents si l'ordre est inversé).
-- =============================================================================

-- Super-administrateurs (beta.gouv)
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('50051b7f-341d-45db-99fd-34d8c9533afd', 'guillaume.bertrand@beta.gouv.fr', 'Guillaume', 'Bertrand', 'super_administrateur'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('ff708a2a-240b-4c7f-836d-804b5bad4378', 'martin.letellier@beta.gouv.fr', 'Martin', 'Letellier', 'super_administrateur'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('075a5799-a0e9-4356-8312-3642be6aa455', 'maxime.amieux@beta.gouv.fr', 'Maxime', 'Amieux', 'super_administrateur'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('4811eada-2c7a-46a5-add6-e719cc8ae892', 'samir.benfares@beta.gouv.fr', 'Samir  BENFARES', 'Benfares', 'super_administrateur'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;

-- Agents fictifs utilisés par fake-parcours/07-commentaires.sql
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_geraldine', 'geraldine.moulin@amo-berry.fr', 'Géraldine', 'Moulin', 'amo'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('seed_jeanpatrick', 'jeanpatrick.duval@allers-vers-indre.fr', 'Jean-Patrick', 'Duval', 'allers_vers'::agent_role, NULL::uuid, NULL::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;

-- Testeurs réels rattachés à des AMO/AV (Adil 36 = 17628a5e-…, AMO Berry = 99999999-…01)
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('f0773fce-f744-4df3-bf97-1f382c252101', 'user@yopmail.com', 'Jean', NULL, 'allers_vers'::agent_role, NULL::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('72bc2109-4dff-40e3-b544-51388e58165b', 'contact@gllm.design', 'Guillaume', 'Bertrand Design', 'amo_et_allers_vers'::agent_role, NULL::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id) VALUES ('607acb0e-605b-453e-a74a-e029ae7507a9', 'martin@evlaa.com', 'Angela', 'Letellier- Aller-vers', 'amo_et_allers_vers'::agent_role, '99999999-9999-9999-9999-999999999901'::uuid, '17628a5e-6a45-4a3c-a72c-606332b42e4c'::uuid) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id, given_name = EXCLUDED.given_name, usual_name = EXCLUDED.usual_name;
