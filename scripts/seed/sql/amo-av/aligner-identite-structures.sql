-- =============================================================================
-- Identité des structures du seed, reprise de leurs lignes d'habilitation (ADR-0053)
-- =============================================================================
-- Les fixtures écrivent nom, SIRET et coordonnées sur les lignes AMO, Aller-vers et
-- expert, alors que l'application les tient sur la structure et les recopie sur ses
-- lignes. Comme la migration 0061 : type expert pour une structure d'expert, identité de l'AMO
-- d'abord, de l'Aller-vers à défaut, SIRET de l'expert à défaut, puis copie retour sur les lignes.

UPDATE structures s
   SET type = 'expert'
 WHERE EXISTS (SELECT 1 FROM experts e WHERE e.structure_id = s.id);

UPDATE structures s
   SET siret = COALESCE(s.siret, NULLIF(a.siret, ''), NULLIF(e.siret, '')),
       adresse = COALESCE(NULLIF(s.adresse, ''), NULLIF(a.adresse, ''), NULLIF(v.adresse, ''), ''),
       telephone = COALESCE(NULLIF(s.telephone, ''), NULLIF(a.telephone, ''), LEFT(NULLIF(v.telephone, ''), 20), ''),
       horaires = COALESCE(NULLIF(s.horaires, ''), NULLIF(a.horaires, ''), NULLIF(v.horaires, ''))
  FROM structures s2
  LEFT JOIN entreprises_amo a ON a.structure_id = s2.id
  LEFT JOIN allers_vers v ON v.structure_id = s2.id
  LEFT JOIN experts e ON e.structure_id = s2.id
 WHERE s.id = s2.id;

UPDATE entreprises_amo a
   SET nom = s.nom, siret = COALESCE(s.siret, a.siret), adresse = s.adresse, telephone = s.telephone, horaires = s.horaires
  FROM structures s
 WHERE s.id = a.structure_id;

UPDATE allers_vers v
   SET nom = s.nom, adresse = s.adresse, telephone = s.telephone, horaires = s.horaires
  FROM structures s
 WHERE s.id = v.structure_id;

UPDATE experts e
   SET nom = s.nom, siret = COALESCE(s.siret, e.siret)
  FROM structures s
 WHERE s.id = e.structure_id;
