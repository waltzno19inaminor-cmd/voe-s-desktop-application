<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExFullAccessBadge from '~/shared/ui/ExFullAccessBadge.vue'
import { strategyReportSections } from '../../strategyReportSections'

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
const label = (en: string, ru: string) => isRu.value ? ru : en
const props = defineProps<{
  selectedSectionId: string | null
  lockedSectionIds?: string[]
}>()
const emit = defineEmits<{
  select: [sectionId: string | null]
}>()
const isActive = (sectionId: string | null) => props.selectedSectionId === sectionId
const isLocked = (sectionId: string) => props.lockedSectionIds?.includes(sectionId) === true
</script>

<template>
  <aside class="hidden w-[clamp(13rem,18vw,18rem)] shrink-0 overflow-y-auto border-r border-white/10 pr-5 lg:block xl:pr-8" :aria-label="label('Report navigation', 'Навигация отчёта')">
    <div class="sticky top-0 pb-8 pt-16">
      <div class="font-serif text-[11px] uppercase tracking-[0.2em] text-white/55">{{ label('Report navigation', 'Навигация отчёта') }}</div>
      <nav class="mt-7 space-y-1" :aria-label="label('Report contents', 'Оглавление отчёта')">
        <a
          href="#report-cover"
          class="group flex gap-3 border-l px-3 py-3 transition-colors hover:bg-white/[0.035]"
          :class="isActive(null) ? 'border-white bg-white/[0.05]' : 'border-transparent hover:border-white/55'"
          @click.prevent="emit('select', null)"
        >
          <span class="shrink-0 pt-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-white/45 group-hover:text-white/80">—</span>
          <span class="min-w-0">
            <span class="block font-mono text-[11px] font-semibold leading-snug tracking-[0.06em] text-white/78 group-hover:text-white">{{ label('Cover', 'Титульный лист') }}</span>
          </span>
        </a>
        <a
          v-for="section in strategyReportSections"
          :key="section.id"
          :href="`#report-section-${section.id}`"
          class="group relative flex gap-3 border-l px-3 py-3 transition-colors hover:bg-white/[0.035]"
          :class="isActive(section.id) ? 'border-white bg-white/[0.05]' : 'border-transparent hover:border-white/55'"
          :aria-label="isLocked(section.id)
            ? `${isRu ? section.title.ru : section.title.en}: ${label('available in the full version', 'доступно в полной версии')}`
            : undefined"
          @click.prevent="emit('select', section.id)"
        >
          <ExFullAccessBadge v-if="isLocked(section.id)" />
          <span class="shrink-0 pt-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-white/45 group-hover:text-white/80">{{ section.page }}</span>
          <span class="min-w-0">
            <span class="block font-mono text-[11px] font-semibold leading-snug tracking-[0.06em] text-white/78 group-hover:text-white">{{ isRu ? section.title.ru : section.title.en }}</span>
            <span class="mt-1.5 block font-serif text-xs leading-relaxed text-white/48">{{ isRu ? section.description.ru : section.description.en }}</span>
          </span>
        </a>
      </nav>
    </div>
  </aside>
</template>
