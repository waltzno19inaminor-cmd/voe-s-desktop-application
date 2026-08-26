<script setup lang="ts">
import { toRefs } from 'vue'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import ExRobustnessEquityMap from './robustnessEquityMap/ExRobustnessEquityMap.vue'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
}>()

const { strategyMetrics, filteredTrades } = toRefs(props)

const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
</script>

<template>
  <div class="absolute inset-0 z-30 overflow-y-auto !bg-black !text-white font-mono selection:bg-white selection:text-black">
    <div class="w-full pb-40 pt-[14vh]">
      <ExRobustnessEquityMap
        :trades="filteredTrades"
        :get-trade-pnl="getTradePnlFn"
      />
    </div>
  </div>
</template>
