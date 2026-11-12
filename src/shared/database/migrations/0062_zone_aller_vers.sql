ALTER TABLE "allers_vers" ADD COLUMN "libelle_zone" text;--> statement-breakpoint
-- Reprend les sous-groupes que la page publique reconnaissait au nom de l'Aller-vers (54 et 59).
UPDATE "allers_vers" v
   SET "libelle_zone" = z.libelle
  FROM (VALUES
    ('alohe', 'Pour la métropole de Nancy'),
    ('soliha metropole nord', 'Pour la métropole Européenne de Lille'),
    ('soliha hauts de france', 'Pour les arrondissements de Dunkerque'),
    ('soliha douaisis', 'Pour la CC Pévèle-Carembault et les CA du Douaisis et Coeur d''Ostrevent'),
    ('soliha hainaut cambresis', 'Pour les arrondissements de Valenciennes et de Cambrai'),
    ('soliha sambre avesnois', 'Pour l''arrondissement d''Avesnes-sur-Helpe')
  ) AS z(cle, libelle)
 WHERE trim(regexp_replace(lower(translate(v."nom", 'ÉÈÊËéèêëÀÂÄàâäÎÏîïÔÖôöÛÜûüÇç', 'EEEEeeeeAAAaaaIIiiOOooUUuuCc')), '[^a-z0-9]+', ' ', 'g')) = z.cle;
