<template>
  <section class="absolute inset-0 overflow-hidden">
    <AssetGraphCanvas ref="surface" :label="locale === 'ru' ? 'Граф активов и результатов закрытых сделок' : 'Assets and closed trade returns graph'" />
  </section>
</template>

<script setup lang="ts">
import AssetGraphCanvas from './AssetGraphCanvas.vue'
import { useAssetGraph } from './model/useAssetGraph'
const props = defineProps<{ trades: Record<string, any>[]; initialDeposit: number; locale: string; isDark?: boolean }>()
const emit = defineEmits<{ 'trade-click': [payload: { tradeId: string; event?: MouseEvent }] }>()
const { surface } = useAssetGraph(props, { onTradeClick: payload => emit('trade-click', payload) })
</script>
