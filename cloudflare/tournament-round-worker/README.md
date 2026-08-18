# ExGenesis tournament round worker

Cloudflare Worker, который один раз в сутки:

1. находит турнир с открытым сезоном и раундом `status: "opened"`;
2. ждёт окончания всех применимых торговых сессий и задержки котировок;
3. получает 30-минутные свечи Yahoo Finance для каждого `allowedAssets`;
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

Даты указываются строго в формате `YYYY-MM-DD` по UTC. Суббота и воскресенье пропускаются автоматически для любых активов. После расчёта Worker всегда закрывает текущий раунд и создаёт следующий на ближайший торговый день. Например, после пятничного раунда он сразу создаст открытый раунд на понедельник; до его `startsAt` приложение покажет обратный отсчёт открытия голосования.

В документе сезона можно задать сезонные награды:

```text
prizes: [
  { "id": "prize-1", "type": "status", "prize": "The Monarch", "visualPreset": 0 },
  { "id": "prize-2", "type": "status", "prize": "The Regent", "visualPreset": 1 },
  { "id": "prize-3", "type": "status", "prize": "The Herald", "visualPreset": 2 }
]
```

Когда сезон завершён (`season.endsAt <= now` или `season.status: "closed"`), Worker один раз выдаёт награды по итоговому leaderboard. Итоговый score — это `points`, внутри которого уже учтены правильные/неправильные прогнозы, пропуски и difficulty multiplier. Маленькая tie-группа на первом месте получает `prize-1`; остальные tie-группы получают нижний сезонный приз `prize-3`. Если `prize-3` отсутствует, используется `prize-2`. Например: `50 / 50 / 45` → первые двое получают `prize-1`; `50 / 35 / 35 / 35` → все участники с `35` получают `prize-3`; если все участники имеют одинаковый score, все получают `prize-3`.

Worker записывает название награды в `leaderboard/{userId}.prize`, создаёт `event/prize` уведомление и добавляет статус в `users/{userId}.status[]` с полем `granted`.

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

1. берёт начальную цену как `close` 30-минутной свечи, которая закрылась в `startsAt`;
2. если такой свечи нет, берёт `close` первой 30-минутной свечи, которая началась в `startsAt` — это нужно для активов, у которых regular session начинается ровно в момент старта раунда, например `^NDX`;
3. берёт итоговую цену как `close` 30-минутной свечи, которая закрылась в `endsAt + season.timeWindow`;
4. если итоговая цена выше начальной — результат `LONG`;
5. если итоговая цена ниже начальной — результат `SHORT`.

Worker ничего не записывает, если отсутствует обязательная свеча, итоговая цена равна начальной или Yahoo вернул неполные данные.

## Безопасность и идемпотентность

- Worker использует Google service account и Firestore REST API.
- Приватный ключ хранится только в Cloudflare Secrets.
- Service account работает через IAM и не зависит от клиентских Firestore Rules.
- Закрытие раунда, создание следующего раунда и все изменения leaderboard выполняются одним Firestore `commit`.
- Для документов используются `updateTime`/`exists` preconditions. Повторный или параллельный запуск не начислит очки дважды.
- Если атомарному commit потребуется больше 450 записей, Worker завершится без изменений. Для более крупного турнира потребуется отдельный ledger/aggregation workflow.

## Очки

- правильный прогноз: `+25 × difficultyMultiplier`;
- неправильный прогноз: `-25` очков;
- пропущенный голос по активу: `-5` очков;
- баланс участника не может стать отрицательным: после списания минимум — `0`.

`difficultyMultiplier` зависит от того, насколько редкой была победившая сторона среди голосов по активу:

```text
50%+ победивших голосов: x1.00
40% победивших голосов:  x1.20
30% победивших голосов:  x1.40
20% победивших голосов:  x1.60
10% победивших голосов:  x1.80
максимум:                x2.00
```

Неправильный прогноз остаётся фиксированным `-25`, пропуск — фиксированным `-5`. Базовые значения правильного и неправильного прогноза задаются в `wrangler.jsonc` через `POINTS_PER_CORRECT` и `POINTS_PER_INCORRECT`.

В `leaderboard` Worker обновляет:

```text
points
totalPredictions
correctPredictions
missedPredictions
assetStats[].pointsEarned
assetStats[].missedPredictions
```

В `round.assetResults` Worker дополнительно записывает:

```text
longVotes
shortVotes
winnerShare
difficultyMultiplier
pointsForCorrect
```

## Special Prize

Для `apex_protocol_2026` Worker дополнительно проверяет специальную награду турнира:

```text
tournaments/apex_protocol_2026

specialPrize: [
  {
    type: "license-key",
    status: "active",
    winners: []
  }
]
```

Если `status: "active"`, пользователь получает награду один раз, когда занимает первое место по очкам минимум в двух завершённых сезонах. Сезон считается завершённым, если `status: "closed"` или если `endsAt` уже прошёл. Если первое место по очкам делят один или два пользователя, победа сезона засчитывается каждому из них. Если первое место делят три и более пользователя, сезон не засчитывается никому для `specialPrize`. Максимум очков должен быть больше `0`.

После выдачи Worker добавляет `userId` в `specialPrize[].winners` и создаёт уведомление:

```text
users/{userId}/notifications/event_prize_apex_protocol_2026_special_license_key
```

Уведомление сообщает, что лицензионный ключ приложения будет направлен на почту, через которую пользователь зарегистрировался.

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

Ручной пересчёт leaderboard за последний прошедший раунд:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_RUN_TOKEN" \
  "http://localhost:8787/recalculate-last-round?dryRun=true"
```

Для конкретного турнира:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_MANUAL_RUN_TOKEN" \
  "http://localhost:8787/recalculate-last-round?dryRun=true&tournamentId=apex_protocol_2026"
```

Этот режим не закрывает раунд и не создаёт новый. Он пересобирает сезонный `leaderboard` заново по всем уже прошедшим раундам до последнего прошедшего раунда, исправляя `points`, `totalPredictions`, `correctPredictions`, `missedPredictions` и `assetStats`.

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
