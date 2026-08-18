# ExGenesis access worker

Отдельный Cloudflare Worker для активации одноразовых или лимитированных ключей.

## Secrets

В Cloudflare добавьте:

```text
ACCESS_KEY_PEPPER
ACCESS_KEY_ENCRYPTION_KEY
ACCESS_ADMIN_TOKEN
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
PATREON_CLIENT_ID
PATREON_CLIENT_SECRET
PATREON_REDIRECT_URI
PATREON_WEBHOOK_SECRET
RESEND_API_KEY
ACCESS_EMAIL_FROM
```

Обычная переменная:

```text
FIREBASE_PROJECT_ID=voes-a88f4
```

## API

### Создать ключи

```bash
curl -X POST "https://YOUR-WORKER.workers.dev/v1/admin/keys" \
  -H "Content-Type: application/json" \
  -H "X-Access-Admin-Token: YOUR_ACCESS_ADMIN_TOKEN" \
  --data '{"count":10,"maxRedemptions":1,"label":"private beta"}'
```

`maxRedemptions: 1` означает один пользователь на один ключ. Можно не передавать поле для ключа без лимита. Ответ содержит исходные ключи только в этот момент; в Firestore сохраняются исключительно HMAC-hash.

### Активировать ключ

```text
POST /v1/redeem
Authorization: Bearer FIREBASE_ID_TOKEN
Content-Type: application/json

{ "key": "EXG-..." }
```

Активация ограничена Cloudflare rate limit: максимум 5 попыток за 60 секунд с одного IP.

### Patreon → одноразовый ключ → email

OAuth callback URL для Patreon client:

```text
https://exgenesis-access-worker.waltzno19inaminor.workers.dev/patreon/callback
```

Webhook URL для Patreon:

```text
https://exgenesis-access-worker.waltzno19inaminor.workers.dev/patreon/webhook
```

В Patreon webhook включите события:

```text
members:create
members:update
```

Worker принимает только подписчика с:

```text
patron_status: "active_patron"
currently_entitled_amount_cents > 0
email present
```

После webhook Worker:

1. проверяет `X-Patreon-Signature` через HMAC-MD5 и `PATREON_WEBHOOK_SECRET`;
2. создаёт один access key с `maxRedemptions: 1`;
3. сохраняет выдачу в `patreonAccessGrants/{memberId}` и временно хранит исходный ключ в зашифрованном виде;
4. отправляет ключ на Patreon email через Resend.

Повторный webhook для того же Patreon member не создаст новый ключ. Если письмо не успело отправиться, Worker повторно отправит тот же зашифрованный ключ.

### Отключить ключ

```bash
curl -X POST "https://YOUR-WORKER.workers.dev/v1/admin/keys/KEY_ID/disable" \
  -H "X-Access-Admin-Token: YOUR_ACCESS_ADMIN_TOKEN"
```

### Автоматическая пара ключей

Worker запускается строго раз в два месяца: в `00:00 UTC` первого числа февраля, апреля, июня, августа, октября и декабря. Он создаёт ровно два ключа, каждый с `maxRedemptions: 1` и сроком действия до следующего запуска.

Чтобы сразу создать или получить текущую пару, используйте:

```bash
curl -X POST "https://YOUR-WORKER.workers.dev/v1/admin/rotation/run" \
  -H "X-Access-Admin-Token: YOUR_ACCESS_ADMIN_TOKEN"
```

Ответ содержит два ключа и дату окончания. Исходные ключи сохраняются между запусками только в зашифрованном виде и доступны исключительно через защищённый admin endpoint:

```bash
curl "https://YOUR-WORKER.workers.dev/v1/admin/rotation" \
  -H "X-Access-Admin-Token: YOUR_ACCESS_ADMIN_TOKEN"
```

## Данные Firestore

```text
accessKeys/{keyId}                         # только Worker
accessKeys/{keyId}/redemptions/{userId}    # только Worker
accessKeyBatches/{batchId}                 # только Worker, ключи зашифрованы
patreonAccessGrants/{memberId}             # только Worker, факт выдачи Patreon ключа
users/{userId}/redeemedKeys/{keyId}        # пользователь может только читать
users/{userId}/access/state                # пользователь может только читать
```

Один Firestore transaction создаёт запись активации, историю ключа у пользователя и увеличивает счётчик использования. Это исключает двойную активацию при параллельных запросах.

## Проверка и deploy

```bash
cd cloudflare/access-worker
npm install
npm run check
npm run deploy
```
