<script setup lang="ts">
import { computed } from 'vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { strategyReportSections } from '../../strategyReportSections'

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const sections = strategyReportSections
</script>

<template>
  <section id="report-contents" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="flex items-end justify-between gap-6 pb-6">
      <div>
        <div class="mb-5 font-serif text-[13px] font-normal uppercase tracking-[0.24em] text-white/75">{{ label('Report navigation', 'Навигация отчёта') }}</div>
        <ExHeading level="h2" variant="cinematic" class="!text-4xl !leading-tight !tracking-[0.16em] sm:!text-6xl">{{ label('Contents', 'Оглавление') }}</ExHeading>
      </div>
      <div class="hidden text-right font-serif text-[13px] font-normal uppercase tracking-[0.18em] text-white/65 sm:block">{{ label('Sections / pages', 'Разделы / страницы') }}</div>
    </div>

    <nav class="mt-10 space-y-2" :aria-label="label('Report contents', 'Оглавление отчёта')">
      <a v-for="section in sections" :key="section.id" :href="`#report-section-${section.id}`" class="group grid grid-cols-[3rem_minmax(0,1fr)] gap-5 px-4 py-5 transition-colors hover:bg-white/[0.035] sm:grid-cols-[4rem_minmax(0,1fr)_minmax(12rem,0.7fr)] sm:gap-8">
        <span class="font-mono text-[11px] font-semibold tracking-[0.2em] text-white/65">{{ section.page }}</span>
        <span class="min-w-0">
          <span class="block text-base font-medium uppercase tracking-[0.14em] text-white/90 transition-opacity group-hover:opacity-60 sm:text-lg">{{ isRu ? section.title.ru : section.title.en }}</span>
          <span class="mt-3 block max-w-2xl font-serif text-sm font-normal normal-case leading-relaxed tracking-normal text-white/70 sm:text-base">{{ isRu ? section.description.ru : section.description.en }}</span>
        </span>
        <span class="hidden self-center text-right text-[10px] font-medium uppercase tracking-[0.16em] text-white/55 sm:block">{{ label('Open section →', 'Открыть раздел →') }}</span>
      </a>
    </nav>
  </section>
</template>
