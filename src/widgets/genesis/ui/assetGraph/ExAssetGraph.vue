<template>
  <section class="absolute inset-0 overflow-hidden">
    <AssetGraphCanvas ref="surface" :label="locale === 'ru' ? 'Граф активов и результатов закрытых сделок' : 'Assets and closed trade returns graph'" />
    <div
      v-if="!hasTrades"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8 text-center font-mono text-[10px] font-bold uppercase tracking-[0.32em] opacity-40"
      role="status"
    >
      {{ locale === 'ru' ? 'СДЕЛОК НЕ НАЙДЕНО' : 'NO TRADES FOUND' }}
    </div>
  </section>
</template>

<script setup lang="ts">
import AssetGraphCanvas from './AssetGraphCanvas.vue'
import { useAssetGraph } from './model/useAssetGraph'
const props = defineProps<{ trades: Record<string, any>[]; initialDeposit: number; locale: string; isDark?: boolean }>()
const emit = defineEmits<{ 'trade-click': [payload: { tradeId: string; event?: MouseEvent }] }>()
const { surface, hasTrades } = useAssetGraph(props, { onTradeClick: payload => emit('trade-click', payload) })
</script>
