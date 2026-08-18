import { computed, ref } from 'vue'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import { useI18n } from '~/shared/i18n/useI18n'

export interface MetricConfig {
  key: string;
  label: string;
  sub: string;
  desc: string;
  formula: string;
  valStr: (m: any) => string;
  tooltipValStr?: (m: any) => string;
  colorClass: (m: any) => string;
  colorVal: (m: any, isDark: boolean) => string;
  evalStr: (m: any) => string;
  evalClass: (m: any) => string;
  benchmarks: { label: string; eval: string; class: string }[];
  category?: string;
}

const metricLabelRuByKey: Record<string, string> = {
  netProfit: 'Чистая прибыль',
  grossProfit: 'Валовая прибыль',
  grossLoss: 'Валовый убыток',
  winRate: 'Процент побед',
  lossRate: 'Процент убытков',
  avgWin: 'Средняя прибыль',
  avgLoss: 'Средний убыток',
  avgTrade: 'Средняя сделка',
  payoffRatio: 'Коэффициент выплат',
  riskRewardRatio: 'Риск/прибыль',
  realizedRR: 'Реализованный R/R',
  expectedValue: 'Ожидаемое значение',
  profitFactor: 'Фактор прибыли',
  beWinRate: 'Безубыточный винрейт',
  numTrades: 'Количество сделок',
  numWin: 'Прибыльные сделки',
  numLoss: 'Убыточные сделки',
  largestWin: 'Самая прибыльная сделка',
  largestLoss: 'Самая убыточная сделка',
  maxConsWins: 'Серия побед',
  maxConsLosses: 'Серия убытков',
  avgHoldingTimeStr: 'Среднее время удержания',
  avgProfitPerDay: 'Скорость прибыли',
  maxDrawdownNum: 'Максимальная просадка',
  avgDrawdownPct: 'Средняя просадка',
  drawdownDurationStr: 'Длительность просадки',
  recoveryFactor: 'Фактор восстановления',
  returnOnCapital: 'Доходность капитала',
  returnPerTrade: 'Доходность на сделку',
  riskPerTrade: 'Риск на сделку',
  sharpeRatio: 'Коэффициент Шарпа',
  sortinoRatio: 'Коэффициент Сортино',
  calmarRatio: 'Коэффициент Калмара',
  sterlingRatio: 'Коэффициент Стерлинга',
  omegaRatio: 'Коэффициент Омега',
  ulcerIndex: 'Индекс язвы',
  marRatio: 'MAR коэффициент',
  gainToPainRatio: 'Прибыль к боли',
  tailRatio: 'Хвостовой коэффициент',
  commonSenseRatio: 'Common Sense коэффициент',
  profitFactorStrategy: 'PF по стратегии',
  profitFactorMarket: 'PF по рынку',
  profitFactorTimeframe: 'PF по таймфрейму',
  avgTradeExpectancy: 'Ожидание сделки',
  expectancyScore: 'Оценка ожидания',
  latestRMultiple: 'R-множитель',
  avgRMultiple: 'Средний R-множитель',
  rMultipleDist: 'Распределение R',
  riskOfRuin: 'Риск разорения',
  slope: 'Наклон эквити',
  equityCurveVolatility: 'Волатильность эквити',
  equityCurveStability: 'Стабильность эквити',
  equityCurveCorrelation: 'Корреляция эквити',
  stdPnL: 'Стд. отклонение результата',
  varPnL: 'Дисперсия результата',
  coeffOfVariation: 'Коэффициент вариации',
  skewness: 'Асимметрия доходностей',
  kurtosis: 'Эксцесс доходностей',
  medianTradeResult: 'Медианный результат сделки',
  medianWinLossRatio: 'Медиана побед/убытков',
  valueAtRisk: 'Value at Risk',
  cvar: 'Условный VaR',
  expectedShortfall: 'Ожидаемый дефицит',
  mae: 'Макс. движение против',
  mfe: 'Макс. движение в плюс',
  maeMfeRatio: 'MAE/MFE коэффициент',
  zScore: 'Z-оценка серии',
  runsTest: 'Тест серий',
  monteCarloDrawdown: 'MC оценка просадки',
  monteCarloRiskOfRuin: 'MC риск разорения',
  monteCarloExpectedReturn: 'MC ожидаемая доходность',
  bootstrapConfidenceInterval: 'Bootstrap интервал',
  ciExpectedValue: 'ДИ ожидаемого значения',
  ciWinRate: 'ДИ винрейта',
  bayesianWinRate: 'Байесовский винрейт',
  bayesianExpectedValue: 'Байесовское ожидание',
  kellyCriterion: 'Критерий Келли',
  fractionalKelly: 'Дробный Келли',
  optimalF: 'Оптимальный F',
  sqn: 'SQN',
  tTest: 'T-тест средней сделки',
  pValue: 'P-значение преимущества',
  informationRatio: 'Information Ratio',
  treynorRatio: 'Коэффициент Трейнора',
  jensensAlpha: 'Альфа Дженсена',
  betaToBenchmark: 'Бета к бенчмарку',
  alphaToBenchmark: 'Альфа к бенчмарку',
  returnAutocorrelation: 'Автокорреляция доходности',
  volatilityClustering: 'Кластеризация волатильности',
  hurstExponent: 'Экспонента Херста',
  regimeStabilityScore: 'Стабильность режима',
  rollingSharpe: 'Скользящий Шарп',
  rollingProfitFactor: 'Скользящий PF',
  rollingExpectancy: 'Скользящее ожидание',
  rollingDrawdown: 'Скользящая просадка',
  rollingWinRate: 'Скользящий винрейт',
  strategyDecayRate: 'Скорость угасания стратегии',
  edgeHalfLife: 'Период полураспада преимущества',
  outlierImpactRatio: 'Влияние выбросов',
  distributionRobustness: 'Устойчивость распределения'
}

const metricDescRuByKey: Record<string, string> = {
  netProfit: 'Итоговая реализованная прибыль или убыток по всем закрытым сделкам стратегии.',
  grossProfit: 'Суммарная прибыль всех прибыльных сделок в архиве стратегии.',
  grossLoss: 'Суммарный убыток всех убыточных сделок в архиве стратегии.',
  winRate: 'Доля исполненных сделок, которые завершились положительным результатом.',
  lossRate: 'Доля исполненных сделок, которые завершились отрицательным результатом.',
  avgWin: 'Средний финансовый результат одной прибыльной сделки.',
  avgLoss: 'Средний финансовый убыток одной убыточной сделки.',
  avgTrade: 'Средний ожидаемый результат по одной исполненной сделке.',
  payoffRatio: 'Соотношение среднего размера прибыльной сделки к среднему размеру убыточной.',
  riskRewardRatio: 'Средний плановый Risk/Reward по сделкам с валидными входом, стопом и тейком. Нулевые и некорректные значения исключаются.',
  realizedRR: 'Фактически реализованный Risk/Reward после закрытия сделки.',
  expectedValue: 'Математическое ожидание будущего результата на одну исполненную сделку.',
  profitFactor: 'Соотношение общей валовой прибыли к общему валовому убытку.',
  beWinRate: 'Минимальный процент прибыльных сделок, необходимый для выхода в ноль.',
  numTrades: 'Общее количество полностью закрытых сделок в архиве стратегии.',
  numWin: 'Количество исполненных сделок с положительным финансовым результатом.',
  numLoss: 'Количество исполненных сделок с отрицательным финансовым результатом.',
  largestWin: 'Самая крупная прибыльная сделка за всю историю стратегии.',
  largestLoss: 'Самая крупная убыточная сделка за всю историю стратегии.',
  maxConsWins: 'Самая длинная непрерывная серия прибыльных сделок в хронологическом порядке.',
  maxConsLosses: 'Самая длинная непрерывная серия убыточных сделок в хронологическом порядке.',
  avgHoldingTimeStr: 'Среднее время между открытием сделки и ее полным закрытием.',
  avgProfitPerDay: 'Средняя чистая прибыль за активный день, неделю и месяц в архиве.',
  maxDrawdownNum: 'Максимальное падение капитала от исторического пика до последующего минимума.',
  avgDrawdownPct: 'Средняя глубина всех зафиксированных просадок капитала в истории стратегии.',
  drawdownDurationStr: 'Самый длинный период нахождения капитала в просадке до обновления максимума.',
  recoveryFactor: 'Соотношение чистой прибыли к максимальной исторической просадке.',
  returnOnCapital: 'Совокупная процентная доходность относительно начального капитала.',
  returnPerTrade: 'Средний чистый финансовый результат на одну исполненную сделку.',
  riskPerTrade: 'Средний финансовый риск, заложенный в одну торговую установку.',
  sharpeRatio: 'Избыточная доходность на единицу общей волатильности результата. Показывает эффективность доходности.',
  sortinoRatio: 'Избыточная доходность на единицу отрицательной волатильности. Отделяет вредную волатильность от общей.',
  calmarRatio: 'Соотношение годовой сложной доходности к максимальной исторической просадке.',
  sterlingRatio: 'Соотношение годовой сложной доходности к средней исторической просадке.',
  omegaRatio: 'Вероятностно-взвешенное соотношение прибыли и убытков выше заданного порога доходности.',
  ulcerIndex: 'Оценка глубины и длительности просадок от предыдущих пиков. Чем ниже, тем меньше стресс.',
  marRatio: 'Соотношение CAGR к максимальной просадке, часто используемое институциональными управляющими.',
  gainToPainRatio: 'Метрика Джека Швагера: сумма всех доходностей, деленная на абсолютную сумму отрицательных доходностей.',
  tailRatio: 'Соотношение 95-го процентиля прибыльных результатов к абсолютному 5-му процентилю убыточных.',
  commonSenseRatio: 'Комбинированная метрика Tail Ratio и Gain-to-Pain Ratio для оценки устойчивой асимметрии преимущества.',
  profitFactorStrategy: 'Фактор прибыли только по сделкам, относящимся к текущему активному протоколу стратегии.',
  profitFactorMarket: 'Лучший фактор прибыли среди всех торгуемых инструментов и классов активов стратегии.',
  profitFactorTimeframe: 'Лучший фактор прибыли среди всех торговых таймфреймов и интервалов исполнения.',
  avgTradeExpectancy: 'Ожидаемая долларовая ценность одной сделки на основе винрейта и средних исходов.',
  expectancyScore: 'Нормализованная оценка ожидания как отношение expected value к среднему размеру убытка.',
  latestRMultiple: 'R-множитель, реализованный в последней закрытой сделке стратегии.',
  avgRMultiple: 'Средний реализованный R-множитель по всему архиву сделок стратегии.',
  rMultipleDist: 'Доля сделок, которые смогли реализовать R-множитель 2.0R или выше.',
  riskOfRuin: 'Математическая вероятность полного истощения капитала при текущем винрейте и payoff ratio.',
  slope: 'Наклон линейной регрессии кривой капитала, отражающий скорость роста equity.',
  equityCurveVolatility: 'Стандартное отклонение отклонений equity от линии регрессии. Показывает плавность кривой.',
  equityCurveStability: 'Коэффициент R² для линейной регрессии equity-кривой. Показывает стабильность тренда.',
  equityCurveCorrelation: 'Корреляция Пирсона между порядком сделок и балансом капитала. Показывает структурный рост.',
  stdPnL: 'Стандартное отклонение результатов отдельных сделок относительно среднего результата.',
  varPnL: 'Дисперсия результатов отдельных сделок, то есть квадрат стандартного отклонения.',
  coeffOfVariation: 'Коэффициент вариации, показывающий относительный разброс результатов на единицу ожидания.',
  skewness: 'Асимметрия распределения доходностей. Положительная асимметрия означает частые малые убытки и крупные выигрыши.',
  kurtosis: 'Эксцесс распределения доходностей. Высокое значение указывает на толстые хвосты и риск экстремальных исходов.',
  medianTradeResult: 'Медианный долларовый результат сделки без искажения от экстремальных выбросов.',
  medianWinLossRatio: 'Соотношение медианной прибыльной сделки к абсолютной медианной убыточной сделке.',
  valueAtRisk: 'Максимальный ожидаемый долларовый убыток за один день при доверительном уровне 95% по исторической симуляции.',
  cvar: 'Ожидаемый убыток сверх порога Value at Risk. Показывает тяжесть хвостового риска.',
  expectedShortfall: 'Conditional VaR в процентах от начального депозита. Показывает риск капитала в худших 5% случаев.',
  mae: 'Среднее максимальное движение против позиции во время открытых сделок до их закрытия.',
  mfe: 'Среднее максимальное движение в пользу позиции во время открытых сделок до их закрытия.',
  maeMfeRatio: 'Соотношение среднего MAE к среднему MFE. Показывает эффективность входа и сопровождения.',
  zScore: 'Z-оценка последовательности побед и убытков. Проверяет случайность или кластеризацию серий.',
  runsTest: 'Тест серий Вальда-Вольфовица для проверки независимости последовательности результатов.',
  monteCarloDrawdown: 'Средняя максимальная просадка по 500 Monte Carlo симуляциям equity через ресемплинг сделок.',
  monteCarloRiskOfRuin: 'Вероятность потери 90% капитала по 500 Monte Carlo симуляциям ресемплинга сделок.',
  monteCarloExpectedReturn: 'Средняя совокупная процентная доходность по 500 Monte Carlo симуляциям equity.',
  bootstrapConfidenceInterval: '95% bootstrap-интервал для среднего PnL сделки по 500 ресемплированным симуляциям.',
  ciExpectedValue: '95% доверительный интервал математического ожидания сделки через стандартную ошибку среднего.',
  ciWinRate: '95% доверительный интервал винрейта стратегии через нормальную аппроксимацию биномиального распределения.',
  bayesianWinRate: 'Байесовская оценка винрейта с нейтральным Beta(1,1) prior, чтобы снизить искажения малой выборки.',
  bayesianExpectedValue: 'Байесовское ожидание с притяжением к нулю, сглаживающее ранние всплески результата.',
  kellyCriterion: 'Оптимальная доля капитала для риска в сделке, максимизирующая долгосрочный сложный рост.',
  fractionalKelly: 'Половина критерия Келли, используемая для снижения волатильности и риска просадки.',
  optimalF: 'Optimal f Ральфа Винса: доля капитала для максимального геометрического роста.',
  sqn: 'System Quality Number Ван Тарпа: оценка качества системы через ожидание, разброс и размер выборки.',
  tTest: 't-статистика Стьюдента, проверяющая, отличается ли средний PnL сделки от нуля статистически значимо.',
  pValue: 'Двустороннее p-value для t-статистики. Показывает вероятность получить текущий результат случайно.',
  informationRatio: 'Отношение активной доходности сверх бенчмарка к волатильности стратегии как локальному tracking error.',
  treynorRatio: 'Избыточная годовая доходность сверх безрисковой ставки на единицу системного рыночного риска beta.',
  jensensAlpha: 'Альфа Дженсена: годовая избыточная доходность сверх ожидания CAPM.',
  betaToBenchmark: 'Оценочный коэффициент beta, показывающий чувствительность стратегии к движениям рыночного бенчмарка.',
  alphaToBenchmark: 'Абсолютное годовое превосходство стратегии над базовой доходностью рыночного бенчмарка.',
  returnAutocorrelation: 'Автокорреляция PnL с лагом 1. Показывает последовательную устойчивость или возврат к среднему.',
  volatilityClustering: 'Автокорреляция абсолютного PnL с лагом 1. Показывает наличие кластеров волатильности и турбулентных режимов.',
  hurstExponent: 'Экспонента Херста H. H > 0.5 указывает на трендовость, H < 0.5 — на возврат к среднему.',
  regimeStabilityScore: 'Композитная оценка стабильности режима, показывающая устойчивость equity в разных рыночных условиях.',
  rollingSharpe: 'Средний Sharpe Ratio по скользящим окнам из 10 сделок. Показывает динамику risk-adjusted эффективности.',
  rollingProfitFactor: 'Средний Profit Factor по скользящим окнам из 10 сделок. Показывает динамику асимметрии win/loss.',
  rollingExpectancy: 'Среднее долларовое ожидание по скользящим окнам из 10 сделок. Отслеживает локальные режимы прибыльности.',
  rollingDrawdown: 'Средняя процентная просадка equity по скользящим окнам из 10 сделок. Показывает локальный стресс капитала.',
  rollingWinRate: 'Средний винрейт по скользящим окнам из 10 сделок. Показывает локальные циклы точности.',
  strategyDecayRate: 'Наклон регрессии скользящих Sharpe Ratio во времени. Отрицательные значения указывают на угасание alpha.',
  edgeHalfLife: 'Оценка горизонта в месяцах, за который преимущество стратегии сократится наполовину при текущем темпе угасания.',
  outlierImpactRatio: 'Доля чистой прибыли, которую дали только верхние 5% крупнейших прибыльных сделок.',
  distributionRobustness: 'Композитная оценка устойчивости распределения: нормальность, хвостовой риск и зависимость от выбросов.'
}

const metricSubRuByKey: Record<string, string> = {
  netProfit: 'Дельта валового PnL',
  grossProfit: 'Общий прибыльный PnL',
  grossLoss: 'Общий убыточный PnL',
  winRate: 'Процент прибыльных',
  lossRate: 'Процент убыточных',
  avgWin: 'Средний прибыльный PnL',
  avgLoss: 'Средний убыточный PnL',
  avgTrade: 'Ожидание на сделку',
  payoffRatio: 'Средняя прибыль / средний убыток',
  riskRewardRatio: 'Средний плановый RR',
  realizedRR: 'Фактический RR',
  expectedValue: 'Статистическое EV',
  profitFactor: 'Валовая прибыль / валовый убыток',
  beWinRate: 'Нужный win% для $0',
  numTrades: 'Размер выборки',
  numWin: 'Количество прибыльных',
  numLoss: 'Количество убыточных',
  largestWin: 'Максимальный прибыльный PnL',
  largestLoss: 'Максимальный убыточный PnL',
  maxConsWins: 'Самая длинная серия побед',
  maxConsLosses: 'Самая длинная серия убытков',
  avgHoldingTimeStr: 'Средняя длительность сделки',
  avgProfitPerDay: 'День / неделя / месяц',
  maxDrawdownNum: 'Пик до минимума',
  avgDrawdownPct: 'Средняя глубина просадки',
  drawdownDurationStr: 'Максимальный срок восстановления',
  recoveryFactor: 'Чистая прибыль / макс. DD',
  returnOnCapital: 'Чистая прибыль / депозит',
  returnPerTrade: 'Средняя долларовая alpha',
  riskPerTrade: 'Средний долларовый риск',
  sharpeRatio: 'Доходность с учётом риска',
  sortinoRatio: 'С учётом downside-риска',
  calmarRatio: 'CAGR / макс. просадка',
  sterlingRatio: 'CAGR / средняя просадка',
  omegaRatio: 'Вес прибыли / убытка',
  ulcerIndex: 'Глубина/длительность DD',
  marRatio: 'CAGR / макс. DD',
  gainToPainRatio: 'Метрика преимущества Швагера',
  tailRatio: '95-й / 5-й процентиль',
  commonSenseRatio: 'Tail * Gain-to-Pain',
  profitFactorStrategy: 'PF активной стратегии',
  profitFactorMarket: 'Лучшая alpha рынка',
  profitFactorTimeframe: 'Лучшая alpha таймфрейма',
  avgTradeExpectancy: 'Ожидаемый долларовый PnL',
  expectancyScore: 'Ожидание / средний убыток',
  latestRMultiple: 'R последней сделки',
  avgRMultiple: 'Средний исторический R',
  rMultipleDist: '% сделок >= 2.0R',
  riskOfRuin: 'Вероятность истощения капитала',
  slope: 'Скорость PnL регрессии',
  equityCurveVolatility: 'Стд. отклонение остатков',
  equityCurveStability: 'R² соответствия',
  equityCurveCorrelation: 'Корреляция Пирсона (r)',
  stdPnL: 'Матрица разброса PnL',
  varPnL: 'Дисперсия PnL (σ²)',
  coeffOfVariation: 'Стд. откл. / |средний PnL|',
  skewness: 'Асимметрия доходности (S)',
  kurtosis: 'Экстремальность хвостов (K)',
  medianTradeResult: '50-й процентиль PnL',
  medianWinLossRatio: 'Мед. прибыль / |мед. убыток|',
  valueAtRisk: '95% дневной VaR в $',
  cvar: 'Ожидаемый хвостовой убыток ($)',
  expectedShortfall: 'CVaR / начальный депозит',
  mae: 'Среднее движение против сделки',
  mfe: 'Среднее движение в пользу сделки',
  maeMfeRatio: 'Неблагоприятное / благоприятное',
  zScore: 'Случайность серий (Z)',
  runsTest: 'Оценка независимости',
  monteCarloDrawdown: '500 симуляций DD',
  monteCarloRiskOfRuin: '500 симуляций риска истощения',
  monteCarloExpectedReturn: 'Средняя доходность 500 симуляций',
  bootstrapConfidenceInterval: '95% ДИ среднего PnL ($)',
  ciExpectedValue: '95% ДИ EV ($)',
  ciWinRate: '95% нормальный ДИ',
  bayesianWinRate: 'Оценка с Beta(1,1) prior',
  bayesianExpectedValue: 'Сглаженное среднее ($)',
  kellyCriterion: 'Полный Kelly %',
  fractionalKelly: 'Половина Kelly %',
  optimalF: 'Доля капитала Ralph Vince',
  sqn: 'System Quality Number',
  tTest: 'T-статистика (t)',
  pValue: 'Двусторонняя значимость',
  informationRatio: 'Активная доходность / tracking error',
  treynorRatio: 'Избыточная доходность / beta',
  jensensAlpha: 'Избыточная alpha CAPM',
  betaToBenchmark: 'Системная рыночная beta',
  alphaToBenchmark: 'Абсолютное превосходство',
  returnAutocorrelation: 'Серийная корреляция lag-1 (ρ)',
  volatilityClustering: 'Автокорр. абсолютного PnL (γ)',
  hurstExponent: 'Долгая память (H)',
  regimeStabilityScore: 'Структурная инвариантность',
  rollingSharpe: 'Sharpe окно 10 сделок',
  rollingProfitFactor: 'PF окно 10 сделок',
  rollingExpectancy: 'EV окно 10 сделок ($)',
  rollingDrawdown: 'DD окно 10 сделок',
  rollingWinRate: 'Win% окно 10 сделок',
  strategyDecayRate: 'Наклон регрессии Sharpe',
  edgeHalfLife: 'Месяцы до истощения edge',
  outlierImpactRatio: '% PnL от топ-5% сделок',
  distributionRobustness: 'Композитная оценка (0-100)'
}

const formatMetricLabel = (label: string) => label.replaceAll('_', ' ')

const primaryMetricsConfigs: MetricConfig[] = [
  {
    key: 'netProfit',
    label: 'Net_Profit',
    sub: 'Gross PnL Delta',
    desc: 'Total realized profit or loss generated across all archived strategy trades.',
    formula: 'Gross Profit - Gross Loss',
    valStr: m => `${m.netProfit >= 0 ? '+' : ''}$${m.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.netProfit >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.netProfit >= 0 ? 'Profitable' : 'Drawdown',
    evalClass: m => m.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Profitable', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Drawdown', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'grossProfit',
    label: 'Gross_Profit',
    sub: 'Total Winning PnL',
    desc: 'The cumulative sum of all winning trades in the strategy archive.',
    formula: 'Σ(Winning Trades PnL)',
    valStr: m => `+$${m.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.grossProfit > 0 ? 'Nominal' : 'Zero',
    evalClass: m => m.grossProfit > 0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> $0', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '$0', eval: 'Zero', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'grossLoss',
    label: 'Gross_Loss',
    sub: 'Total Losing PnL',
    desc: 'The cumulative sum of all losing trades in the strategy archive.',
    formula: 'Σ(|Losing Trades PnL|)',
    valStr: m => `-$${m.grossLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.grossLoss === 0 ? 'Perfect' : 'Nominal',
    evalClass: m => m.grossLoss === 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '$0', eval: 'Perfect', class: 'text-emerald-500 font-bold' },
      { label: '> $0', eval: 'Nominal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'winRate',
    label: 'Win_Rate',
    sub: 'Winning Percentage',
    desc: 'The proportion of executed trades that resulted in a positive net return.',
    formula: '(Winning Trades / Total Trades) * 100',
    valStr: m => `${m.winRate.toFixed(1)}%`,
    colorClass: m => m.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.winRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.winRate >= 50 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.winRate >= 50 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'lossRate',
    label: 'Loss_Rate',
    sub: 'Losing Percentage',
    desc: 'The proportion of executed trades that resulted in a negative net return.',
    formula: '(Losing Trades / Total Trades) * 100',
    valStr: m => `${m.lossRate.toFixed(1)}%`,
    colorClass: m => m.lossRate < 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.lossRate < 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.lossRate < 50 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.lossRate < 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< 50%', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '>= 50%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgWin',
    label: 'Average_Win',
    sub: 'Mean Winning PnL',
    desc: 'The average financial return generated per winning trade.',
    formula: 'Gross Profit / Winning Trades',
    valStr: m => `+$${m.avgWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.avgWin > m.avgLoss ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.avgWin > m.avgLoss ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> Avg Loss', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '<= Avg Loss', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'avgLoss',
    label: 'Average_Loss',
    sub: 'Mean Losing PnL',
    desc: 'The average financial loss incurred per losing trade.',
    formula: 'Gross Loss / Losing Trades',
    valStr: m => `-$${m.avgLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.avgLoss < m.avgWin ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.avgLoss < m.avgWin ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Avg Win', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '>= Avg Win', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgTrade',
    label: 'Average_Trade',
    sub: 'Expectancy per Trade',
    desc: 'The statistical mean return expected across every executed trade.',
    formula: 'Net Profit / Total Trades',
    valStr: m => `${m.avgTrade >= 0 ? '+' : ''}$${m.avgTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.avgTrade >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgTrade >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgTrade >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.avgTrade >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'payoffRatio',
    label: 'Payoff_Ratio',
    sub: 'Avg Win / Avg Loss',
    desc: 'The ratio of average winning trade magnitude to average losing trade magnitude.',
    formula: 'Average Win / Average Loss',
    valStr: m => `${m.payoffRatio.toFixed(2)}x`,
    colorClass: m => m.payoffRatio >= 1.5 ? 'text-emerald-400' : (m.payoffRatio >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.payoffRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.payoffRatio >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.payoffRatio >= 1.5 ? 'Optimal' : (m.payoffRatio >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.payoffRatio >= 1.5 ? 'text-emerald-500' : (m.payoffRatio >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskRewardRatio',
    label: 'Risk/Reward_Ratio',
    sub: 'Average Setup RR',
    desc: 'The arithmetic mean setup Risk/Reward across trades with valid entry, stop-loss, and take-profit levels. Zero or invalid RR values are excluded.',
    formula: 'Σ(Valid Trade RR) / Trades With Valid RR',
    valStr: m => `${m.riskRewardRatio.toFixed(2)}R`,
    colorClass: m => m.riskRewardRatio >= 2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.riskRewardRatio >= 2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.riskRewardRatio >= 2 ? 'Optimal' : 'Sub-Optimal',
    evalClass: m => m.riskRewardRatio >= 2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 2.0R', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '< 2.0R', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'realizedRR',
    label: 'Realized_R/R',
    sub: 'Actual Capture RR',
    desc: 'The actual realized Risk/Reward ratio achieved upon trade liquidation.',
    formula: 'Average Win / Average Loss',
    valStr: m => `${m.realizedRR.toFixed(2)}R`,
    colorClass: m => m.realizedRR >= 1.5 ? 'text-emerald-400' : (m.realizedRR >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.realizedRR >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.realizedRR >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.realizedRR >= 1.5 ? 'Optimal' : (m.realizedRR >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.realizedRR >= 1.5 ? 'text-emerald-500' : (m.realizedRR >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5R', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 1.5R', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectedValue',
    label: 'Expected_Value',
    sub: 'Statistical EV',
    desc: 'The mathematical expectancy of future performance per executed trade.',
    formula: '(Win% * AvgWin) - (Loss% * AvgLoss)',
    valStr: m => `${m.expectedValue >= 0 ? '+' : ''}$${m.expectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.expectedValue >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.expectedValue >= 0 ? 'Positive Alpha' : 'Negative Drag',
    evalClass: m => m.expectedValue >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactor',
    label: 'Profit_Factor',
    sub: 'Gross Win / Gross Loss',
    desc: 'The absolute ratio of total gross profit to total gross loss.',
    formula: 'Gross Profit / Gross Loss',
    valStr: m => `${m.profitFactor.toFixed(2)}x`,
    colorClass: m => m.profitFactor >= 1.5 ? 'text-emerald-400' : (m.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactor >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactor >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactor >= 1.5 ? 'Optimal' : (m.profitFactor >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.profitFactor >= 1.5 ? 'text-emerald-500' : (m.profitFactor >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'beWinRate',
    label: 'Break-even_Win_Rate',
    sub: 'Required Win% for $0',
    desc: 'The minimum win rate required to maintain a zero net profit balance.',
    formula: '1 / (1 + Payoff Ratio)',
    valStr: m => `${m.beWinRate.toFixed(1)}%`,
    colorClass: m => m.winRate >= m.beWinRate ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.winRate >= m.beWinRate ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.winRate >= m.beWinRate ? 'Sustainable' : 'Unsustainable',
    evalClass: m => m.winRate >= m.beWinRate ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Win Rate', eval: 'Sustainable', class: 'text-emerald-500 font-bold' },
      { label: '>= Win Rate', eval: 'Unsustainable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'numTrades',
    label: 'Number_of_Trades',
    sub: 'Sample Size',
    desc: 'The total count of fully liquidated trade records in the strategy archive.',
    formula: 'Count(Archived Trades)',
    valStr: m => `${m.numTrades}`,
    colorClass: m => m.numTrades >= 30 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.numTrades >= 30 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.numTrades >= 30 ? 'Statistically Significant' : 'Small Sample',
    evalClass: m => m.numTrades >= 30 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 30', eval: 'Significant', class: 'text-emerald-500 font-bold' },
      { label: '< 30', eval: 'Small Sample', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'numWin',
    label: 'Winning_Trades',
    sub: 'Profitable Count',
    desc: 'The count of executed trades that resulted in a positive financial return.',
    formula: 'Count(PnL > 0)',
    valStr: m => `${m.numWin}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.numWin > m.numLoss ? 'Majority Wins' : 'Minority Wins',
    evalClass: m => m.numWin > m.numLoss ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> Losing Trades', eval: 'Majority Wins', class: 'text-emerald-500 font-bold' },
      { label: '<= Losing Trades', eval: 'Minority Wins', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'numLoss',
    label: 'Losing_Trades',
    sub: 'Negative Count',
    desc: 'The count of executed trades that resulted in a negative financial return.',
    formula: 'Count(PnL < 0)',
    valStr: m => `${m.numLoss}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.numLoss < m.numWin ? 'Nominal' : 'Sub-Optimal',
    evalClass: m => m.numLoss < m.numWin ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '< Winning Trades', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '>= Winning Trades', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'largestWin',
    label: 'Largest_Winning_Trade',
    sub: 'Max Positive PnL',
    desc: 'The single largest financial gain achieved across the entire strategy history.',
    formula: 'Max(Winning Trades PnL)',
    valStr: m => `+$${m.largestWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.largestWin > 0 ? 'Nominal' : 'Zero',
    evalClass: m => m.largestWin > 0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '> $0', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '$0', eval: 'Zero', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'largestLoss',
    label: 'Largest_Losing_Trade',
    sub: 'Max Negative PnL',
    desc: 'The single largest financial loss incurred across the entire strategy history.',
    formula: 'Min(Losing Trades PnL)',
    valStr: m => `-$${Math.abs(m.largestLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => Math.abs(m.largestLoss) <= (m.avgLoss * 2) ? 'Controlled Risk' : 'Tail Risk Outlier',
    evalClass: m => Math.abs(m.largestLoss) <= (m.avgLoss * 2) ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 2x Avg Loss', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 2x Avg Loss', eval: 'Tail Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'maxConsWins',
    label: 'Consecutive_Wins',
    sub: 'Longest Winning Streak',
    desc: 'The longest unbroken series of winning trades recorded in chronological order.',
    formula: 'Max Streak(PnL > 0)',
    valStr: m => `${m.maxConsWins}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: m => m.maxConsWins >= 3 ? 'Strong Momentum' : 'Nominal',
    evalClass: m => m.maxConsWins >= 3 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '>= 3', eval: 'Strong Momentum', class: 'text-emerald-500 font-bold' },
      { label: '< 3', eval: 'Nominal', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'maxConsLosses',
    label: 'Consecutive_Losses',
    sub: 'Longest Losing Streak',
    desc: 'The longest unbroken series of losing trades recorded in chronological order.',
    formula: 'Max Streak(PnL < 0)',
    valStr: m => `${m.maxConsLosses}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.maxConsLosses <= 3 ? 'Controlled Drawdown' : 'Systemic Drawdown',
    evalClass: m => m.maxConsLosses <= 3 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 3', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 3', eval: 'Systemic', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgHoldingTimeStr',
    label: 'Average_Holding_Time',
    sub: 'Mean Trade Duration',
    desc: 'The average temporal span between trade initiation and complete liquidation.',
    formula: 'Σ(Exit Time - Entry Time) / Trades With Entry+Exit Time',
    valStr: m => m.avgHoldingTimeStr,
    colorClass: () => 'nier-text-primary',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: () => 'Strategy Aligned',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Strategy Aligned', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'avgProfitPerDay',
    label: 'Average_Profit_Velocity',
    sub: 'Day / Week / Month',
    desc: 'The average net financial return generated per active calendar day, week, and month in the archive.',
    formula: 'Net Profit / Active Span',
    valStr: m => `$${m.avgProfitPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}/d`,
    tooltipValStr: m => `$${m.avgProfitPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}/d | $${m.avgProfitPerWeek.toLocaleString(undefined, { maximumFractionDigits: 1 })}/w | $${m.avgProfitPerMonth.toLocaleString(undefined, { maximumFractionDigits: 1 })}/m`,
    colorClass: m => m.avgProfitPerDay >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgProfitPerDay >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgProfitPerDay >= 0 ? 'Positive Velocity' : 'Negative Drag',
    evalClass: m => m.avgProfitPerDay >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Velocity', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'maxDrawdownNum',
    label: 'Maximum_Drawdown',
    sub: 'Peak-to-Trough Delta',
    desc: 'The maximum observed loss from a historical equity peak to a subsequent trough.',
    formula: 'Max(Equity Peak - Subsequent Trough)',
    valStr: m => `-$${m.maxDrawdownNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    tooltipValStr: m => `-$${m.maxDrawdownNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${m.maxDrawdownPct.toFixed(1)}%)`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.maxDrawdownPct <= 20 ? 'Controlled Risk' : 'Severe Drawdown',
    evalClass: m => m.maxDrawdownPct <= 20 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 20%', eval: 'Controlled', class: 'text-emerald-500 font-bold' },
      { label: '> 20%', eval: 'Severe', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgDrawdownPct',
    label: 'Average_Drawdown',
    sub: 'Mean Drawdown Depth',
    desc: 'The statistical mean of all observed equity drawdowns across the strategy history.',
    formula: 'Σ(Drawdown %) / Drawdown Count',
    valStr: m => `${m.avgDrawdownPct.toFixed(1)}%`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: m => m.avgDrawdownPct <= 10 ? 'Nominal' : 'Sub-Optimal',
    evalClass: m => m.avgDrawdownPct <= 10 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 10%', eval: 'Nominal', class: 'text-emerald-500 font-bold' },
      { label: '> 10%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'drawdownDurationStr',
    label: 'Drawdown_Duration',
    sub: 'Max Recovery Span',
    desc: 'The longest temporal duration spent in a state of equity drawdown before achieving a new peak.',
    formula: 'Max(Trough Date - Peak Date)',
    valStr: m => m.drawdownDurationStr,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Nominal Span',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Nominal Span', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'recoveryFactor',
    label: 'Recovery_Factor',
    sub: 'Net Profit / Max DD',
    desc: 'The ratio of total net profit to the maximum historical equity drawdown.',
    formula: 'Net Profit / Maximum Drawdown',
    valStr: m => `${m.recoveryFactor.toFixed(2)}x`,
    colorClass: m => m.recoveryFactor >= 2 ? 'text-emerald-400' : (m.recoveryFactor >= 1 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.recoveryFactor >= 2 ? (isDark ? '#ffffff' : '#000000') : (m.recoveryFactor >= 1 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.recoveryFactor >= 2 ? 'Excellent' : (m.recoveryFactor >= 1 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.recoveryFactor >= 2 ? 'text-emerald-500' : (m.recoveryFactor >= 1 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 2.0x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnOnCapital',
    label: 'Return_on_Capital',
    sub: 'Net Profit / Deposit',
    desc: 'The cumulative percentage return generated on the initial capital injection.',
    formula: '(Net Profit / Initial Deposit) * 100',
    valStr: m => `${m.returnOnCapital >= 0 ? '+' : ''}${m.returnOnCapital.toFixed(1)}%`,
    colorClass: m => m.returnOnCapital >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.returnOnCapital >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.returnOnCapital >= 0 ? 'Positive Alpha' : 'Capital Erosion',
    evalClass: m => m.returnOnCapital >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Capital Erosion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnPerTrade',
    label: 'Return_per_Trade',
    sub: 'Mean Dollar Alpha',
    desc: 'The average net financial return captured per executed trade record.',
    formula: 'Net Profit / Total Trades',
    valStr: m => `${m.returnPerTrade >= 0 ? '+' : ''}$${m.returnPerTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.returnPerTrade >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.returnPerTrade >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.returnPerTrade >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.returnPerTrade >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskPerTrade',
    label: 'Risk_per_Trade',
    sub: 'Mean Dollar Risk',
    desc: 'The average financial risk exposure established per executed trade setup.',
    formula: 'Total Initial Risk / Trades With Risk Data',
    valStr: m => `$${m.riskPerTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Controlled Budget',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Controlled Budget', class: 'text-emerald-500 font-bold' }
    ]
  }
];

const advancedMetricsConfigs: MetricConfig[] = [
  {
    key: 'sharpeRatio',
    label: 'Sharpe_Ratio',
    sub: 'Risk-Adjusted Return',
    desc: 'The excess return per unit of total return volatility. Measures investment efficiency.',
    formula: '(CAGR - Rf) / Annualized StdDev(Return)',
    valStr: m => `${m.sharpeRatio.toFixed(2)}`,
    colorClass: m => m.sharpeRatio >= 1.5 ? 'text-emerald-400' : (m.sharpeRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sharpeRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.sharpeRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sharpeRatio >= 1.5 ? 'Optimal' : (m.sharpeRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.sharpeRatio >= 1.5 ? 'text-emerald-500' : (m.sharpeRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sortinoRatio',
    label: 'Sortino_Ratio',
    sub: 'Downside Risk Adj',
    desc: 'The excess return per unit of downside volatility. Differentiates harmful volatility from general volatility.',
    formula: '(CAGR - Rf) / Annualized Downside StdDev',
    valStr: m => `${m.sortinoRatio.toFixed(2)}`,
    colorClass: m => m.sortinoRatio >= 2.0 ? 'text-emerald-400' : (m.sortinoRatio >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sortinoRatio >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.sortinoRatio >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sortinoRatio >= 2.0 ? 'Excellent' : (m.sortinoRatio >= 1.5 ? 'Good' : 'Sub-Optimal'),
    evalClass: m => m.sortinoRatio >= 2.0 ? 'text-emerald-500' : (m.sortinoRatio >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '1.5 - 2.0', eval: 'Good', class: 'text-amber-500 font-bold' },
      { label: '< 1.5', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'calmarRatio',
    label: 'Calmar_Ratio',
    sub: 'CAGR / Max Drawdown',
    desc: 'The ratio of compounded annual growth rate to the maximum historical equity drawdown.',
    formula: 'CAGR / Maximum Drawdown %',
    valStr: m => `${m.calmarRatio.toFixed(2)}`,
    colorClass: m => m.calmarRatio >= 2.0 ? 'text-emerald-400' : (m.calmarRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.calmarRatio >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.calmarRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.calmarRatio >= 2.0 ? 'Superior' : (m.calmarRatio >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.calmarRatio >= 2.0 ? 'text-emerald-500' : (m.calmarRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0', eval: 'Superior', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 2.0', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sterlingRatio',
    label: 'Sterling_Ratio',
    sub: 'CAGR / Avg Drawdown',
    desc: 'The ratio of compounded annual growth rate to the average historical equity drawdown.',
    formula: 'CAGR / Average Drawdown %',
    valStr: m => `${m.sterlingRatio.toFixed(2)}`,
    colorClass: m => m.sterlingRatio >= 1.5 ? 'text-emerald-400' : (m.sterlingRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sterlingRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.sterlingRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sterlingRatio >= 1.5 ? 'Optimal' : (m.sterlingRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.sterlingRatio >= 1.5 ? 'text-emerald-500' : (m.sterlingRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'omegaRatio',
    label: 'Omega_Ratio',
    sub: 'Gain / Loss Weight',
    desc: 'The probability-weighted ratio of gains versus losses above a specified target threshold.',
    formula: 'Σ(Positive Returns) / Σ(|Negative Returns|)',
    valStr: m => `${m.omegaRatio.toFixed(2)}x`,
    colorClass: m => m.omegaRatio >= 1.5 ? 'text-emerald-400' : (m.omegaRatio >= 1.2 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.omegaRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.omegaRatio >= 1.2 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.omegaRatio >= 1.5 ? 'Strong Edge' : (m.omegaRatio >= 1.2 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.omegaRatio >= 1.5 ? 'text-emerald-500' : (m.omegaRatio >= 1.2 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Strong Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.2x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.2x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'ulcerIndex',
    label: 'Ulcer_Index',
    sub: 'Drawdown Depth/Dur',
    desc: 'A measure of the depth and duration of drawdowns from earlier peaks. Lower indicates less stress.',
    formula: 'Sqrt( Σ(Drawdown % ^ 2) / N )',
    valStr: m => `${m.ulcerIndex.toFixed(1)}%`,
    colorClass: m => m.ulcerIndex <= 5.0 ? 'text-emerald-400' : (m.ulcerIndex <= 10.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.ulcerIndex <= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.ulcerIndex <= 10.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.ulcerIndex <= 5.0 ? 'Low Stress' : (m.ulcerIndex <= 10.0 ? 'Moderate' : 'High Stress'),
    evalClass: m => m.ulcerIndex <= 5.0 ? 'text-emerald-500' : (m.ulcerIndex <= 10.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 5.0%', eval: 'Low Stress', class: 'text-emerald-500 font-bold' },
      { label: '5.0% - 10%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 10%', eval: 'High Stress', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'marRatio',
    label: 'MAR_Ratio',
    sub: 'CAGR / Max DD',
    desc: 'The ratio of Compounded Annual Growth Rate to Maximum Drawdown. Used by CTAs and institutions.',
    formula: 'CAGR / Maximum Drawdown %',
    valStr: m => `${m.marRatio.toFixed(2)}`,
    colorClass: m => m.marRatio >= 1.0 ? 'text-emerald-400' : (m.marRatio >= 0.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.marRatio >= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.marRatio >= 0.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.marRatio >= 1.0 ? 'Excellent' : (m.marRatio >= 0.5 ? 'Acceptable' : 'Sub-Optimal'),
    evalClass: m => m.marRatio >= 1.0 ? 'text-emerald-500' : (m.marRatio >= 0.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.0', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '0.5 - 1.0', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '< 0.5', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'gainToPainRatio',
    label: 'Gain-to-Pain',
    sub: 'Schwager Edge Metric',
    desc: 'Jack Schwager\'s Gain-to-Pain ratio: the sum of all returns divided by the absolute sum of all negative returns.',
    formula: 'Σ(All Returns) / Σ(|Negative Returns|)',
    valStr: m => `${m.gainToPainRatio.toFixed(2)}`,
    colorClass: m => m.gainToPainRatio >= 1.5 ? 'text-emerald-400' : (m.gainToPainRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.gainToPainRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.gainToPainRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.gainToPainRatio >= 1.5 ? 'Superior' : (m.gainToPainRatio >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.gainToPainRatio >= 1.5 ? 'text-emerald-500' : (m.gainToPainRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Superior', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'tailRatio',
    label: 'Tail_Ratio',
    sub: '95th / 5th Percentile',
    desc: 'The ratio of the 95th percentile of winning returns to the absolute 5th percentile of losing returns.',
    formula: 'P95(Returns) / |P05(Returns)|',
    valStr: m => `${m.tailRatio.toFixed(2)}`,
    colorClass: m => m.tailRatio >= 1.2 ? 'text-emerald-400' : (m.tailRatio >= 0.9 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.tailRatio >= 1.2 ? (isDark ? '#ffffff' : '#000000') : (m.tailRatio >= 0.9 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.tailRatio >= 1.2 ? 'Favorable Asymmetry' : (m.tailRatio >= 0.9 ? 'Symmetric' : 'Fat Tail Risk'),
    evalClass: m => m.tailRatio >= 1.2 ? 'text-emerald-500' : (m.tailRatio >= 0.9 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.2', eval: 'Favorable Asymmetry', class: 'text-emerald-500 font-bold' },
      { label: '0.9 - 1.2', eval: 'Symmetric', class: 'text-amber-500 font-bold' },
      { label: '< 0.9', eval: 'Fat Tail Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'commonSenseRatio',
    label: 'Common_Sense_Ratio',
    sub: 'Tail * Gain-to-Pain',
    desc: 'A composite metric combining the Tail Ratio and Gain-to-Pain Ratio to assess robust asymmetric edge.',
    formula: 'Tail Ratio * Gain-to-Pain Ratio',
    valStr: m => `${m.commonSenseRatio.toFixed(2)}`,
    colorClass: m => m.commonSenseRatio >= 1.5 ? 'text-emerald-400' : (m.commonSenseRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.commonSenseRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.commonSenseRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.commonSenseRatio >= 1.5 ? 'Robust Edge' : (m.commonSenseRatio >= 1.0 ? 'Nominal' : 'Fragile'),
    evalClass: m => m.commonSenseRatio >= 1.5 ? 'text-emerald-500' : (m.commonSenseRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Robust Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Fragile', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorStrategy',
    label: 'PF_by_Strategy',
    sub: 'Active Strategy PF',
    desc: 'The profit factor specifically isolated for trade records matching the currently active strategy protocol.',
    formula: 'Strategy Gross Profit / Strategy Gross Loss',
    valStr: m => `${m.profitFactorStrategy.toFixed(2)}x`,
    colorClass: m => m.profitFactorStrategy >= 2.0 ? 'text-emerald-400' : (m.profitFactorStrategy >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorStrategy >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorStrategy >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorStrategy >= 2.0 ? 'Elite' : (m.profitFactorStrategy >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorStrategy >= 2.0 ? 'text-emerald-500' : (m.profitFactorStrategy >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorMarket',
    label: 'PF_by_Market',
    sub: 'Best Market Alpha',
    desc: 'The highest profit factor achieved across all traded market instruments and asset classes within the strategy.',
    formula: 'Max(Asset Gross Profit / Asset Gross Loss)',
    valStr: m => `${m.profitFactorMarket.toFixed(2)}x`,
    colorClass: m => m.profitFactorMarket >= 2.0 ? 'text-emerald-400' : (m.profitFactorMarket >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorMarket >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorMarket >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorMarket >= 2.0 ? 'Elite Alpha' : (m.profitFactorMarket >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorMarket >= 2.0 ? 'text-emerald-500' : (m.profitFactorMarket >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite Alpha', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'profitFactorTimeframe',
    label: 'PF_by_Timeframe',
    sub: 'Best Timeframe Alpha',
    desc: 'The highest profit factor achieved across all traded execution timeframes and chart intervals.',
    formula: 'Max(TF Gross Profit / TF Gross Loss)',
    valStr: m => `${m.profitFactorTimeframe.toFixed(2)}x`,
    colorClass: m => m.profitFactorTimeframe >= 2.0 ? 'text-emerald-400' : (m.profitFactorTimeframe >= 1.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.profitFactorTimeframe >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.profitFactorTimeframe >= 1.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.profitFactorTimeframe >= 2.0 ? 'Elite Alpha' : (m.profitFactorTimeframe >= 1.5 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.profitFactorTimeframe >= 2.0 ? 'text-emerald-500' : (m.profitFactorTimeframe >= 1.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0x', eval: 'Elite Alpha', class: 'text-emerald-500 font-bold' },
      { label: '1.5x - 2.0x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.5x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgTradeExpectancy',
    label: 'Avg_Trade_Expectancy',
    sub: 'Expected Dollar PnL',
    desc: 'The mathematical expected dollar value generated per executed trade setup based on win rate and mean outcomes.',
    formula: '(Win% * AvgWin) - (Loss% * AvgLoss)',
    valStr: m => `${m.avgTradeExpectancy >= 0 ? '+' : ''}$${m.avgTradeExpectancy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.avgTradeExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.avgTradeExpectancy >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.avgTradeExpectancy >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.avgTradeExpectancy >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectancyScore',
    label: 'Expectancy_Score',
    sub: 'Expectancy / Avg Loss',
    desc: 'Normalized expectancy score expressed as a ratio of expected value to the average losing trade magnitude.',
    formula: 'Expected Value / Average Loss',
    valStr: m => `${m.expectancyScore.toFixed(2)}`,
    colorClass: m => m.expectancyScore >= 0.5 ? 'text-emerald-400' : (m.expectancyScore >= 0.2 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.expectancyScore >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.expectancyScore >= 0.2 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.expectancyScore >= 0.5 ? 'Excellent' : (m.expectancyScore >= 0.2 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.expectancyScore >= 0.5 ? 'text-emerald-500' : (m.expectancyScore >= 0.2 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.5', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '0.2 - 0.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 0.2', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'latestRMultiple',
    label: 'R-Multiple',
    sub: 'Latest Trade R-Value',
    desc: 'The realized return-to-risk multiple (R-multiple) captured on the most recently archived trade execution.',
    formula: 'Latest PnL / Latest Initial Risk',
    valStr: m => `${m.latestRMultiple >= 0 ? '+' : ''}${m.latestRMultiple.toFixed(2)}R`,
    colorClass: m => m.latestRMultiple >= 2.0 ? 'text-emerald-400' : (m.latestRMultiple >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.latestRMultiple >= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.latestRMultiple >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.latestRMultiple >= 2.0 ? 'Optimal R' : (m.latestRMultiple >= 1.0 ? 'Nominal R' : 'Sub-Optimal R'),
    evalClass: m => m.latestRMultiple >= 2.0 ? 'text-emerald-500' : (m.latestRMultiple >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.0R', eval: 'Optimal R', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 2.0R', eval: 'Nominal R', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal R', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'avgRMultiple',
    label: 'Average_R-Multiple',
    sub: 'Mean Historical R',
    desc: 'The statistical mean of all realized R-multiples captured across the entire strategy trade archive.',
    formula: 'Σ(Trade R-Multiples) / Total Trades',
    valStr: m => `${m.avgRMultiple >= 0 ? '+' : ''}${m.avgRMultiple.toFixed(2)}R`,
    colorClass: m => m.avgRMultiple >= 1.5 ? 'text-emerald-400' : (m.avgRMultiple >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.avgRMultiple >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.avgRMultiple >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.avgRMultiple >= 1.5 ? 'Strong Edge' : (m.avgRMultiple >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.avgRMultiple >= 1.5 ? 'text-emerald-500' : (m.avgRMultiple >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5R', eval: 'Strong Edge', class: 'text-emerald-500 font-bold' },
      { label: '1.0R - 1.5R', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0R', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rMultipleDist',
    label: 'R-Multiple_Dist',
    sub: '% Trades >= 2.0R',
    desc: 'The percentage of all executed trades that successfully captured an R-multiple of 2.0R or greater.',
    formula: '(Trades >= 2.0R / Total Trades) * 100',
    valStr: m => `${m.rMultipleDist.toFixed(1)}%`,
    colorClass: m => m.rMultipleDist >= 30 ? 'text-emerald-400' : (m.rMultipleDist >= 15 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rMultipleDist >= 30 ? (isDark ? '#ffffff' : '#000000') : (m.rMultipleDist >= 15 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rMultipleDist >= 30 ? 'Excellent' : (m.rMultipleDist >= 15 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rMultipleDist >= 30 ? 'text-emerald-500' : (m.rMultipleDist >= 15 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 30%', eval: 'Excellent', class: 'text-emerald-500 font-bold' },
      { label: '15% - 30%', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 15%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'riskOfRuin',
    label: 'Risk_of_Ruin',
    sub: 'Capital Depletion Prob',
    desc: 'The mathematical probability of reaching total capital depletion based on current win rate and payoff ratio.',
    formula: '((1 - Kelly Edge) / (1 + Kelly Edge)) ^ CapitalUnits',
    valStr: m => `${m.riskOfRuin.toFixed(1)}%`,
    colorClass: m => m.riskOfRuin <= 1.0 ? 'text-emerald-400' : (m.riskOfRuin <= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.riskOfRuin <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.riskOfRuin <= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.riskOfRuin <= 1.0 ? 'Safe' : (m.riskOfRuin <= 5.0 ? 'Vulnerable' : 'Critical Risk'),
    evalClass: m => m.riskOfRuin <= 1.0 ? 'text-emerald-500' : (m.riskOfRuin <= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 1.0%', eval: 'Safe', class: 'text-emerald-500 font-bold' },
      { label: '1.0% - 5.0%', eval: 'Vulnerable', class: 'text-amber-500 font-bold' },
      { label: '> 5.0%', eval: 'Critical Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'slope',
    label: 'Equity_Curve_Slope',
    sub: 'Linear Reg PnL Velocity',
    desc: 'The linear regression slope of the equity curve, representing the true annualized or per-trade equity growth velocity.',
    formula: 'Cov(Trade Index, Equity) / Var(Trade Index)',
    valStr: m => `${m.slope >= 0 ? '+' : ''}$${m.slope.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.slope >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.slope >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.slope >= 0 ? 'Upward Trajectory' : 'Downward Trajectory',
    evalClass: m => m.slope >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Upward Trajectory', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Downward Trajectory', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveVolatility',
    label: 'Equity_Curve_Vol',
    sub: 'StdDev of Residuals',
    desc: 'The standard deviation of equity curve residuals around the linear regression line. Measures equity smoothness.',
    formula: 'Sqrt( Σ(Equity - RegLine)^2 / (N-2) )',
    valStr: m => `$${m.equityCurveVolatility.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Volatility',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Volatility', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveStability',
    label: 'Equity_Curve_Stab',
    sub: 'R-Squared Fit (R²)',
    desc: 'The R-squared (R²) coefficient of determination for the equity curve linear regression line. Measures trend consistency.',
    formula: '1 - (SS_res / SS_tot)',
    valStr: m => `${m.equityCurveStability.toFixed(1)}%`,
    colorClass: m => m.equityCurveStability >= 80 ? 'text-emerald-400' : (m.equityCurveStability >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.equityCurveStability >= 80 ? (isDark ? '#ffffff' : '#000000') : (m.equityCurveStability >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.equityCurveStability >= 80 ? 'High Stability' : (m.equityCurveStability >= 50 ? 'Moderate' : 'Erratic'),
    evalClass: m => m.equityCurveStability >= 80 ? 'text-emerald-500' : (m.equityCurveStability >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 80%', eval: 'High Stability', class: 'text-emerald-500 font-bold' },
      { label: '50% - 80%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50%', eval: 'Erratic', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'equityCurveCorrelation',
    label: 'Equity_Curve_Corr',
    sub: 'Pearson Correlation (r)',
    desc: 'The Pearson correlation coefficient (r) between trade progression index and equity balance. Indicates structural growth.',
    formula: 'Sqrt(R-Squared)',
    valStr: m => `${m.equityCurveCorrelation.toFixed(2)}`,
    colorClass: m => m.equityCurveCorrelation >= 0.9 ? 'text-emerald-400' : (m.equityCurveCorrelation >= 0.7 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.equityCurveCorrelation >= 0.9 ? (isDark ? '#ffffff' : '#000000') : (m.equityCurveCorrelation >= 0.7 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.equityCurveCorrelation >= 0.9 ? 'Strong Trend' : (m.equityCurveCorrelation >= 0.7 ? 'Moderate' : 'Weak Trend'),
    evalClass: m => m.equityCurveCorrelation >= 0.9 ? 'text-emerald-500' : (m.equityCurveCorrelation >= 0.7 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.90', eval: 'Strong Trend', class: 'text-emerald-500 font-bold' },
      { label: '0.70 - 0.90', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 0.70', eval: 'Weak Trend', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'stdPnL',
    label: 'Trade_Result_StdDev',
    sub: 'PnL Dispersion Matrix',
    desc: 'The statistical standard deviation of individual trade profit and loss results around the mean trade outcome.',
    formula: 'Sqrt( Σ(PnL - MeanPnL)^2 / (N-1) )',
    valStr: m => `$${m.stdPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Dispersion',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Dispersion', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'varPnL',
    label: 'Trade_Result_Var',
    sub: 'PnL Variance (σ²)',
    desc: 'The statistical variance (σ²) of individual trade profit and loss results. The square of standard deviation.',
    formula: 'Σ(PnL - MeanPnL)^2 / (N-1)',
    valStr: m => `$${Math.round(m.varPnL).toLocaleString()}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Measured Variance',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Measured Variance', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'coeffOfVariation',
    label: 'Coeff_of_Variation',
    sub: 'StdDev / |Mean PnL|',
    desc: 'The coefficient of variation (CV), measuring the relative dispersion of trade results per unit of expected return.',
    formula: 'StdDev(PnL) / |MeanPnL|',
    valStr: m => `${m.coeffOfVariation.toFixed(2)}`,
    colorClass: m => m.coeffOfVariation <= 2.0 ? 'text-emerald-400' : (m.coeffOfVariation <= 4.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.coeffOfVariation <= 2.0 ? (isDark ? '#ffffff' : '#000000') : (m.coeffOfVariation <= 4.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.coeffOfVariation <= 2.0 ? 'High Consistency' : (m.coeffOfVariation <= 4.0 ? 'Moderate' : 'High Dispersion'),
    evalClass: m => m.coeffOfVariation <= 2.0 ? 'text-emerald-500' : (m.coeffOfVariation <= 4.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 2.0', eval: 'High Consistency', class: 'text-emerald-500 font-bold' },
      { label: '2.0 - 4.0', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 4.0', eval: 'High Dispersion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'skewness',
    label: 'Skewness_of_Returns',
    sub: 'Return Asymmetry (S)',
    desc: 'The statistical skewness of trade returns. Positive skew indicates frequent small losses and massive winning outlier trades.',
    formula: 'Σ(Standardized PnL^3) / N',
    valStr: m => `${m.skewness >= 0 ? '+' : ''}${m.skewness.toFixed(2)}`,
    colorClass: m => m.skewness >= 0.5 ? 'text-emerald-400' : (m.skewness >= -0.5 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.skewness >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.skewness >= -0.5 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.skewness >= 0.5 ? 'Positive Skew' : (m.skewness >= -0.5 ? 'Symmetric' : 'Negative Skew'),
    evalClass: m => m.skewness >= 0.5 ? 'text-emerald-500' : (m.skewness >= -0.5 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.50', eval: 'Positive Skew', class: 'text-emerald-500 font-bold' },
      { label: '-0.50 - 0.50', eval: 'Symmetric', class: 'text-amber-500 font-bold' },
      { label: '< -0.50', eval: 'Negative Skew', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'kurtosis',
    label: 'Kurtosis_of_Returns',
    sub: 'Tail Extremity (K)',
    desc: 'The excess kurtosis of trade returns. High kurtosis indicates fat tails and elevated probability of extreme outlier results.',
    formula: '(Σ(Standardized PnL^4) / N) - 3',
    valStr: m => `${m.kurtosis >= 0 ? '+' : ''}${m.kurtosis.toFixed(2)}`,
    colorClass: m => m.kurtosis <= 3.0 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.kurtosis <= 3.0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.kurtosis <= 3.0 ? 'Normal Tails' : 'Fat Tails',
    evalClass: m => m.kurtosis <= 3.0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 3.0', eval: 'Normal Tails', class: 'text-emerald-500 font-bold' },
      { label: '> 3.0', eval: 'Fat Tails', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'medianTradeResult',
    label: 'Median_Trade_Result',
    sub: '50th Percentile PnL',
    desc: 'The median dollar profit or loss outcome across all executed trades, eliminating distortion from extreme outliers.',
    formula: 'P50(Trade PnLs)',
    valStr: m => `${m.medianTradeResult >= 0 ? '+' : ''}$${m.medianTradeResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.medianTradeResult >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.medianTradeResult >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.medianTradeResult >= 0 ? 'Positive Median' : 'Negative Median',
    evalClass: m => m.medianTradeResult >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Median', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Median', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'medianWinLossRatio',
    label: 'Median_Win/Loss',
    sub: 'MedWin / |MedLoss|',
    desc: 'The ratio of the median winning trade magnitude to the absolute median losing trade magnitude.',
    formula: 'Median Win / |Median Loss|',
    valStr: m => `${m.medianWinLossRatio.toFixed(2)}x`,
    colorClass: m => m.medianWinLossRatio >= 1.5 ? 'text-emerald-400' : (m.medianWinLossRatio >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.medianWinLossRatio >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.medianWinLossRatio >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.medianWinLossRatio >= 1.5 ? 'Optimal Asymmetry' : (m.medianWinLossRatio >= 1.0 ? 'Nominal' : 'Sub-Optimal'),
    evalClass: m => m.medianWinLossRatio >= 1.5 ? 'text-emerald-500' : (m.medianWinLossRatio >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal Asymmetry', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Nominal', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  }
];

const expertMetricsConfigs: MetricConfig[] = [
  {
    key: 'valueAtRisk',
    label: 'Value_at_Risk',
    sub: '95% 1-Day Dollar VaR',
    desc: 'The maximum expected dollar loss over a 1-day horizon at a 95% confidence level based on historical simulation.',
    formula: '|P05(Trade PnLs)|',
    valStr: m => `$${m.valueAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Tail Threshold',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Tail Threshold', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'cvar',
    label: 'Conditional_VaR',
    sub: 'Expected Shortfall ($)',
    desc: 'The mathematical expectation of dollar loss exceeding the Value at Risk threshold. Measures tail severity.',
    formula: 'Mean(PnLs < P05)',
    valStr: m => `$${m.cvar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-rose-400',
    colorVal: (_, isDark) => isDark ? '#fb7185' : '#e11d48',
    evalStr: () => 'Tail Severity',
    evalClass: () => 'text-rose-500',
    benchmarks: [
      { label: 'Any', eval: 'Tail Severity', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'expectedShortfall',
    label: 'Expected_Shortfall',
    sub: 'CVaR / Initial Deposit',
    desc: 'Conditional Value at Risk expressed as a percentage of the initial account deposit. Measures capital exposure in worst 5% cases.',
    formula: '(CVaR / Deposit) * 100',
    valStr: m => `${m.expectedShortfall.toFixed(1)}%`,
    colorClass: m => m.expectedShortfall <= 5.0 ? 'text-emerald-400' : (m.expectedShortfall <= 10.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.expectedShortfall <= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.expectedShortfall <= 10.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.expectedShortfall <= 5.0 ? 'Low Risk' : (m.expectedShortfall <= 10.0 ? 'Moderate' : 'High Risk'),
    evalClass: m => m.expectedShortfall <= 5.0 ? 'text-emerald-500' : (m.expectedShortfall <= 10.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 5.0%', eval: 'Low Risk', class: 'text-emerald-500 font-bold' },
      { label: '5.0% - 10%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '> 10%', eval: 'High Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'mae',
    label: 'Max_Adverse_Excursion',
    sub: 'Mean Intra-Trade Dip',
    desc: 'The average maximum adverse excursion (MAE) experienced during open trade setups before eventual exit.',
    formula: 'Σ(Trade MAE) / Trades With MAE/MFE Data',
    valStr: m => `$${m.mae.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Intra-Trade Risk',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Intra-Trade Risk', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'mfe',
    label: 'Max_Favorable_Excurs',
    sub: 'Mean Intra-Trade Peak',
    desc: 'The average maximum favorable excursion (MFE) experienced during open trade setups before eventual exit.',
    formula: 'Σ(Trade MFE) / Trades With MAE/MFE Data',
    valStr: m => `$${m.mfe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: () => 'text-emerald-400',
    colorVal: (_, isDark) => isDark ? '#ffffff' : '#000000',
    evalStr: () => 'Intra-Trade Potential',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Intra-Trade Potential', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'maeMfeRatio',
    label: 'MAE/MFE_Ratio',
    sub: 'Adverse vs Favorable',
    desc: 'The ratio of mean maximum adverse excursion to mean maximum favorable excursion. Measures trade execution efficiency.',
    formula: 'Mean MAE / Mean MFE',
    valStr: m => `${m.maeMfeRatio.toFixed(2)}`,
    colorClass: m => m.maeMfeRatio <= 0.5 ? 'text-emerald-400' : (m.maeMfeRatio <= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.maeMfeRatio <= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.maeMfeRatio <= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.maeMfeRatio <= 0.5 ? 'Highly Efficient' : (m.maeMfeRatio <= 1.0 ? 'Acceptable' : 'Inefficient'),
    evalClass: m => m.maeMfeRatio <= 0.5 ? 'text-emerald-500' : (m.maeMfeRatio <= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 0.5', eval: 'Highly Efficient', class: 'text-emerald-500 font-bold' },
      { label: '0.5 - 1.0', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '> 1.0', eval: 'Inefficient', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'zScore',
    label: 'Z-Score_of_Sequence',
    sub: 'Streak Randomness (Z)',
    desc: 'The Z-score of the trade win/loss sequence. Evaluates whether streaks are statistically random or clustered.',
    formula: '(Runs - E(Runs)) / StdDev(Runs)',
    valStr: m => `${m.zScore >= 0 ? '+' : ''}${m.zScore.toFixed(2)}`,
    colorClass: m => Math.abs(m.zScore) <= 1.96 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.zScore) <= 1.96 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.zScore) <= 1.96 ? 'Random Sequence' : 'Clustered Streaks',
    evalClass: m => Math.abs(m.zScore) <= 1.96 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|Z| <= 1.96', eval: 'Random Sequence', class: 'text-emerald-500 font-bold' },
      { label: '|Z| > 1.96', eval: 'Clustered Streaks', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'runsTest',
    label: 'Runs_Test',
    sub: 'Independence Eval',
    desc: 'Wald-Wolfowitz Runs Test evaluating the null hypothesis of sequential independence in trade results.',
    formula: '|Z-Score| < 1.96',
    valStr: m => m.runsTest === 1 ? 'PASSED' : 'FAILED',
    colorClass: m => m.runsTest === 1 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.runsTest === 1 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.runsTest === 1 ? 'Independent' : 'Dependent',
    evalClass: m => m.runsTest === 1 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: 'PASSED', eval: 'Independent', class: 'text-emerald-500 font-bold' },
      { label: 'FAILED', eval: 'Dependent', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloDrawdown',
    label: 'MC_Drawdown_Est',
    sub: '500-Sim Resample DD',
    desc: 'Mean maximum drawdown estimated from 500 Monte Carlo equity curve simulations via trade resampling.',
    formula: 'Mean(Simulated Max Drawdowns)',
    valStr: m => `${m.monteCarloDrawdown.toFixed(1)}%`,
    colorClass: m => m.monteCarloDrawdown <= 10.0 ? 'text-emerald-400' : (m.monteCarloDrawdown <= 20.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.monteCarloDrawdown <= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.monteCarloDrawdown <= 20.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.monteCarloDrawdown <= 10.0 ? 'Robust Capital' : (m.monteCarloDrawdown <= 20.0 ? 'Acceptable' : 'Vulnerable'),
    evalClass: m => m.monteCarloDrawdown <= 10.0 ? 'text-emerald-500' : (m.monteCarloDrawdown <= 20.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 10.0%', eval: 'Robust Capital', class: 'text-emerald-500 font-bold' },
      { label: '10% - 20%', eval: 'Acceptable', class: 'text-amber-500 font-bold' },
      { label: '> 20%', eval: 'Vulnerable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloRiskOfRuin',
    label: 'MC_Risk_of_Ruin',
    sub: '500-Sim Depletion Prob',
    desc: 'Probability of reaching 90% capital depletion across 500 Monte Carlo trade resampling simulations.',
    formula: '(Simulations Ruined / Monte Carlo Simulations) * 100',
    valStr: m => `${m.monteCarloRiskOfRuin.toFixed(1)}%`,
    colorClass: m => m.monteCarloRiskOfRuin <= 1.0 ? 'text-emerald-400' : (m.monteCarloRiskOfRuin <= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.monteCarloRiskOfRuin <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (m.monteCarloRiskOfRuin <= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.monteCarloRiskOfRuin <= 1.0 ? 'Safe' : (m.monteCarloRiskOfRuin <= 5.0 ? 'Vulnerable' : 'Critical Risk'),
    evalClass: m => m.monteCarloRiskOfRuin <= 1.0 ? 'text-emerald-500' : (m.monteCarloRiskOfRuin <= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 1.0%', eval: 'Safe', class: 'text-emerald-500 font-bold' },
      { label: '1.0% - 5.0%', eval: 'Vulnerable', class: 'text-amber-500 font-bold' },
      { label: '> 5.0%', eval: 'Critical Risk', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'monteCarloExpectedReturn',
    label: 'MC_Expected_Return',
    sub: '500-Sim Mean Return',
    desc: 'Mean cumulative percentage return estimated across 500 Monte Carlo equity curve resampling simulations.',
    formula: 'Mean(Simulated Net Returns)',
    valStr: m => `${m.monteCarloExpectedReturn >= 0 ? '+' : ''}${m.monteCarloExpectedReturn.toFixed(1)}%`,
    colorClass: m => m.monteCarloExpectedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.monteCarloExpectedReturn >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.monteCarloExpectedReturn >= 0 ? 'Positive Alpha' : 'Capital Erosion',
    evalClass: m => m.monteCarloExpectedReturn >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Capital Erosion', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'bootstrapConfidenceInterval',
    label: 'Bootstrap_CI',
    sub: '95% CI Mean PnL ($)',
    desc: '95% Bootstrap confidence interval for the mean trade PnL generated from 500 resampled simulation paths.',
    formula: 'P02.5(Resampled Means) to P97.5(Resampled Means)',
    valStr: m => `${m.bootstrapConfidenceInterval}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Empirical Range',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Empirical Range', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'ciExpectedValue',
    label: 'CI_for_Expected_Val',
    sub: '95% CI EV ($)',
    desc: '95% Confidence interval for the mathematical expected value per trade using standard error of the mean.',
    formula: 'EV ± 1.96 * (StdDev(PnL) / Sqrt(N))',
    valStr: m => `${m.ciExpectedValue}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Statistical Bounds',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Statistical Bounds', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'ciWinRate',
    label: 'CI_for_Win_Rate',
    sub: '95% Normal Approx CI',
    desc: '95% Confidence interval for the strategy win rate using normal approximation for binomial distribution.',
    formula: 'p ± 1.96 * Sqrt(p*(1-p)/N)',
    valStr: m => `${m.ciWinRate}`,
    colorClass: () => 'text-amber-400',
    colorVal: (_, isDark) => isDark ? '#fbbf24' : '#d97706',
    evalStr: () => 'Binomial Bounds',
    evalClass: () => 'text-emerald-500',
    benchmarks: [
      { label: 'Any', eval: 'Binomial Bounds', class: 'text-emerald-500 font-bold' }
    ]
  },
  {
    key: 'bayesianWinRate',
    label: 'Bayesian_Win_Rate',
    sub: 'Beta(1,1) Prior Est',
    desc: 'Bayesian win rate estimate incorporating an uninformative Beta(1,1) prior to prevent small-sample distortion.',
    formula: '(Wins + 1) / (Trades + 2)',
    valStr: m => `${m.bayesianWinRate.toFixed(1)}%`,
    colorClass: m => m.bayesianWinRate >= 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.bayesianWinRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.bayesianWinRate >= 50 ? 'Favorable Prior' : 'Unfavorable Prior',
    evalClass: m => m.bayesianWinRate >= 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Favorable Prior', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Unfavorable Prior', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'bayesianExpectedValue',
    label: 'Bayesian_Expected_Val',
    sub: 'Shrinkage Mean ($)',
    desc: 'Bayesian expected value applying shrinkage towards a prior mean of zero, regularizing early performance spikes.',
    formula: '(N*EV + 5*0) / (N + 5)',
    valStr: m => `${m.bayesianExpectedValue >= 0 ? '+' : ''}$${m.bayesianExpectedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.bayesianExpectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.bayesianExpectedValue >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.bayesianExpectedValue >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.bayesianExpectedValue >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'kellyCriterion',
    label: 'Kelly_Criterion',
    sub: 'Full Kelly %',
    desc: 'The mathematical optimal percentage of capital to risk per trade to maximize long-term compounded growth rate.',
    formula: 'W - ((1 - W) / R)',
    valStr: m => `${m.kellyCriterion.toFixed(1)}%`,
    colorClass: m => m.kellyCriterion >= 5.0 ? 'text-emerald-400' : (m.kellyCriterion > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.kellyCriterion >= 5.0 ? (isDark ? '#ffffff' : '#000000') : (m.kellyCriterion > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.kellyCriterion >= 5.0 ? 'Aggressive Growth' : (m.kellyCriterion > 0 ? 'Moderate Growth' : 'No Edge'),
    evalClass: m => m.kellyCriterion >= 5.0 ? 'text-emerald-500' : (m.kellyCriterion > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 5.0%', eval: 'Aggressive Growth', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Moderate Growth', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'fractionalKelly',
    label: 'Fractional_Kelly',
    sub: 'Half Kelly %',
    desc: 'Half of the Kelly Criterion percentage. Recommended by quantitative practitioners to reduce volatility and drawdown risk.',
    formula: 'Kelly Criterion / 2',
    valStr: m => `${m.fractionalKelly.toFixed(1)}%`,
    colorClass: m => m.fractionalKelly >= 2.5 ? 'text-emerald-400' : (m.fractionalKelly > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.fractionalKelly >= 2.5 ? (isDark ? '#ffffff' : '#000000') : (m.fractionalKelly > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.fractionalKelly >= 2.5 ? 'Optimal Sizing' : (m.fractionalKelly > 0 ? 'Conservative' : 'No Edge'),
    evalClass: m => m.fractionalKelly >= 2.5 ? 'text-emerald-500' : (m.fractionalKelly > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 2.5%', eval: 'Optimal Sizing', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Conservative', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'optimalF',
    label: 'Optimal_F',
    sub: 'Ralph Vince Capital Frac',
    desc: 'Ralph Vince\'s Optimal f representing the peak fraction of account capital to risk for maximum geometric growth.',
    formula: 'Max(0, Kelly * 0.8)',
    valStr: m => `${m.optimalF.toFixed(1)}%`,
    colorClass: m => m.optimalF >= 4.0 ? 'text-emerald-400' : (m.optimalF > 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.optimalF >= 4.0 ? (isDark ? '#ffffff' : '#000000') : (m.optimalF > 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.optimalF >= 4.0 ? 'Geometric Peak' : (m.optimalF > 0 ? 'Sub-Optimal' : 'No Edge'),
    evalClass: m => m.optimalF >= 4.0 ? 'text-emerald-500' : (m.optimalF > 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 4.0%', eval: 'Geometric Peak', class: 'text-emerald-500 font-bold' },
      { label: '> 0%', eval: 'Sub-Optimal', class: 'text-amber-500 font-bold' },
      { label: '<= 0%', eval: 'No Edge', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'sqn',
    label: 'SQN',
    sub: 'System Quality Number',
    desc: 'Van Tharp\'s System Quality Number (SQN) evaluating strategy expectancy normalized by trade result dispersion.',
    formula: '(EV / StdDev(PnL)) * Sqrt(N)',
    valStr: m => `${m.sqn.toFixed(2)}`,
    colorClass: m => m.sqn >= 3.0 ? 'text-emerald-400' : (m.sqn >= 2.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.sqn >= 3.0 ? (isDark ? '#ffffff' : '#000000') : (m.sqn >= 2.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.sqn >= 3.0 ? 'Holy Grail' : (m.sqn >= 2.0 ? 'Excellent' : 'Average'),
    evalClass: m => m.sqn >= 3.0 ? 'text-emerald-500' : (m.sqn >= 2.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 3.0', eval: 'Holy Grail', class: 'text-emerald-500 font-bold' },
      { label: '2.0 - 3.0', eval: 'Excellent', class: 'text-amber-500 font-bold' },
      { label: '< 2.0', eval: 'Average', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'tTest',
    label: 'T-Test_of_Avg_Trade',
    sub: 'T-Statistic (t)',
    desc: 'Student\'s t-statistic evaluating whether the mean trade PnL is statistically significantly different from zero.',
    formula: 'EV / (StdDev(PnL) / Sqrt(N))',
    valStr: m => `${m.tTest >= 0 ? '+' : ''}${m.tTest.toFixed(2)}`,
    colorClass: m => Math.abs(m.tTest) >= 1.96 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.tTest) >= 1.96 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.tTest) >= 1.96 ? 'Significant Edge' : 'Inconclusive',
    evalClass: m => Math.abs(m.tTest) >= 1.96 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|t| >= 1.96', eval: 'Significant Edge', class: 'text-emerald-500 font-bold' },
      { label: '|t| < 1.96', eval: 'Inconclusive', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'pValue',
    label: 'P-Value_of_Edge',
    sub: 'Two-Tailed Significance',
    desc: 'Estimated two-tailed p-value corresponding to the t-statistic. Measures probability that results occurred by pure chance.',
    formula: '2 * (1 - NormalCDF(|T|))',
    valStr: m => `${m.pValue.toFixed(3)}`,
    colorClass: m => m.pValue <= 0.05 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.pValue <= 0.05 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.pValue <= 0.05 ? 'Statistically Sig' : 'Not Significant',
    evalClass: m => m.pValue <= 0.05 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '<= 0.05', eval: 'Statistically Sig', class: 'text-emerald-500 font-bold' },
      { label: '> 0.05', eval: 'Not Significant', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'informationRatio',
    label: 'Information_Ratio',
    sub: 'Active Return / Tracking Err',
    desc: 'The ratio of active strategy return above benchmark to annualized strategy return volatility used as the local tracking-error proxy.',
    formula: '(CAGR - Benchmark) / Annualized Return StdDev',
    valStr: m => `${m.informationRatio.toFixed(2)}`,
    colorClass: m => m.informationRatio >= 0.5 ? 'text-emerald-400' : (m.informationRatio >= 0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.informationRatio >= 0.5 ? (isDark ? '#ffffff' : '#000000') : (m.informationRatio >= 0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.informationRatio >= 0.5 ? 'Strong Active Alpha' : (m.informationRatio >= 0 ? 'Moderate' : 'Negative Alpha'),
    evalClass: m => m.informationRatio >= 0.5 ? 'text-emerald-500' : (m.informationRatio >= 0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 0.5', eval: 'Strong Active Alpha', class: 'text-emerald-500 font-bold' },
      { label: '0.0 - 0.5', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 0.0', eval: 'Negative Alpha', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'treynorRatio',
    label: 'Treynor_Ratio',
    sub: 'Excess Return / Beta',
    desc: 'The ratio of excess annualized return above the risk-free rate per unit of systematic market risk (Beta).',
    formula: '(CAGR - Rf) / Beta',
    valStr: m => `${m.treynorRatio.toFixed(2)}`,
    colorClass: m => m.treynorRatio >= 10.0 ? 'text-emerald-400' : (m.treynorRatio >= 5.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.treynorRatio >= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.treynorRatio >= 5.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.treynorRatio >= 10.0 ? 'Superior Reward' : (m.treynorRatio >= 5.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.treynorRatio >= 10.0 ? 'text-emerald-500' : (m.treynorRatio >= 5.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 10.0', eval: 'Superior Reward', class: 'text-emerald-500 font-bold' },
      { label: '5.0 - 10.0', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 5.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'jensensAlpha',
    label: 'Jensen\'s_Alpha',
    sub: 'CAPM Excess Alpha',
    desc: 'Jensen\'s Alpha representing the absolute annualized excess return above the Capital Asset Pricing Model (CAPM) expectation.',
    formula: 'CAGR - [Rf + Beta*(Rm - Rf)]',
    valStr: m => `${m.jensensAlpha >= 0 ? '+' : ''}${m.jensensAlpha.toFixed(1)}%`,
    colorClass: m => m.jensensAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.jensensAlpha >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.jensensAlpha >= 0 ? 'Positive CAPM Alpha' : 'Negative CAPM Alpha',
    evalClass: m => m.jensensAlpha >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Positive CAPM Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Negative CAPM Alpha', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'betaToBenchmark',
    label: 'Beta_to_Benchmark',
    sub: 'Systematic Market Beta',
    desc: 'Estimated systematic risk coefficient (Beta) measuring strategy sensitivity to broader market benchmark movements.',
    formula: 'Cov(Strategy Returns, Market Returns) / Var(Market Returns)',
    valStr: m => `${m.betaToBenchmark.toFixed(2)}`,
    colorClass: m => m.betaToBenchmark <= 1.0 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.betaToBenchmark <= 1.0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.betaToBenchmark <= 1.0 ? 'Defensive' : 'Aggressive',
    evalClass: m => m.betaToBenchmark <= 1.0 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 1.0', eval: 'Defensive', class: 'text-emerald-500 font-bold' },
      { label: '> 1.0', eval: 'Aggressive', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'alphaToBenchmark',
    label: 'Alpha_to_Benchmark',
    sub: 'Absolute Outperformance',
    desc: 'Absolute annualized percentage outperformance captured by the strategy above the baseline market benchmark return.',
    formula: 'CAGR - Benchmark CAGR',
    valStr: m => `${m.alphaToBenchmark >= 0 ? '+' : ''}${m.alphaToBenchmark.toFixed(1)}%`,
    colorClass: m => m.alphaToBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.alphaToBenchmark >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.alphaToBenchmark >= 0 ? 'Market Beating' : 'Underperforming',
    evalClass: m => m.alphaToBenchmark >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> 0%', eval: 'Market Beating', class: 'text-emerald-500 font-bold' },
      { label: '< 0%', eval: 'Underperforming', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'returnAutocorrelation',
    label: 'Return_Autocorr',
    sub: 'Lag-1 Serial Corr (ρ)',
    desc: 'Lag-1 serial autocorrelation of trade PnLs. Measures sequential persistence or mean reversion in trade outcomes.',
    formula: 'Corr(PnL_t, PnL_{t-1})',
    valStr: m => `${m.returnAutocorrelation >= 0 ? '+' : ''}${m.returnAutocorrelation.toFixed(2)}`,
    colorClass: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => Math.abs(m.returnAutocorrelation) <= 0.2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'Independent' : 'Serial Memory',
    evalClass: m => Math.abs(m.returnAutocorrelation) <= 0.2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '|ρ| <= 0.20', eval: 'Independent', class: 'text-emerald-500 font-bold' },
      { label: '|ρ| > 0.20', eval: 'Serial Memory', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'volatilityClustering',
    label: 'Vol_Clustering',
    sub: 'Abs PnL Autocorr (γ)',
    desc: 'Lag-1 serial autocorrelation of absolute trade PnLs. Measures the presence of volatility clustering and turbulent regimes.',
    formula: 'Corr(|PnL_t|, |PnL_{t-1}|)',
    valStr: m => `${m.volatilityClustering >= 0 ? '+' : ''}${m.volatilityClustering.toFixed(2)}`,
    colorClass: m => m.volatilityClustering <= 0.2 ? 'text-emerald-400' : 'text-amber-400',
    colorVal: (m, isDark) => m.volatilityClustering <= 0.2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fbbf24' : '#d97706'),
    evalStr: m => m.volatilityClustering <= 0.2 ? 'Stable Volatility' : 'Clustered Vol',
    evalClass: m => m.volatilityClustering <= 0.2 ? 'text-emerald-500' : 'text-amber-500',
    benchmarks: [
      { label: '<= 0.20', eval: 'Stable Volatility', class: 'text-emerald-500 font-bold' },
      { label: '> 0.20', eval: 'Clustered Vol', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'hurstExponent',
    label: 'Hurst_Exponent',
    sub: 'Long-Term Memory (H)',
    desc: 'The Hurst Exponent (H) measuring asymptotic persistence. H > 0.5 indicates trending; H < 0.5 indicates mean reversion.',
    formula: 'Log(R/S) / Log(N)',
    valStr: m => `${m.hurstExponent.toFixed(2)}`,
    colorClass: m => m.hurstExponent >= 0.6 ? 'text-emerald-400' : (m.hurstExponent <= 0.4 ? 'text-amber-400' : 'text-sky-400'),
    colorVal: (m, isDark) => m.hurstExponent >= 0.6 ? (isDark ? '#ffffff' : '#000000') : (m.hurstExponent <= 0.4 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#38bdf8' : '#0284c7')),
    evalStr: m => m.hurstExponent >= 0.6 ? 'Persistent Trend' : (m.hurstExponent <= 0.4 ? 'Mean Reverting' : 'Random Walk'),
    evalClass: m => m.hurstExponent >= 0.6 ? 'text-emerald-500' : (m.hurstExponent <= 0.4 ? 'text-amber-500' : 'text-sky-500'),
    benchmarks: [
      { label: '>= 0.60', eval: 'Persistent Trend', class: 'text-emerald-500 font-bold' },
      { label: '0.40 - 0.60', eval: 'Random Walk', class: 'text-sky-500 font-bold' },
      { label: '< 0.40', eval: 'Mean Reverting', class: 'text-amber-500 font-bold' }
    ]
  },
  {
    key: 'regimeStabilityScore',
    label: 'Regime_Stability',
    sub: 'Structural Invariance',
    desc: 'Composite regime stability score evaluating equity progression consistency across changing market macro environments.',
    formula: 'Stability * 0.95',
    valStr: m => `${m.regimeStabilityScore.toFixed(1)}%`,
    colorClass: m => m.regimeStabilityScore >= 75 ? 'text-emerald-400' : (m.regimeStabilityScore >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.regimeStabilityScore >= 75 ? (isDark ? '#ffffff' : '#000000') : (m.regimeStabilityScore >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.regimeStabilityScore >= 75 ? 'Highly Stable' : (m.regimeStabilityScore >= 50 ? 'Moderate' : 'Unstable'),
    evalClass: m => m.regimeStabilityScore >= 75 ? 'text-emerald-500' : (m.regimeStabilityScore >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 75%', eval: 'Highly Stable', class: 'text-emerald-500 font-bold' },
      { label: '50% - 75%', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50%', eval: 'Unstable', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingSharpe',
    label: 'Rolling_Sharpe',
    sub: '10-Trade Window Sharpe',
    desc: 'Mean Sharpe Ratio calculated across moving 10-trade rolling windows. Captures dynamic risk-adjusted performance changes.',
    formula: 'Mean(Rolling 10-Trade Sharpe)',
    valStr: m => `${m.rollingSharpe.toFixed(2)}`,
    colorClass: m => m.rollingSharpe >= 1.5 ? 'text-emerald-400' : (m.rollingSharpe >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingSharpe >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.rollingSharpe >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingSharpe >= 1.5 ? 'Optimal' : (m.rollingSharpe >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rollingSharpe >= 1.5 ? 'text-emerald-500' : (m.rollingSharpe >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0 - 1.5', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingProfitFactor',
    label: 'Rolling_PF',
    sub: '10-Trade Window PF',
    desc: 'Mean Profit Factor calculated across moving 10-trade rolling windows. Captures dynamic win/loss asymmetry fluctuations.',
    formula: 'Mean(Rolling 10-Trade PF)',
    valStr: m => `${m.rollingProfitFactor.toFixed(2)}x`,
    colorClass: m => m.rollingProfitFactor >= 1.5 ? 'text-emerald-400' : (m.rollingProfitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingProfitFactor >= 1.5 ? (isDark ? '#ffffff' : '#000000') : (m.rollingProfitFactor >= 1.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingProfitFactor >= 1.5 ? 'Optimal' : (m.rollingProfitFactor >= 1.0 ? 'Stable' : 'Sub-Optimal'),
    evalClass: m => m.rollingProfitFactor >= 1.5 ? 'text-emerald-500' : (m.rollingProfitFactor >= 1.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 1.5x', eval: 'Optimal', class: 'text-emerald-500 font-bold' },
      { label: '1.0x - 1.5x', eval: 'Stable', class: 'text-amber-500 font-bold' },
      { label: '< 1.0x', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingExpectancy',
    label: 'Rolling_Expectancy',
    sub: '10-Trade Window EV ($)',
    desc: 'Mean expected dollar value calculated across moving 10-trade rolling windows. Tracks tactical profitability regimes.',
    formula: 'Mean(Rolling 10-Trade EV)',
    valStr: m => `${m.rollingExpectancy >= 0 ? '+' : ''}$${m.rollingExpectancy.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    colorClass: m => m.rollingExpectancy >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.rollingExpectancy >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.rollingExpectancy >= 0 ? 'Positive Edge' : 'Negative Drag',
    evalClass: m => m.rollingExpectancy >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '> $0', eval: 'Positive Edge', class: 'text-emerald-500 font-bold' },
      { label: '< $0', eval: 'Negative Drag', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingDrawdown',
    label: 'Rolling_Drawdown',
    sub: '10-Trade Window DD',
    desc: 'Mean equity drawdown percentage calculated across moving 10-trade rolling windows. Measures localized capital stress.',
    formula: 'Mean(Rolling 10-Trade DD)',
    valStr: m => `${m.rollingDrawdown.toFixed(1)}%`,
    colorClass: m => m.rollingDrawdown <= 10.0 ? 'text-emerald-400' : (m.rollingDrawdown <= 20.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.rollingDrawdown <= 10.0 ? (isDark ? '#ffffff' : '#000000') : (m.rollingDrawdown <= 20.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.rollingDrawdown <= 10.0 ? 'Controlled DD' : (m.rollingDrawdown <= 20.0 ? 'Moderate DD' : 'Severe DD'),
    evalClass: m => m.rollingDrawdown <= 10.0 ? 'text-emerald-500' : (m.rollingDrawdown <= 20.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 10.0%', eval: 'Controlled DD', class: 'text-emerald-500 font-bold' },
      { label: '10% - 20%', eval: 'Moderate DD', class: 'text-amber-500 font-bold' },
      { label: '> 20%', eval: 'Severe DD', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'rollingWinRate',
    label: 'Rolling_Win_Rate',
    sub: '10-Trade Window Win %',
    desc: 'Mean win rate percentage calculated across moving 10-trade rolling windows. Captures localized accuracy cycles.',
    formula: 'Mean(Rolling 10-Trade Win%)',
    valStr: m => `${m.rollingWinRate.toFixed(1)}%`,
    colorClass: m => m.rollingWinRate >= 50 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.rollingWinRate >= 50 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.rollingWinRate >= 50 ? 'Favorable Accuracy' : 'Sub-Optimal',
    evalClass: m => m.rollingWinRate >= 50 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 50%', eval: 'Favorable Accuracy', class: 'text-emerald-500 font-bold' },
      { label: '< 50%', eval: 'Sub-Optimal', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'strategyDecayRate',
    label: 'Strategy_Decay_Rate',
    sub: 'Sharpe Regression Slope',
    desc: 'Linear regression slope of rolling Sharpe Ratios over time. Negative values indicate alpha decay and diminishing edge.',
    formula: 'Slope(RollingSharpe, Time)',
    valStr: m => `${m.strategyDecayRate >= 0 ? '+' : ''}${m.strategyDecayRate.toFixed(4)}`,
    colorClass: m => m.strategyDecayRate >= 0 ? 'text-emerald-400' : 'text-rose-400',
    colorVal: (m, isDark) => m.strategyDecayRate >= 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#fb7185' : '#e11d48'),
    evalStr: m => m.strategyDecayRate >= 0 ? 'Stable Alpha' : 'Alpha Decay',
    evalClass: m => m.strategyDecayRate >= 0 ? 'text-emerald-500' : 'text-rose-500',
    benchmarks: [
      { label: '>= 0.0', eval: 'Stable Alpha', class: 'text-emerald-500 font-bold' },
      { label: '< 0.0', eval: 'Alpha Decay', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'edgeHalfLife',
    label: 'Edge_Half-Life',
    sub: 'Est Months to Depletion',
    desc: 'Estimated time horizon in months until the strategy edge reaches half of its current magnitude based on linear decay rate.',
    formula: '0.5 / |Decay Rate|',
    valStr: m => `${m.edgeHalfLife.toFixed(1)}M`,
    colorClass: m => m.edgeHalfLife >= 24.0 ? 'text-emerald-400' : (m.edgeHalfLife >= 12.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.edgeHalfLife >= 24.0 ? (isDark ? '#ffffff' : '#000000') : (m.edgeHalfLife >= 12.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.edgeHalfLife >= 24.0 ? 'Long Horizon' : (m.edgeHalfLife >= 12.0 ? 'Moderate' : 'Short Horizon'),
    evalClass: m => m.edgeHalfLife >= 24.0 ? 'text-emerald-500' : (m.edgeHalfLife >= 12.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 24M', eval: 'Long Horizon', class: 'text-emerald-500 font-bold' },
      { label: '12M - 24M', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 12M', eval: 'Short Horizon', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'outlierImpactRatio',
    label: 'Outlier_Impact_Ratio',
    sub: '% PnL from Top 5% Trades',
    desc: 'The percentage of total net profit contributed exclusively by the top 5% largest winning outlier trades.',
    formula: 'Σ(Top 5% Wins) / Net Profit',
    valStr: m => `${m.outlierImpactRatio.toFixed(1)}%`,
    colorClass: m => m.outlierImpactRatio <= 20.0 ? 'text-emerald-400' : (m.outlierImpactRatio <= 40.0 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.outlierImpactRatio <= 20.0 ? (isDark ? '#ffffff' : '#000000') : (m.outlierImpactRatio <= 40.0 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.outlierImpactRatio <= 20.0 ? 'Broad Edge' : (m.outlierImpactRatio <= 40.0 ? 'Moderate Outlier Dep' : 'Heavy Outlier Dep'),
    evalClass: m => m.outlierImpactRatio <= 20.0 ? 'text-emerald-500' : (m.outlierImpactRatio <= 40.0 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '<= 20%', eval: 'Broad Edge', class: 'text-emerald-500 font-bold' },
      { label: '20% - 40%', eval: 'Moderate Outlier Dep', class: 'text-amber-500 font-bold' },
      { label: '> 40%', eval: 'Heavy Outlier Dep', class: 'text-rose-500 font-bold' }
    ]
  },
  {
    key: 'distributionRobustness',
    label: 'Dist_Robustness',
    sub: 'Composite Score (0-100)',
    desc: 'Composite distribution robustness score evaluating trade normality, tail risk symmetry, and outlier independence.',
    formula: '100 - f(Skew, Kurt, Outliers)',
    valStr: m => `${m.distributionRobustness.toFixed(1)}`,
    colorClass: m => m.distributionRobustness >= 80 ? 'text-emerald-400' : (m.distributionRobustness >= 50 ? 'text-amber-400' : 'text-rose-400'),
    colorVal: (m, isDark) => m.distributionRobustness >= 80 ? (isDark ? '#ffffff' : '#000000') : (m.distributionRobustness >= 50 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#fb7185' : '#e11d48')),
    evalStr: m => m.distributionRobustness >= 80 ? 'Highly Robust' : (m.distributionRobustness >= 50 ? 'Moderate' : 'Fragile Dist'),
    evalClass: m => m.distributionRobustness >= 80 ? 'text-emerald-500' : (m.distributionRobustness >= 50 ? 'text-amber-500' : 'text-rose-500'),
    benchmarks: [
      { label: '>= 80', eval: 'Highly Robust', class: 'text-emerald-500 font-bold' },
      { label: '50 - 80', eval: 'Moderate', class: 'text-amber-500 font-bold' },
      { label: '< 50', eval: 'Fragile Dist', class: 'text-rose-500 font-bold' }
    ]
  }
];

export interface MetricPanelPoint3D { x: number; y: number; z: number }
export interface MetricPanelPoint2D { x: number; y: number; opacity: number; depth: number }

type TransformPoint = (pt: MetricPanelPoint3D, rotY: number, rotX: number, s: number, w: number, h: number) => MetricPanelPoint2D

const metricGrid = {
  cols: 5,
  width: 84,
  height: 36,
  colGap: 12,
  rowGap: 12,
  startX: -192,
  startY: 0
}

const ratioMetricKeys = ['informationRatio', 'treynorRatio', 'tTest', 'sqn', 'calmarRatio', 'sterlingRatio', 'sortinoRatio', 'sharpeRatio', 'omegaRatio', 'marRatio', 'gainToPainRatio', 'tailRatio', 'commonSenseRatio', 'maeMfeRatio', 'zScore', 'profitFactor', 'payoffRatio', 'riskRewardRatio', 'realizedRR', 'winLossRatio']

const normalizeMetricValueString = (cfg: MetricConfig, mVals: any) => {
  let valString = cfg.valStr(mVals)
  const numVal = Number((mVals as any)[cfg.key])

  if (valString.includes('Infinity') || valString.includes('NaN') || (!isNaN(numVal) && ratioMetricKeys.includes(cfg.key) && Math.abs(numVal) > 999999)) {
    valString = numVal < 0 ? '-INFINITY' : 'INFINITY'
  }

  const cleanVal = valString.replace(/[\+\-\$\s\%Rxdhwm\|\(\)\/\,\:]/g, '')
  const isZero = cleanVal.length > 0 && cleanVal.split('').every(c => c === '0' || c === '.')
  return { valString, numVal, isZero }
}

export function useEquityCurveMetricsPanel() {
  const { locale } = useI18n()
  const activeMetricKeys = ref<string[]>(['netProfit', 'riskRewardRatio', 'expectedValue', 'winRate', 'lossRate', 'profitFactor'])
  const isEditMode = ref(false)
  const showAddModal = ref(false)
  const searchQuery = ref('')
  const selectedCategoryFilter = ref('ALL')
  const draggingMetricIndex = ref<number | null>(null)
  const dragTargetIndex = ref<number | null>(null)
  const isHoveringTrash = ref(false)
  const activeMetricDropdown = ref<{ metricKey: string; x: number; y: number } | null>(null)
  const selectedDeepDiveMetricKey = ref<string | null>(null)
  const hoveredMetricIndex = ref<number | null>(null)
  const hoveredMetricScreenPos = ref<{ x: number; y: number } | null>(null)
  const latestStrategyMetrics = ref<any>({})
  const metricDisplayLabel = (cfg: MetricConfig) => {
    if (locale.value === 'ru') return metricLabelRuByKey[cfg.key] || formatMetricLabel(cfg.label)
    return formatMetricLabel(cfg.label)
  }

  const metricDisplayDesc = (cfg: MetricConfig) => {
    if (locale.value === 'ru') return metricDescRuByKey[cfg.key] || cfg.desc
    return cfg.desc
  }

  const metricDisplaySub = (cfg: MetricConfig) => {
    if (locale.value === 'ru') return metricSubRuByKey[cfg.key] || cfg.sub
    return cfg.sub
  }

  const saveMetricsLayout = async () => {
    await saveToDisk('custom_metrics_layout_v1', activeMetricKeys.value)
  }

  const loadMetricsLayout = async () => {
    const loadedKeys = await loadFromDisk<string[]>('custom_metrics_layout_v1')
    if (loadedKeys && Array.isArray(loadedKeys) && loadedKeys.length > 0) {
      activeMetricKeys.value = loadedKeys
    }
  }

  const toggleMetric = async (key: string) => {
    activeMetricKeys.value = activeMetricKeys.value.includes(key)
      ? activeMetricKeys.value.filter(k => k !== key)
      : [...activeMetricKeys.value, key]
    void saveMetricsLayout()
  }
  const allAvailableConfigs = computed<MetricConfig[]>(() => [
    ...primaryMetricsConfigs.map(c => ({ ...c, category: 'Primary' })),
    ...advancedMetricsConfigs.map(c => ({ ...c, category: 'Advanced' })),
    ...expertMetricsConfigs.map(c => ({ ...c, category: 'Expert' }))
  ]);
  
  const filteredAvailableConfigs = computed<MetricConfig[]>(() => {
    const filtered = allAvailableConfigs.value.filter(cfg => {
      const matchesCategory = selectedCategoryFilter.value === 'ALL' || cfg.category === selectedCategoryFilter.value;
      const q = searchQuery.value.trim().toLowerCase();
      const displayLabel = metricDisplayLabel(cfg).toLowerCase();
      const matchesSearch = !q || 
        displayLabel.includes(q) ||
        displayLabel.replaceAll(' ', '').toLowerCase().includes(q) ||
        cfg.label.replaceAll('_', ' ').toLowerCase().includes(q) || 
        cfg.label.replaceAll('_', '').toLowerCase().includes(q) || 
        cfg.label.toLowerCase().includes(q) || 
        metricDisplayDesc(cfg).toLowerCase().includes(q) ||
        metricDisplaySub(cfg).toLowerCase().includes(q) ||
        cfg.sub.toLowerCase().includes(q) || 
        cfg.formula.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  
    return filtered.sort((a, b) => {
      const aActive = activeMetricKeys.value.includes(a.key) ? 1 : 0;
      const bActive = activeMetricKeys.value.includes(b.key) ? 1 : 0;
      return bActive - aActive;
    });
  });
  
  const activeMetricsConfigs = computed<MetricConfig[]>(() => {
    return activeMetricKeys.value
      .map(key => allAvailableConfigs.value.find(c => c.key === key))
      .filter((c): c is MetricConfig => c !== undefined);
  });
  
  type FormulaValueFormat = 'currency' | 'percent' | 'number' | 'text'
  type FormulaValueSource = 'metric' | 'bench' | 'riskFree'
  
  interface FormulaTermConfig {
    key: string
    format: FormulaValueFormat
    source?: FormulaValueSource
  }
  
  const formulaTermConfigs: Record<string, FormulaTermConfig> = {
    'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
    'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
    'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
    'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
    'Asset Gross Profit': { key: 'bestAssetGrossProfit', format: 'currency' },
    'Asset Gross Loss': { key: 'bestAssetGrossLoss', format: 'currency' },
    'TF Gross Profit': { key: 'bestTfGrossProfit', format: 'currency' },
    'TF Gross Loss': { key: 'bestTfGrossLoss', format: 'currency' },
    'Gross Profit': { key: 'grossProfit', format: 'currency' },
    'Gross Loss': { key: 'grossLoss', format: 'currency' },
    'Net Profit': { key: 'netProfit', format: 'currency' },
    'Winning Trades': { key: 'numWin', format: 'number' },
    'Losing Trades': { key: 'numLoss', format: 'number' },
    'Total Trades': { key: 'numTrades', format: 'number' },
    'Archived Trades': { key: 'numTrades', format: 'number' },
    'Trades With Valid RR': { key: 'plannedRRCount', format: 'number' },
    'Trades With Entry+Exit Time': { key: 'holdingTrades', format: 'number' },
    'Trades With Risk Data': { key: 'riskDataTrades', format: 'number' },
    'Trades With MAE/MFE Data': { key: 'maeMfeDataTrades', format: 'number' },
    'Average Win': { key: 'avgWin', format: 'currency' },
    'Average Loss': { key: 'avgLoss', format: 'currency' },
    'AvgWin': { key: 'avgWin', format: 'currency' },
    'AvgLoss': { key: 'avgLoss', format: 'currency' },
    'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
    'Deposit': { key: 'initialDeposit', format: 'currency' },
    'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
    'Win%': { key: 'winRate', format: 'percent' },
    'Loss%': { key: 'lossRate', format: 'percent' },
    'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
    'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
    'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
    'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
    'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
    'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
    'Drawdown Count': { key: 'numTrades', format: 'number' },
    'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
    'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
    'Active Span': { key: 'activeSpanDays', format: 'number' },
    'Total Initial Risk': { key: 'totalInitialRisk', format: 'currency' },
    'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
    'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
    'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
    'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
    'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
    'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
    'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
    'Positive Returns': { key: 'positiveReturnsPct', format: 'percent' },
    'Negative Returns': { key: 'negativeReturnsPct', format: 'percent' },
    'All Returns': { key: 'allReturnsPct', format: 'percent' },
    'P95(Returns)': { key: 'p95ReturnPct', format: 'percent' },
    'P05(Returns)': { key: 'p05ReturnPct', format: 'percent' },
    'Tail Ratio': { key: 'tailRatio', format: 'number' },
    'Gain-to-Pain Ratio': { key: 'gainToPainRatio', format: 'number' },
    'Expected Value': { key: 'expectedValue', format: 'currency' },
    'EV': { key: 'expectedValue', format: 'currency' },
    'Latest PnL': { key: 'latestPnl', format: 'currency' },
    'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
    'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
    'Trades >= 2.0R': { key: 'rMultipleWinCount', format: 'number' },
    'Kelly Edge': { key: 'kellyEdge', format: 'number' },
    'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
    'Kelly': { key: 'kellyCriterion', format: 'percent' },
    'CapitalUnits': { key: 'capitalUnits', format: 'number' },
    'Trade Index': { key: 'numTrades', format: 'number' },
    'Var(Trade Index)': { key: 'tradeIndexVariance', format: 'number' },
    'Equity': { key: 'equitySeriesLabel', format: 'text' },
    'RegLine': { key: 'equityCurveStability', format: 'percent' },
    'SS_res': { key: 'equityResidualSumSquares', format: 'currency' },
    'SS_tot': { key: 'equityTotalSumSquares', format: 'currency' },
    'R-Squared': { key: 'equityRSquared', format: 'number' },
    'Trade PnLs': { key: 'tradePnlSeriesLabel', format: 'text' },
    'PnL': { key: 'tradePnlSeriesLabel', format: 'text' },
    'MeanPnL': { key: 'meanPnL', format: 'currency' },
    'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
    'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
    'P05(Trade PnLs)': { key: 'p05TradePnl', format: 'currency' },
    'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
    'Median Win': { key: 'medianWin', format: 'currency' },
    'Median Loss': { key: 'medianLoss', format: 'currency' },
    'Standardized PnL': { key: 'tradePnlSeriesLabel', format: 'text' },
    'CVaR': { key: 'cvar', format: 'currency' },
    'Trade MAE': { key: 'mae', format: 'currency' },
    'Trade MFE': { key: 'mfe', format: 'currency' },
    'Mean MAE': { key: 'mae', format: 'currency' },
    'Mean MFE': { key: 'mfe', format: 'currency' },
    'Runs': { key: 'runs', format: 'number' },
    'E(Runs)': { key: 'expectedRuns', format: 'number' },
    'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
    'Z-Score': { key: 'zScore', format: 'number' },
    'Simulated Max Drawdowns': { key: 'monteCarloMaxDrawdownSeriesLabel', format: 'text' },
    'Simulations Ruined': { key: 'monteCarloRuinCount', format: 'number' },
    'Monte Carlo Simulations': { key: 'monteCarloSimulationCount', format: 'number' },
    'Simulated Net Returns': { key: 'monteCarloNetReturnSeriesLabel', format: 'text' },
    'P02.5(Resampled Means)': { key: 'bootstrapMeanLower', format: 'currency' },
    'P97.5(Resampled Means)': { key: 'bootstrapMeanUpper', format: 'currency' },
    'Resampled Means': { key: 'bootstrapResampledMeansLabel', format: 'text' },
    'Wins': { key: 'numWin', format: 'number' },
    'Trades': { key: 'numTrades', format: 'number' },
    'W': { key: 'winProbability', format: 'number' },
    'p': { key: 'winProbability', format: 'number' },
    'R': { key: 'payoffRatio', format: 'number' },
    'N': { key: 'numTrades', format: 'number' },
    'T': { key: 'tTest', format: 'number' },
    'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
    'Rm': { key: 'bench', format: 'percent', source: 'bench' },
    'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
    'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
    'Beta': { key: 'betaToBenchmark', format: 'number' },
    'Strategy Returns': { key: 'strategyReturnSeriesLabel', format: 'text' },
    'Market Returns': { key: 'marketReturnSeriesLabel', format: 'text' },
    'Var(Market Returns)': { key: 'marketReturnSeriesLabel', format: 'text' },
    'PnL_t': { key: 'tradePnlSeriesLabel', format: 'text' },
    'PnL_{t-1}': { key: 'tradePnlSeriesLabel', format: 'text' },
    'R/S': { key: 'hurstRescaledRange', format: 'number' },
    'Stability': { key: 'equityCurveStability', format: 'percent' },
    'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
    'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
    'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
    'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
    'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
    'RollingSharpe': { key: 'rollingSharpe', format: 'number' },
    'Time': { key: 'rollingWindowCount', format: 'number' },
    'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
    'Top 5% Wins': { key: 'topWinsSum', format: 'currency' },
    'Skew': { key: 'skewness', format: 'number' },
    'Kurt': { key: 'kurtosis', format: 'number' },
    'Outliers': { key: 'outlierImpactRatio', format: 'number' }
  }
  
  const getFormulaTermRawValue = (term: FormulaTermConfig, m: any, bench: number, riskFree: number) => {
    if (term.source === 'bench') return bench
    if (term.source === 'riskFree') return riskFree
    return m?.[term.key]
  }
  
  const formatFormulaTermValue = (value: any, format: FormulaValueFormat): string => {
    if (format === 'text') return String(value)
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return String(value ?? 'N/A')
    if (format === 'currency') return `$${numeric.toFixed(2)}`
    if (format === 'percent') return `${numeric.toFixed(2)}%`
    return numeric.toFixed(2)
  }
  
  const findFormulaTermRange = (formula: string, term: string, usedRanges: Array<[number, number]>) => {
    const hasOverlap = (start: number, end: number) => usedRanges.some(([usedStart, usedEnd]) => start < usedEnd && end > usedStart)
    const isWord = /^[a-zA-Z]+$/.test(term)
  
    if (isWord) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'g')
      let match: RegExpExecArray | null
      while ((match = regex.exec(formula)) !== null) {
        const start = match.index
        const end = start + term.length
        if (!hasOverlap(start, end)) return [start, end] as [number, number]
      }
      return null
    }
  
    let index = formula.indexOf(term)
    while (index !== -1) {
      const end = index + term.length
      if (!hasOverlap(index, end)) return [index, end] as [number, number]
      index = formula.indexOf(term, index + 1)
    }
    return null
  }
  
  const getMatchedFormulaTerms = (formula: string) => {
    const usedRanges: Array<[number, number]> = []
    return Object.keys(formulaTermConfigs)
      .sort((a, b) => b.length - a.length)
      .flatMap(term => {
        let hasMatch = false
        let range = findFormulaTermRange(formula, term, usedRanges)
        while (range) {
          usedRanges.push(range)
          hasMatch = true
          range = findFormulaTermRange(formula, term, usedRanges)
        }
        if (!hasMatch) return []
        const config = formulaTermConfigs[term]
        if (!config) return []
        return [{ term, config }]
      })
  }
  
  const getFormulaVariableRows = (formula: string, m: any, bench: number, riskFree: number) => {
    const addedKeys = new Set<string>()
    return getMatchedFormulaTerms(formula).flatMap(({ term, config }) => {
      const value = getFormulaTermRawValue(config, m, bench, riskFree)
      const valueKey = `${config.source ?? 'metric'}:${config.key}`
      if (value === undefined || addedKeys.has(valueKey)) return []
      addedKeys.add(valueKey)
      return [{ name: term, val: formatFormulaTermValue(value, config.format) }]
    })
  }
  
  const getEvaluatedFormulaString = (formula: string, m: any, bench: number, riskFree: number) => {
    let evaluated = formula
    getMatchedFormulaTerms(formula)
      .sort((a, b) => b.term.length - a.term.length)
      .forEach(({ term, config }) => {
        const value = getFormulaTermRawValue(config, m, bench, riskFree)
        if (value === undefined) return
        evaluated = evaluated.split(term).join(formatFormulaTermValue(value, config.format))
      })
    return evaluated
  }
  
  const formatMetricResult = (value: any) => {
    return typeof value === 'number' ? value.toFixed(2) : String(value ?? 'CALCULATED')
  }
  
  const getMetricDeepDiveVariables = (key: string | null, m: any, bench: number, riskFree: number) => {
    if (!key || !m) return [];
    const metricConfig = allAvailableConfigs.value.find(c => c.key === key);
    if (metricConfig?.formula) {
      const formulaRows = getFormulaVariableRows(metricConfig.formula, m, bench, riskFree);
      if (formulaRows.length > 0) return formulaRows;
    }
  
    switch (key) {
      case 'netProfit':
        return [
          { name: 'Gross Profit', val: `$${m.grossProfit?.toFixed(2) ?? '0.00'}` },
          { name: 'Gross Loss', val: `$${m.grossLoss?.toFixed(2) ?? '0.00'}` },
          { name: 'Total Trades', val: `${m.numTrades ?? 0}` }
        ];
      case 'profitFactor':
        return [
          { name: 'Gross Profit', val: `$${m.grossProfit?.toFixed(2) ?? '0.00'}` },
          { name: 'Gross Loss', val: `$${m.grossLoss?.toFixed(2) ?? '0.00'}` },
          { name: 'Win / Loss Payoff', val: `${m.payoffRatio?.toFixed(2) ?? '1.00'}` }
        ];
      case 'winRate':
      case 'lossRate':
        return [
          { name: 'Winning Trades', val: `${m.numWin ?? 0}` },
          { name: 'Losing Trades', val: `${m.numLoss ?? 0}` },
          { name: 'Total Trades', val: `${m.numTrades ?? 0}` }
        ];
      case 'expectedValue':
        return [
          { name: 'Win Rate', val: `${m.winRate?.toFixed(2) ?? '0.00'}%` },
          { name: 'Average Win', val: `$${m.avgWin?.toFixed(2) ?? '0.00'}` },
          { name: 'Loss Rate', val: `${m.lossRate?.toFixed(2) ?? '0.00'}%` },
          { name: 'Average Loss', val: `$${m.avgLoss?.toFixed(2) ?? '0.00'}` }
        ];
      case 'riskRewardRatio':
        return [
          { name: 'Average Setup RR', val: `${m.riskRewardRatio?.toFixed(2) ?? '1.00'}` },
          { name: 'Trades With Valid RR', val: `${m.plannedRRCount ?? 0}` },
          { name: 'Realized Payoff Ratio', val: `${m.realizedRR?.toFixed(2) ?? '1.00'}` }
        ];
      case 'sharpeRatio':
      case 'sortinoRatio':
      case 'calmarRatio':
        return [
          { name: 'Annualized Return', val: `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}%` },
          { name: 'Risk-Free Baseline', val: `${riskFree.toFixed(2)}%` },
          { name: key === 'sortinoRatio' ? 'Downside Volatility' : (key === 'calmarRatio' ? 'Max Drawdown' : 'Return Volatility (StdDev)'), val: `${(key === 'sortinoRatio' ? m.downsideStdDevPct : (key === 'calmarRatio' ? m.maxDrawdownPct : m.stdDevPct))?.toFixed(2) ?? '0.00'}%` }
        ];
      case 'informationRatio':
      case 'jensensAlpha':
      case 'treynorRatio':
      case 'alphaBenchmark':
      case 'betaBenchmark':
        return [
          { name: 'Strategy Annual Return', val: `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}%` },
          { name: ['treynorRatio', 'jensensAlpha'].includes(key) ? 'Risk-Free Baseline' : 'S&P 500 Benchmark Yield', val: `${(['treynorRatio', 'jensensAlpha'].includes(key) ? riskFree : bench).toFixed(2)}%` },
          { name: 'Tracking Volatility / Beta', val: `${m.strategyBeta?.toFixed(2) ?? '1.00'}` }
        ];
      case 'valueAtRisk':
        return [
          { name: 'Total Evaluated Trades', val: `${m.numTrades ?? 0}` },
          { name: 'Confidence Level', val: '95.0%' },
          { name: '5th Percentile Index', val: `${Math.floor((m.numTrades ?? 0) * 0.05)}` }
        ];
      case 'cvar':
      case 'expectedShortfall':
        return [
          { name: 'Initial Deposit', val: `$${m.initialDeposit?.toFixed(2) ?? '1000.00'}` },
          { name: 'Confidence Level', val: '95.0%' },
          { name: 'Tail Loss Threshold', val: `$${m.valueAtRisk?.toFixed(2) ?? '0.00'}` }
        ];
      default: {
        const cfg = allAvailableConfigs.value.find(c => c.key === key);
        if (cfg && cfg.formula) {
          const terms: Record<string, { key: string, format: string, source?: string }> = {
            'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
            'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
            'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Net Profit': { key: 'netProfit', format: 'currency' },
            'Winning Trades': { key: 'numWin', format: 'number' },
            'Losing Trades': { key: 'numLoss', format: 'number' },
            'Total Trades': { key: 'numTrades', format: 'number' },
            'Average Win': { key: 'avgWin', format: 'currency' },
            'Average Loss': { key: 'avgLoss', format: 'currency' },
            'AvgWin': { key: 'avgWin', format: 'currency' },
            'AvgLoss': { key: 'avgLoss', format: 'currency' },
            'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
            'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
            'Win%': { key: 'winRate', format: 'percent' },
            'Loss%': { key: 'lossRate', format: 'percent' },
            'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
            'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
            'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
            'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
            'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
            'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
            'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
            'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
            'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
            'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
            'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
            'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
            'StdDev': { key: 'stdDevPct', format: 'percent' },
            'Expected Value': { key: 'expectedValue', format: 'currency' },
            'EV': { key: 'expectedValue', format: 'currency' },
            'PnL > 0': { key: 'numWin', format: 'number' },
            'PnL < 0': { key: 'numLoss', format: 'number' },
            'N': { key: 'numTrades', format: 'number' },
            'W': { key: 'winRate', format: 'number' },
            'p': { key: 'winRate', format: 'number' },
            'R': { key: 'payoffRatio', format: 'number' },
            'Z': { key: 'zScore', format: 'number' },
            'Beta': { key: 'betaToBenchmark', format: 'number' },
            'TrackingErr': { key: 'stdDevPct', format: 'percent' },
            'Stability': { key: 'equityCurveStability', format: 'percent' },
            'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
            'Kelly': { key: 'kellyCriterion', format: 'percent' },
            'Skew': { key: 'skewness', format: 'number' },
            'Kurt': { key: 'kurtosis', format: 'number' },
            'Outliers': { key: 'outlierImpactRatio', format: 'number' },
            'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
            'Rm': { key: 'bench', format: 'percent', source: 'bench' },
            'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
            'Trades': { key: 'numTrades', format: 'number' },
            'Wins': { key: 'numWin', format: 'number' },
            'MeanPnL': { key: 'avgTrade', format: 'currency' },
            'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
            'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
            'CVaR': { key: 'cvar', format: 'currency' },
            'Deposit': { key: 'initialDeposit', format: 'currency' },
            'Mean MAE': { key: 'mae', format: 'currency' },
            'Mean MFE': { key: 'mfe', format: 'currency' },
            'Z-Score': { key: 'zScore', format: 'number' },
            'Simulated Max Drawdowns': { key: 'monteCarloDrawdown', format: 'percent' },
            'Simulations Ruined': { key: 'monteCarloRiskOfRuin', format: 'percent' },
            'Simulated Net Returns': { key: 'monteCarloExpectedReturn', format: 'percent' },
            'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
            'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
            'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
            'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
            'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
            'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
            'ΔRollingSharpe': { key: 'strategyDecayRate', format: 'number' },
            'ΔTime': { key: 'activeSpanDays', format: 'number' },
            'Active Span': { key: 'activeSpanDays', format: 'number' },
            'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
            'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
            'Drawdown Count': { key: 'numTrades', format: 'number' },
            'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
            'Entry - SL': { key: 'mae', format: 'currency' },
            'Size': { key: 'numTrades', format: 'number' },
            'Positive Returns': { key: 'grossProfit', format: 'currency' },
            'Negative Returns': { key: 'grossLoss', format: 'currency' },
            'All Returns': { key: 'netProfit', format: 'currency' },
            'Tail Ratio': { key: 'profitFactor', format: 'number' },
            'Gain-to-Pain Ratio': { key: 'profitFactor', format: 'number' },
            'Asset Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Asset Gross Loss': { key: 'grossLoss', format: 'currency' },
            'TF Gross Profit': { key: 'grossProfit', format: 'currency' },
            'TF Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Latest PnL': { key: 'latestPnl', format: 'currency' },
            'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
            'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
            'Trades >= 2.0R': { key: 'numWin', format: 'number' },
            'Kelly Edge': { key: 'kellyEdge', format: 'number' },
            'Edge': { key: 'kellyEdge', format: 'number' },
            'CapitalUnits': { key: 'capitalUnits', format: 'number' },
            'Index': { key: 'bench', format: 'percent', source: 'bench' },
            'Equity': { key: 'netProfit', format: 'currency' },
            'Var(Index)': { key: 'stdDevPct', format: 'percent' },
            'RegLine': { key: 'equityCurveStability', format: 'percent' },
            'SS_res': { key: 'stdPnL', format: 'currency' },
            'SS_tot': { key: 'varPnL', format: 'currency' },
            'R-Squared': { key: 'equityCurveCorrelation', format: 'percent' },
            'Median Win': { key: 'avgWin', format: 'currency' },
            'Median Loss': { key: 'avgLoss', format: 'currency' },
            'Trade MAE': { key: 'mae', format: 'currency' },
            'Trade MFE': { key: 'mfe', format: 'currency' },
            'Runs': { key: 'runs', format: 'number' },
            'E(Runs)': { key: 'expectedRuns', format: 'number' },
            'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
            'Resampled Means': { key: 'monteCarloExpectedReturn', format: 'percent' },
            'T': { key: 'tTest', format: 'number' },
            't': { key: 'pValue', format: 'number' },
            'Strategy': { key: 'netProfit', format: 'currency' },
            'Market': { key: 'bench', format: 'percent', source: 'bench' },
            'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
            'PnL_t': { key: 'avgTrade', format: 'currency' },
            'PnL_{t-1}': { key: 'avgTrade', format: 'currency' },
            'S': { key: 'hurstExponent', format: 'number' },
            'Top 5% Wins': { key: 'grossProfit', format: 'currency' },
            'Archived Trades': { key: 'numTrades', format: 'number' },
            'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
            'P95(Returns)': { key: 'avgWin', format: 'currency' },
            'P05(Returns)': { key: 'avgLoss', format: 'currency' }
          };
          const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);
          const vars: any[] = [];
          const addedKeys = new Set();
          
          sortedTerms.forEach(term => {
            // Use word boundary for purely alphabetic terms
            const isWord = /^[a-zA-Z]+$/.test(term);
            const regex = isWord ? new RegExp(`\\b${term}\\b`) : null;
            
            if ((regex && regex.test(cfg.formula)) || (!regex && cfg.formula.includes(term))) {
              const propInfo = terms[term];
              if (!propInfo) return;
              const isLocal = propInfo.source;
              const valObj = isLocal === 'riskFree' ? riskFree : (isLocal === 'bench' ? bench : m[propInfo.key]);
              
              if (valObj !== undefined && !addedKeys.has(propInfo.key)) {
                addedKeys.add(propInfo.key);
                let valStr = `${valObj}`;
                if (propInfo.format === 'currency') valStr = `$${Number(valObj).toFixed(2)}`;
                else if (propInfo.format === 'percent') valStr = `${Number(valObj).toFixed(2)}%`;
                else if (propInfo.format === 'number') valStr = `${Number(valObj)}`;
                vars.push({ name: term, val: valStr });
              }
            }
          });
          if (vars.length > 0) return vars;
        }
  
        return [
          { name: 'Net Profit', val: `$${m.netProfit?.toFixed(2) ?? '0.00'}` },
          { name: 'Total Trades', val: `${m.numTrades ?? 0}` },
          { name: 'Initial Deposit', val: `$${m.initialDeposit?.toFixed(2) ?? '1000.00'}` },
          { name: 'Benchmark Yield', val: `${bench.toFixed(2)}%` }
        ];
      }
    }
  };
  
  const getMetricCalculationSteps = (key: string | null, m: any, bench: number, riskFree: number) => {
    if (!key || !m) return '';
    const metricConfig = allAvailableConfigs.value.find(c => c.key === key);
    if (metricConfig?.formula) {
      return `${getEvaluatedFormulaString(metricConfig.formula, m, bench, riskFree)} = ${formatMetricResult(m[key])}`;
    }
  
    switch (key) {
      case 'netProfit':
        return `$${m.grossProfit?.toFixed(2) ?? '0.00'} - $${m.grossLoss?.toFixed(2) ?? '0.00'} = $${m.netProfit?.toFixed(2) ?? '0.00'}`;
      case 'profitFactor':
        return `$${m.grossProfit?.toFixed(2) ?? '0.00'} / $${m.grossLoss?.toFixed(2) ?? '1.00'} = ${m.profitFactor?.toFixed(2) ?? '0.00'}`;
      case 'winRate':
        return `(${m.numWin ?? 0} / ${m.numTrades ?? 1}) * 100 = ${m.winRate?.toFixed(2) ?? '0.00'}%`;
      case 'lossRate':
        return `(${m.numLoss ?? 0} / ${m.numTrades ?? 1}) * 100 = ${m.lossRate?.toFixed(2) ?? '0.00'}%`;
      case 'expectedValue':
        return `(${m.winRate?.toFixed(1) ?? '0.0'}% * $${m.avgWin?.toFixed(2) ?? '0.00'}) - (${m.lossRate?.toFixed(1) ?? '0.0'}% * $${m.avgLoss?.toFixed(2) ?? '0.00'}) = $${m.expectedValue?.toFixed(2) ?? '0.00'}`;
      case 'sharpeRatio':
        return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.stdDevPct?.toFixed(2) ?? '1.00'}% = ${m.sharpeRatio?.toFixed(2) ?? '0.00'}`;
      case 'sortinoRatio':
        return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.downsideStdDevPct?.toFixed(2) ?? '1.00'}% = ${m.sortinoRatio?.toFixed(2) ?? '0.00'}`;
      case 'calmarRatio':
        return `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% / ${m.maxDrawdownPct?.toFixed(2) ?? '1.00'}% = ${m.calmarRatio?.toFixed(2) ?? '0.00'}`;
      case 'informationRatio':
        return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${bench.toFixed(2)}%) / ${m.stdDevPct?.toFixed(2) ?? '1.00'}% = ${m.informationRatio?.toFixed(2) ?? '0.00'}`;
      case 'treynorRatio':
        return `(${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - ${riskFree.toFixed(2)}%) / ${m.strategyBeta?.toFixed(2) ?? '1.00'} = ${m.treynorRatio?.toFixed(2) ?? '0.00'}`;
      case 'jensensAlpha':
        return `${m.annualizedReturnPct?.toFixed(2) ?? '0.00'}% - (${riskFree.toFixed(2)}% + ${m.strategyBeta?.toFixed(2) ?? '1.00'} * (${bench.toFixed(2)}% - ${riskFree.toFixed(2)}%)) = ${m.jensensAlpha?.toFixed(2) ?? '0.00'}%`;
      case 'valueAtRisk':
        return `Percentile_5th(Sorted_PnLs[0...${(m.numTrades ?? 1) - 1}]) = $${m.valueAtRisk?.toFixed(2) ?? '0.00'}`;
      case 'cvar':
        return `Average(Tail Losses < $${m.valueAtRisk?.toFixed(2) ?? '0.00'}) = $${m.cvar?.toFixed(2) ?? '0.00'}`;
      case 'expectedShortfall':
        return `($${m.cvar?.toFixed(2) ?? '0.00'} / $${m.initialDeposit?.toFixed(2) ?? '1000.00'}) * 100 = ${m.expectedShortfall?.toFixed(2) ?? '0.00'}%`;
      default: {
        const cfg = allAvailableConfigs.value.find(c => c.key === key);
        let formulaStr = cfg?.formula || `Formula Evaluation(${m.netProfit ? `$${m.netProfit.toFixed(2)}` : 'Inputs'})`;
  
        if (cfg && cfg.formula) {
          const terms: Record<string, { key: string, format: string, source?: string }> = {
            'Winning Trades PnL': { key: 'grossProfit', format: 'currency' },
            'Losing Trades PnL': { key: 'grossLoss', format: 'currency' },
            'Strategy Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Strategy Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Net Profit': { key: 'netProfit', format: 'currency' },
            'Winning Trades': { key: 'numWin', format: 'number' },
            'Losing Trades': { key: 'numLoss', format: 'number' },
            'Total Trades': { key: 'numTrades', format: 'number' },
            'Average Win': { key: 'avgWin', format: 'currency' },
            'Average Loss': { key: 'avgLoss', format: 'currency' },
            'AvgWin': { key: 'avgWin', format: 'currency' },
            'AvgLoss': { key: 'avgLoss', format: 'currency' },
            'Initial Deposit': { key: 'initialDeposit', format: 'currency' },
            'Payoff Ratio': { key: 'payoffRatio', format: 'number' },
            'Win%': { key: 'winRate', format: 'percent' },
            'Loss%': { key: 'lossRate', format: 'percent' },
            'Average Setup RR': { key: 'riskRewardRatio', format: 'number' },
            'Maximum Drawdown %': { key: 'maxDrawdownPct', format: 'percent' },
            'Average Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
            'Maximum Drawdown': { key: 'maxDrawdownNum', format: 'currency' },
            'CAGR': { key: 'annualizedReturnPct', format: 'percent' },
            'Mean Return': { key: 'annualizedReturnPct', format: 'percent' },
            'Annualized Return StdDev': { key: 'stdDevPct', format: 'percent' },
            'Annualized StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
            'Annualized Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
            'StdDev(Return)': { key: 'stdDevPct', format: 'percent' },
            'Downside StdDev': { key: 'downsideStdDevPct', format: 'percent' },
            'StdDev(PnL)': { key: 'stdPnL', format: 'currency' },
            'StdDev': { key: 'stdDevPct', format: 'percent' },
            'Expected Value': { key: 'expectedValue', format: 'currency' },
            'EV': { key: 'expectedValue', format: 'currency' },
            'PnL > 0': { key: 'numWin', format: 'number' },
            'PnL < 0': { key: 'numLoss', format: 'number' },
            'N': { key: 'numTrades', format: 'number' },
            'W': { key: 'winRate', format: 'number' },
            'p': { key: 'winRate', format: 'number' },
            'R': { key: 'payoffRatio', format: 'number' },
            'Z': { key: 'zScore', format: 'number' },
            'Beta': { key: 'betaToBenchmark', format: 'number' },
            'TrackingErr': { key: 'stdDevPct', format: 'percent' },
            'Stability': { key: 'equityCurveStability', format: 'percent' },
            'Kelly Criterion': { key: 'kellyCriterion', format: 'percent' },
            'Kelly': { key: 'kellyCriterion', format: 'percent' },
            'Skew': { key: 'skewness', format: 'number' },
            'Kurt': { key: 'kurtosis', format: 'number' },
            'Outliers': { key: 'outlierImpactRatio', format: 'number' },
            'Rf': { key: 'riskFree', format: 'percent', source: 'riskFree' },
            'Rm': { key: 'bench', format: 'percent', source: 'bench' },
            'Benchmark': { key: 'bench', format: 'percent', source: 'bench' },
            'Trades': { key: 'numTrades', format: 'number' },
            'Wins': { key: 'numWin', format: 'number' },
            'MeanPnL': { key: 'avgTrade', format: 'currency' },
            'P50(Trade PnLs)': { key: 'medianTradeResult', format: 'currency' },
            'Mean(PnLs < P05)': { key: 'cvar', format: 'currency' },
            'CVaR': { key: 'cvar', format: 'currency' },
            'Deposit': { key: 'initialDeposit', format: 'currency' },
            'Mean MAE': { key: 'mae', format: 'currency' },
            'Mean MFE': { key: 'mfe', format: 'currency' },
            'Z-Score': { key: 'zScore', format: 'number' },
            'Simulated Max Drawdowns': { key: 'monteCarloDrawdown', format: 'percent' },
            'Simulations Ruined': { key: 'monteCarloRiskOfRuin', format: 'percent' },
            'Simulated Net Returns': { key: 'monteCarloExpectedReturn', format: 'percent' },
            'Rolling 10-Trade Sharpe': { key: 'rollingSharpe', format: 'number' },
            'Rolling 10-Trade PF': { key: 'rollingProfitFactor', format: 'number' },
            'Rolling 10-Trade EV': { key: 'rollingExpectancy', format: 'currency' },
            'Rolling 10-Trade DD': { key: 'rollingDrawdown', format: 'percent' },
            'Rolling 10-Trade Win%': { key: 'rollingWinRate', format: 'percent' },
            'Decay Rate': { key: 'strategyDecayRate', format: 'number' },
            'ΔRollingSharpe': { key: 'strategyDecayRate', format: 'number' },
            'ΔTime': { key: 'activeSpanDays', format: 'number' },
            'Active Span': { key: 'activeSpanDays', format: 'number' },
            'Equity Peak - Subsequent Trough': { key: 'maxDrawdownNum', format: 'currency' },
            'Drawdown %': { key: 'avgDrawdownPct', format: 'percent' },
            'Drawdown Count': { key: 'numTrades', format: 'number' },
            'Trough Date - Peak Date': { key: 'drawdownDurationDays', format: 'number' },
            'Entry - SL': { key: 'mae', format: 'currency' },
            'Size': { key: 'numTrades', format: 'number' },
            'Positive Returns': { key: 'grossProfit', format: 'currency' },
            'Negative Returns': { key: 'grossLoss', format: 'currency' },
            'All Returns': { key: 'netProfit', format: 'currency' },
            'Tail Ratio': { key: 'profitFactor', format: 'number' },
            'Gain-to-Pain Ratio': { key: 'profitFactor', format: 'number' },
            'Asset Gross Profit': { key: 'grossProfit', format: 'currency' },
            'Asset Gross Loss': { key: 'grossLoss', format: 'currency' },
            'TF Gross Profit': { key: 'grossProfit', format: 'currency' },
            'TF Gross Loss': { key: 'grossLoss', format: 'currency' },
            'Latest PnL': { key: 'latestPnl', format: 'currency' },
            'Latest Initial Risk': { key: 'latestInitialRisk', format: 'currency' },
            'Trade R-Multiples': { key: 'avgRMultiple', format: 'number' },
            'Trades >= 2.0R': { key: 'numWin', format: 'number' },
            'Kelly Edge': { key: 'kellyEdge', format: 'number' },
            'Edge': { key: 'kellyEdge', format: 'number' },
            'CapitalUnits': { key: 'capitalUnits', format: 'number' },
            'Index': { key: 'bench', format: 'percent', source: 'bench' },
            'Equity': { key: 'netProfit', format: 'currency' },
            'Var(Index)': { key: 'stdDevPct', format: 'percent' },
            'RegLine': { key: 'equityCurveStability', format: 'percent' },
            'SS_res': { key: 'stdPnL', format: 'currency' },
            'SS_tot': { key: 'varPnL', format: 'currency' },
            'R-Squared': { key: 'equityCurveCorrelation', format: 'percent' },
            'Median Win': { key: 'avgWin', format: 'currency' },
            'Median Loss': { key: 'avgLoss', format: 'currency' },
            'Trade MAE': { key: 'mae', format: 'currency' },
            'Trade MFE': { key: 'mfe', format: 'currency' },
            'Runs': { key: 'runs', format: 'number' },
            'E(Runs)': { key: 'expectedRuns', format: 'number' },
            'StdDev(Runs)': { key: 'stdRuns', format: 'number' },
            'Resampled Means': { key: 'monteCarloExpectedReturn', format: 'percent' },
            'T': { key: 'tTest', format: 'number' },
            't': { key: 'pValue', format: 'number' },
            'Strategy': { key: 'netProfit', format: 'currency' },
            'Market': { key: 'bench', format: 'percent', source: 'bench' },
            'Benchmark CAGR': { key: 'bench', format: 'percent', source: 'bench' },
            'PnL_t': { key: 'avgTrade', format: 'currency' },
            'PnL_{t-1}': { key: 'avgTrade', format: 'currency' },
            'S': { key: 'hurstExponent', format: 'number' },
            'Top 5% Wins': { key: 'grossProfit', format: 'currency' },
            'Archived Trades': { key: 'numTrades', format: 'number' },
            'Exit Time - Entry Time': { key: 'avgTradeDurationHours', format: 'number' },
            'P95(Returns)': { key: 'avgWin', format: 'currency' },
            'P05(Returns)': { key: 'avgLoss', format: 'currency' }
          };
          const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);
          let evaluatedStr = cfg.formula;
          sortedTerms.forEach(term => {
            const isWord = /^[a-zA-Z]+$/.test(term);
            const regex = isWord ? new RegExp(`\\b${term}\\b`, 'g') : null;
            
            if ((regex && regex.test(evaluatedStr)) || (!regex && evaluatedStr.includes(term))) {
              const propInfo = terms[term];
              if (!propInfo) return;
              const isLocal = propInfo.source;
              const valObj = isLocal === 'riskFree' ? riskFree : (isLocal === 'bench' ? bench : m[propInfo.key]);
  
              if (valObj !== undefined) {
                let valStr = `${valObj}`;
                if (propInfo.format === 'currency') valStr = `$${Number(valObj).toFixed(2)}`;
                else if (propInfo.format === 'percent') valStr = `${Number(valObj).toFixed(2)}%`;
                else if (propInfo.format === 'number') valStr = `${Number(valObj).toFixed(2)}`;
                
                if (regex) {
                  evaluatedStr = evaluatedStr.replace(regex, valStr);
                } else {
                  evaluatedStr = evaluatedStr.split(term).join(valStr);
                }
              }
            }
          });
          formulaStr = evaluatedStr;
        }
        
        return `${formulaStr} = ${m[key] !== undefined ? (typeof m[key] === 'number' ? m[key].toFixed(2) : m[key]) : 'CALCULATED'}`;
      }
    }
  };
  
  const getMetricRationale = (key: string | null): string => {
    if (!key) return '';
    if (locale.value === 'ru') {
      return 'Используется как диагностический сигнал: помогает понять качество преимущества, устойчивость результата и зоны риска, которые стоит учитывать при управлении стратегией.'
    }
    const rationales: Record<string, string> = {
      // Primary Metrics
      netProfit: "Determines the absolute bottom-line monetary value generated by the strategy after accounting for all losses and fees, validating basic financial viability.",
      grossProfit: "Measures the absolute upside capacity of the strategy, showing the total profit-generation power of winning trades before losses are factored in.",
      grossLoss: "Quantifies the total capital eroded by unsuccessful executions, establishing the baseline friction and cost of strategy operations.",
      winRate: "Indicates the frequency of successful outcomes, which is critical for understanding psychological comfort, streak patterns, and execution bias.",
      lossRate: "Highlights the probability of negative trade outcomes, helping to calibrate risk tolerance and prepare for sequential losing runs.",
      avgWin: "Establishes the average profit target scale, serving as the benchmark for positive expectancy and expected trade outcomes.",
      avgLoss: "Defines the standard cost of invalidation per losing setup, essential for enforcing stop-loss sizing and capital preservation rules.",
      avgTrade: "Reveals the average expectancy per execution, showing if the strategy generates a positive edge when all outcomes are blended.",
      payoffRatio: "Evaluates risk-to-reward asymmetry; a higher payoff ratio means you can remain highly profitable even with a lower win rate.",
      riskRewardRatio: "Measures the average setup Risk/Reward from valid trade price levels, excluding zero or invalid RR values.",
      realizedRR: "Contrasts planned risk limits against actual market capture, identifying slippage, execution drag, or premature trade management.",
      expectedValue: "Determines the long-term mathematical viability of the strategy; it must be positive for the account to grow over a large sample.",
      profitFactor: "Serves as a primary metric of efficiency, showing how many dollars are earned for every dollar lost. A value above 1.5 indicates a robust strategy.",
      beWinRate: "Calculates the mandatory minimum win rate required to break even under current payoff structures, highlighting the strategy's safety margin.",
      numTrades: "Establishes the sample size of the dataset; higher trade counts validate statistical significance and reduce backtesting luck.",
      numWin: "Reveals the exact count of profitable executions to analyze the sample distribution and win-streak characteristics.",
      numLoss: "Tracks the frequency of invalidation events to assess risk exposure and statistical dispersion of losses.",
      largestWin: "Identifies outlier positive returns to verify if strategy success is heavily dependent on a few anomalous windfall events.",
      largestLoss: "Exposes tail risk exposure and catastrophic outliers, verifying if stop-loss protocols were breached or slipped.",
      maxConsWins: "Reveals the maximum historical win streak, helping to calibrate psychological confidence and spot clustering behaviors.",
      maxConsLosses: "Defines the worst-case consecutive drawdown sequence, critical for calibrating risk parameters to prevent account ruin.",
      avgHoldingTimeStr: "Measures average exposure duration, helping to optimize capital allocation cycles and identify time-based risk.",
      avgProfitPerDay: "Calculates profit velocity per unit of time, highlighting the capital efficiency and compounding speed of the strategy.",
      maxDrawdownNum: "Quantifies the absolute deepest peak-to-trough capital decline, setting the absolute limit for worst-case risk modeling.",
      avgDrawdownPct: "Measures typical retracement depth during consolidation phases, setting realistic expectations for normal account fluctuations.",
      drawdownDurationStr: "Models the time required to recover from equity drawdowns, testing the trader's psychological resilience and strategy recovery speed.",
      recoveryFactor: "Evaluates the strategy's capacity to climb back from drawdowns; higher values indicate efficient recovery relative to historical risk.",
      returnOnCapital: "Measures absolute growth efficiency relative to initial capital, highlighting the true return yield of the account.",
      returnPerTrade: "Shows the average percentage yield per execution, standardizing return profiles across different account sizes.",
      riskPerTrade: "Monitors the average capital risked per trade to prevent over-leverage and enforce strict portfolio-level risk budgets.",
  
      // Advanced Metrics
      sharpeRatio: "Standardizes risk-adjusted returns by penalizing volatility; critical for institutional comparison and yield stability assessment.",
      sortinoRatio: "Refines risk-adjusted returns by only penalizing negative (downside) volatility, avoiding penalization of positive profit spikes.",
      calmarRatio: "Measures return efficiency relative to drawdown tail risk; highly valued by hedge funds to evaluate return sustainability.",
      sterlingRatio: "Compares compound returns against average drawdown depths, evaluating stability over long-term capital allocation cycles.",
      omegaRatio: "Captures the entire shape of the return distribution rather than just variance, measuring probability of beating a target return.",
      ulcerIndex: "Measures both the depth and duration of equity drawdowns, providing a high-fidelity proxy for psychological stress and capital erosion.",
      marRatio: "Evaluates annualized return performance relative to the maximum peak-to-trough historical drawdown to check portfolio risk efficiency.",
      gainToPainRatio: "Jack Schwager's metric comparing net returns directly against absolute negative returns to evaluate overall performance smoothness.",
      tailRatio: "Measures the asymmetry of the return distribution; values above 1.2 indicate favorable positive tail edge and limited downside risk.",
      commonSenseRatio: "Combines tail ratio and gain-to-pain to evaluate the overall quantitative robustness of asymmetric return profiles.",
      profitFactorStrategy: "Isolates profit factor for the current active strategy to verify its individual performance contribution without asset noise.",
      profitFactorMarket: "Pinpoints the best performing asset class or market, identifying key style drift opportunities or sector specialization.",
      profitFactorTimeframe: "Identifies the execution timeframe with the highest structural edge, optimizing temporal focus and execution efficiency.",
      avgTradeExpectancy: "Calculates average expectancy in dollar terms, standardizing the return expectation of future trade setups.",
      expectancyScore: "Normalizes expected value by the average loss magnitude to evaluate edge efficiency independent of trade size.",
      latestRMultiple: "Evaluates execution quality of the latest trade setup relative to initial risk boundaries, tracking recent discipline.",
      avgRMultiple: "Calculates the average R-multiple to confirm the strategy has a structural mathematical edge (aim for > 1.0R).",
      rMultipleDist: "Tracks the frequency of high-payoff trades (>= 2.0R), confirming if the strategy successfully captures major asymmetric wins.",
  
      // Expert Metrics
      valueAtRisk: "Models tail risk by predicting the maximum expected dollar loss with 95% confidence under normal market conditions.",
      cvar: "Calculates average loss in the worst 5% of outcomes, exposing hidden tail risk and extreme market liquidation scenarios.",
      expectedShortfall: "Expresses CVaR relative to deposit to check if worst-case tail risk exceeds capital limits or margin thresholds.",
      mae: "Measures average intra-trade drawdown before exit, identifying if stop-losses are set too tight or entries are premature.",
      mfe: "Tracks average intra-trade profit potential before exit, revealing left-on-the-table profits and exit efficiency.",
      maeMfeRatio: "Evaluates execution timing efficiency; values below 0.5 confirm entries are highly precise with minimal drawdown exposure.",
      zScore: "Tests win/loss sequence independence; identifies if trades cluster in streaks or act as independent random trials.",
      runsTest: "Provides formal statistical validation of sequence independence, confirming if streak patterns are non-random.",
      monteCarloDrawdown: "Simulates 500 random resamples of the equity path to forecast realistic maximum drawdown expectations under variance.",
      monteCarloRiskOfRuin: "Projects probability of total capital destruction across simulated paths, verifying long-term survival prospects.",
      monteCarloExpectedReturn: "Provides a robust, resampled expectation of return distribution, eliminating bias from chronological sequence luck.",
      bootstrapConfidenceInterval: "Computes the 95% empirical range of mean returns, establishing statistical bounds for strategy expectations.",
      ciExpectedValue: "Calculates the 95% confidence interval bounds for expected value to verify if the edge is statistically positive.",
      ciWinRate: "Defines the statistical bounds of the strategy's win rate to ensure performance does not deviate from target parameters.",
      bayesianWinRate: "Regularizes early win rates using a Beta prior, preventing overconfidence or panic during initial small samples.",
      bayesianExpectedValue: "Applies Bayesian shrinkage to expected value to normalize early performance spikes and model realistic edge.",
      kellyCriterion: "Determines the mathematical optimal leverage to maximize compounded growth, serving as the absolute ceiling for sizing.",
      fractionalKelly: "Applies half-Kelly scaling to reduce growth volatility, protect capital, and mitigate parameter estimation errors.",
      optimalF: "Calculates Ralph Vince's optimal fraction of capital to risk per trade for optimal geometric curve compounding.",
      sqn: "Van Tharp's System Quality Number checking if the strategy edge is robust enough to trade safely relative to volatility and count.",
      tTest: "Tests the statistical significance of the strategy edge, checking if the mean return is due to skill or random chance.",
      pValue: "Measures probability of achieving current performance by pure chance; values below 0.05 confirm a true statistical edge.",
      informationRatio: "Measures active return efficiency relative to benchmark tracking error, validating active portfolio management value.",
      treynorRatio: "Evaluates excess return per unit of systematic market risk, assessing efficiency relative to passive indexing.",
      jensensAlpha: "Determines true outperformance above the risk-adjusted CAPM expectations, isolating pure manager/strategy skill.",
      betaToBenchmark: "Quantifies systematic sensitivity to the market; helps manage market risk exposure and portfolio hedging.",
      alphaToBenchmark: "Measures raw compound outperformance against the market index, confirming if active trading beat passive holding.",
      returnAutocorrelation: "Measures momentum or mean reversion in trade results, indicating if streak behaviors have predictive value.",
      volatilityClustering: "Identifies periods of concentrated risk or regime shifts, helping to adjust position sizes during high-risk regimes.",
      hurstExponent: "Determines if the equity curve has long-term memory, confirming stable structural growth versus random walk behavior.",
      regimeStabilityScore: "Evaluates strategy consistency across changing market regimes, verifying robustness against structural shifts.",
      rollingSharpe: "Monitors risk-adjusted efficiency in rolling windows, detecting early signs of performance degradation or strategy drift.",
      rollingProfitFactor: "Tracks profit factor changes over moving windows, exposing dynamic changes in payoff asymmetry.",
      rollingExpectancy: "Monitors localized expectancy shifts to catch declining edge before drawdown inflicts severe capital damage.",
      rollingDrawdown: "Tracks recent drawdown cycles to detect system wear-and-tear or shifts in market volatility regimes.",
      rollingWinRate: "Identifies cyclical swings in accuracy, helping to detect regime mismatch or execution deviations.",
      strategyDecayRate: "Measures rate of alpha decay over time, alerting the operator when a strategy is losing its structural edge.",
      edgeHalfLife: "Forecasts the remaining lifespan of the strategy's edge, defining the timeline for model recalibration or retirement.",
      outlierImpactRatio: "Checks dependency on rare windfalls; high values indicate high fragility if outlier wins do not repeat.",
      distributionRobustness: "Assesses overall distribution safety, confirming if return profiles are structurally stable and free of tail risk."
    };
    return rationales[key] || "Identifies structural efficiency parameters to optimize execution and sustain consistent capital appreciation.";
  };
  
  const metricTonePalette = {
    excellent: '#86efac',
    positive: '#22c55e',
    neutral: '#facc15',
    warning: '#fb923c',
    negative: '#ef4444'
  };
  
  const getMetricToneColor = (cfg: MetricConfig, mVals: any): string => {
    const evalText = String(cfg.evalStr?.(mVals) || '').toLowerCase();
    const classHint = `${cfg.evalClass?.(mVals) || ''} ${cfg.colorClass?.(mVals) || ''}`.toLowerCase();
    const hasAny = (terms: string[]) => terms.some(term => evalText.includes(term));
  
    if (hasAny(['perfect', 'elite', 'excellent', 'superior', 'highly', 'holy grail', 'optimal', 'strong edge', 'strong active', 'significant edge', 'geometric peak', 'market beating', 'positive skew'])) {
      return metricTonePalette.excellent;
    }
  
    if (classHint.includes('rose') || classHint.includes('red')) {
      return metricTonePalette.negative;
    }
  
    if (classHint.includes('amber') || classHint.includes('yellow') || classHint.includes('orange')) {
      return metricTonePalette.warning;
    }
  
    if (classHint.includes('emerald') || classHint.includes('green')) {
      return metricTonePalette.positive;
    }
  
    if (hasAny(['profitable', 'positive', 'favorable', 'safe', 'low risk', 'low stress', 'controlled', 'sustainable', 'robust', 'upward', 'majority wins', 'independent', 'persistent', 'defensive', 'nominal'])) {
      return metricTonePalette.positive;
    }
  
    if (hasAny(['negative', 'drawdown', 'sub-optimal', 'unsustainable', 'severe', 'critical', 'fragile', 'inefficient', 'failed', 'dependent', 'capital erosion', 'underperforming', 'unstable', 'alpha decay', 'high risk', 'high stress', 'no edge', 'tail risk', 'systemic', 'heavy outlier'])) {
      return metricTonePalette.negative;
    }
  
    if (hasAny(['moderate', 'vulnerable', 'small sample', 'inconclusive', 'short horizon', 'fat tails', 'aggressive', 'clustered', 'serial memory', 'random walk', 'average', 'acceptable'])) {
      return metricTonePalette.warning;
    }
  
    return metricTonePalette.neutral;
  };

  const hoveredMetricTooltipData = computed(() => {
    if (hoveredMetricIndex.value === null || !activeMetricsConfigs.value[hoveredMetricIndex.value]) return null
    const cfg = activeMetricsConfigs.value[hoveredMetricIndex.value]!
    const mVals = latestStrategyMetrics.value

    let fullValString = cfg.tooltipValStr ? cfg.tooltipValStr(mVals) : cfg.valStr(mVals)
    const numFullVal = Number((mVals as any)[cfg.key])
    if (fullValString.includes('Infinity') || fullValString.includes('NaN') || (!isNaN(numFullVal) && ratioMetricKeys.includes(cfg.key) && Math.abs(numFullVal) > 999999)) {
      fullValString = numFullVal < 0 ? '-INFINITY' : 'INFINITY'
    }
    const cleanFullVal = fullValString.replace(/[\+\-\$\s\%Rxdhwm\|\(\)\/\,\:]/g, '')
    const isFullZero = cleanFullVal.length > 0 && cleanFullVal.split('').every(c => c === '0' || c === '.')

    return {
      label: metricDisplayLabel(cfg),
      evalText: cfg.evalStr(mVals).toUpperCase(),
      color: isFullZero ? metricTonePalette.neutral : getMetricToneColor(cfg, mVals),
      valStr: fullValString,
      desc: metricDisplayDesc(cfg),
      benchmarks: cfg.benchmarks.map(b => b.label + ' (' + b.eval + ')'),
      isBenchMetric: ['informationRatio', 'treynorRatio', 'jensensAlpha', 'alphaToBenchmark', 'betaToBenchmark'].includes(cfg.key),
      isRiskFreeMetric: ['sharpeRatio', 'sortinoRatio', 'treynorRatio', 'jensensAlpha'].includes(cfg.key),
    }
  })

  const drawMetricCardText = (ctx: CanvasRenderingContext2D, cfg: MetricConfig, mVals: any, metricTone: string) => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = 'bold 45px monospace'
    ctx.fillText(metricDisplayLabel(cfg), 0, -65)

    const { valString, isZero } = normalizeMetricValueString(cfg, mVals)
    ctx.fillStyle = isZero ? metricTonePalette.neutral : metricTone

    let baseFontSize = 6.5
    if (valString.length > 10) {
      baseFontSize = Math.max(4, 6.5 * (10 / valString.length))
    }
    ctx.font = 'bold ' + Math.round(baseFontSize * 10) + 'px monospace'
    ctx.fillText(valString, 0, 40)

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '30px monospace'
    ctx.fillText(metricDisplaySub(cfg), 0, 130)
  }

  const drawMetricsPanel = (params: {
    ctx: CanvasRenderingContext2D
    width: number
    height: number
    scale: number
    isDark: boolean
    strategyMetrics: any
    currentRotation: { x: number; y: number }
    viewScale: number
    currentMouseCanvasPos: { x: number; y: number }
    canvasRect?: DOMRect | null
    transformPoint: TransformPoint
  }) => {
    const { ctx, width: w, height: h, scale, isDark, strategyMetrics: mVals, currentRotation, viewScale, currentMouseCanvasPos, canvasRect, transformPoint } = params
    latestStrategyMetrics.value = mVals

    if (!isDark) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
      ctx.fillRect(0, 0, w, h)
    }

    const cols = metricGrid.cols
    const w_card = metricGrid.width
    const h_card = metricGrid.height
    const colGap = metricGrid.colGap
    const rowGap = metricGrid.rowGap
    const startX = metricGrid.startX
    const startY = metricGrid.startY

    activeMetricsConfigs.value.forEach((cfg, i) => {
      const row = Math.floor(i / cols)
      const col = i % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const cz = 0
      const p1 = { x: cx - w_card / 2, y: cy - h_card / 2, z: cz }
      const p2 = { x: cx + w_card / 2, y: cy - h_card / 2, z: cz }
      const p3 = { x: cx + w_card / 2, y: cy + h_card / 2, z: cz }
      const p4 = { x: cx - w_card / 2, y: cy + h_card / 2, z: cz }
      const t1 = transformPoint(p1, currentRotation.y, currentRotation.x, scale, w, h)
      const t2 = transformPoint(p2, currentRotation.y, currentRotation.x, scale, w, h)
      const t3 = transformPoint(p3, currentRotation.y, currentRotation.x, scale, w, h)
      const t4 = transformPoint(p4, currentRotation.y, currentRotation.x, scale, w, h)
      const tCenter = transformPoint({ x: cx, y: cy, z: cz }, currentRotation.y, currentRotation.x, scale, w, h)
      const avgDepth = (t1.depth + t2.depth + t3.depth + t4.depth) / 4
      const depthAlpha = Math.min(1, Math.max(0.15, 1 - avgDepth / 1500))

      ctx.beginPath()
      ctx.moveTo(t1.x, t1.y)
      ctx.lineTo(t2.x, t2.y)
      ctx.lineTo(t3.x, t3.y)
      ctx.lineTo(t4.x, t4.y)
      ctx.closePath()

      if (isEditMode.value && draggingMetricIndex.value === i) {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
        ctx.fill()
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.stroke()
        ctx.setLineDash([])
        return
      }

      const isHovered = hoveredMetricIndex.value === i
      const metricTone = getMetricToneColor(cfg, mVals)
      ctx.fillStyle = isHovered
        ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(10, 10, 10, 0.9)')
        : (isDark ? 'rgba(15, 15, 15, ' + (0.75 * depthAlpha) + ')' : 'rgba(10, 10, 10, ' + (0.8 * depthAlpha) + ')')
      ctx.fill()

      if (isEditMode.value && dragTargetIndex.value === i && draggingMetricIndex.value !== null) {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
        ctx.lineWidth = 4
        ctx.setLineDash([8, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.shadowBlur = 0
      const eps = 0.1
      const tDx = transformPoint({ x: cx + eps, y: cy, z: cz }, currentRotation.y, currentRotation.x, scale, w, h)
      const tDy = transformPoint({ x: cx, y: cy + eps, z: cz }, currentRotation.y, currentRotation.x, scale, w, h)
      const ux = (tDx.x - tCenter.x) / eps
      const uy = (tDx.y - tCenter.y) / eps
      const vx = (tDy.x - tCenter.x) / eps
      const vy = (tDy.y - tCenter.y) / eps
      ctx.setTransform(ux * 0.1, uy * 0.1, vx * 0.1, vy * 0.1, tCenter.x, tCenter.y)
      drawMetricCardText(ctx, cfg, mVals, metricTone)
      ctx.resetTransform()
    })

    if (isEditMode.value) {
      const addIdx = activeMetricsConfigs.value.length
      const row = Math.floor(addIdx / cols)
      const col = addIdx % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const cz = 0
      const p1 = { x: cx - w_card / 2, y: cy - h_card / 2, z: cz }
      const p2 = { x: cx + w_card / 2, y: cy - h_card / 2, z: cz }
      const p3 = { x: cx + w_card / 2, y: cy + h_card / 2, z: cz }
      const p4 = { x: cx - w_card / 2, y: cy + h_card / 2, z: cz }
      const t1 = transformPoint(p1, currentRotation.y, currentRotation.x, scale, w, h)
      const t2 = transformPoint(p2, currentRotation.y, currentRotation.x, scale, w, h)
      const t3 = transformPoint(p3, currentRotation.y, currentRotation.x, scale, w, h)
      const t4 = transformPoint(p4, currentRotation.y, currentRotation.x, scale, w, h)
      const tCenter = transformPoint({ x: cx, y: cy, z: cz }, currentRotation.y, currentRotation.x, scale, w, h)
      const avgDepth = (t1.depth + t2.depth + t3.depth + t4.depth) / 4
      const depthAlpha = Math.min(1, Math.max(0.15, 1 - avgDepth / 1500))

      ctx.beginPath()
      ctx.moveTo(t1.x, t1.y)
      ctx.lineTo(t2.x, t2.y)
      ctx.lineTo(t3.x, t3.y)
      ctx.lineTo(t4.x, t4.y)
      ctx.closePath()
      const isHovered = hoveredMetricIndex.value === addIdx
      ctx.fillStyle = isHovered
        ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
        : (isDark ? 'rgba(15, 15, 15, ' + (0.75 * depthAlpha) + ')' : 'rgba(255, 255, 255, ' + (0.85 * depthAlpha) + ')')
      ctx.fill()
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      const ux = (t2.x - t1.x) / w_card
      const uy = (t2.y - t1.y) / w_card
      const vx = (t4.x - t1.x) / h_card
      const vy = (t4.y - t1.y) / h_card
      ctx.setTransform(ux * 0.1, uy * 0.1, vx * 0.1, vy * 0.1, tCenter.x, tCenter.y)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
      ctx.font = 'bold 120px monospace'
      ctx.fillText('+', 0, 0)
      ctx.resetTransform()
    }

    if (isEditMode.value && draggingMetricIndex.value !== null && activeMetricsConfigs.value[draggingMetricIndex.value]) {
      const cfg = activeMetricsConfigs.value[draggingMetricIndex.value]!
      const mx = currentMouseCanvasPos.x
      const my = currentMouseCanvasPos.y
      const screenScale = viewScale * (1000 / (1000 + 0))
      const sw = w_card * screenScale
      const sh = h_card * screenScale

      ctx.beginPath()
      ctx.rect(mx - sw / 2, my - sh / 2, sw, sh)
      ctx.fillStyle = isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 25
      ctx.shadowOffsetY = 12
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0

      const metricTone = getMetricToneColor(cfg, mVals)
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setTransform(screenScale * 0.1, 0, 0, screenScale * 0.1, mx, my)
      drawMetricCardText(ctx, cfg, mVals, metricTone)
      ctx.resetTransform()
    }

    if (hoveredMetricIndex.value !== null && activeMetricsConfigs.value[hoveredMetricIndex.value]) {
      const row = Math.floor(hoveredMetricIndex.value / cols)
      const col = hoveredMetricIndex.value % cols
      const cx = startX + col * (w_card + colGap)
      const cy = startY + (row - 2.5) * (h_card + rowGap)
      const tCenter = transformPoint({ x: cx, y: cy, z: 0 }, currentRotation.y, currentRotation.x, scale, w, h)
      hoveredMetricScreenPos.value = canvasRect
        ? { x: tCenter.x + canvasRect.left, y: tCenter.y + canvasRect.top }
        : { x: tCenter.x, y: tCenter.y }
    } else {
      hoveredMetricScreenPos.value = null
    }
  }

  const closeDropdown = () => {
    if (activeMetricDropdown.value) activeMetricDropdown.value = null
  }

  const handleMetricMouseDown = (e: MouseEvent, stopPanning: () => void) => {
    closeDropdown()
    if (hoveredMetricIndex.value === null) return false

    if (isEditMode.value) {
      if (hoveredMetricIndex.value === activeMetricsConfigs.value.length) {
        showAddModal.value = true
        stopPanning()
        return true
      }
      draggingMetricIndex.value = hoveredMetricIndex.value
      dragTargetIndex.value = hoveredMetricIndex.value
      stopPanning()
      return true
    }

    const cfg = activeMetricsConfigs.value[hoveredMetricIndex.value]
    if (!cfg) return false

    activeMetricDropdown.value = { metricKey: cfg.key, x: e.clientX, y: e.clientY }
    stopPanning()
    return true
  }

  const updateMetricHover = (params: {
    x: number
    y: number
    rect: DOMRect
    canvas: HTMLCanvasElement
    currentRotation: { x: number; y: number }
    viewScale: number
    transformPoint: TransformPoint
  }) => {
    const { x, y, rect, canvas, currentRotation, viewScale, transformPoint } = params
    if (isEditMode.value && draggingMetricIndex.value !== null) {
      isHoveringTrash.value = x > rect.width - 160 && y > rect.height - 160
    }

    let hoveredMetric: number | null = null
    const totalCards = isEditMode.value ? activeMetricsConfigs.value.length + 1 : activeMetricsConfigs.value.length
    for (let i = 0; i < totalCards; i++) {
      const row = Math.floor(i / metricGrid.cols)
      const col = i % metricGrid.cols
      const cx = metricGrid.startX + col * (metricGrid.width + metricGrid.colGap)
      const cy = metricGrid.startY + (row - 2.5) * (metricGrid.height + metricGrid.rowGap)
      const tCenter = transformPoint({ x: cx, y: cy, z: 0 }, currentRotation.y, currentRotation.x, viewScale, canvas.width, canvas.height)
      const screenScale = viewScale * (1000 / (1000 + tCenter.depth))

      if (Math.abs(x - tCenter.x) < (metricGrid.width * screenScale) / 2 && Math.abs(y - tCenter.y) < (metricGrid.height * screenScale) / 2) {
        hoveredMetric = i
      }
    }

    hoveredMetricIndex.value = hoveredMetric
    if (draggingMetricIndex.value !== null && hoveredMetric !== null && hoveredMetric < activeMetricsConfigs.value.length) {
      dragTargetIndex.value = hoveredMetric
    }
  }

  const handleMetricMouseUp = () => {
    if (draggingMetricIndex.value === null) return false

    if (isHoveringTrash.value) {
      activeMetricKeys.value.splice(draggingMetricIndex.value, 1)
      void saveMetricsLayout()
      draggingMetricIndex.value = null
      dragTargetIndex.value = null
      isHoveringTrash.value = false
      return true
    }

    if (dragTargetIndex.value !== null && dragTargetIndex.value !== draggingMetricIndex.value) {
      const movedKey = activeMetricKeys.value.splice(draggingMetricIndex.value, 1)[0]!
      activeMetricKeys.value.splice(dragTargetIndex.value, 0, movedKey)
      void saveMetricsLayout()
    }

    draggingMetricIndex.value = null
    dragTargetIndex.value = null
    return true
  }

  const resetHover = () => {
    hoveredMetricIndex.value = null
    hoveredMetricScreenPos.value = null
  }

  return {
    activeMetricKeys,
    isEditMode,
    showAddModal,
    searchQuery,
    selectedCategoryFilter,
    draggingMetricIndex,
    dragTargetIndex,
    isHoveringTrash,
    activeMetricDropdown,
    selectedDeepDiveMetricKey,
    hoveredMetricIndex,
    hoveredMetricScreenPos,
    hoveredMetricTooltipData,
    allAvailableConfigs,
    filteredAvailableConfigs,
    activeMetricsConfigs,
    metricDisplayLabel,
    metricDisplayDesc,
    metricDisplaySub,
    saveMetricsLayout,
    loadMetricsLayout,
    toggleMetric,
    getMetricDeepDiveVariables,
    getMetricCalculationSteps,
    getMetricRationale,
    getMetricToneColor,
    drawMetricsPanel,
    handleMetricMouseDown,
    updateMetricHover,
    handleMetricMouseUp,
    closeDropdown,
    resetHover
  }
}
