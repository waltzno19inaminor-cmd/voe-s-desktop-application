<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'
import ExRobustnessEquityMap from './robustnessEquityMap/ExRobustnessEquityMap.vue'
import { buildEquityStabilityMap } from './robustnessEquityMap/equityStabilityMap'

const props = defineProps<{
  diagnosticStats: any
  strategyMetrics: any
  filteredTrades: any[]
}>()

const { strategyMetrics, filteredTrades } = toRefs(props)

const getTradePnlFn = (trade: any) => getTradeCashPnl(trade, strategyMetrics.value?.initialDeposit || 1000)
const equityModel = computed(() => buildEquityStabilityMap(filteredTrades.value, getTradePnlFn))
</script>

<template>
  <ExRobustnessEquityMap
    v-if="false"
    :model="equityModel"
    :trades="filteredTrades"
    :get-trade-pnl="getTradePnlFn"
  />
</template>
