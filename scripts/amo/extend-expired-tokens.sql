-- Script pour prolonger la validité des tokens AMO
-- Définit la nouvelle date d'expiration à maintenant + 365 jours (1 an) pour tous les tokens non utilisés
--
-- Commande : psql -d fonds_prevention_argile -f scripts/amo/extend-expired-tokens.sql

UPDATE amo_validation_tokens SET expires_at = NOW() + INTERVAL '365 days' WHERE used_at IS NULL;

-- Afficher le résultat
SELECT COUNT(*) as tokens_prolonges, MIN(expires_at) as nouvelle_expiration_min, MAX(expires_at) as nouvelle_expiration_max FROM amo_validation_tokens WHERE used_at IS NULL;