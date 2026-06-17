<template>
  <ExPanel
    variant="light"
    :no-padding="true"
    :no-shadow="true"
    class="!h-[52rem] !max-h-[82vh] !bg-gray-50/50 dark:!bg-[#070707]/60 !border-black/10 dark:!border-white/10"
  >

    <div v-if="loading" class="shrink-0 border-b border-black/10 px-5 py-3 dark:border-white/10">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-2 w-2 animate-pulse rotate-45 bg-amber-500 dark:bg-amber-300"></div>
          <span class="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
            {{ locale === 'ru' ? 'Ищу совместимые стили и паттерны в исторических данных' : 'Matching style-compatible historical patterns' }}
          </span>
        </div>
        <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/45 dark:text-white/45">
          {{ locale === 'ru' ? 'загрузка' : 'loading' }}
        </span>
      </div>
      <div class="mt-3 h-[3px] overflow-hidden bg-black/8 dark:bg-white/10">
        <div class="forecast-loading-bar h-full w-[220%] bg-[linear-gradient(90deg,transparent_0%,rgba(245,158,11,0.2)_18%,rgba(245,158,11,1)_50%,rgba(0,0,0,0.25)_70%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,rgba(253,230,138,0.18)_18%,rgba(253,230,138,1)_50%,rgba(255,255,255,0.32)_70%,transparent_100%)]"></div>
      </div>
    </div>

    <div class="shrink-0 border-b border-black/10 px-5 py-2 dark:border-white/10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.28em] transition-colors"
              :class="activeTab === 'summary'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-transparent text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/5'"
              @click="activeTab = 'summary'"
            >
              {{ locale === 'ru' ? 'Сводка' : 'Summary' }}
            </button>
            <button
              type="button"
              class="px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.28em] transition-colors"
              :class="activeTab === 'settings'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-transparent text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/5'"
              @click="activeTab = 'settings'"
            >
              {{ locale === 'ru' ? 'Настройки' : 'Settings' }}
            </button>
          </div>

          <!-- Confidence telemetry badge -->
          <div class="flex items-center gap-2 border nier-border-primary px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02]">
            <div class="h-1.5 w-1.5 rotate-45 bg-black/40 dark:bg-white/40"></div>
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.25em]" :class="confidenceClass">
              {{ confidenceLabel }}
            </span>
          </div>
        </div>

        <label class="flex cursor-pointer items-center gap-2 select-none">
          <input
            v-model="includeAverageRR"
            type="checkbox"
            class="peer sr-only"
          >
          <span
            class="flex h-5 w-5 items-center justify-center border border-black/20 bg-white transition-colors dark:border-white/25 dark:bg-black/40"
            :class="includeAverageRR
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-white text-transparent dark:bg-black/40'"
          >
            <svg
              viewBox="0 0 12 12"
              class="h-3 w-3"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.2 6.2L4.7 8.7L9.8 3.4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-black/60 dark:text-white/60">
            {{ locale === 'ru' ? 'Учитывать Avg RR' : 'Include Avg RR' }}
          </span>
        </label>
      </div>
    </div>

    <div
      v-if="forecast.status === 'insufficient-data'"
      class="shrink-0 border-b border-black/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-600 dark:border-white/10 dark:text-amber-300"
    >
      {{ forecast.message }}
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-0 pb-6 custom-scrollbar">
      <template v-if="activeTab === 'summary'">
      <div class="grid grid-cols-1 gap-0">
        <div class="border-b border-black/10 px-5 py-4 dark:border-white/10">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Вероятный итог' : 'Likely outcome' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ formatMoney(forecast.currentCapital) }}
            </span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Вероятный итог за 10 сделок' : 'Likely outcome over 10 trades' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p50 ?? 0, forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Вероятный итог за 20 сделок' : 'Likely outcome over 20 trades' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercentWithCapital(forecast.tactical.horizons[1]?.p50 ?? 0, forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Похожесть на прибыльные истории' : 'Similarity to profitable histories' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.lifecycle.affinityAbove30, false) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Шанс завершиться в плюсе' : 'Chance to finish in profit' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.lifecycle.affinityPositive, false) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-black/10 px-5 py-4 dark:border-white/10">
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
            {{ locale === 'ru' ? 'Тактическое продолжение после похожих фаз' : 'Tactical continuation after similar phases' }}
          </span>
          <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
            {{ `${forecast.tactical.matchesCount} matches / ${forecast.tactical.sourceFilesCount} files` }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="horizon in forecast.tactical.horizons"
            :key="horizon.horizonTrades"
            class="border border-black/10 px-4 py-4 dark:border-white/10"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-mono text-[8px] font-black uppercase tracking-[0.25em] nier-text-primary">
                {{ horizon.horizonTrades }}T
              </span>
              <span class="font-mono text-[8px] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                {{ locale === 'ru' ? 'Вероятное продолжение' : 'Likely continuation' }}
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div class="font-mono text-[7px] uppercase tracking-[0.25em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Вероятный итог' : 'Likely outcome' }}
              </div>
              <div class="mt-1 font-mono text-lg font-black nier-text-primary">
                  {{ formatPercentWithCapital(horizon.p50, forecast.currentCapital) }}
              </div>
            </div>
            <div>
              <div class="font-mono text-[7px] uppercase tracking-[0.25em] text-black/35 dark:text-white/35">
                  {{ locale === 'ru' ? 'Шанс на прибыль' : 'Profit chance' }}
                </div>
                <div class="mt-1 font-mono text-lg font-black nier-text-primary">
                  {{ formatPercent(horizon.probabilityPositive, false) }}
                </div>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-1">
              <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
                {{ locale === 'ru' ? 'Вероятный максимум по пути' : 'Likely peak along the way' }}:
                {{ formatPercentWithCapital(horizon.medianPeakPct, forecast.currentCapital) }}
              </div>
              <div class="font-mono text-[10px] text-red-600 dark:text-red-300">
                {{ locale === 'ru' ? 'Вероятная просадка по пути' : 'Likely drawdown along the way' }}:
                {{ formatPercentWithCapital(horizon.medianTroughPct, forecast.currentCapital) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-black/10 px-5 py-4 dark:border-white/10">
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
            {{ locale === 'ru' ? 'Итоговая близость по финальным исходам' : 'Terminal outcome affinity' }}
          </span>
          <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
            {{ locale === 'ru' ? 'от текущего паттерна до конца периода торговли' : 'from current pattern to the end of the trading period' }}
          </span>
        </div>

        <div class="mt-4 border border-black/10 px-4 py-4 dark:border-white/10">
          <div class="font-mono text-[8px] uppercase tracking-[0.28em] text-black/35 dark:text-white/35">
            {{ locale === 'ru' ? 'Ключевой вывод' : 'Key takeaway' }}
          </div>
          <div class="mt-2 font-mono text-sm font-black nier-text-primary">
            {{ lifecycleSummary }}
          </div>
          <div class="mt-2 grid grid-cols-1 gap-1 md:grid-cols-3">
            <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Похожесть на прибыльные истории' : 'Similarity to profitable histories' }}:
              {{ formatPercent(forecast.lifecycle.affinityAbove30, false) }}
            </div>
            <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Шанс завершиться в плюсе' : 'Chance to finish in profit' }}:
              {{ formatPercent(forecast.lifecycle.affinityPositive, false) }}
            </div>
            <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Вероятный остаток пути' : 'Likely remaining path' }}:
              {{ formatPercent(forecast.lifecycle.medianContinuationToEndPct) }}
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div
            v-for="group in forecast.lifecycle.groups"
            :key="group.key"
            class="border border-black/10 px-3 py-3 dark:border-white/10"
            :class="topLifecycleGroupKeys.has(group.key)
              ? 'bg-white text-black dark:bg-white dark:text-black'
              : ''"
          >
            <div class="font-mono text-[8px] font-black uppercase tracking-[0.22em]" :class="topLifecycleGroupKeys.has(group.key) ? 'text-black' : 'nier-text-primary'">
              {{ group.label }}
            </div>
            <div class="mt-2 font-mono text-base font-black" :class="topLifecycleGroupKeys.has(group.key) ? 'text-black' : 'nier-text-primary'">
              {{ formatPercent(group.affinityScore, false) }}
            </div>
            <div class="mt-1 font-mono text-[10px]" :class="topLifecycleGroupKeys.has(group.key) ? 'text-black/55' : 'text-black/40 dark:text-white/40'">
              {{ group.matchesCount }} matches
            </div>
          </div>
        </div>
      </div>
      </template>

      <template v-else>
        <div class="border-b border-black/10 px-5 py-4 dark:border-white/10">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Стиль торговли' : 'Trading style' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ forecast.styleProfile.styleLabel }}
            </span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Средний duration' : 'Avg duration' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatHours(forecast.styleProfile.averageDurationHours) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Median abs / trade' : 'Median abs / trade' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.styleProfile.medianAbsReturnPct, false) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Сделок в неделю' : 'Trades / week' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatNumber(forecast.styleProfile.tradeFrequencyPerWeek, 1) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Текущий капитал' : 'Current capital' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatMoney(forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                Avg RR
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatNumber(forecast.styleProfile.averageRR, 2) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Вероятный диапазон результата' : 'Likely result range' }}
              </div>
              <div class="mt-2 font-mono text-[10px] font-black nier-text-primary">
                {{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p25 ?? 0, forecast.currentCapital) }}
                ...
                {{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p75 ?? 0, forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div class="font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                {{ locale === 'ru' ? 'Простой расчет по текущему профилю' : 'Simple estimate from current profile' }}
              </div>
              <div class="mt-2 font-mono text-[10px] font-black nier-text-primary">
                {{ formatPercentWithCapital(forecast.tactical.horizons[0]?.userLinearEstimatePct ?? 0, forecast.currentCapital) }}
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Паттерн пользователя' : 'User pattern' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ forecast.currentPattern.sequenceLabel }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
              v-for="(block, index) in forecast.currentPattern.blocks"
              :key="`user-${block.phase}-${index}`"
              class="border border-black/10 px-4 py-4 dark:border-white/10"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="font-mono text-[8px] font-black uppercase tracking-[0.24em]" :class="phaseClass(block.phase)">
                  {{ phaseLabel(block.phase) }}
                </span>
                <span class="font-mono text-[8px] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                  {{ block.tradeCount }}T
                </span>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-1">
                <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
                  {{ locale === 'ru' ? 'Результат' : 'Return' }}: {{ formatPercent(block.returnPct) }}
                </div>
                <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
                  Duration: {{ formatHours(block.averageDurationHours) }}
                </div>
                <div class="font-mono text-[10px] text-black/45 dark:text-white/45">
                  WR: {{ formatPercent(block.winRate, false) }}
                </div>
                <div class="font-mono text-[10px] text-black/35 dark:text-white/35">
                  {{ formatCloseRange(block.firstCloseTimestamp, block.lastCloseTimestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-black/10 px-5 py-4 dark:border-white/10">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Лучшие исторические совпадения' : 'Best historical matches' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ locale === 'ru' ? 'стиль + паттерн' : 'style + pattern' }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="(match, index) in forecast.topMatches"
            :key="`${match.sourceFile}-${index}`"
            class="border border-black/10 px-4 py-4 dark:border-white/10"
            :class="index < 2 ? 'bg-black text-white dark:bg-black dark:text-white' : ''"
          >
              <div class="flex items-center justify-between gap-3">
                <div class="flex flex-col">
                  <span class="font-mono text-[8px] font-black uppercase tracking-[0.22em]" :class="index < 2 ? 'text-white' : 'nier-text-primary'">
                    {{ index + 1 }}
                  </span>
                </div>
                <span class="font-mono text-[8px] uppercase tracking-[0.22em]" :class="index < 2 ? 'text-white/80' : 'text-black/40 dark:text-white/40'">
                  {{ match.matchedPhaseLabel }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Стиль' : 'Style' }}: {{ formatPercent(match.styleScore, false) }}
                </div>
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Паттерн' : 'Pattern' }}: {{ formatPercent(match.patternScore, false) }}
                </div>
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Через 10 сделок' : '+10T' }}: {{ formatPercent(match.continuation10Pct) }}
                </div>
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Через 20 сделок' : '+20T' }}: {{ formatPercent(match.continuation20Pct) }}
                </div>
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white' : 'nier-text-primary'">
                  {{ locale === 'ru' ? 'До конца' : 'End' }}: {{ formatPercent(match.continuationToEndPct) }}
                </div>
                <div class="font-mono text-[10px]" :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Итог файла' : 'File total' }}: {{ formatPercent(match.totalFileReturnPct) }}
                </div>
                <div
                  v-if="includeAverageRR"
                  class="font-mono text-[10px]"
                  :class="index < 2 ? 'text-white/80' : 'text-black/45 dark:text-white/45'"
                >
                  Avg RR: {{ formatNumber(match.matchedAverageRR, 2) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </ExPanel>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { loadFromDisk, saveToDisk } from '~/shared/diskStorage'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import {
  calculatePatternForecast,
  createEmptyPatternForecast
} from '~/widgets/genesis/model/patternForecast'
import type { PatternForecastResult } from '~/widgets/genesis/model/patternForecast'
import type { DiaryEntry } from '~/entities/diary/model/diary.types'

const props = defineProps<{
  visible: boolean
  trades: DiaryEntry[]
  initialCapital: number
  strategyId: string
  strategyName: string
}>()

const emit = defineEmits<{
  (e: 'loading-change', value: boolean): void
}>()

const { locale } = useI18n()

const loading = ref(false)
const forecast = ref<PatternForecastResult>(createEmptyPatternForecast())
const activeTab = ref<'summary' | 'settings'>('summary')
const includeAverageRR = ref(false)
let requestId = 0

const persistPatternForecastSnapshot = async (result: PatternForecastResult) => {
  const savedAt = new Date().toISOString()
  const fileName = `pattern_forecast_${sanitizeFileSegment(props.strategyId)}_${Date.now()}`
  const snapshot = {
    savedAt,
    strategyId: props.strategyId,
    strategyName: props.strategyName,
    tradeCount: props.trades.length,
    initialCapital: props.initialCapital,
    forecast: result
  }

  await saveToDisk(fileName, snapshot)

  const existingIndex = await loadFromDisk<any[]>('pattern_forecast_index_v1')
  const index = Array.isArray(existingIndex) ? existingIndex : []
  index.push({
    savedAt,
    fileName,
    strategyId: props.strategyId,
    strategyName: props.strategyName,
    tradeCount: props.trades.length,
    confidence: result.confidence,
    strongestGroup: result.lifecycle.strongestGroupLabel,
    strongestGroupAffinity: result.lifecycle.strongestGroupAffinity
  })
  await saveToDisk('pattern_forecast_index_v1', index.slice(-250))
}

const refreshForecast = async () => {
  if (!props.visible) return

  const nextRequestId = requestId + 1
  requestId = nextRequestId

  loading.value = true
  emit('loading-change', true)
  forecast.value = createEmptyPatternForecast({
    message: locale.value === 'ru'
      ? 'Ищу совместимые стили и паттерны в исторических данных.'
      : 'Matching style-compatible historical patterns.'
  })

  try {
    const result = await calculatePatternForecast({
      trades: props.trades,
      initialCapital: props.initialCapital,
      includeAverageRR: includeAverageRR.value
    })

    if (requestId === nextRequestId) {
      forecast.value = result.status === 'insufficient-data'
        ? {
            ...result,
            message: locale.value === 'ru'
              ? 'Пока недостаточно закрытых сделок, чтобы определить стабильный структурный паттерн.'
              : result.message
          }
        : result
      if (result.status === 'ready') {
        await persistPatternForecastSnapshot(result)
      }
    }
  } catch (error) {
    if (requestId === nextRequestId) {
      forecast.value = createEmptyPatternForecast({
        message: locale.value === 'ru'
          ? 'Не удалось собрать structural pattern forecast.'
          : 'Unable to build the structural pattern forecast.'
      })
    }
  } finally {
    if (requestId === nextRequestId) {
      loading.value = false
      emit('loading-change', false)
    }
  }
}

watch(
  () => [props.visible, props.strategyId, props.initialCapital, props.trades, locale.value, includeAverageRR.value],
  () => {
    if (props.visible) {
      void refreshForecast()
    } else {
      emit('loading-change', false)
    }
  },
  { deep: true, immediate: true }
)

onUnmounted(() => {
  emit('loading-change', false)
})

watch(() => props.visible, (visible) => {
  if (!visible) {
    activeTab.value = 'summary'
  }
})

const confidenceLabel = computed(() => {
  if (locale.value === 'ru') {
    if (forecast.value.confidence === 'high') return 'Высокая уверенность'
    if (forecast.value.confidence === 'medium') return 'Средняя уверенность'
    return 'Низкая уверенность'
  }

  if (forecast.value.confidence === 'high') return 'High confidence'
  if (forecast.value.confidence === 'medium') return 'Medium confidence'
  return 'Low confidence'
})

const confidenceClass = computed(() => {
  if (forecast.value.confidence === 'high') return 'text-emerald-600 dark:text-emerald-300'
  if (forecast.value.confidence === 'medium') return 'text-amber-600 dark:text-amber-300'
  return 'text-red-600 dark:text-red-300'
})

const topLifecycleGroupKeys = computed(() => {
  return new Set(
    forecast.value.lifecycle.groups
      .slice()
      .sort((left, right) => right.affinityScore - left.affinityScore)
      .slice(0, 2)
      .map((group) => group.key)
  )
})

const lifecycleSummary = computed(() => {
  if (locale.value === 'ru') {
    return `Ваша торговая история ближе всего к фазам, которые в итоге заканчивались с результатом ${forecast.value.lifecycle.strongestGroupLabel} со сходством ${formatPercent(forecast.value.lifecycle.strongestGroupAffinity, false)}.`
  }
  return `The current profile is closest to phases that eventually finished in the ${forecast.value.lifecycle.strongestGroupLabel} group with ${formatPercent(forecast.value.lifecycle.strongestGroupAffinity, false)} affinity.`
})

const formatNumber = (value: number, digits = 1) => {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
}

const formatPercent = (value: number, signed = true) => {
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, 1)}%`
}

const formatPercentWithCapital = (value: number, capital: number) => {
  const percent = formatPercent(value)
  const projectedCapital = Number.isFinite(capital) ? capital * (1 + value / 100) : Number.NaN
  if (!Number.isFinite(projectedCapital)) return percent
  return `${percent} (${formatMoney(projectedCapital)})`
}

const formatMoney = (value: number) => {
  const sign = value < 0 ? '-$' : '$'
  return `${sign}${formatNumber(Math.abs(value), 0)}`
}

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0H'
  if (hours >= 24) {
    return `${formatNumber(hours / 24, 1)}D`
  }
  return `${formatNumber(hours, 1)}H`
}

const formatCloseRange = (firstTimestamp: number, lastTimestamp: number) => {
  if (!Number.isFinite(firstTimestamp) || !Number.isFinite(lastTimestamp)) {
    return locale.value === 'ru' ? 'Даты закрытия: n/a' : 'Close dates: n/a'
  }

  const formatter = new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  const first = formatter.format(new Date(firstTimestamp))
  const last = formatter.format(new Date(lastTimestamp))

  return locale.value === 'ru'
    ? `Закрытия: ${first} -> ${last}`
    : `Closes: ${first} -> ${last}`
}

const phaseLabel = (phase: string) => {
  if (locale.value === 'ru') {
    if (phase === 'impulse-up') return 'Импульс роста'
    if (phase === 'drawdown') return 'Просадка'
    if (phase === 'recovery') return 'Восстановление'
    return 'Диапазон'
  }

  if (phase === 'impulse-up') return 'Impulse up'
  if (phase === 'drawdown') return 'Drawdown'
  if (phase === 'recovery') return 'Recovery'
  return 'Range'
}

const phaseClass = (phase: string) => {
  if (phase === 'impulse-up') return 'text-emerald-600 dark:text-emerald-300'
  if (phase === 'drawdown') return 'text-red-600 dark:text-red-300'
  if (phase === 'recovery') return 'text-sky-600 dark:text-sky-300'
  return 'text-amber-600 dark:text-amber-300'
}

function sanitizeFileSegment(value: string) {
  return String(value || 'strategy').replace(/[^a-zA-Z0-9_-]+/g, '_')
}
</script>

<style scoped>
.forecast-loading-bar {
  animation: forecast-loading-shift 1.1s linear infinite;
  transform: translateX(-55%);
}

@keyframes forecast-loading-shift {
  0% {
    transform: translateX(-55%);
  }

  100% {
    transform: translateX(0%);
  }
}
</style>
