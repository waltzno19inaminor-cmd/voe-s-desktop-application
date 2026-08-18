<script setup lang="ts">
import { toRefs } from 'vue'
import { useExRobustness } from '../../model/useExRobustness'
import { useI18n } from '~/shared/i18n/useI18n'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
}>()

const { diagnosticStats, strategyMetrics, filteredTrades } = toRefs(props)
const { locale } = useI18n()

const getFilteredTradesFn = () => filteredTrades.value
const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)

const {
  robustnessExplanationVariables,
  robustnessDistributionFits,
  robustnessNormalityTests,
  robustnessBootstrapSummary,
  robustnessUiLayerSummary
} = useExRobustness(diagnosticStats, strategyMetrics, getFilteredTradesFn, getTradePnlFn)

const diagnosticTextMap: Record<string, { en: string; ru: string }> = {
  distributionMetrics: { en: 'I. DISTRIBUTION METRICS', ru: 'I. МЕТРИКИ РЕЗУЛЬТАТОВ' },
  bootstrapStability: { en: 'II. BOOTSTRAP STABILITY', ru: 'II. УСТОЙЧИВОСТЬ ПОВТОРНОЙ ПРОВЕРКИ' },
  distributionFits: { en: 'III. DISTRIBUTION FITS', ru: 'III. СРАВНЕНИЕ МОДЕЛЕЙ' },
  optimalFit: { en: '[ BEST ]', ru: '[ ЛУЧШЕ ]' },
  suboptimal: { en: '[ WEAKER ]', ru: '[ СЛАБЕЕ ]' },
  referenceFit: { en: '[ REFERENCE ]', ru: '[ СПРАВКА ]' },
  normalityHypothesis: { en: 'IV. NORMALITY HYPOTHESIS', ru: 'IV. ПРОВЕРКА НОРМАЛЬНОСТИ' },
  rollingLayer: { en: 'V. ROLLING LAYER DYNAMICS', ru: 'V. ТЕКУЩАЯ ДИНАМИКА' }
}

function diagnosticText(key: string) {
  return diagnosticTextMap[key]?.[locale.value === 'ru' ? 'ru' : 'en'] || key
}
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-y-auto nier-bg-panel nier-text-primary font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
    <div class="w-full max-w-4xl mx-auto px-12 pt-24 pb-64">
      
      <!-- DATA -->
      <div class="space-y-20 text-[11px] uppercase tracking-widest">
        
        <!-- METRICS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">{{ diagnosticText('distributionMetrics') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
            <div v-for="item in robustnessExplanationVariables" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
        </section>

        <!-- BOOTSTRAP STABILITY -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">{{ diagnosticText('bootstrapStability') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 mb-8">
            <div v-for="item in robustnessBootstrapSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
        </section>

        <!-- DISTRIBUTION FITS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">{{ diagnosticText('distributionFits') }}</h2>
          <div class="flex flex-col border-t border-l border-r nier-border-primary overflow-x-auto">
            <div v-for="fit in robustnessDistributionFits" :key="fit.name" 
                 class="grid min-w-[34rem] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-3 py-3 border-b"
                 :class="fit.isBest ? 'border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5' : fit.isReferenceOnly ? 'nier-border-primary bg-black/[0.02] dark:bg-white/[0.02]' : 'nier-border-primary'">
              <div class="font-bold flex items-center gap-2 text-[10px]">
                <span class="w-1.5 h-1.5 rounded-full" :class="fit.isBest ? 'nier-bg-inverted' : 'opacity-0'"></span>
                {{ fit.name }}
              </div>
              <div class="nier-text-primary text-right whitespace-nowrap text-[9px]"><span class="opacity-80">AIC:</span> <span class="ml-1 font-black">{{ fit.aic }}</span></div>
              <div class="nier-text-primary text-right whitespace-nowrap text-[9px]"><span class="opacity-80">BIC:</span> <span class="ml-1 font-black">{{ fit.bic }}</span></div>
              <div class="justify-self-end whitespace-nowrap px-1.5 py-0.5 text-[8px] leading-none border font-bold"
                   :class="fit.isBest ? 'border-black bg-black text-white dark:border-white' : fit.isReferenceOnly ? 'nier-border-primary nier-text-primary' : 'border-red-500/70 bg-red-500/10 text-red-600 dark:border-red-400 dark:text-red-400'">
                {{ fit.isBest ? diagnosticText('optimalFit') : fit.isReferenceOnly ? diagnosticText('referenceFit') : diagnosticText('suboptimal') }}
              </div>
            </div>
          </div>
        </section>

        <!-- NORMALITY TESTS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">{{ diagnosticText('normalityHypothesis') }}</h2>
          <div class="flex flex-col gap-6 mb-10">
            <div v-for="test in robustnessNormalityTests" :key="test.name" class="flex flex-col gap-3">
              <div class="flex items-center gap-6">
                <span class="font-bold w-40">{{ test.name }}</span>
                <span class="px-3 py-1 text-[9px] tracking-widest border"
                      :class="test.pass ? 'border-black bg-black text-white dark:border-white font-bold' : 'border-red-500/70 bg-red-500/10 text-red-600 dark:border-red-400 dark:text-red-400 font-bold'">
                  {{ test.result }}
                </span>
              </div>
              <p class="opacity-50 pl-[11.5rem] leading-relaxed">{{ test.note }}</p>
            </div>
          </div>
        </section>

        <!-- ROLLING LAYER -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">{{ diagnosticText('rollingLayer') }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
            <div v-for="item in robustnessUiLayerSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>
