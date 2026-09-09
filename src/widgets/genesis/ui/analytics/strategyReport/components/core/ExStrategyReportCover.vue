<script setup lang="ts">
import { computed } from 'vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useI18n } from '~/shared/i18n/useI18n'

const props = defineProps<{
  strategyName?: string
}>()

const { locale } = useI18n()
const authStore = useAuthStore()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const displayStrategyName = computed(() => props.strategyName?.trim() || label('Selected strategy', 'Выбранная стратегия'))
const displayUserName = computed(() => authStore.user?.displayName?.trim() || authStore.user?.email?.split('@')[0] || 'Trader')
const reportTitle = computed(() => `${displayUserName.value}'s TRADING REPORT`)
const reportDate = (() => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
})()
</script>

<template>
  <section id="report-cover" class="relative flex min-h-[calc(100vh-2rem)] flex-col justify-between overflow-hidden bg-transparent px-[clamp(1.5rem,7vw,8rem)] py-10 text-white sm:py-14">
    <div class="text-[9px] uppercase tracking-[0.18em] text-white/40">J.L. JÖRMUNGANDR</div>

    <div class="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-20">
      <div class="mb-8 font-serif text-[13px] font-normal uppercase tracking-[0.24em] text-white/75">{{ label('Personal report', 'Персональный отчёт') }}</div>
      <ExHeading level="h1" variant="cinematic" class="!max-w-5xl !text-3xl !font-light !leading-[1.15] !tracking-[0.14em] sm:!text-5xl lg:!text-6xl break-words [overflow-wrap:anywhere]">
        <span class="break-words">{{ displayUserName }}'s</span>
        <span class="inline-block whitespace-nowrap">TRADING REPORT</span>
      </ExHeading>
      <div class="mt-8 max-w-2xl text-base font-medium uppercase tracking-[0.2em] text-white/70 sm:text-xl">
        {{ label('Strategy performance analysis', 'Анализ результатов стратегии') }}
      </div>
      <div class="mt-5 max-w-3xl text-base font-light leading-relaxed text-white/55 sm:text-lg">{{ displayStrategyName }}</div>
    </div>

    <div class="absolute bottom-20 right-[clamp(1.5rem,7vw,8rem)] flex items-end gap-4 text-right">
      <img src="/assets/signature-dark.svg" alt="" aria-hidden="true" class="h-14 w-24 object-contain opacity-85 sm:h-16 sm:w-28" />
      <div>
        <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{{ label('Author', 'Автор') }}</div>
        <div class="mt-2 max-w-[200px] truncate text-lg font-normal text-white sm:max-w-[320px] sm:text-xl">{{ displayUserName }}</div>
      </div>
    </div>

    <div class="absolute inset-x-0 bottom-8 text-center font-serif text-[13px] font-normal tracking-[0.18em] text-white/80">{{ reportDate }}</div>
  </section>
</template>
