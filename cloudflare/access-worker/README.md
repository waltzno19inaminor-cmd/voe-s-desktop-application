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
FIREBASE_PROJECT_NUMBER=79915571390
FIREBASE_APPCHECK_ENFORCE=true
FIREBASE_APPCHECK_APP_IDS=1:79915571390:web:fe7659ef2933e1167826ef
```

Для production включите Firebase App Check для этого Web App и задайте
`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` во время сборки приложения. Worker в
production настроен fail-closed: запросы к `/v1/redeem`, `/v1/trial` и
`/v1/free` требуют одновременно валидный Firebase ID token и App Check token.
Не переключайте `FIREBASE_APPCHECK_ENFORCE` в `false` за пределами локальной
отладки.

## API

### Создать ключи

```bash
curl -X POST "https://YOUR-WORKER.workers.dev/v1/admin/keys" \
  -H "Content-Type: application/json" \
  -H "X-Access-Admin-Token: YOUR_ACCESS_ADMIN_TOKEN" \
  --data '{"count":10,"maxRedemptions":1,"plan":"3m","label":"private beta"}'
```

`maxRedemptions: 1` означает один пользователь на один ключ и является значением по умолчанию. Укажите другое положительное число только для сознательно ограниченной групповой выдачи. Ответ содержит исходные ключи только в этот момент; в Firestore сохраняются исключительно HMAC-hash.

Для ручной выдачи используйте `plan`: `1m`, `3m`, `6m`, `1y`, `5y` или `lifetime`. Срок лицензии начинается в момент первой успешной активации ключа, а не при его генерации. `expiresAt` при необходимости остаётся отдельным дедлайном, до которого сам ключ можно погасить.

### Активировать ключ

```text
POST /v1/redeem
Authorization: Bearer FIREBASE_ID_TOKEN
Content-Type: application/json

{ "key": "EXG-..." }
```

### Бесплатный период

```text
POST /v1/trial
Authorization: Bearer FIREBASE_ID_TOKEN
```

Worker выдаёт семь дней доступа один раз на Firebase-аккаунт. Повторный запрос не продлевает период.
Для trial и free Worker также требует `email_verified: true` в Firebase ID token.
Регистрация по email отправляет письмо подтверждения; Google sign-in обычно уже
возвращает подтверждённый email.

### Бесплатная версия

```text
POST /v1/free
Authorization: Bearer FIREBASE_ID_TOKEN
X-Firebase-AppCheck: FIREBASE_APPCHECK_TOKEN
```

Worker выдаёт постоянный тариф `free`. Сейчас его серверная policy разрешает
всё, кроме интеграций Binance, Bybit, Kraken и Interactive Brokers; MetaTrader
5 остаётся доступен. Список прав сохраняется в `access/state.capabilities` и
должен повторно проверяться каждым серверным endpoint с платной функцией.

Если пользователь бесплатного плана позднее активирует платный ключ, Worker
сохраняет бесплатный тариф как fallback и восстановит его после истечения ключа.

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
users/{userId}/accessFreePlans/default     # пользователь может только читать
```

Один Firestore transaction создаёт запись активации, историю ключа у пользователя и увеличивает счётчик использования. Это исключает двойную активацию при параллельных запросах.

## Проверка и deploy

```bash
cd cloudflare/access-worker
npm install
npm run check
npm run deploy
```
