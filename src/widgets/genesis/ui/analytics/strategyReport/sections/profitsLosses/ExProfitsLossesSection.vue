<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExStrategyReportPageNumber from '../../components/auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../../components/auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../../components/auxiliary/ExStrategyReportSectionSubheading.vue'
import ExCapitalGrowthRateChart from './components/ExCapitalGrowthRateChart.vue'

defineProps<{
  trades: Record<string, any>[]
  getTradePnl: (trade: Record<string, any>) => number
  initialCapital?: number
}>()

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
</script>

<template>
  <section id="report-section-profits-losses" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="01" total="07" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Прибыли и убытки' : 'Profits & Losses' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Состав и структура наблюдаемого торгового результата.' : 'Composition and structure of the observed trading result.' }}</ExStrategyReportSectionSubheading>
      </div>
      <ExCapitalGrowthRateChart :trades="trades" :get-trade-pnl="getTradePnl" :initial-capital="initialCapital" />
    </div>
  </section>
</template>
