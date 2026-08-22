<template>
  <ExPanel
    variant="light"
    :no-padding="true"
    :no-shadow="true"
    :class="props.compactNavigation
      ? 'compact-forecast-panel !h-auto !max-h-none !border-0 !bg-transparent !shadow-none'
      : '!h-[52rem] !max-h-[82vh] !bg-gray-50/50 dark:!bg-[#070707]/60 !border-black/10 dark:!border-white/10'"
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

    <div v-if="!props.compactNavigation" class="shrink-0 border-b border-black/10 px-5 py-2 dark:border-white/10">
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
        <div :class="props.compactNavigation ? 'px-0 py-4' : 'border-b border-black/10 px-5 py-4 dark:border-white/10'">
          <div v-if="props.compactNavigation" class="mb-6">
            <div>
              <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">I.</div>
              <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
                {{ locale === 'ru' ? 'ВЕРОЯТНЫЙ ИТОГ' : 'LIKELY OUTCOME' }}
              </h2>
            </div>
            <div class="mt-4 flex flex-col items-start gap-1">
              <span class="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
                {{ locale === 'ru' ? 'ТЕКУЩИЙ КАПИТАЛ' : 'CURRENT CAPITAL' }}
              </span>
              <span class="font-mono text-xl font-black tracking-[0.08em] nier-text-primary md:text-2xl">
                {{ formatMoney(forecast.currentCapital) }}
              </span>
            </div>
          </div>
          <div v-else class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Вероятный итог' : 'Likely outcome' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ formatMoney(forecast.currentCapital) }}
            </span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px]'"
              >
                {{ locale === 'ru' ? 'ВЕРОЯТНЫЙ РЕЗУЛЬТАТ ЧЕРЕЗ 10 СДЕЛОК' : 'LIKELY RESULT AFTER 10 TRADES' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black" :class="forecastValueClass(forecast.tactical.horizons[0]?.p50 ?? 0)">
                {{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p50 ?? 0, forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px]'"
              >
                {{ locale === 'ru' ? 'ВЕРОЯТНЫЙ РЕЗУЛЬТАТ ЧЕРЕЗ 20 СДЕЛОК' : 'LIKELY RESULT AFTER 20 TRADES' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black" :class="forecastValueClass(forecast.tactical.horizons[1]?.p50 ?? 0)">
                {{ formatPercentWithCapital(forecast.tactical.horizons[1]?.p50 ?? 0, forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px]'"
              >
                {{ locale === 'ru' ? 'СХОЖЕСТЬ С ПРИБЫЛЬНЫМИ ТРЕЙДЕРАМИ' : 'SIMILARITY TO PROFITABLE TRADERS' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.lifecycle.affinityAbove30, false) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px]'"
              >
                {{ locale === 'ru' ? 'ВЕРОЯТНОСТЬ ВЫЙТИ В ПЛЮС' : 'PROBABILITY OF FINISHING IN PROFIT' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.lifecycle.affinityPositive, false) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div :class="props.compactNavigation ? 'px-0 py-4' : 'border-t border-black/10 px-5 py-4 dark:border-white/10'">
        <div v-if="props.compactNavigation" class="mb-6 flex items-end justify-between gap-4">
          <div>
            <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">II.</div>
            <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
              {{ locale === 'ru' ? 'ТАКТИЧЕСКОЕ ПРОДОЛЖЕНИЕ' : 'TACTICAL CONTINUATION' }}
            </h2>
          </div>
          <span v-if="!props.compactNavigation" class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
            {{ locale === 'ru'
              ? `${forecast.tactical.matchesCount} совпадений / ${forecast.tactical.sourceFilesCount} файлов`
              : `${forecast.tactical.matchesCount} matches / ${forecast.tactical.sourceFilesCount} files` }}
          </span>
        </div>
        <div v-else class="flex items-center justify-between gap-3">
          <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
            {{ locale === 'ru' ? 'Тактическое продолжение после похожих фаз' : 'Tactical continuation after similar phases' }}
          </span>
          <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
            {{ locale === 'ru'
              ? `${forecast.tactical.matchesCount} совпадений / ${forecast.tactical.sourceFilesCount} файлов`
              : `${forecast.tactical.matchesCount} matches / ${forecast.tactical.sourceFilesCount} files` }}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="horizon in forecast.tactical.horizons"
            :key="horizon.horizonTrades"
            class="border border-black/10 px-4 dark:border-white/10"
            :class="props.compactNavigation ? 'py-2' : 'py-4'"
          >
            <div class="flex items-center justify-between gap-3">
              <span v-if="!props.compactNavigation" class="font-mono text-[8px] font-black uppercase tracking-[0.25em] nier-text-primary">
                {{ horizon.horizonTrades }}T
              </span>
              <span v-if="!props.compactNavigation" class="font-mono text-[8px] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                {{ locale === 'ru' ? 'Вероятное продолжение' : 'Likely continuation' }}
              </span>
            </div>
            <div :class="props.compactNavigation ? 'mt-1' : 'mt-3'" class="grid grid-cols-2 gap-3">
            <div>
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px] tracking-[0.25em] text-black/35 dark:text-white/35'"
              >
                {{ locale === 'ru' ? 'Вероятный итог' : 'Likely outcome' }}
              </div>
              <div class="mt-1 font-mono text-lg font-black" :class="forecastValueClass(horizon.p50)">
                  {{ formatPercentWithCapital(horizon.p50, forecast.currentCapital) }}
              </div>
            </div>
            <div>
              <div
                class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
                :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[7px] tracking-[0.25em] text-black/35 dark:text-white/35'"
              >
                  {{ locale === 'ru' ? 'Шанс на прибыль' : 'Profit chance' }}
                </div>
                <div class="mt-1 font-mono text-lg font-black" :class="forecastValueClass(horizon.probabilityPositive)">
                  {{ formatPercent(horizon.probabilityPositive, false) }}
                </div>
              </div>
            </div>
            <div :class="props.compactNavigation ? 'mt-2' : 'mt-3'" class="grid grid-cols-1 gap-1">
              <div
                class="font-mono text-black/45 dark:text-white/45"
                :class="props.compactNavigation ? 'text-[11px] font-black uppercase tracking-[0.18em] leading-relaxed' : 'text-[10px]'"
              >
                {{ locale === 'ru' ? 'Вероятный максимум по пути' : 'Likely peak along the way' }}:
                <span :class="forecastValueClass(horizon.medianPeakPct)">{{ formatPercentWithCapital(horizon.medianPeakPct, forecast.currentCapital) }}</span>
              </div>
              <div
                class="font-mono text-red-600 dark:text-red-300"
                :class="props.compactNavigation ? 'text-[11px] font-black uppercase tracking-[0.18em] leading-relaxed' : 'text-[10px]'"
              >
                {{ locale === 'ru' ? 'Вероятная просадка по пути' : 'Likely drawdown along the way' }}:
                <span :class="forecastValueClass(horizon.medianTroughPct)">{{ formatPercentWithCapital(horizon.medianTroughPct, forecast.currentCapital) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div :class="props.compactNavigation ? 'px-0 py-4' : 'border-t border-black/10 px-5 py-4 dark:border-white/10'">
        <div v-if="props.compactNavigation" class="mb-6">
          <div>
            <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">III.</div>
            <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
              {{ locale === 'ru' ? 'ИТОГОВАЯ БЛИЗОСТЬ' : 'TERMINAL AFFINITY' }}
            </h2>
          </div>
          <div class="mt-4 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
            {{ locale === 'ru' ? 'ФИНАЛЬНЫЕ ВЫВОДЫ' : 'FINAL CONCLUSIONS' }}
          </div>
        </div>
        <div v-else class="flex items-center justify-between gap-3">
          <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
            {{ locale === 'ru' ? 'Итоговая близость по финальным исходам' : 'Terminal outcome affinity' }}
          </span>
          <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
            {{ locale === 'ru' ? 'от текущего паттерна до конца периода торговли' : 'from current pattern to the end of the trading period' }}
          </span>
        </div>

        <div class="mt-4 border border-black/10 px-4 py-4 dark:border-white/10">
          <div
            class="font-mono uppercase tracking-[0.18em] text-black/55 dark:text-white/55"
            :class="props.compactNavigation ? 'text-[11px] font-black leading-relaxed' : 'text-[8px] tracking-[0.28em] text-black/35 dark:text-white/35'"
          >
            {{ locale === 'ru' ? 'Ключевой вывод' : 'Key takeaway' }}
          </div>
          <div class="mt-2 font-mono text-sm font-black nier-text-primary">
            {{ lifecycleSummary }}
          </div>
        </div>

        <div v-if="props.compactNavigation" class="mt-6 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
          {{ locale === 'ru' ? 'СХОДСТВА С ДРУГИМИ ТРЕЙДЕРАМИ' : 'SIMILARITIES WITH OTHER TRADERS' }}
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
            <div
              class="font-mono font-black uppercase tracking-[0.18em]"
              :class="[
                props.compactNavigation ? 'text-[11px] leading-relaxed' : 'text-[8px] tracking-[0.22em]',
                topLifecycleGroupKeys.has(group.key) ? 'text-black' : 'nier-text-primary'
              ]"
            >
              {{ formatOutcomeGroupLabel(group.label) }}
            </div>
            <div class="mt-2 font-mono text-base font-black" :class="topLifecycleGroupKeys.has(group.key) ? 'text-black' : 'nier-text-primary'">
              {{ formatPercent(group.affinityScore, false) }}
            </div>
            <div
              class="mt-1 font-mono"
              :class="[
                props.compactNavigation ? 'text-[11px] font-black tracking-[0.18em]' : 'text-[10px]',
                topLifecycleGroupKeys.has(group.key) ? 'text-black/55' : 'text-black/40 dark:text-white/40'
              ]"
            >
              {{ group.matchesCount }} {{ locale === 'ru' ? 'совпадений' : 'matches' }}
            </div>
          </div>
        </div>
      </div>
      </template>

      <template v-else>
        <div :class="props.compactNavigation ? 'px-0 py-4' : 'border-b border-black/10 px-5 py-4 dark:border-white/10'">
          <div v-if="props.compactNavigation" class="mb-6 flex items-end justify-between gap-4">
            <div>
              <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">I.</div>
              <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
                {{ locale === 'ru' ? 'СТИЛЬ ТОРГОВЛИ' : 'TRADING STYLE' }}
              </h2>
            </div>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ tradingStyleLabel(forecast.styleProfile.styleLabel) }}
            </span>
          </div>
          <div v-else class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Стиль торговли' : 'Trading style' }}
            </span>
            <span class="font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40">
              {{ tradingStyleLabel(forecast.styleProfile.styleLabel) }}
            </span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Средняя длительность' : 'Avg duration' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatHours(forecast.styleProfile.averageDurationHours) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Медианный абсолютный результат / сделка' : 'Median abs / trade' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatPercent(forecast.styleProfile.medianAbsReturnPct, false) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Сделок в неделю' : 'Trades / week' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatNumber(forecast.styleProfile.tradeFrequencyPerWeek, 1) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Текущий капитал' : 'Current capital' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black" :class="forecastValueClass(forecast.currentCapital)">
                {{ formatMoney(forecast.currentCapital) }}
              </div>
            </div>
            <div class="border border-black/10 px-3 py-3 dark:border-white/10">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Средний RR' : 'Avg RR' }}
              </div>
              <div class="mt-2 font-mono text-sm font-black nier-text-primary">
                {{ formatNumber(forecast.styleProfile.averageRR, 2) }}
              </div>
            </div>
            <div class="col-span-2 border border-black/10 px-3 py-3 dark:border-white/10 md:col-span-5">
              <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/55 dark:text-white/55' : 'font-mono text-[7px] uppercase tracking-[0.3em] text-black/35 dark:text-white/35'">
                {{ locale === 'ru' ? 'Вероятный диапазон результата' : 'Likely result range' }}
              </div>
              <div
                class="mt-2 min-w-0 max-w-full whitespace-normal break-words font-mono font-black nier-text-primary"
                :class="likelyRangeValueClass"
              >
                <span :class="forecastValueClass(Math.min(forecast.tactical.horizons[0]?.p25 ?? 0, forecast.tactical.horizons[0]?.p75 ?? 0))">{{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p25 ?? 0, forecast.currentCapital) }}</span>
                ...
                <span :class="forecastValueClass(forecast.tactical.horizons[0]?.p75 ?? 0)">{{ formatPercentWithCapital(forecast.tactical.horizons[0]?.p75 ?? 0, forecast.currentCapital) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div :class="props.compactNavigation ? 'px-0 py-4' : 'px-5 py-4'">
          <div v-if="props.compactNavigation" class="mb-6 flex items-end justify-between gap-4">
            <div>
              <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">II.</div>
              <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
                {{ locale === 'ru' ? 'ПАТТЕРН ПОЛЬЗОВАТЕЛЯ' : 'USER PATTERN' }}
              </h2>
            </div>
          </div>
          <div v-else class="flex items-center justify-between gap-3">
            <span class="font-mono text-[8px] font-black uppercase tracking-[0.35em] text-black/45 dark:text-white/45">
              {{ locale === 'ru' ? 'Паттерн пользователя' : 'User pattern' }}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
              v-for="(block, index) in forecast.currentPattern.blocks"
              :key="`user-${block.phase}-${index}`"
              class="border border-black/10 px-4 py-4 dark:border-white/10"
            >
              <div class="flex items-center justify-between gap-3">
                <span
                  class="font-mono uppercase tracking-[0.2em]"
                  :class="[
                    phaseClass(block.phase),
                    props.compactNavigation ? 'text-[11px] font-black' : 'text-[8px] font-black tracking-[0.24em]'
                  ]"
                >
                  {{ phaseLabel(block.phase) }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-1">
                <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black text-black/60 dark:text-white/60' : 'font-mono text-[10px] text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Результат' : 'Return' }}:
                  <span :class="forecastValueClass(block.returnPct)">{{ formatPercent(block.returnPct) }}</span>
                </div>
                <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black text-black/60 dark:text-white/60' : 'font-mono text-[10px] text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Длительность' : 'Duration' }}: {{ formatHours(block.averageDurationHours) }}
                </div>
                <div :class="props.compactNavigation ? 'font-mono text-[11px] font-black text-black/60 dark:text-white/60' : 'font-mono text-[10px] text-black/45 dark:text-white/45'">
                  {{ locale === 'ru' ? 'Доля прибыльных' : 'Win rate' }}: {{ formatPercent(block.winRate, false) }}
                </div>
                <div :class="props.compactNavigation ? 'font-mono text-[10px] font-black text-black/50 dark:text-white/50' : 'font-mono text-[10px] text-black/35 dark:text-white/35'">
                  {{ formatCloseRange(block.firstCloseTimestamp, block.lastCloseTimestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div :class="props.compactNavigation ? 'px-0 py-4' : 'border-t border-black/10 px-5 py-4 dark:border-white/10'">
          <div v-if="props.compactNavigation" class="mb-6 flex items-end justify-between gap-4">
            <div>
              <div class="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-black/45 dark:text-white/45">III.</div>
              <h2 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] nier-text-primary md:text-3xl">
                {{ locale === 'ru' ? 'ЛУЧШИЕ ИСТОРИЧЕСКИЕ СОВПАДЕНИЯ' : 'BEST HISTORICAL MATCHES' }}
              </h2>
            </div>
            <span :class="props.compactNavigation ? 'font-mono text-[11px] font-black uppercase tracking-[0.18em] text-black/60 dark:text-white/60' : 'font-mono text-[8px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40'">
              {{ locale === 'ru' ? 'стиль + паттерн' : 'style + pattern' }}
            </span>
          </div>
          <div v-else class="flex items-center justify-between gap-3">
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
            class="min-w-0"
          >
              <div class="mb-2 pl-1 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
                {{ index + 1 }}
              </div>
              <div
                class="border border-black/10 px-4 py-4 dark:border-white/10"
                :class="index < 2 ? 'bg-black text-white dark:bg-black dark:text-white' : ''"
              >
                <div class="grid grid-cols-2 gap-2">
                <div class="font-mono" :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']">
                  {{ locale === 'ru' ? 'Стиль' : 'Style' }}: {{ formatPercent(match.styleScore, false) }}
                </div>
                <div class="font-mono" :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']">
                  {{ locale === 'ru' ? 'Паттерн' : 'Pattern' }}: {{ formatPercent(match.patternScore, false) }}
                </div>
                <div class="font-mono" :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']">
                  {{ locale === 'ru' ? 'Через 10 сделок' : '+10T' }}:
                  <span :class="matchMetricValueClass(match.continuation10Pct, index)">{{ formatPercent(match.continuation10Pct) }}</span>
                </div>
                <div class="font-mono" :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']">
                  {{ locale === 'ru' ? 'Через 20 сделок' : '+20T' }}:
                  <span :class="matchMetricValueClass(match.continuation20Pct, index)">{{ formatPercent(match.continuation20Pct) }}</span>
                </div>
                <div class="font-mono" :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']">
                  {{ locale === 'ru' ? 'Итог торговли' : 'Trading total' }}:
                  <span class="font-black" :class="matchMetricValueClass(match.totalFileReturnPct, index)">{{ formatPercent(match.totalFileReturnPct) }}</span>
                </div>
                <div
                  v-if="includeAverageRR"
                  class="font-mono"
                  :class="[props.compactNavigation ? 'text-[11px] font-black' : 'text-[10px]', index < 2 ? 'text-white/80' : 'text-black/55 dark:text-white/55']"
                >
                  {{ locale === 'ru' ? 'Средний RR' : 'Avg RR' }}: {{ formatNumber(match.matchedAverageRR, 2) }}
                </div>
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
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'
import ExPanel from '~/shared/ui/ExPanel.vue'

const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()

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
  compactNavigation?: boolean
  activeTab?: 'summary' | 'settings'
  includeAverageRr?: boolean
}>()

const emit = defineEmits<{
  (e: 'loading-change', value: boolean): void
  (e: 'update:active-tab', value: 'summary' | 'settings'): void
  (e: 'update:include-average-rr', value: boolean): void
}>()

const { locale } = useI18n()

const loading = ref(false)
const forecast = ref<PatternForecastResult>(createEmptyPatternForecast())
const activeTab = ref<'summary' | 'settings'>('summary')
const includeAverageRR = ref(false)
let requestId = 0
let refreshTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.activeTab, (value) => {
  if (value) activeTab.value = value
}, { immediate: true })

watch(() => props.includeAverageRr, (value) => {
  if (value !== undefined) includeAverageRR.value = value
}, { immediate: true })

watch(activeTab, (value) => {
  if (props.compactNavigation) emit('update:active-tab', value)
})

watch(includeAverageRR, (value) => {
  if (props.compactNavigation) emit('update:include-average-rr', value)
})

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
        // Persistence is secondary work. Do not keep the forecast screen in a
        // loading state while disk/index writes are happening.
        void persistPatternForecastSnapshot(result).catch(() => undefined)
      }
    }
  } catch (error) {
    if (requestId === nextRequestId) {
      forecast.value = createEmptyPatternForecast({
        message: locale.value === 'ru'
          ? 'Не удалось собрать прогноз структурного паттерна.'
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

const scheduleForecastRefresh = () => {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }

  if (!props.visible) {
    emit('loading-change', false)
    return
  }

  // Let Vue commit the entry screen and let the browser paint its loading
  // state before starting the CPU-heavy historical pattern analysis.
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshForecast()
  }, 0)
}

watch(
  () => [props.visible, props.strategyId, props.initialCapital, props.trades, includeAverageRR.value],
  () => {
    scheduleForecastRefresh()
  },
  { deep: true, immediate: true }
)

onUnmounted(() => {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
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
  const groupLabel = formatOutcomeGroupLabel(forecast.value.lifecycle.strongestGroupLabel)
  if (locale.value === 'ru') {
    return `Ваша торговая история ближе всего к фазам, которые в итоге заканчивались с результатом ${groupLabel} со сходством ${formatPercent(forecast.value.lifecycle.strongestGroupAffinity, false)}.`
  }
  return `The current profile is closest to phases that eventually finished in the ${groupLabel} group with ${formatPercent(forecast.value.lifecycle.strongestGroupAffinity, false)} affinity.`
})

const formatOutcomeGroupLabel = (label: string) => {
  const labels = locale.value === 'ru'
    ? {
        '< 0%': 'меньше 0%',
        '0% to 15%': 'от 0% до 15%',
        '15% to 30%': 'от 15% до 30%',
        '30% to 60%': 'от 30% до 60%',
        '60%+': 'больше 60%'
      }
    : {
        '< 0%': 'less than 0%',
        '0% to 15%': 'from 0% to 15%',
        '15% to 30%': 'from 15% to 30%',
        '30% to 60%': 'from 30% to 60%',
        '60%+': 'more than 60%'
      }

  return labels[label as keyof typeof labels] || label.replace('<', 'less than').replace('>', 'more than').replace('+', '')
}

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

const forecastValueClass = (value: number) => {
  return Number(value) < 0 ? 'text-red-600 dark:text-red-300' : 'nier-text-primary'
}

const matchMetricValueClass = (value: number, index: number) => {
  if (Number(value) < 0) return 'text-red-600 dark:text-red-300'
  return index < 2 ? 'text-white' : 'nier-text-primary'
}

const formatPercentWithCapital = (value: number, capital: number) => {
  const percent = formatPercent(value)
  const resultDollars = Number.isFinite(capital) ? capital * (value / 100) : Number.NaN
  if (!Number.isFinite(resultDollars)) return percent
  return `${percent} (${formatMoney(resultDollars)})`
}

const formatMoney = (value: number) => {
  const sign = value < 0 ? '-$' : '$'
  return `${sign}${formatNumber(Math.abs(value), 0)}`
}

const likelyRangeValueClass = computed(() => {
  const horizon = forecast.value.tactical.horizons[0]
  const lower = formatPercentWithCapital(
    Math.min(horizon?.p25 ?? 0, horizon?.p75 ?? 0),
    forecast.value.currentCapital
  )
  const upper = formatPercentWithCapital(
    horizon?.p75 ?? 0,
    forecast.value.currentCapital
  )
  const longestValueLength = Math.max(lower.length, upper.length)

  if (longestValueLength > 34) return 'text-[6px] leading-tight'
  if (longestValueLength > 27) return 'text-[7px] leading-tight'
  if (longestValueLength > 21) return 'text-[8px] leading-tight'
  if (longestValueLength > 16) return 'text-[9px] leading-tight'
  return 'text-[10px] leading-normal'
})

const formatHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0H'
  if (hours >= 24) {
    return `${formatNumber(hours / 24, 1)}D`
  }
  return `${formatNumber(hours, 1)}H`
}

const formatCloseRange = (firstTimestamp: number, lastTimestamp: number) => {
  if (!Number.isFinite(firstTimestamp) || !Number.isFinite(lastTimestamp)) {
    return locale.value === 'ru' ? 'Даты закрытия: н/д' : 'Close dates: n/a'
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

const tradingStyleLabel = (label: string) => {
  if (locale.value !== 'ru') return label
  const labels: Record<string, string> = {
    'Scalp / Intraday': 'Скальпинг / интрадей',
    'Intraday / Short Swing': 'Интрадей / короткий свинг',
    Swing: 'Свинг',
    'Position / Long Swing': 'Позиционная / длинный свинг'
  }
  return labels[label] || label
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
.compact-forecast-panel :deep(.ex-panel-backdrop) {
  display: none;
}

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
