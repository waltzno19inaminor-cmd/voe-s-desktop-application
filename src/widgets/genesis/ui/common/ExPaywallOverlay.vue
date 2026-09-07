<template>
  <Teleport to="body">
    <Transition name="fade-blur">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10050] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8 overflow-hidden"
           @click.self="closeOverlay">
        
        <!-- Decorative Background Elements -->
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div class="w-[800px] h-[800px] rounded-full border border-white/5 animate-spin-slow"></div>
          <div class="absolute w-[600px] h-[600px] rounded-full border border-[#FF424D]/10 animate-reverse-spin"></div>
          <div class="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF424D]/20 to-transparent top-1/2"></div>
        </div>

        <!-- Main Panel -->
        <ExPanel 
          variant="light" 
          :title="featureContent.title"
          class="relative w-full max-w-3xl shadow-[0_0_100px_rgba(255,66,77,0.1)] group z-10 border-white/10"
        >
          <div class="flex w-full flex-col items-center relative z-10">
            <div class="w-full border-b border-white/10 pb-6 text-center">
              <span class="font-mono text-[8px] font-black uppercase tracking-[0.42em] text-[#FF424D]">
                {{ locale === 'ru' ? 'ДОСТУПНО ПО ПОДПИСКЕ' : 'AVAILABLE WITH SUBSCRIPTION' }}
              </span>
              <p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/65">
                {{ featureContent.summary }}
              </p>
            </div>

            <div class="my-6 grid w-full gap-2 sm:grid-cols-3">
              <div
                v-for="(benefit, index) in featureContent.benefits"
                :key="benefit"
                class="relative min-h-24 border border-white/10 bg-white/[0.025] px-4 pb-4 pt-7"
              >
                <span class="absolute left-4 top-3 font-mono text-[7px] font-black tracking-[0.28em] text-white/25">
                  0{{ index + 1 }}
                </span>
                <p class="font-mono text-[9px] font-bold uppercase leading-relaxed tracking-[0.12em] text-white/70">
                  {{ benefit }}
                </p>
              </div>
            </div>
            
            <!-- Action Area -->
            <div class="flex w-full flex-col items-center gap-4 sm:flex-row">
              <button
                @click="openPatreon"
                class="relative flex-1 group/btn w-full overflow-hidden border border-[#FF424D]/50 hover:border-[#FF424D] bg-[#FF424D]/5 hover:bg-[#FF424D]/15 transition-all duration-500 py-5 px-6 flex items-center justify-center gap-4"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF424D]/20 to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                <svg class="w-6 h-6 fill-[#FF424D] drop-shadow-[0_0_8px_rgba(255,66,77,0.8)]" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><g transform="matrix(.47407 0 0 .47407 .383 .422)"><clipPath id="prefix__a"><path d="M0 0h1080v1080H0z"/></clipPath><g clip-path="url(#prefix__a)"><path d="M1033.05 324.45c-.19-137.9-107.59-250.92-233.6-291.7-156.48-50.64-362.86-43.3-512.28 27.2-181.1 85.46-237.99 272.66-240.11 459.36-1.74 153.5 13.58 557.79 241.62 560.67 169.44 2.15 194.67-216.18 273.07-321.33 55.78-74.81 127.6-95.94 216.01-117.82 151.95-37.61 255.51-157.53 255.29-316.38z" fill-rule="nonzero"/></g></g></svg>
                <span class="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white group-hover/btn:text-white transition-colors relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  {{ locale === 'ru' ? 'ОФОРМИТЬ ПОДПИСКУ НА PATREON' : 'GET THE FULL APP ON PATREON' }}
                </span>
              </button>
              
              <button 
                @click="closeOverlay"
                class="flex-none px-10 py-5 border border-white/20 text-white/60 hover:text-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] font-bold text-xs"
              >
                {{ locale === 'ru' ? 'ЗАКРЫТЬ' : 'CLOSE' }}
              </button>
            </div>
            
            <p class="mt-7 max-w-md text-center font-mono text-[8px] uppercase leading-relaxed tracking-widest text-white/35">
              {{ locale === 'ru' ? 'Доступ откроется автоматически после активации подписки.' : 'Access unlocks automatically after subscription activation.' }}
            </p>

          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { open } from '@tauri-apps/plugin-shell'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import type { AccessCapability } from '~/features/access/model/accessEntitlements'

const { locale } = useI18n()

const props = defineProps<{
  isOpen: boolean
  capability?: AccessCapability
}>()

type LocalizedFeatureContent = {
  title: { ru: string; en: string }
  summary: { ru: string; en: string }
  benefits: { ru: [string, string, string]; en: [string, string, string] }
}

const featureContentByCapability: Partial<Record<AccessCapability, LocalizedFeatureContent>> = {
  'broker.binance': {
    title: { ru: 'ПОДКЛЮЧЕНИЕ BINANCE', en: 'BINANCE CONNECTION' },
    summary: { ru: 'Переносите историю сделок Binance в журнал без ручного ввода.', en: 'Bring your Binance trade history into the journal without manual entry.' },
    benefits: {
      ru: ['Импорт сделок с биржи', 'Единая история в журнале', 'Меньше ручной работы'],
      en: ['Import exchange trades', 'One journal history', 'Less manual work']
    }
  },
  'broker.bybit': {
    title: { ru: 'ПОДКЛЮЧЕНИЕ BYBIT', en: 'BYBIT CONNECTION' },
    summary: { ru: 'Синхронизируйте сделки Bybit и анализируйте их вместе с остальным журналом.', en: 'Sync Bybit trades and analyze them together with the rest of your journal.' },
    benefits: {
      ru: ['Импорт закрытых сделок', 'Синхронизация истории', 'Общий торговый журнал'],
      en: ['Import closed trades', 'History synchronization', 'Unified trading journal']
    }
  },
  'broker.kraken': {
    title: { ru: 'ПОДКЛЮЧЕНИЕ KRAKEN', en: 'KRAKEN CONNECTION' },
    summary: { ru: 'Добавляйте сделки Kraken в журнал и сохраняйте аналитику в одном месте.', en: 'Add Kraken trades to your journal and keep analysis in one place.' },
    benefits: {
      ru: ['Импорт истории Kraken', 'Spot и Futures контекст', 'Единая база сделок'],
      en: ['Kraken history import', 'Spot and Futures context', 'One trade database']
    }
  },
  'broker.interactiveBrokers': {
    title: { ru: 'ПОДКЛЮЧЕНИЕ IBKR', en: 'IBKR CONNECTION' },
    summary: { ru: 'Загружайте отчёты Interactive Brokers и ведите журнал без повторного заполнения сделок.', en: 'Load Interactive Brokers reports and journal trades without entering them again.' },
    benefits: {
      ru: ['Импорт через Flex Query', 'Автоматизация журнала', 'Анализ в общей системе'],
      en: ['Flex Query import', 'Automated journaling', 'Analysis in one system']
    }
  },
  'reports.scenariosConditions': {
    title: { ru: 'СЦЕНАРИИ И УСЛОВИЯ', en: 'SCENARIOS & CONDITIONS' },
    summary: { ru: 'Узнайте, в каком рыночном контексте стратегия действительно работает.', en: 'See which market context actually makes your strategy work.' },
    benefits: {
      ru: ['Сравнение сценариев', 'Эффективность условий', 'Поиск сильных комбинаций'],
      en: ['Compare scenarios', 'Measure condition impact', 'Find strong combinations']
    }
  },
  'analytics.scenariosConditions': {
    title: { ru: 'ФИЛЬТР СЦЕНАРИЕВ', en: 'SCENARIO FILTERING' },
    summary: { ru: 'Изолируйте нужный сценарий или условие прямо на кривой капитала.', en: 'Isolate a scenario or condition directly on the equity curve.' },
    benefits: {
      ru: ['Отдельная кривая результата', 'Сравнение торгового контекста', 'Быстрая проверка гипотез'],
      en: ['Focused result curve', 'Compare trading context', 'Test hypotheses quickly']
    }
  },
  'diary.genesisTree': {
    title: { ru: 'ДЕРЕВО ГЕНЕЗИСА', en: 'GENESIS TREE' },
    summary: { ru: 'Смотрите структуру торговли как связанную систему, а не набор отдельных сделок.', en: 'View your trading as a connected system instead of isolated trades.' },
    benefits: {
      ru: ['Связи между сделками', 'Визуальная структура развития', 'Поиск повторяющихся ветвей'],
      en: ['Connections between trades', 'Visual evolution structure', 'Find recurring branches']
    }
  },
  'diary.capitalForecast': {
    title: { ru: 'ПРОГНОЗ КАПИТАЛА', en: 'CAPITAL FORECAST' },
    summary: { ru: 'Оцените возможную траекторию капитала на основе вашей реальной статистики.', en: 'Estimate possible capital paths from your actual trading statistics.' },
    benefits: {
      ru: ['Несколько горизонтов прогноза', 'Диапазон возможных исходов', 'Оценка риска будущей серии'],
      en: ['Multiple forecast horizons', 'Range of possible outcomes', 'Future sequence risk']
    }
  },
  'trade.nodeMapping': {
    title: { ru: 'NODE MAPPING', en: 'NODE MAPPING' },
    summary: { ru: 'Разберите сделку в контексте стратегии, сценария и фактического исполнения.', en: 'Break down a trade through its strategy, scenario, and actual execution.' },
    benefits: {
      ru: ['Карта элементов сделки', 'Связь с логикой стратегии', 'Быстрый поиск слабого звена'],
      en: ['Trade element map', 'Strategy logic connection', 'Find the weak link quickly']
    }
  },
  'trade.advancedPatterns': {
    title: { ru: 'ПАТТЕРНЫ СДЕЛОК', en: 'TRADE PATTERNS' },
    summary: { ru: 'Находите общие признаки, которые повторяются в сильных и слабых сделках.', en: 'Find traits that repeat across your strongest and weakest trades.' },
    benefits: {
      ru: ['Группировка по Trade Score', 'Повторяющиеся диапазоны метрик', 'Различия сильных и слабых сделок'],
      en: ['Trade Score cohorts', 'Recurring metric ranges', 'Strong versus weak trades']
    }
  },
  'trade.ohlcAnalysis': {
    title: { ru: 'OHLC-АНАЛИЗ СДЕЛКИ', en: 'TRADE OHLC ANALYSIS' },
    summary: { ru: 'Восстановите движение цены внутри сделки и оцените качество входа и выхода.', en: 'Reconstruct price movement inside a trade and evaluate entry and exit quality.' },
    benefits: {
      ru: ['Свечной график сделки', 'MFE и глубина просадки', 'Анализ пути цены'],
      en: ['Trade candlestick chart', 'MFE and drawdown depth', 'Price-path analysis']
    }
  },
  'matrix.strategyVersions': {
    title: { ru: 'ВЕРСИИ СТРАТЕГИИ', en: 'STRATEGY VERSIONS' },
    summary: { ru: 'Фиксируйте этапы развития стратегии и безопасно возвращайтесь к прошлой структуре.', en: 'Capture strategy evolution and safely return to an earlier structure.' },
    benefits: {
      ru: ['Снимки структуры', 'Сравнение изменений', 'Обновление и откат версий'],
      en: ['Structure snapshots', 'Change comparison', 'Update and restore versions']
    }
  },
  'matrix.multipleBoards': {
    title: { ru: 'НЕСКОЛЬКО ДОСОК', en: 'MULTIPLE BOARDS' },
    summary: { ru: 'Разделяйте независимые стратегии по собственным рабочим пространствам.', en: 'Keep independent strategies in their own workspaces.' },
    benefits: {
      ru: ['Отдельная доска для стратегии', 'Чистая структура проектов', 'Быстрое переключение'],
      en: ['One board per strategy', 'Clean project structure', 'Fast switching']
    }
  }
}

const fallbackContent: LocalizedFeatureContent = {
  title: { ru: 'РАСШИРЕННЫЙ ИНСТРУМЕНТ', en: 'ADVANCED TOOL' },
  summary: { ru: 'Откройте расширенные инструменты анализа и развития торговой системы.', en: 'Unlock advanced tools for analyzing and developing your trading system.' },
  benefits: {
    ru: ['Глубже анализ', 'Больше рабочих инструментов', 'Единая система развития'],
    en: ['Deeper analysis', 'More workflow tools', 'One development system']
  }
}

const featureContent = computed(() => {
  const source = (props.capability && featureContentByCapability[props.capability]) || fallbackContent
  const language = locale.value === 'ru' ? 'ru' : 'en'
  return {
    title: source.title[language],
    summary: source.summary[language],
    benefits: source.benefits[language]
  }
})

const emit = defineEmits(['close'])

const openPatreon = async () => {
  try {
    await open('https://www.patreon.com/cw/jlgandr')
  } catch (error) {
    console.error('Failed to open external link', error)
  }
}

const closeOverlay = () => {
  emit('close')
}
</script>

<style scoped>
.fade-blur-enter-active, .fade-blur-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-blur-enter-from, .fade-blur-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.fade-blur-enter-to, .fade-blur-leave-from {
  opacity: 1;
  backdrop-filter: blur(24px);
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reverse-spin {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

.animate-reverse-spin {
  animation: reverse-spin 15s linear infinite;
}
</style>
