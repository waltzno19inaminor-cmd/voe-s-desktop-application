<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExStrategyReportPageNumber from '../auxiliary/ExStrategyReportPageNumber.vue'
import ExStrategyReportSectionHeading from '../auxiliary/ExStrategyReportSectionHeading.vue'
import ExStrategyReportSectionSubheading from '../auxiliary/ExStrategyReportSectionSubheading.vue'

const { locale } = useI18n()
const isRu = computed(() => locale.value === 'ru')
</script>

<template>
  <section id="report-section-profits-losses" class="min-h-screen px-[clamp(1.5rem,7vw,8rem)] py-16 text-white sm:py-24">
    <div class="mx-auto max-w-5xl">
      <ExStrategyReportPageNumber page="01" total="08" />
      <div class="mt-12">
        <ExStrategyReportSectionHeading>{{ isRu ? 'Прибыли и убытки' : 'Profits & Losses' }}</ExStrategyReportSectionHeading>
        <ExStrategyReportSectionSubheading muted>{{ isRu ? 'Состав и структура наблюдаемого торгового результата.' : 'Composition and structure of the observed trading result.' }}</ExStrategyReportSectionSubheading>
      </div>
    </div>
  </section>
</template>
