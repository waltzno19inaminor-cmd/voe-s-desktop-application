<script setup lang="ts">
import { toRefs } from 'vue'
import { useExRobustness } from '../../model/useExRobustness'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
  formatSentenceCase: (text: string) => string
}>()

const { diagnosticStats, strategyMetrics, filteredTrades } = toRefs(props)

const getFilteredTradesFn = () => filteredTrades.value

const {
  robustnessExplanation,
  robustnessExplanationVariables,
  robustnessDistributionFits,
  robustnessDistributionComparison,
  robustnessNormalityTests,
  robustnessHypothesisSummary,
  robustnessBootstrapSummary,
  robustnessBootstrapInterpretation,
  robustnessUiLayerSummary,
  robustnessExplanationSequence
} = useExRobustness(diagnosticStats, strategyMetrics, getFilteredTradesFn)
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-y-auto nier-bg-panel nier-text-primary font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
    <div class="w-full max-w-4xl mx-auto px-12 pt-24 pb-64">
      
      <!-- HEADER -->
      <header class="mb-20 border-b border-black/20 dark:border-white/20 pb-12">
        <div class="text-[9px] uppercase tracking-[0.45em] opacity-40 mb-6">VIEW_EXPLANATION</div>
        <h1 class="text-3xl uppercase tracking-widest font-black mb-6" :style="{ color: robustnessExplanation.tone }">
          {{ robustnessExplanation.verdict }}
        </h1>
        <p class="text-[13px] uppercase tracking-[0.1em] leading-loose opacity-70 max-w-3xl">
          {{ robustnessExplanation.diagnosis }}
        </p>
      </header>

      <!-- DATA -->
      <div class="space-y-20 text-[11px] uppercase tracking-widest">
        
        <!-- METRICS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">I. DISTRIBUTION_METRICS</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
            <div v-for="item in robustnessExplanationVariables" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
        </section>

        <!-- BOOTSTRAP STABILITY -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">II. BOOTSTRAP_STABILITY</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 mb-8">
            <div v-for="item in robustnessBootstrapSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
          <p class="opacity-60 leading-loose border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessBootstrapInterpretation }}</p>
        </section>

        <!-- DISTRIBUTION FITS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">III. DISTRIBUTION_FITS</h2>
          <div class="flex flex-col border-t border-l border-r nier-border-primary">
            <div v-for="fit in robustnessDistributionFits" :key="fit.name" 
                 class="grid grid-cols-4 items-center p-5 border-b"
                 :class="fit.isBest ? 'border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5' : 'nier-border-primary opacity-70'">
              <div class="font-bold flex items-center gap-4">
                <span class="w-1.5 h-1.5 rounded-full" :class="fit.isBest ? 'nier-bg-inverted' : 'opacity-0'"></span>
                {{ fit.name }}
              </div>
              <div class="opacity-60 text-right">AIC: <span class="font-bold nier-text-primary opacity-100 ml-2 text-sm">{{ fit.aic }}</span></div>
              <div class="opacity-60 text-right">BIC: <span class="font-bold nier-text-primary opacity-100 ml-2 text-sm">{{ fit.bic }}</span></div>
              <div class="text-right" :class="fit.isBest ? 'opacity-100 font-bold' : 'opacity-40'">
                {{ fit.isBest ? '[ OPTIMAL_FIT ]' : '[ SUBOPTIMAL ]' }}
              </div>
            </div>
          </div>
          <p class="mt-8 opacity-60 leading-loose border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessDistributionComparison }}</p>
        </section>

        <!-- NORMALITY TESTS -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">IV. NORMALITY_HYPOTHESIS</h2>
          <div class="flex flex-col gap-6 mb-10">
            <div v-for="test in robustnessNormalityTests" :key="test.name" class="flex flex-col gap-3">
              <div class="flex items-center gap-6">
                <span class="font-bold w-40">{{ test.name }}</span>
                <span class="px-3 py-1 text-[9px] tracking-widest border"
                      :class="test.pass ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-black/20 dark:border-white/20 opacity-50'">
                  {{ test.result }}
                </span>
              </div>
              <p class="opacity-50 pl-[11.5rem] leading-relaxed">{{ test.note }}</p>
            </div>
          </div>
          <div class="p-6 border" :class="robustnessNormalityTests.every(test => test.pass) ? 'border-black bg-black/5 dark:border-white dark:bg-white/5' : 'border-dashed border-black/20 dark:border-white/20 opacity-80'">
            <p class="leading-loose font-bold">> {{ robustnessHypothesisSummary }}</p>
          </div>
        </section>

        <!-- ROLLING LAYER -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">V. ROLLING_LAYER_DYNAMICS</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
            <div v-for="item in robustnessUiLayerSummary" :key="item.name" class="flex items-end justify-between group border-b border-black/5 dark:border-white/5 pb-2">
              <span class="opacity-50 group-hover:opacity-100 transition-opacity">{{ item.name }}</span>
              <span class="font-bold text-sm">{{ item.val }}</span>
            </div>
          </div>
        </section>

        <!-- ACTION -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">VI. ROBUSTNESS_ACTION</h2>
          <div class="p-6 border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03]">
            <p class="leading-loose font-bold" :style="{ color: robustnessExplanation.tone }">> {{ robustnessExplanation.action }}</p>
          </div>
        </section>

        <!-- TRACE -->
        <section>
          <h2 class="text-[9px] tracking-[0.4em] opacity-40 mb-8 pb-3 border-b nier-border-primary">VII. DIAGNOSTIC_TRACE</h2>
          <pre class="whitespace-pre-wrap normal-case tracking-normal leading-loose opacity-60 border-l border-black/20 dark:border-white/20 pl-6">{{ robustnessExplanationSequence }}</pre>
        </section>

      </div>
    </div>
  </div>
</template>
