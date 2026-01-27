-- =============================================================================
-- 99-VERIFICATION : Vérification des données insérées
-- =============================================================================

-- Résumé global
SELECT 'RÉSUMÉ DES DONNÉES CRÉÉES' as info;
SELECT 'Utilisateurs' as type, COUNT(*) as nombre FROM users WHERE id::text LIKE '11111111-1111-1111-1111-1111111111%'
UNION ALL SELECT 'Parcours', COUNT(*) FROM parcours_prevention WHERE id::text LIKE '22222222-2222-2222-2222-2222222222%'
UNION ALL SELECT 'Validations AMO', COUNT(*) FROM parcours_amo_validations WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%'
UNION ALL SELECT 'Dossiers DS', COUNT(*) FROM dossiers_demarches_simplifiees WHERE id::text LIKE '44444444-4444-4444-4444-4444444444%';

-- Répartition par statut de validation
SELECT 'RÉPARTITION PAR STATUT' as info;
SELECT statut, COUNT(*) as nombre
FROM parcours_amo_validations
WHERE id::text LIKE '33333333-3333-3333-3333-3333333333%'
GROUP BY statut ORDER BY nombre DESC;

-- Répartition par étape (dossiers suivis uniquement)
SELECT 'RÉPARTITION PAR ÉTAPE (dossiers suivis)' as info;
SELECT pp.current_step as etape, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
  AND pav.statut = 'logement_eligible'
GROUP BY pp.current_step ORDER BY nombre DESC;

-- Répartition par commune
SELECT 'RÉPARTITION PAR COMMUNE' as info;
SELECT pp.rga_simulation_data->'logement'->>'commune_nom' as commune, COUNT(*) as nombre
FROM parcours_amo_validations pav
INNER JOIN parcours_prevention pp ON pp.id = pav.parcours_id
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
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
WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
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
  WHERE pav.id::text LIKE '33333333-3333-3333-3333-3333333333%'
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
WHERE pav.id = '33333333-3333-3333-3333-333333333301';
