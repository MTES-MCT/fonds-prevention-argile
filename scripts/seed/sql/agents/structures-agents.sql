-- =============================================================================
-- Agents — structure de rattachement
-- =============================================================================
-- Le rôle d'un agent AMO ou Aller-vers vient de sa structure (migration 0059). Les fixtures
-- écrivent encore ses rattachements hérités (entreprise_amo_id, allers_vers_id) : on en déduit
-- sa structure, par la même règle que la migration. Joué en dernier dans l'étape agents, après
-- les fixtures SQL et les testeurs de SEED_AGENTS_HYBRIDES.
--
-- Un agent dont l'étape amo-av a remis les rattachements à NULL (ON DELETE SET NULL) se
-- retrouve sans structure, donc sans rôle : comme avant, il est à rattacher à la main.
-- =============================================================================

UPDATE agents a
SET structure_id = COALESCE(
  CASE WHEN a.role IN ('amo', 'amo_et_allers_vers')
    THEN (SELECT ea.structure_id FROM entreprises_amo ea WHERE ea.id = a.entreprise_amo_id) END,
  CASE WHEN a.role IN ('allers_vers', 'amo_et_allers_vers')
    THEN (SELECT av.structure_id FROM allers_vers av WHERE av.id = a.allers_vers_id) END
)
WHERE a.role IN ('amo', 'allers_vers', 'amo_et_allers_vers');

-- Structures laissées sans habilitation (AMO, Aller-vers, expert) ni agent par le DELETE / INSERT des fixtures.
DELETE FROM structures s
WHERE NOT EXISTS (SELECT 1 FROM entreprises_amo ea WHERE ea.structure_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM allers_vers av WHERE av.structure_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM agents a WHERE a.structure_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM experts e WHERE e.structure_id = s.id);
