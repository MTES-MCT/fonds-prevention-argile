-- Cherche un email ou un téléphone resté en clair dans la base locale ; n'affiche que des compteurs.
-- Usage : docker exec -i fonds-argile-postgres psql -U fonds_argile_user -d fonds_argile -q < scripts/dev/verifier-anonymisation.sql

DO $$
DECLARE
  c record;
  emails bigint;
  telephones bigint;
  trouve boolean := false;
BEGIN
  FOR c IN
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'jsonb', 'ARRAY')
      AND table_name NOT IN ('entreprises_amo', 'allers_vers', 'spatial_ref_sys', 'rga_zones_import', 'catastrophes_naturelles')
    ORDER BY 1, 2
  LOOP
    EXECUTE format(
      $q$SELECT
        count(*) FILTER (WHERE regexp_replace(%1$I::text, '[^[:space:]"'',;]+@(anonyme\.invalid|beta\.gouv\.fr|yopmail\.com)', '', 'gi')
          ~* '[a-z0-9._%%+-]+@[a-z0-9.-]+\.[a-z]{2,}'),
        count(*) FILTER (WHERE replace(%1$I::text, '0600000000', '') ~ '(\+33|\m0)[1-9]([ .-]?[0-9]{2}){4}\M')
      FROM %2$I$q$,
      c.column_name, c.table_name) INTO emails, telephones;
    IF emails > 0 OR telephones > 0 THEN
      RAISE NOTICE '%.% : % ligne(s) avec un email, % avec un téléphone', c.table_name, c.column_name, emails, telephones;
      trouve := true;
    END IF;
  END LOOP;
  IF NOT trouve THEN
    RAISE NOTICE 'Aucun email ni téléphone en clair hors des structures AMO et Aller-vers et des agents conservés';
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM dossiers_demarches_simplifiees WHERE ds_url ~ 'prefill_token=(?!anonymise(&|#|$))') AS liens_dn_actifs,
  (SELECT count(*) FROM users WHERE prenom <> 'Demandeur') AS prenoms_en_clair,
  (SELECT count(*) FROM agents WHERE email !~* '@(anonyme\.invalid|beta\.gouv\.fr|yopmail\.com)$') AS agents_en_clair;
