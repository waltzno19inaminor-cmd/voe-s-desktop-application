<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import { buildEquityStabilityMap } from './robustnessEquityMap/equityStabilityMap'
import ExStrategyReportCover from './strategyReport/components/core/ExStrategyReportCover.vue'
import ExStrategyReportTableOfContents from './strategyReport/components/core/ExStrategyReportTableOfContents.vue'
import ExProfitsLossesSection from './strategyReport/sections/profitsLosses/ExProfitsLossesSection.vue'
import ExTradeResultsDistributionSection from './strategyReport/sections/tradeDistribution/ExTradeResultsDistributionSection.vue'
import ExRiskExecutionSection from './strategyReport/sections/riskExecution/ExRiskExecutionSection.vue'
import ExScenariosConditionsSection from './strategyReport/sections/scenariosConditions/ExScenariosConditionsSection.vue'
import ExDrawdownsSection from './strategyReport/sections/drawdowns/ExDrawdownsSection.vue'
import ExRobustnessDiagnosticsSection from './strategyReport/sections/robustness/ExRobustnessDiagnosticsSection.vue'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
  strategyName?: string
}>()

const { strategyMetrics, filteredTrades, strategyName } = toRefs(props)

const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
const equityModel = computed(() => buildEquityStabilityMap(filteredTrades.value, getTradePnlFn, strategyMetrics.value?.initialDeposit || 1000))
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-hidden bg-transparent">
    <div class="h-full w-full px-[12vw]">
      <div class="mt-[4vh] h-[calc(100%_-_4vh)] min-h-0 w-full overflow-y-auto bg-black">
        <ExStrategyReportCover
          :strategy-name="strategyName"
        />

        <ExStrategyReportTableOfContents />

        <ExProfitsLossesSection
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />

        <ExTradeResultsDistributionSection
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
        />

        <ExRiskExecutionSection
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
          :risk-budget="strategyMetrics?.configuredRiskPerTrade"
        />

        <ExScenariosConditionsSection
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />

        <ExDrawdownsSection
          :model="equityModel"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
        />

        <ExRobustnessDiagnosticsSection
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
          :initial-capital="strategyMetrics?.initialDeposit || 1000"
        />
      </div>
    </div>
  </div>
</template>
