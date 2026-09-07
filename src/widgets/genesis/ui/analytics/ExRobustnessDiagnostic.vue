<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import { useAccessActivation } from '~/features/access/model/useAccessActivation'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import { buildEquityStabilityMap } from './robustnessEquityMap/equityStabilityMap'
import ExStrategyReportCover from './strategyReport/components/core/ExStrategyReportCover.vue'
import ExStrategyReportTableOfContents from './strategyReport/components/core/ExStrategyReportTableOfContents.vue'
import ExStrategyReportSideNavigation from './strategyReport/components/core/ExStrategyReportSideNavigation.vue'
import ExProfitsLossesSection from './strategyReport/sections/profitsLosses/ExProfitsLossesSection.vue'
import ExTradeResultsDistributionSection from './strategyReport/sections/tradeDistribution/ExTradeResultsDistributionSection.vue'
import ExRiskExecutionSection from './strategyReport/sections/riskExecution/ExRiskExecutionSection.vue'
import ExScenariosConditionsSection from './strategyReport/sections/scenariosConditions/ExScenariosConditionsSection.vue'
import ExDrawdownsSection from './strategyReport/sections/drawdowns/ExDrawdownsSection.vue'
import ExRobustnessDiagnosticsSection from './strategyReport/sections/robustness/ExRobustnessDiagnosticsSection.vue'
import ExPaywallOverlay from '../common/ExPaywallOverlay.vue'
import { strategyReportSections } from './strategyReport/strategyReportSections'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
  strategyName?: string
}>()

const { strategyMetrics, filteredTrades, strategyName } = toRefs(props)

const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
const equityModel = computed(() => buildEquityStabilityMap(filteredTrades.value, getTradePnlFn, strategyMetrics.value?.initialDeposit || 1000))
const selectedSectionId = ref<string | null>(null)
const scrollAreaRef = ref<HTMLElement | null>(null)
const showPaywall = ref(false)
const { canAccess } = useAccessActivation()
const isSectionAllowed = (sectionId: string) => {
  const section = strategyReportSections.find(item => item.id === sectionId)
  return !section?.capability || canAccess(section.capability)
}
const lockedSectionIds = computed(() => strategyReportSections
  .filter(section => section.capability && !canAccess(section.capability))
  .map(section => section.id))

const scrollToTop = () => {
  if (scrollAreaRef.value) {
    scrollAreaRef.value.scrollTop = 0
  }
}

const handleSelectSection = (sectionId: string | null) => {
  if (sectionId && !isSectionAllowed(sectionId)) {
    showPaywall.value = true
    return
  }

  selectedSectionId.value = sectionId
  nextTick(() => {
    scrollToTop()
    requestAnimationFrame(() => {
      scrollToTop()
    })
  })
}

watch(selectedSectionId, () => {
  nextTick(() => {
    scrollToTop()
    requestAnimationFrame(() => {
      scrollToTop()
    })
  })
})

watch(lockedSectionIds, (lockedIds) => {
  if (selectedSectionId.value && lockedIds.includes(selectedSectionId.value)) {
    selectedSectionId.value = null
  }
})

onMounted(() => {
  nextTick(() => {
    scrollToTop()
    requestAnimationFrame(() => {
      scrollToTop()
    })
  })
})
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-hidden bg-transparent">
    <div class="h-full w-full pl-[4vw] pr-4 xl:pl-[7vw] xl:pr-6">
      <div class="mt-[4vh] flex h-[calc(100%_-_4vh)] min-h-0 w-full gap-6 bg-black xl:gap-10">
        <ExStrategyReportSideNavigation
          :selected-section-id="selectedSectionId"
          :locked-section-ids="lockedSectionIds"
          @select="handleSelectSection"
        />

        <div ref="scrollAreaRef" class="report-scroll-area min-h-0 min-w-0 flex-1 overflow-y-auto pb-20">
        <ExStrategyReportCover
          v-if="!selectedSectionId"
          :strategy-name="strategyName"
        />

        <div class="hidden">
          <ExStrategyReportTableOfContents />
        </div>

        <ExProfitsLossesSection
          v-if="selectedSectionId === 'profits-losses'"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />

        <ExTradeResultsDistributionSection
          v-if="selectedSectionId === 'trade-distribution'"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
        />

        <ExRiskExecutionSection
          v-if="selectedSectionId === 'risk-execution'"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
          :risk-budget="strategyMetrics?.configuredRiskPerTrade"
        />

        <ExScenariosConditionsSection
          v-if="selectedSectionId === 'scenarios-conditions' && isSectionAllowed('scenarios-conditions')"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />

        <ExDrawdownsSection
          v-if="selectedSectionId === 'drawdowns'"
          :model="equityModel"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
        />

        <ExRobustnessDiagnosticsSection
          v-if="selectedSectionId === 'robustness'"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />
        </div>
      </div>
    </div>
    <ExPaywallOverlay
      :is-open="showPaywall"
      capability="reports.scenariosConditions"
      @close="showPaywall = false"
    />
  </div>
</template>

<style scoped>
.report-scroll-area {
  scrollbar-color: rgba(148, 163, 184, 0.62) transparent;
  scrollbar-width: auto;
  transition: scrollbar-color 220ms ease;
}

.report-scroll-area::-webkit-scrollbar {
  width: 10px;
}

.report-scroll-area:hover {
  scrollbar-color: rgba(203, 213, 225, 0.82) transparent;
}

.report-scroll-area::-webkit-scrollbar-track {
  margin-top: 18px;
  margin-bottom: 18px;
  background: transparent;
}

.report-scroll-area::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  background-color: rgba(148, 163, 184, 0.62);
  background-clip: content-box;
  transition: background-color 220ms ease;
}

.report-scroll-area:hover::-webkit-scrollbar-thumb {
  background-color: rgba(203, 213, 225, 0.82);
  background-clip: content-box;
}
</style>
