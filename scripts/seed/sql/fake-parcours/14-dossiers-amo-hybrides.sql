-- =============================================================================
-- 14 - Dossiers de l'AMO des agents hybrides
-- =============================================================================
-- Les agents hybrides (agent-hybride-*, SEED_AGENTS_HYBRIDES) sont rattachés à l'AMO du Berry
-- Profond, qui n'avait aucun dossier : quatre dossiers de Maison Tranquille, à des étapes
-- différentes, lui sont réattribués pour qu'ils aient un côté AMO à tester.
--
-- Joué après 13, qui supprime puis recrée cette AMO : une validation qui la référencerait plus
-- tôt ferait échouer ce DELETE (ON DELETE RESTRICT). Idempotent, 03 recréant les validations.
-- =============================================================================

UPDATE parcours_amo_validations
SET entreprise_amo_id = '99999999-9999-4999-8999-999999999901'
WHERE id IN (
  '33333333-3333-4333-8333-333333333311', -- éligibilité
  '33333333-3333-4333-8333-333333333310', -- diagnostic
  '33333333-3333-4333-8333-333333333312', -- devis
  '33333333-3333-4333-8333-333333333320'  -- demande en attente de réponse
);
