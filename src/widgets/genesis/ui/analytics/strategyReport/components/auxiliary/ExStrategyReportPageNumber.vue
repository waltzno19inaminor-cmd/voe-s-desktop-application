<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const props = defineProps<{
  page: string | number
  total?: string | number
  label?: string
}>()

const { locale } = useI18n()
const pageLabel = computed(() => props.label || (locale.value === 'ru' ? 'Страница' : 'Page'))
</script>

<template>
  <div class="flex items-baseline gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
    <span>{{ pageLabel }}</span>
    <span class="text-white">{{ String(page).padStart(2, '0') }}</span>
    <span v-if="total" class="text-white/40">/ {{ String(total).padStart(2, '0') }}</span>
  </div>
</template>
