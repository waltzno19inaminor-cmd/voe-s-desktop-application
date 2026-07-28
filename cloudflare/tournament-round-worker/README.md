# ExGenesis tournament round worker

Cloudflare Worker, который один раз в сутки:

1. находит турнир с открытым сезоном и раундом `status: "opened"`;
2. ждёт окончания всех применимых торговых сессий и задержки котировок;
3. получает минутные свечи Yahoo Finance для каждого `allowedAssets`;
4. определяет победившее направление для каждого актива;
5. атомарно обновляет `leaderboard`, закрывает текущий раунд и создаёт следующий.

## Строгая модель данных

Раунд:

```text
tournaments/{tournamentId}/seasons/{seasonId}/rounds/{roundId}

status: "opened"
startsAt: Firestore Timestamp
endsAt: Firestore Timestamp
```

Предикты:

```text
.../rounds/{roundId}/predictions/{userId}_{assetId}

userId: string
assetId: string
asset: string
predict: "LONG" | "SHORT"
predictTime: Firestore Timestamp
```

Обязательный формат `allowedAssets`:

```json
[
  {
    "symbol": "EUR/USD",
    "type": "Forex",
    "yahooSymbol": "EURUSD=X",
    "session": "UTC_24H"
  },
  {
    "symbol": "AAPL",
    "type": "Stocks",
    "yahooSymbol": "AAPL",
    "session": "NYSE"
  },
  {
    "symbol": "BTC",
    "type": "Crypto",
    "yahooSymbol": "BTC-USD",
    "session": "UTC_24H"
  }
]
```

`yahooSymbol` и `session` обязательны для каждого актива. Worker не пытается угадывать Yahoo-тикер по отображаемому `symbol`: это исключает подмену спотового инструмента фьючерсом или неверной валютной парой.

Допустимые `session`:

- `UTC_24H` — период оценки заканчивается на границе `23:59 UTC` текущего дня: учитываются завершённые минутные свечи до `23:58:59 UTC` включительно;
- `NYSE` — период оценки заканчивается в `16:00:00 America/New_York` в календарный день `endsAt`.

## Определение результата

Для каждого актива Worker:

1. требует точную минутную свечу в минуту `startsAt`;
2. требует точную минутную свечу в минуту `endsAt`;
3. берёт `open` этих свечей и считает:

   ```text
   referencePrice = (startPrice + endPrice) / 2
   ```

4. на свечах от `endsAt` до конца сессии находит абсолютный максимум и минимум;
5. если относительно `referencePrice` была достигнута только верхняя сторона — результат `LONG`;
6. если была достигнута только нижняя сторона — результат `SHORT`;
7. если достигнуты обе стороны, сравнивает время первого достижения итогового максимума и итогового минимума:
   - минимум раньше максимума → `SHORT`;
   - максимум раньше минимума → `LONG`.

Если максимум и минимум пришлись на одну минуту, точного порядка в минутных данных нет. Worker останавливает расчёт и не меняет Firestore. Он также ничего не записывает, если отсутствует хотя бы одна обязательная свеча или Yahoo вернул неполные данные.

## Безопасность и идемпотентность

- Worker использует Google service account и Firestore REST API.
- Приватный ключ хранится только в Cloudflare Secrets.
- Service account работает через IAM и не зависит от клиентских Firestore Rules.
- Закрытие раунда, создание следующего раунда и все изменения leaderboard выполняются одним Firestore `commit`.
- Для документов используются `updateTime`/`exists` preconditions. Повторный или параллельный запуск не начислит очки дважды.
- Если атомарному commit потребуется больше 450 записей, Worker завершится без изменений. Для более крупного турнира потребуется отдельный ledger/aggregation workflow.

## Очки

- правильный прогноз: `+25` очков;
- неправильный прогноз: `-25` очков;
- баланс участника может стать отрицательным.

Значения задаются в `wrangler.jsonc` через `POINTS_PER_CORRECT` и `POINTS_PER_INCORRECT`.

## Service account

В Google Cloud для проекта `voes-a88f4`:

1. создайте отдельный service account только для этого Worker;
2. выдайте ему минимальную роль с чтением/записью Firestore (на старте можно использовать `Cloud Datastore User`, затем заменить custom IAM role);
3. создайте JSON key;
4. из JSON key используйте `client_email` и `private_key`.

Не добавляйте JSON key в репозиторий.

## Установка

```bash
cd cloudflare/tournament-round-worker
npm install
```

Добавьте secrets интерактивно:

```bash
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put MANUAL_RUN_TOKEN
```

Для локальной разработки скопируйте `.dev.vars.example` в `.dev.vars`. `.dev.vars` уже исключается общим `.gitignore`.

## Проверка

```bash
npm run check
npm run dev
```

Безопасный dry-run:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_RUN_TOKEN" \
  "http://localhost:8787/run?dryRun=true"
```

Dry-run читает Firestore и Yahoo, считает результат, но ничего не записывает.

## Деплой

```bash
npm run deploy
```

Cron в `wrangler.jsonc`:

```text
59 23 * * *
```

Cloudflare запускает Cron Triggers по UTC. Worker запускается один раз в сутки, в `23:59 UTC`. Для активов с `UTC_24H` в расчёт входят минутные свечи от `endsAt` до `23:58:59 UTC` включительно: свеча `23:59` не включается, поскольку в момент запуска она ещё не завершена.

## Ограничение Yahoo Finance

Yahoo Finance показывает исторические данные и описывает источники/задержки котировок, но не предоставляет официально документированный публичный API для этого Worker. Используемый chart endpoint может измениться или ограничить запросы. Для турнира с денежными призами замените `fetchYahooCandles()` на лицензированного market-data provider, сохранив остальную логику расчёта и атомарного commit.
