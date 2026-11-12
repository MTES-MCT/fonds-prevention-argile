-- =============================================================================
-- 99-VERIFICATION : Vérification des données insérées
-- =============================================================================

-- Résumé global
SELECT 'RÉSUMÉ DES DONNÉES CRÉÉES' as info;
SELECT 'Utilisateurs' as type, COUNT(*) as nombre FROM users WHERE id::text LIKE '11111111-1111-4111-8111-1111111111%'
UNION ALL SELECT 'Parcours', COUNT(*) FROM parcours_prevention WHERE id::text LIKE '22222222-2222-4222-8222-2222222222%'
UNION ALL SELECT 'Validations AMO', COUNT(*) FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-4333-8333-3333333333%'
UNION ALL SELECT 'Dossiers DS', COUNT(*) FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-8444-4444444444%';

-- Répartition par statut de validation
SELECT 'RÉPARTITION PAR STATUT' as info;
SELECT statut, COUNT(*) as nombre
FROM parcours_amo_validations
WHERE id::text LIKE '33333333-3333-4333-8333-3333333333%'
GROUP BY statut ORDER BY nombre DESC;

-- Répartition par étape (dossiers suivis uniquement)
SELECT 'RÉPARTITION PAR ÉTAPE (dossiers suivis)' as info;
SELECT pp.current_step as etape, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-4333-8333-3333333333%'
  AND pav.statut = 'logement_eligible'
GROUP BY pp.current_step ORDER BY nombre DESC;

-- Répartition par commune
SELECT 'RÉPARTITION PAR COMMUNE' as info;
SELECT pp.rga_simulation_data->'logement'->>'commune_nom' as commune, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-4333-8333-3333333333%'
GROUP BY pp.rga_simulation_data->'logement'->>'commune_nom'
ORDER BY nombre DESC;

-- Répartition par tranche de revenus
SELECT 'RÉPARTITION PAR REVENUS' as info;
SELECT
  CASE
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 15000 THEN 'Très modestes (<15k)'
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 25000 THEN 'Modestes (15-25k)'
    WHEN (pp.rga_simulation_data->'menage'->>'revenu_rga')::int < 40000 THEN 'Intermédiaires (25-40k)'
    ELSE 'Aisés (>40k)'
  END as tranche_revenus,
  COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-4333-8333-3333333333%'
GROUP BY tranche_revenus ORDER BY nombre DESC;

-- Vérification des updated_at pour le badge "jours depuis dernière action"
SELECT 'VÉRIFICATION UPDATED_AT (badge jours inactivité)' as info;
SELECT inactivite, nombre FROM (
  SELECT
    CASE
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) = 0 THEN 'Aujourd''hui'
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 7 THEN '1-7 jours'
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 14 THEN '8-14 jours'
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 30 THEN '15-30 jours'
      ELSE '> 30 jours'
    END as inactivite,
    COUNT(*) as nombre,
    CASE
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) = 0 THEN 1
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 7 THEN 2
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 14 THEN 3
      WHEN EXTRACT(DAY FROM NOW() - pp.updated_at) <= 30 THEN 4
      ELSE 5
    END as ordre
  FROM parcours_amo_validations pav
  INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
  WHERE pav.id::text LIKE '33333333-3333-4333-8333-3333333333%'
    AND pav.statut = 'logement_eligible'
  GROUP BY 1, 3
) sub
ORDER BY ordre;

-- Exemple de demande complète
SELECT 'EXEMPLE DE DEMANDE COMPLÈTE' as info;
SELECT
  pav.id,
  pav.user_prenom || ' ' || pav.user_nom as demandeur,
  pav.user_email,
  pav.user_telephone,
  pav.adresse_logement,
  pav.statut,
  pp.rga_simulation_data->'logement'->>'commune_nom' as commune,
  pp.rga_simulation_data->'menage'->>'personnes' as nb_personnes,
  pp.rga_simulation_data->'menage'->>'revenu_rga' as revenu,
  EXTRACT(DAY FROM NOW() - pp.updated_at)::int as jours_inactivite
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id = '33333333-3333-4333-8333-333333333301';

-- Agents hybrides : une AMO et un Aller-vers qu'ils relient formeront une même structure, la
-- relation doit donc être 1:1. Même garde que la migration des structures, levée plus tôt.
DO $$
DECLARE
  ambigues text;
BEGIN
  WITH paires AS (
    SELECT DISTINCT entreprise_amo_id AS amo_id, allers_vers_id AS av_id
    FROM agents
    WHERE role = 'amo_et_allers_vers' AND entreprise_amo_id IS NOT NULL AND allers_vers_id IS NOT NULL
  )
  SELECT string_agg(nom, ', ') INTO ambigues FROM (
    SELECT ea.nom FROM paires p JOIN entreprises_amo ea ON ea.id = p.amo_id GROUP BY ea.id, ea.nom HAVING count(*) > 1
    UNION ALL
    SELECT av.nom FROM paires p JOIN allers_vers av ON av.id = p.av_id GROUP BY av.id, av.nom HAVING count(*) > 1
  ) s;

  IF ambigues IS NOT NULL THEN
    RAISE EXCEPTION 'Agents hybrides : structure reliée à plusieurs partenaires (%)', ambigues;
  END IF;
END $$;

-- Rôle porté par la structure (migration 0059) : chaque agent AMO ou Aller-vers du seed doit en avoir une habilitée.
DO $$
DECLARE
  sans_role text;
BEGIN
  SELECT string_agg(a.email, ', ') INTO sans_role
  FROM agents a
  WHERE a.sub LIKE 'seed_%'
    AND a.role IN ('amo', 'allers_vers', 'amo_et_allers_vers')
    AND NOT EXISTS (SELECT 1 FROM entreprises_amo ea WHERE ea.structure_id = a.structure_id)
    AND NOT EXISTS (SELECT 1 FROM allers_vers av WHERE av.structure_id = a.structure_id);

  IF sans_role IS NOT NULL THEN
    RAISE EXCEPTION 'Agents du seed sans structure habilitée : %', sans_role;
  END IF;
END $$;

-- Les hybrides du seed doivent hériter des deux rôles : une paire scindée en deux structures ne leur laisserait que l'AMO.
DO $$
DECLARE
  incomplets text;
BEGIN
  SELECT string_agg(a.email, ', ') INTO incomplets
  FROM agents a
  WHERE a.sub LIKE 'seed_%'
    AND a.role = 'amo_et_allers_vers'
    AND NOT (
      EXISTS (SELECT 1 FROM entreprises_amo ea WHERE ea.structure_id = a.structure_id)
      AND EXISTS (SELECT 1 FROM allers_vers av WHERE av.structure_id = a.structure_id)
    );

  IF incomplets IS NOT NULL THEN
    RAISE EXCEPTION 'Agents hybrides du seed sans les deux rôles : %', incomplets;
  END IF;
END $$;

-- Comme en production, une entreprise AMO et Aller-vers n'a qu'une structure : scindée, elle perd le cumul des rôles.
DO $$
DECLARE
  scindees text;
BEGIN
  SELECT string_agg(a.nom, ', ') INTO scindees
  FROM (VALUES
    ('665c22f2-1027-4b01-aaec-a4d3e1b02a8f'::uuid, '3fe0b9e7-4371-40b4-b03f-da6d560b71ea'::uuid),
    ('87fa62a7-8250-4656-86a5-9235a88e12b4'::uuid, 'a83baa10-9522-4f05-a604-8ecd5e9f6038'::uuid),
    ('c1381ec2-a499-475a-91a0-ed1486c5234a'::uuid, '9bf88991-f647-4661-8096-19c62d223186'::uuid),
    ('795697ef-c9f6-4a0d-8028-60096072309e'::uuid, '066731d8-a0f7-4c2e-97b3-1bf4ef598d87'::uuid)
  ) AS paires(av_id, amo_id)
  JOIN entreprises_amo a ON a.id = paires.amo_id
  JOIN allers_vers v ON v.id = paires.av_id
  WHERE v.structure_id <> a.structure_id;

  IF scindees IS NOT NULL THEN
    RAISE EXCEPTION 'Entreprises AMO et Aller-vers scindées en deux structures : %', scindees;
  END IF;
END $$;
