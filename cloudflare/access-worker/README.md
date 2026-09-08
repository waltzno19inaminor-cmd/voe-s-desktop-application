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
FIREBASE_APPCHECK_CHALLENGE_SECRET
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
production настроен fail-closed: запросы к `/v1/redeem`, `/v1/trial`,
`/v1/free`, `/v1/entitlement/check` и `/v1/email-verification` требуют одновременно валидный Firebase
ID token и App Check token. Endpoint `/v1/password-reset` не требует входа в
аккаунт, но при включённом production App Check требует App Check token.
Не переключайте `FIREBASE_APPCHECK_ENFORCE` в `false` за пределами локальной
отладки.

Для macOS/Windows Tauri Worker также предоставляет `POST /v1/app-check/token`.
Клиент получает короткий challenge, подписывает его локальным ключом установки,
а Worker обменивает custom token через Firebase App Check API. Перед первым
deployment создайте отдельный secret:

```bash
openssl rand -base64 32 | npx wrangler secret put FIREBASE_APPCHECK_CHALLENGE_SECRET
npx wrangler deploy
```

Не вставляйте это значение в frontend или `.env`: оно должно существовать только
в Cloudflare Worker. После deployment packaged Tauri-приложение автоматически
использует custom provider для Auth, Firestore, Storage и собственных запросов с
`X-Firebase-AppCheck`; браузер продолжает использовать reCAPTCHA Enterprise.

`FIREBASE_CLIENT_EMAIL` должен принадлежать service account с доступом к
Firestore. Для branded-писем подтверждения email ему также нужен permission
`firebaseauth.users.sendEmail` (обычно роль **Firebase Authentication Admin**).

## API

### Подтверждение email

```text
POST /v1/email-verification
Authorization: Bearer FIREBASE_ID_TOKEN
X-Firebase-AppCheck: FIREBASE_APPCHECK_TOKEN
Content-Type: application/json

{ "locale": "ru" }
```

Worker создаёт одноразовую Firebase verification link и отправляет её через
Resend в branded HTML-письме с кнопкой подтверждения. Endpoint доступен только
самому неподтверждённому пользователю, требует App Check и ограничен до трёх
писем за минуту для каждого IP и аккаунта.

После подтверждения клиент вызывает `reload()` у Firebase user и продолжает
вход только когда `emailVerified` стал `true`.

### Сброс пароля

```text
POST /v1/password-reset
X-Firebase-AppCheck: FIREBASE_APPCHECK_TOKEN
Content-Type: application/json

{ "email": "operator@example.com", "locale": "ru" }
```

Worker создаёт одноразовый Firebase password-reset code, отправляет branded-письмо
через Resend и показывает форму нового пароля на странице Worker. Для каждого IP
и email разрешены две отправки за 60 секунд; третья попытка блокируется на 60 секунд.

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
всё, кроме интеграций Binance, Bybit, Kraken и Interactive Brokers, а также
раздела Reports «Сценарии и условия»; MetaTrader 5 остаётся доступен. Список
прав сохраняется в `access/state.capabilities` и должен повторно проверяться
каждым серверным endpoint с платной функцией.

Если пользователь бесплатного плана позднее активирует платный ключ, Worker
сохраняет бесплатный тариф как fallback и восстановит его после истечения ключа.

### Проверить права

```text
POST /v1/entitlement/check
Authorization: Bearer FIREBASE_ID_TOKEN
X-Firebase-AppCheck: FIREBASE_APPCHECK_TOKEN
```

Endpoint ничего не записывает и возвращает актуальные `plan`, `capabilities` и
`expiresAt`. Десктопный клиент вызывает его лениво перед закрытой операцией и
кэширует успешную проверку на 15 дней; запуск приложения сам по себе запрос не
создаёт. Параллельные проверки объединяются в одну, после сетевой ошибки действует
минутный cooldown, а Worker допускает не более шести проверок за 60 секунд для
каждого IP и Firebase UID. Одна серверная проверка читает два документа Firestore.

Для добавления нового ограничения сначала добавьте capability в `ACCESS_CAPABILITIES`,
затем включите её в `FREE_PLAN_DISABLED_CAPABILITIES` одновременно в Worker и
клиентском `accessEntitlements.ts`. UI использует capability только для отображения;
операция обязана отдельно вызывать `authorizeCapability`, а серверная операция —
проверять ту же capability на своей стороне.

Активация ограничена Cloudflare rate limit: максимум 5 попыток за 60 секунд с одного IP.

### Patreon → ключ с продлением → email

OAuth callback URL для Patreon client:

```text
https://auth.gandr.site/patreon/callback
```

Webhook URL для Patreon:

```text
https://auth.gandr.site/patreon/webhook
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
2. создаёт один access key с `maxRedemptions: 1` и сроком подписки из `pledge_cadence` (для месячной подписки — ровно 1 месяц);
3. сохраняет выдачу в `patreonAccessGrants/{memberId}` и временно хранит исходный ключ в зашифрованном виде;
4. отправляет ключ на Patreon email через Resend.

Повторный webhook для того же Patreon member не создаёт новый ключ. Если приходит новое успешное списание, срок уже активированного доступа продлевается на новый период, а тот же ключ остаётся у пользователя. Продление дедуплицируется по `last_charge_date`, поэтому повторная доставка одного webhook не продлевает доступ несколько раз.

Для задержек webhook используется 7-дневное grace-окно после оплаченного периода. Если новое успешное списание приходит в это окно, доступ восстанавливается/продлевается от предыдущей оплаченной даты. Если продления нет, после grace-окна доступ деактивируется автоматически.

Если пользователь успел активировать другой платный ключ, поздний Patreon webhook не переключит его обратно на старую Patreon-лицензию. Повторная активация старого ключа поверх нового также запрещена.

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
