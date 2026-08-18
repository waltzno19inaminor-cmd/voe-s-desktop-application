<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPaywallOverlay from '~/widgets/genesis/ui/common/ExPaywallOverlay.vue'

const props = defineProps<{
  trade?: any
  metricsOnly?: boolean
}>()

const { locale } = useI18n()
const showPaywall = ref(false)

const title = computed(() => {
  if (props.metricsOnly) return locale.value === 'ru' ? 'МЕТРИКИ УДАЛЕНЫ' : 'METRICS REMOVED'
  const asset = String(props.trade?.asset || props.trade?.symbol || '').trim()
  return asset || (locale.value === 'ru' ? 'АНАЛИТИКА УДАЛЕНА' : 'ANALYTICS REMOVED')
})
</script>

<template>
  <div class="flex min-h-[220px] w-full items-center justify-center border border-black/10 p-8 text-center font-mono uppercase dark:border-white/10">
    <div class="max-w-xl">
      <div class="mx-auto mb-6 h-10 w-10 rotate-45 border border-current opacity-25"></div>
      <div class="text-[10px] font-black tracking-[0.36em] opacity-45">
        {{ title }}
      </div>
      <p class="mt-5 text-[12px] font-bold leading-loose tracking-[0.18em] opacity-65">
        {{ locale === 'ru'
          ? 'В demo-версии панели extra metrics и advanced metrics удалены вместе с расчетными файлами.'
          : 'Extra metrics and advanced metrics panels are removed from the demo build together with their calculation files.' }}
      </p>
      <button
        type="button"
        class="mt-7 border border-[#FF424D]/50 px-6 py-3 text-[9px] font-black uppercase tracking-[0.28em] text-[#FF424D] transition-colors hover:bg-[#FF424D]/10"
        @click="showPaywall = true"
      >
        {{ locale === 'ru' ? 'КУПИТЬ КЛЮЧ НА PATREON' : 'GET THE FULL APP ON PATREON' }}
      </button>
    </div>

    <ExPaywallOverlay :is-open="showPaywall" @close="showPaywall = false" />
  </div>
</template>
