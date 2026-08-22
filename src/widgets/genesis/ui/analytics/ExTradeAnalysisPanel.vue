<script setup lang="ts">
import ExAdvancedMetricsPanel from './ExAdvancedMetricsPanel.vue'
import ExTradeMetricsPanel from './ExTradeMetricsPanel.vue'

defineProps<{
  trade?: any
  metricsOnly?: boolean
  allTrades?: any[]
  initialBalance?: number
}>()
</script>

<template>
  <ExTradeMetricsPanel
    v-if="metricsOnly"
    v-bind="$attrs"
    :trade="trade"
    :all-trades="allTrades"
    :initial-balance="initialBalance"
  />
  <ExAdvancedMetricsPanel
    v-else
    v-bind="$attrs"
    :trade="trade"
    :all-trades="allTrades"
    :initial-balance="initialBalance"
  />
</template>
