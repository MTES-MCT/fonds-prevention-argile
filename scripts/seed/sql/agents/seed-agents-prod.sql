-- =============================================================================
-- Amorçage : créer le premier super-administrateur d'un environnement
-- =============================================================================
-- Sert uniquement à sortir de l'impasse du démarrage : l'application ne crée
-- jamais d'agent à la volée, donc sur une base neuve personne ne peut se
-- connecter au back-office pour créer les autres agents. Une fois ce premier
-- compte en place, tout le reste passe par /administration/agents, qui trace
-- l'opération.
--
-- Aucune adresse n'est écrite ici : elle est passée en paramètre. Ce fichier est
-- commité, donc public — y inscrire des identités réelles revient à publier une
-- liste nominative de comptes à privilèges.
--
-- Usage :
--   psql "$DATABASE_URL" \
--     -v email="'prenom.nom@example.gouv.fr'" \
--     -v given="'Prénom'" \
--     -v usual="'Nom'" \
--     -f scripts/seed/sql/agents/seed-agents-prod.sql
--
-- Le `sub` reste un marqueur `pending_` : ProConnect écrit le vrai identifiant à
-- la première connexion, l'agent étant retrouvé par son email d'ici là
-- (cf. authenticateFromProConnect, agents.repository.ts).
-- =============================================================================

INSERT INTO agents (sub, email, given_name, usual_name, role)
VALUES ('pending_' || :email, :email, :given, :usual, 'super_administrateur')
ON CONFLICT (email) DO UPDATE SET role = 'super_administrateur';

SELECT email, role, created_at FROM agents WHERE email = :email;
