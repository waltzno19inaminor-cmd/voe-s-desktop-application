<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import ExRobustnessEquityMap from './robustnessEquityMap/ExRobustnessEquityMap.vue'
import { buildEquityStabilityMap } from './robustnessEquityMap/equityStabilityMap'
import ExStrategyReportCover from './ExStrategyReportCover.vue'
import ExStrategyReportTableOfContents from './ExStrategyReportTableOfContents.vue'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
  strategyName?: string
}>()

const { strategyMetrics, filteredTrades, strategyName } = toRefs(props)

const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
const equityModel = computed(() => buildEquityStabilityMap(filteredTrades.value, getTradePnlFn))
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-hidden bg-transparent">
    <div class="h-full w-full px-[12vw]">
      <div class="h-full min-h-screen w-full overflow-y-auto bg-black">
        <ExStrategyReportCover
          :strategy-name="strategyName"
        />

        <ExStrategyReportTableOfContents />

        <ExRobustnessEquityMap
          v-if="false"
          :model="equityModel"
          :trades="filteredTrades"
          :get-trade-pnl="getTradePnlFn"
        />
      </div>
    </div>
  </div>
</template>
