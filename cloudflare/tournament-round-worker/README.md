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

В документе сезона обязателен целочисленный интервал определения результата в минутах:

```text
timeWindow: 120
```

`timeWindow: 120` означает, что Worker оценивает движение цены ровно в течение двух часов после `endsAt`: интервал `[endsAt, endsAt + 120 минут)`. Сам Worker по-прежнему запускается в `23:59 UTC`; он просто получает исторические минутные свечи за это уже завершённое окно. Интервал не может выходить за конец торговой сессии актива: для `UTC_24H` — за `23:59 UTC` дня `endsAt`, для `NYSE` — за `16:00 America/New_York`.

В документе сезона можно задать праздничные дни, в которые раунд не должен открываться:

```text
tournaments/{tournamentId}/seasons/{seasonId}

tradingHolidays: ["2026-09-07", "2026-11-26", "2026-12-25"]
```

Даты указываются строго в формате `YYYY-MM-DD` по UTC. Суббота и воскресенье пропускаются автоматически для любых активов. Если следующий календарный день — выходной или дата из `tradingHolidays`, Worker оставляет текущий раунд `opened`. В следующий запуск перед ближайшим торговым днём он рассчитает этот раунд и создаст новый с датами ближайшего торгового дня.

## Ручная отмена раунда

Если биржа была незапланированно закрыта или торги были остановлены, не меняйте `status` раунда вручную. Оставьте его `opened` и добавьте в документ текущего раунда:

```text
settlementAction: "cancel"
cancelReason: "NYSE trading halt"
```

В ближайший запуск перед торговым днём Worker не обратится к Yahoo и не изменит `leaderboard`. Он атомарно сменит статус раунда на `cancelled`, запишет `cancelledAt` и создаст следующий открытый раунд. Чтобы выполнить отмену сразу, после добавления флага вызовите вручную защищённый `POST /run` без `dryRun=true`.

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

- `UTC_24H` — окно `timeWindow` должно завершаться не позднее `23:59 UTC` в день `endsAt`;
- `NYSE` — окно `timeWindow` должно завершаться не позднее `16:00:00 America/New_York` в календарный день `endsAt`.

## Определение результата

Для каждого актива Worker:

1. требует точную минутную свечу в минуту `startsAt`;
2. требует точную минутную свечу в минуту `endsAt`;
3. берёт `open` этих свечей и считает:

   ```text
   referencePrice = (startPrice + endPrice) / 2
   ```

4. на свечах от `endsAt` до `endsAt + season.timeWindow` находит абсолютный максимум и минимум;
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
- баланс участника не может стать отрицательным: после списания минимум — `0`.

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

Cloudflare запускает Cron Triggers по UTC. Worker запускается один раз в сутки, в `23:59 UTC`. К этому времени он получает данные только за завершённый интервал `[endsAt, endsAt + season.timeWindow)`. При `timeWindow: 120` и `endsAt: 15:30 UTC` в расчёт попадут минутные свечи с `15:30` до `17:29 UTC` включительно.

## Ограничение Yahoo Finance

Yahoo Finance показывает исторические данные и описывает источники/задержки котировок, но не предоставляет официально документированный публичный API для этого Worker. Используемый chart endpoint может измениться или ограничить запросы. Для турнира с денежными призами замените `fetchYahooCandles()` на лицензированного market-data provider, сохранив остальную логику расчёта и атомарного commit.
