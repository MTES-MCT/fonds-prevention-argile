-- Script pour prolonger la validité des tokens AMO expirés
-- Définit la nouvelle date d'expiration à maintenant + 90 jours pour tous les tokens expirés
-- 
-- Commande : psql -d fonds_prevention_argile -f scripts/amo/extend-expired-tokens.sql

UPDATE amo_validation_tokens
SET expires_at = NOW() + INTERVAL '90 days'
WHERE expires_at < NOW();

-- Afficher le résultat
SELECT 
  COUNT(*) as tokens_prolonges,
  MIN(expires_at) as nouvelle_expiration_min,
  MAX(expires_at) as nouvelle_expiration_max
FROM amo_validation_tokens
WHERE expires_at > NOW()
  AND expires_at <= NOW() + INTERVAL '91 days';