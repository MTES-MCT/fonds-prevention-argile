# Webhooks Brevo — tester les événements entrants

Brevo notifie l'app du cycle de vie des emails transactionnels (délivré, ouvert, cliqué,
bounce) sur `POST /api/webhooks/brevo`. Ces événements alimentent les colonnes `email_*` de
`parcours_amo_validations` — utile quand une AMO dit ne pas avoir reçu son invitation.

Route : [`src/app/api/webhooks/brevo/`](../../src/app/api/webhooks/brevo). Cycle de vie
complet : [`docs/emails/BREVO-LIFECYCLE.md`](../emails/BREVO-LIFECYCLE.md).

## Le secret

La route exige `Authorization: Bearer <BREVO_WEBHOOK_SECRET>` et refuse la requête si la
variable n'est pas configurée côté serveur.

**Ne jamais coller la valeur du secret dans un fichier, un ticket ou une commande
d'historique.** La récupérer dans l'environnement au moment de l'appel :

```bash
# En local : depuis le .env du projet
export BREVO_WEBHOOK_SECRET=$(grep -E '^BREVO_WEBHOOK_SECRET=' .env | cut -d= -f2-)
```

```bash
# Sur un environnement déployé
export BREVO_WEBHOOK_SECRET=$(scalingo --app fonds-argile-staging --region osc-fr1 env \
  | grep '^BREVO_WEBHOOK_SECRET=' | cut -d= -f2-)
```

Puis viser l'environnement voulu :

```bash
export FPA_URL=http://localhost:3000
# ou
export FPA_URL=https://staging.fonds-prevention-argile.beta.gouv.fr
```

> Les commandes ci-dessous sont écrites pour **staging ou local**. Rejouer un événement
> sur la **production** écrit dans les données réelles d'un dossier : à ne faire que pour
> corriger un cas identifié, jamais pour « voir si ça marche ».

## Healthcheck

```bash
curl -i -X GET "$FPA_URL/api/webhooks/brevo" \
  -H "Authorization: Bearer $BREVO_WEBHOOK_SECRET"
```

## Événements

Le `message-id` doit correspondre à celui enregistré à l'envoi pour que l'événement soit
rattaché à une validation ; avec une valeur inventée, la route répond correctement mais ne
met rien à jour.

```bash
# Délivré
curl -i -X POST "$FPA_URL/api/webhooks/brevo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BREVO_WEBHOOK_SECRET" \
  -d '{"event":"delivered","email":"amo@example.org","message-id":"<MESSAGE_ID>","ts_event":1732456789}'
```

```bash
# Ouvert
curl -i -X POST "$FPA_URL/api/webhooks/brevo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BREVO_WEBHOOK_SECRET" \
  -d '{"event":"opened","email":"amo@example.org","message-id":"<MESSAGE_ID>","ts_event":1732456789}'
```

```bash
# Clic
curl -i -X POST "$FPA_URL/api/webhooks/brevo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BREVO_WEBHOOK_SECRET" \
  -d '{"event":"click","email":"amo@example.org","message-id":"<MESSAGE_ID>","ts_event":1732456789,"link":"https://example.org"}'
```

```bash
# Hard bounce
curl -i -X POST "$FPA_URL/api/webhooks/brevo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BREVO_WEBHOOK_SECRET" \
  -d '{"event":"hard_bounce","email":"amo@example.org","message-id":"<MESSAGE_ID>","ts_event":1732456789,"reason":"User unknown"}'
```

## Vérifier l'effet en base

```sql
SELECT statut, email_sent_at, email_delivered_at, email_opened_at,
       email_clicked_at, email_bounce_type, email_bounce_reason
FROM parcours_amo_validations
WHERE parcours_id = '<PARCOURS_UUID>';
```

## En cas de 401

Dans l'ordre : le secret exporté est-il bien celui de l'environnement visé (local et staging
n'ont pas le même) ; `$FPA_URL` pointe-t-il vers cet environnement ; et la variable est-elle
bien définie côté serveur (`scalingo … env | grep BREVO`) — une variable absente fait
refuser toutes les requêtes, indépendamment de l'en-tête envoyé.
