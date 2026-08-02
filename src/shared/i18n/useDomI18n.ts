import { nextTick, onMounted, onUnmounted, type Ref, watch } from 'vue'
import { translations } from './translations'
import { useI18n } from './useI18n'

const textOriginals = new WeakMap<Text, string>()
const attributeOriginals = new WeakMap<Element, Map<string, string>>()
const translatedAttributes = ['placeholder', 'title', 'aria-label', 'alt', 'data-placeholder']

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

const buildReverseDictionary = (dictionary: Record<string, unknown>) => {
  const reverse = new Map<string, string>()

  for (const [source, translation] of Object.entries(dictionary)) {
    if (typeof translation === 'string') {
      reverse.set(normalize(translation), source)
    }
  }

  return reverse
}

const translateDynamic = (key: string, dictionary: Record<string, string>) => {
  const quoted = key.match(/^> (.+)$/)
  if (quoted) {
    const translated = dictionary[quoted[1]] || translateDynamic(quoted[1], dictionary)
    if (translated) return `> ${translated}`
  }

  const multiStepTrace = key.match(/^(1\. Fit check: .+?) (2\. Curve domain: .+?) (3\. Dispersion check: .+?) (4\. Shape check: .+?) (5\. Risk check: .+?) (6\. Verdict: .+?) (7\. Action: .+)$/)
  if (multiStepTrace) {
    return multiStepTrace
      .slice(1)
      .map(line => dictionary[line] || translateDynamic(line, dictionary) || line)
      .join('\n')
  }

  const protocolCount = key.match(/^(\d+)_PROTOCOLS$/)
  if (protocolCount) return `${protocolCount[1]}_ПРОТОКОЛОВ`

  const resultCount = key.match(/^(\d+)_Results$/)
  if (resultCount) return `${resultCount[1]}_РЕЗУЛЬТАТОВ`

  const rootNodes = key.match(/^(\d+)_Root_Nodes$/)
  if (rootNodes) return `${rootNodes[1]}_КОРНЕВЫХ_УЗЛОВ`

  const cmeExample = key.match(/^\(e\.g\. (.+): 1 contract = (.+)\)$/)
  if (cmeExample) return `(напр. ${cmeExample[1]}: 1 контракт = ${cmeExample[2]})`

  const archiveId = key.match(/^Archive_ID: (.+)$/)
  if (archiveId) return `ID_Архива: ${archiveId[1]}`

  const systemState = key.match(/^System_State: (.+)$/)
  if (systemState) return `Состояние_Системы: ${dictionary[systemState[1]] || systemState[1]}`

  const tokenGenitive: Record<string, string> = {
    OPEN: 'ОТКРЫТИЯ',
    ENTRY: 'ВХОДА',
    EXIT: 'ВЫХОДА'
  }

  const archiveToken = key.match(/^([A-Z0-9_]+)_ARCHIVE$/)
  if (archiveToken) return `АРХИВ_${tokenGenitive[archiveToken[1]] || dictionary[archiveToken[1]] || archiveToken[1]}`

  const syncToken = key.match(/^([A-Z0-9_]+)_SYNC$/)
  if (syncToken) return `СИНХР_${tokenGenitive[syncToken[1]] || dictionary[syncToken[1]] || syncToken[1]}`

  const clusterToken = key.match(/^(.+)_CLUSTER$/)
  if (clusterToken) return `${dictionary[clusterToken[1]] || clusterToken[1]}_КЛАСТЕР`

  const typedMeta = key.match(/^(TYPE|PRIORITY|STATUS): (.+)$/)
  if (typedMeta) {
    return `${dictionary[`${typedMeta[1]}:`] || `${typedMeta[1]}:`} ${dictionary[typedMeta[2]] || typedMeta[2]}`
  }

  const commentNumber = key.match(/^Comment (\d+)$/)
  if (commentNumber) return `Комментарий ${commentNumber[1]}`

  const stepNumber = key.match(/^Step (.+)$/)
  if (stepNumber) return `Шаг ${stepNumber[1]}`

  const initializeStep = key.match(/^Initialize (numerical|alphabetic|roman) sequence step (.+)$/)
  if (initializeStep) {
    const modeMap: Record<string, string> = {
      numerical: 'числовой',
      alphabetic: 'буквенный',
      roman: 'римский'
    }
    return `Инициализировать ${modeMap[initializeStep[1]]} шаг ${initializeStep[2]}`
  }

  const initializeProtocol = key.match(/^Initialize (.+) protocol$/)
  if (initializeProtocol) {
    const protocolKey = initializeProtocol[1].replace(/\s+/g, '_')
    return `Инициализировать протокол ${dictionary[initializeProtocol[1]] || dictionary[protocolKey] || initializeProtocol[1]}`
  }

  const constructDomain = key.match(/^Construct behavioral domain: (.+)$/)
  if (constructDomain) return `Создать поведенческую зону: ${dictionary[constructDomain[1]] || constructDomain[1]}`

  const dataLink = key.match(/^Establish data link: (.+)$/)
  if (dataLink) return `Создать связь с данными: ${dataLink[1]}`

  const assetTicker = key.match(/^ASSET_TICKER: (.+)$/)
  if (assetTicker) return `ТИКЕР_АКТИВА: ${assetTicker[1]}`

  const scalingProtocol = key.match(/^SCALING_PROTOCOL: (.+) LOTS @ (.+)$/)
  if (scalingProtocol) {
    const price = dictionary[scalingProtocol[2]] || scalingProtocol[2]
    return `ПРОТОКОЛ_МАСШТАБИРОВАНИЯ: ${scalingProtocol[1]} ЛОТОВ @ ${price}`
  }

  const lots = key.match(/^(.+) LOTS$/)
  if (lots) return `${lots[1]} ЛОТОВ`

  const constructingDomain = key.match(/^Constructing_(.+)_Domain\.\.\.$/)
  if (constructingDomain) return `Создание_Зоны_${dictionary[constructingDomain[1].toUpperCase()] || constructingDomain[1]}...`

  const tradesLower = key.match(/^(\d+) trades$/)
  if (tradesLower) return `${tradesLower[1]} сделок`

  const tradesUpper = key.match(/^(\d+) TRADES$/)
  if (tradesUpper) return `${tradesUpper[1]} СДЕЛОК`

  const regimePeriods = key.match(/^(\d+) PERIODS \/ (\d+) TRADES$/)
  if (regimePeriods) return `${regimePeriods[1]} ПЕРИОДОВ / ${regimePeriods[2]} СДЕЛОК`

  const fulfilled = key.match(/^(\d+) Fulfilled$/)
  if (fulfilled) return `${fulfilled[1]} ${dictionary.Fulfilled || 'Fulfilled'}`

  const confirmations = key.match(/^(\d+) Confirmations$/)
  if (confirmations) return `${confirmations[1]} ${dictionary.Confirmations || 'Confirmations'}`

  const frictionMarkers = key.match(/^(\d+) Friction Markers$/)
  if (frictionMarkers) return `${frictionMarkers[1]} ${dictionary['Friction Markers'] || 'Friction Markers'}`

  const negativeRules = key.match(/^-(\d+) Rules$/)
  if (negativeRules) return `-${negativeRules[1]} ${dictionary.Rules || 'Rules'}`

  const exceededBy = key.match(/^Exceeded by \$(.+)$/)
  if (exceededBy) return `Превышено на $${exceededBy[1]}`

  const bypassedRules = key.match(/^Bypassed (\d+) Required Rules$/)
  if (bypassedRules) return `Пропущено ${bypassedRules[1]} Обязательных_Правил`

  const belowMin = key.match(/^Below Min \((.+)\)$/)
  if (belowMin) return `Ниже_Минимума (${belowMin[1]})`

  const exceededMax = key.match(/^Exceeded Max \((.+)\)$/)
  if (exceededMax) return `Превышен_Максимум (${exceededMax[1]})`

  const aligned = key.match(/^(.+) Aligned$/)
  if (aligned && dictionary[aligned[1]]) return `${dictionary[aligned[1]]}_Синхронизирован`

  const statusTokenMap: Record<string, string> = {
    PASS: 'ПРОЙДЕН',
    REJECT: 'ОТКЛОНЕНО',
    WATCH: 'НАБЛЮДАТЬ',
    FAT_TAIL: 'ТОЛСТЫЙ_ХВОСТ',
    ALIGNED: 'СИНХРОНИЗИРОВАНО',
    TAIL_DEVIATION: 'ОТКЛОНЕНИЕ_ХВОСТА',
    OUTLIER_RISK: 'РИСК_ВЫБРОСОВ',
    NO_RISK_MODEL: 'НЕТ_РИСК_МОДЕЛИ'
  }

  for (const [token, translation] of Object.entries(statusTokenMap)) {
    const statusMatch = key.match(new RegExp(`^(.+) ${token}$`))
    if (statusMatch) return `${statusMatch[1]} ${translation}`
  }

  const studentBic = key.match(/^Student's t is preferred by BIC by (.+) points\. The strategy should be managed as fat-tailed: outliers and capital reserve matter more than average trade comfort\.$/)
  if (studentBic) {
    return `Student's t предпочтительнее по BIC на ${studentBic[1]} пункта. Стратегию нужно вести как fat-tail: выбросы и резерв капитала важнее комфорта средней сделки.`
  }

  const normalBic = key.match(/^Normal fit is preferred by BIC by (.+) points\. The current distribution looks calmer, but skew and sample size still decide risk policy\.$/)
  if (normalBic) {
    return `Нормальная аппроксимация предпочтительнее по BIC на ${normalBic[1]} пункта. Текущее распределение выглядит спокойнее, но skew и размер выборки все еще определяют риск-политику.`
  }

  const fragileHypothesis = key.match(/^Hypothesis verdict: fragile profile\. Tails, skew, and weak risk controls are all active, so average PnL is misleading\. Stop-loss coverage is (.+)%\.$/)
  if (fragileHypothesis) {
    return `Вердикт гипотезы: хрупкий профиль. Хвосты, skew и слабый риск-контроль активны одновременно, поэтому средний PnL вводит в заблуждение. Покрытие stop-loss: ${fragileHypothesis[1]}%.`
  }

  const unmanagedTailHypothesis = key.match(/^Hypothesis verdict: unmanaged tail risk\. Outliers are present and risk coverage is weak, so the strategy needs controls before the average trade means much\. Stop-loss coverage is (.+)%\.$/)
  if (unmanagedTailHypothesis) {
    return `Вердикт гипотезы: неуправляемый хвостовой риск. Есть выбросы и слабое риск-покрытие, поэтому стратегии нужны ограничения до того, как средняя сделка станет значимой. Покрытие stop-loss: ${unmanagedTailHypothesis[1]}%.`
  }

  const asymmetricHypothesis = key.match(/^Hypothesis verdict: asymmetric and under-controlled\. The return shape is tilted, but the risk model is too thin to trust the edge\. Stop-loss coverage is (.+)%\.$/)
  if (asymmetricHypothesis) {
    return `Вердикт гипотезы: асимметрично и недостаточно контролируемо. Форма доходности смещена, но риск-модель слишком тонкая, чтобы доверять преимуществу. Покрытие stop-loss: ${asymmetricHypothesis[1]}%.`
  }

  const riskModelHypothesis = key.match(/^Hypothesis verdict: risk model missing\. The distribution may look acceptable, but robustness is limited until stop-loss coverage improves from (.+)%\.$/)
  if (riskModelHypothesis) {
    return `Вердикт гипотезы: отсутствует риск-модель. Распределение может выглядеть приемлемо, но устойчивость ограничена, пока покрытие stop-loss не вырастет с ${riskModelHypothesis[1]}%.`
  }

  const traceStudent = key.match(/^1\. Fit check: Student's t BIC \((.+)\) is lower than Normal BIC \((.+)\), so tail risk deserves priority\.$/)
  if (traceStudent) return `1. Проверка fitting: BIC Student's t (${traceStudent[1]}) ниже BIC Normal (${traceStudent[2]}), поэтому хвостовой риск имеет приоритет.`

  const traceNormal = key.match(/^1\. Fit check: Normal BIC \((.+)\) is competitive with Student's t BIC \((.+)\), so the profile is treated as calmer unless skew\/kurtosis disagrees\.$/)
  if (traceNormal) return `1. Проверка fitting: BIC Normal (${traceNormal[1]}) конкурентен BIC Student's t (${traceNormal[2]}), поэтому профиль считается более спокойным, если skew/kurtosis не противоречат.`

  const traceDomain = key.match(/^2\. Curve domain: fitted PDFs span \$(.+) to \$(.+), covering observed PnL from \$(.+) to \$(.+)\.$/)
  if (traceDomain) return `2. Диапазон кривой: подобранные PDF охватывают $${traceDomain[1]}-$${traceDomain[2]}, покрывая наблюдаемый PnL от $${traceDomain[3]} до $${traceDomain[4]}.`

  const traceDispersion = key.match(/^3\. Dispersion check: standard deviation is \$(.+), so average trade expectations should be judged against this volatility band\.$/)
  if (traceDispersion) return `3. Проверка разброса: стандартное отклонение равно $${traceDispersion[1]}, поэтому ожидания средней сделки нужно оценивать относительно этой полосы волатильности.`

  const traceShape = key.match(/^4\. Shape check: skewness is (.+) and excess kurtosis is (.+)\.$/)
  if (traceShape) return `4. Проверка формы: skewness = ${traceShape[1]}, excess kurtosis = ${traceShape[2]}.`

  const traceRisk = key.match(/^5\. Risk check: stop-loss coverage is (.+)%, take-profit coverage is (.+)%, and (.+) trades are unmanaged\.$/)
  if (traceRisk) return `5. Проверка риска: покрытие stop-loss = ${traceRisk[1]}%, take-profit = ${traceRisk[2]}%, сделок без управления риском: ${traceRisk[3]}.`

  const traceVerdict = key.match(/^6\. Verdict: (.+)\.$/)
  if (traceVerdict) return `6. Вердикт: ${dictionary[traceVerdict[1]] || traceVerdict[1]}.`

  const traceAction = key.match(/^7\. Action: (.+)$/)
  if (traceAction) return `7. Действие: ${dictionary[traceAction[1]] || traceAction[1]}`

  return ''
}

const withOriginalSpacing = (source: string, translation: string) => {
  const leading = source.match(/^\s*/)?.[0] || ''
  const trailing = source.match(/\s*$/)?.[0] || ''
  return `${leading}${translation}${trailing}`
}

export function useDomI18n(rootRef: Ref<HTMLElement | null>, namespace: string, options: { includeBody?: boolean } = {}) {
  const { locale } = useI18n()
  let observer: MutationObserver | null = null
  let applyScheduled = false

  const getNamespaceDictionary = (selectedLocale: 'en' | 'ru'): Record<string, string> => {
    const result = namespace.split('.').reduce<any>((value, key) => value?.[key], translations[selectedLocale])
    return result && typeof result === 'object' ? result : {}
  }

  // Keep English source keys and Russian translations available when switching in either direction.
  const sourceDictionary = getNamespaceDictionary('en')
  const translationDictionary = getNamespaceDictionary('ru')
  const dictionary = { ...sourceDictionary, ...translationDictionary }
  const reverseDictionary = buildReverseDictionary(translationDictionary)

  const resolveOriginal = (value: string, dictionary: Record<string, string>, reverseDictionary: Map<string, string>) => {
    const key = normalize(value)
    if (!key) return ''

    if (dictionary[key] || translateDynamic(key, dictionary)) {
      return value
    }

    const source = reverseDictionary.get(key)
    return source ? withOriginalSpacing(value, source) : ''
  }

  const translateTextNode = (node: Text, dictionary: Record<string, string>, reverseDictionary: Map<string, string>) => {
    const currentValue = node.nodeValue || ''
    let original = textOriginals.get(node)

    if (!original) {
      original = resolveOriginal(currentValue, dictionary, reverseDictionary)
      if (!original) return
      textOriginals.set(node, original)
    }

    const key = normalize(original)
    if (!key) return

    const translation = dictionary[key] || translateDynamic(key, dictionary)
    if (!translation) return

    const nextValue = locale.value === 'ru' ? withOriginalSpacing(original, translation) : original
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue
  }

  const translateAttributes = (el: Element, dictionary: Record<string, string>, reverseDictionary: Map<string, string>) => {
    for (const attr of translatedAttributes) {
      if (!el.hasAttribute(attr)) continue

      let originals = attributeOriginals.get(el)
      if (!originals) {
        originals = new Map()
        attributeOriginals.set(el, originals)
      }

      if (!originals.has(attr)) {
        const original = resolveOriginal(el.getAttribute(attr) || '', dictionary, reverseDictionary)
        if (!original) continue
        originals.set(attr, original)
      }

      const original = originals.get(attr) || ''
      const translation = dictionary[normalize(original)]
      if (!translation) continue

      const nextValue = locale.value === 'ru' ? translation : original
      if (el.getAttribute(attr) !== nextValue) el.setAttribute(attr, nextValue)
    }
  }

  const walk = (root: Node, dictionary: Record<string, string>, reverseDictionary: Map<string, string>) => {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root as Text, dictionary, reverseDictionary)
      return
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return

    const element = root as Element
    const tag = element.tagName
    if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'].includes(tag)) {
      translateAttributes(element, dictionary, reverseDictionary)
      return
    }

    translateAttributes(element, dictionary, reverseDictionary)
    if ((element as HTMLElement).isContentEditable || element.closest('[contenteditable="true"]')) return
    root.childNodes.forEach(child => walk(child, dictionary, reverseDictionary))
  }

  const applyTranslations = async () => {
    await nextTick()
    const root = rootRef.value
    if (!root) return

    walk(root, dictionary, reverseDictionary)
    if (options.includeBody && typeof document !== 'undefined') {
      walk(document.body, dictionary, reverseDictionary)
    }
  }

  const scheduleApply = () => {
    if (applyScheduled) return
    applyScheduled = true

    const run = () => {
      applyScheduled = false
      void applyTranslations()
    }

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(run)
    } else {
      queueMicrotask(run)
    }
  }

  onMounted(() => {
    scheduleApply()
    const observeRoot = options.includeBody && typeof document !== 'undefined' ? document.body : rootRef.value
    if (!observeRoot || typeof MutationObserver === 'undefined') return

    observer = new MutationObserver(() => scheduleApply())
    observer.observe(observeRoot, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes
    })
  })

  watch(locale, scheduleApply)

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })
}
