<template>
  <div class="flex flex-col font-mono select-none nier-text-primary" :class="showFilters ? (compactFiltersPanel ? 'space-y-0' : 'space-y-6') : ''">
    <!-- FILTER BAR -->
    <div v-if="showFilters" ref="filterBarRef" class="relative z-30 flex flex-col" :class="compactFiltersPanel ? 'gap-0 pb-0' : 'gap-3 pb-4 border-b nier-border-primary'">
      <div v-if="!compactFiltersPanel" class="flex items-center justify-between gap-4 text-xs">
        <div class="flex items-center gap-3 min-w-0">
          <span class="font-black uppercase tracking-widest">{{ locale === 'ru' ? 'Фильтры' : 'Filters' }}</span>
          <span v-if="activeFilterCount > 0" class="opacity-40 text-[10px] uppercase whitespace-nowrap">({{ activeFilterCount }} {{ locale === 'ru' ? 'Активно' : 'Active' }})</span>
          <button v-if="activeFilterCount > 0" @click="resetAllFilters" class="text-[10px] opacity-40 hover:opacity-100 uppercase transition-opacity">
            {{ locale === 'ru' ? '[Сброс]' : '[Reset]' }}
          </button>
        </div>
        <div class="flex items-center space-x-3 shrink-0">
          <div class="flex items-center gap-1 pr-3 border-r nier-border-primary">
            <button
              @click="emit('list-view-mode-change', 'timeTree')"
              class="h-5 px-1.5 border text-[9px] font-bold uppercase tracking-[0.14em] transition-colors"
              :class="activeListViewMode === 'timeTree' ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black border-black dark:border-white' : 'border-black/20 dark:border-white/20 opacity-45 hover:opacity-100'"
            >
              {{ locale === 'ru' ? 'ДЕРЕВО' : 'TREE' }}
            </button>
            <button
              @click="emit('list-view-mode-change', 'list')"
              class="h-5 px-1.5 border text-[9px] font-bold uppercase tracking-[0.14em] transition-colors"
              :class="activeListViewMode === 'list' ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black border-black dark:border-white' : 'border-black/20 dark:border-white/20 opacity-45 hover:opacity-100'"
            >
              {{ locale === 'ru' ? 'СПИСОК' : 'LIST' }}
            </button>
          </div>
          <div class="flex items-center gap-1 pr-3 border-r nier-border-primary">
            <button
              @click="setResultDisplayMode('currency')"
              class="h-5 min-w-5 px-1.5 border text-[10px] font-bold transition-colors"
              :class="resultDisplayMode === 'currency' ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black border-black dark:border-white' : 'border-black/20 dark:border-white/20 opacity-45 hover:opacity-100'"
            >
              $
            </button>
            <button
              @click="setResultDisplayMode('percent')"
              class="h-5 min-w-5 px-1.5 border text-[10px] font-bold transition-colors"
              :class="resultDisplayMode === 'percent' ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black border-black dark:border-white' : 'border-black/20 dark:border-white/20 opacity-45 hover:opacity-100'"
            >
              %
            </button>
          </div>
          <button @click="setColorMode('monochrome')" class="relative w-4 h-4 transition-all group">
            <div class="absolute top-0.5 left-0.5 w-1.5 h-1.5 border border-black dark:border-white transition-opacity" :class="colorMode === 'monochrome' ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'"></div>
            <div class="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 nier-bg-inverted transition-opacity" :class="colorMode === 'monochrome' ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'"></div>
          </button>
          <button @click="setColorMode('colorful')" class="relative w-4 h-4 transition-all group">
            <div class="absolute top-0.5 left-0.5 w-1.5 h-1.5 border border-red-500 transition-opacity" :class="colorMode === 'colorful' ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'"></div>
            <div class="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 transition-opacity" :class="colorMode === 'colorful' ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'"></div>
          </button>
          <button
            v-if="showFullscreenToggle && activeListViewMode === 'timeTree'"
            @click="emit('toggle-time-tree-fullscreen')"
            class="ml-1 flex h-5 w-5 items-center justify-center border border-black/20 opacity-45 transition-all hover:border-black/50 hover:opacity-100 dark:border-white/20 dark:hover:border-white/50"
            :class="timeTreeFullscreenActive ? 'bg-black text-white opacity-100 dark:bg-[#F9F6F0] dark:text-black' : ''"
            :aria-label="locale === 'ru' ? 'Полноэкранный TimeTree' : 'Fullscreen TimeTree'"
          >
            <svg
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="square"
              stroke-linejoin="miter"
              aria-hidden="true"
            >
              <path d="M8 4H4v4" />
              <path d="M16 4h4v4" />
              <path d="M20 16v4h-4" />
              <path d="M4 16v4h4" />
            </svg>
          </button>
        </div>
      </div>

      <div :class="compactFiltersPanel ? 'flex w-full flex-wrap' : 'flex flex-wrap gap-2'">
        <div v-for="filter in filterDropdowns" :key="filter.id" :class="compactFiltersPanel ? 'relative w-28 flex-none' : 'relative'">
          <button
            @click.stop="filter.id === 'dateRange' ? openDateRangeEditor('start') : (openFilterId = openFilterId === filter.id ? null : filter.id)"
            class="h-8 max-w-[220px] px-3 border text-[11px] uppercase tracking-wider transition-colors flex items-center gap-2"
            :class="[compactFiltersPanel ? 'w-full max-w-none' : '', filter.isActive || openFilterId === filter.id ? 'bg-black/10 dark:bg-white/10 border-black/40 dark:border-white/40 opacity-100' : 'border-black/20 dark:border-white/20 opacity-55 hover:opacity-100 hover:border-black/40 dark:hover:border-white/40']"
          >
            <span class="truncate">{{ filterButtonLabel(filter.id) }}</span>
            <span class="text-[10px] opacity-50">{{ openFilterId === filter.id ? '^' : '⌄' }}</span>
          </button>

          <Transition name="fade">
            <div
              v-if="openFilterId === filter.id"
              class="absolute top-full mt-1 w-80 max-w-[calc(100vw-3rem)] bg-white/95 dark:bg-[#070707]/95 border border-black/20 dark:border-white/20 shadow-xl backdrop-blur-md p-3 z-50"
              :class="filter.id === 'profit' || filter.id === 'time' || filter.id === 'duration' ? 'right-0 left-auto' : 'left-0'"
            >
              <div v-if="filter.id !== 'profit'" class="flex items-center justify-between pb-2 border-b nier-border-primary">
                <span class="text-[10px] font-black uppercase tracking-widest">{{ filter.label }}</span>
                <button
                  v-if="filter.isActive"
                  @click.stop="resetFilterById(filter.id)"
                  class="text-[9px] uppercase opacity-40 hover:opacity-100 transition-opacity"
                >
                  {{ locale === 'ru' ? 'Очистить' : 'Clear' }}
                </button>
              </div>

              <div v-if="filter.type === 'options'" class="max-h-64 overflow-y-auto custom-scrollbar py-2">
                <button
                  v-if="filter.options.length"
                  v-for="item in filter.options"
                  :key="item.id"
                  @click.stop="selectDropdownOption(filter.id, item.id)"
                  class="w-full px-2.5 py-2 text-left text-[10px] uppercase tracking-wider transition-colors flex items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 last:border-0"
                  :class="isDropdownOptionActive(filter.id, item.id) ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black font-bold' : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'"
                >
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate">{{ item.label }}</span>
                    <span v-if="(item as any).description" class="text-[8px] opacity-45 normal-case tracking-normal">{{ (item as any).description }}</span>
                  </span>
                  <span v-if="isDropdownOptionActive(filter.id, item.id)" class="text-[8px] opacity-60">{{ locale === 'ru' ? 'АКТИВНО' : 'ACTIVE' }}</span>
                </button>
                <span
                  v-else-if="filter.id === 'conditions'"
                  class="block px-2.5 py-3 text-[10px] uppercase tracking-wider opacity-45"
                >
                  {{ locale === 'ru' ? 'НЕТ УСЛОВИЙ' : 'NO CONDITIONS' }}
                </span>
              </div>

              <div v-else-if="filter.id === 'profit'" class="py-2">
                <div class="pb-2 border-b nier-border-primary">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-black uppercase tracking-wider">{{ locale === 'ru' ? 'Изменение прибыли' : 'Profit change' }} {{ resultMetricLabel }}</span>
                    <button
                      v-if="filter.isActive"
                      @click.stop="resetFilterById(filter.id)"
                      class="text-[9px] uppercase opacity-40 hover:opacity-100 transition-opacity"
                    >
                      {{ locale === 'ru' ? 'Очистить' : 'Clear' }}
                    </button>
                  </div>
                  <span class="mt-1 block text-[9px] opacity-45">{{ resultDisplayMode === 'percent' ? (locale === 'ru' ? 'В процентах' : 'Percent mode') : (locale === 'ru' ? 'В долларах' : 'Dollar mode') }}</span>
                  <input
                    v-model="profitTierSearch"
                    type="text"
                    :placeholder="locale === 'ru' ? 'Поиск' : 'Search'"
                    class="mt-2 w-full px-2.5 py-2 text-[10px] bg-transparent border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-mono"
                  />
                </div>

                <div class="max-h-64 overflow-y-auto custom-scrollbar py-2">
                  <button
                    v-for="item in filteredProfitTierOptions"
                    :key="item.id"
                    @click.stop="selectedProfitTier = selectedProfitTier === item.id ? 'ALL' : item.id"
                    class="w-full px-2.5 py-2 text-left text-[10px] uppercase tracking-wider transition-colors flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 last:border-0"
                    :class="selectedProfitTier === item.id ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black font-bold' : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'"
                  >
                    <span class="flex flex-col min-w-0">
                      <span class="truncate">{{ item.label }}</span>
                      <span class="text-[8px] opacity-50 normal-case tracking-normal">{{ item.description }}</span>
                    </span>
                    <span v-if="selectedProfitTier === item.id" class="text-[8px] opacity-60">{{ locale === 'ru' ? 'АКТИВНО' : 'ACTIVE' }}</span>
                  </button>
                </div>

                <div class="mt-1 pt-3 border-t nier-border-primary">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] uppercase tracking-widest opacity-45">{{ locale === 'ru' ? 'Ручная настройка' : 'Manual Setup' }}</span>
                    <span class="text-[9px] opacity-40">{{ resultMetricLabel }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input v-model.number="customProfitMin" type="number" :placeholder="`${locale === 'ru' ? 'Мин' : 'Min'} ${resultMetricLabel}`" class="filter-input w-20" />
                    <span class="text-[9px] opacity-40">..</span>
                    <input v-model.number="customProfitMax" type="number" :placeholder="`${locale === 'ru' ? 'Макс' : 'Max'} ${resultMetricLabel}`" class="filter-input w-20" />
                    <button
                      @click.stop="selectedProfitTier = 'CUSTOM'"
                      class="px-2 py-1 text-[9px] uppercase border border-black/20 dark:border-white/20 opacity-60 hover:opacity-100"
                      :class="selectedProfitTier === 'CUSTOM' ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black opacity-100' : ''"
                    >
                      {{ locale === 'ru' ? 'Применить' : 'Apply' }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else-if="filter.id === 'time'" class="py-2">
                <button
                  v-for="preset in timeWindowPresets"
                  :key="preset.id"
                  @click.stop="applyTimeWindowPreset(preset)"
                  class="w-full px-2.5 py-2 text-left text-[10px] uppercase tracking-wider transition-colors flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 last:border-0"
                  :class="isTimeWindowPresetActive(preset) ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black font-bold' : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'"
                >
                  <span class="flex flex-col min-w-0">
                    <span class="truncate">{{ preset.label }}</span>
                    <span class="text-[8px] opacity-50 normal-case tracking-normal">{{ preset.description }}</span>
                  </span>
                  <span v-if="isTimeWindowPresetActive(preset)" class="text-[8px] opacity-60">{{ locale === 'ru' ? 'АКТИВНО' : 'ACTIVE' }}</span>
                </button>

                <div class="mt-3 pt-3 border-t nier-border-primary">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] uppercase tracking-widest opacity-45">{{ locale === 'ru' ? 'Ручная настройка' : 'Manual Setup' }}</span>
                    <span class="text-[9px] opacity-40">{{ timeWindowLabel }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input :value="manualMinTime" @input="setManualTime('min', $event)" type="time" class="filter-input w-28" />
                    <span class="text-[9px] opacity-40">..</span>
                    <input :value="manualMaxTime" @input="setManualTime('max', $event)" type="time" class="filter-input w-28" />
                  </div>
                </div>
              </div>

              <div v-else-if="filter.id === 'duration'" class="py-2">
                <button
                  v-for="preset in durationWindowPresets"
                  :key="preset.id"
                  @click.stop="applyDurationWindowPreset(preset)"
                  class="w-full px-2.5 py-2 text-left text-[10px] uppercase tracking-wider transition-colors flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 last:border-0"
                  :class="isDurationWindowPresetActive(preset) ? 'bg-black text-white dark:bg-[#F9F6F0] dark:text-black font-bold' : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'"
                >
                  <span class="flex flex-col min-w-0">
                    <span class="truncate">{{ preset.label }}</span>
                    <span class="text-[8px] opacity-50 normal-case tracking-normal">{{ preset.description }}</span>
                  </span>
                  <span v-if="isDurationWindowPresetActive(preset)" class="text-[8px] opacity-60">{{ locale === 'ru' ? 'АКТИВНО' : 'ACTIVE' }}</span>
                </button>

                <div class="mt-3 pt-3 border-t nier-border-primary">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] uppercase tracking-widest opacity-45">{{ locale === 'ru' ? 'Ручная настройка' : 'Manual Setup' }}</span>
                    <span class="text-[9px] opacity-40">{{ durationWindowLabel }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input :value="minDuration" @input="setManualDuration('min', $event)" type="number" min="0" :placeholder="locale === 'ru' ? 'Мин м' : 'Min m'" class="filter-input w-20" />
                    <span class="text-[9px] opacity-40">..</span>
                    <input :value="maxDuration" @input="setManualDuration('max', $event)" type="number" min="0" :placeholder="locale === 'ru' ? 'Макс м' : 'Max m'" class="filter-input w-20" />
                    <span class="text-[9px] opacity-40">{{ locale === 'ru' ? 'мин' : 'min' }}</span>
                  </div>
                </div>
              </div>

              <div v-if="filter.id === 'conditions' && selectedCondition.length > 0" class="pt-2 border-t nier-border-primary">
                <button
                  @click.stop="conditionMatchMode = conditionMatchMode === 'INCLUDED' ? 'EXACT' : 'INCLUDED'"
                  class="w-full px-2 py-2 text-[9px] uppercase tracking-wider flex items-center justify-between opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span>{{ locale === 'ru' ? 'Режим совпадения' : 'Match Mode' }}</span>
                  <span class="font-bold">{{ conditionMatchMode === 'INCLUDED' ? (locale === 'ru' ? 'Включено' : 'Included') : (locale === 'ru' ? 'Только' : 'Alone') }}</span>
                </button>
              </div>

            </div>
          </Transition>
        </div>
      </div>

      <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-2">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.id"
          @click="removeFilterChip(chip.id)"
          class="flex items-center space-x-2 px-2 py-1 bg-black/5 dark:bg-white/5 border nier-border-primary hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[9px] uppercase group"
        >
          <span class="opacity-45">{{ chip.type }}:</span>
          <span class="font-bold">{{ chip.label }}</span>
          <span class="opacity-40 group-hover:opacity-100 group-hover:text-red-500 transition-colors ml-1">×</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="nier-fade">
        <div
          v-if="isDateRangeEditorOpen"
          @click.self="cancelDateRangeEditor"
          class="fixed inset-0 z-[11000] flex cursor-pointer items-center justify-center bg-black/20 p-20 backdrop-blur-md dark:bg-black/40"
        >
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="w-full max-w-4xl !border-black/20 dark:!border-white/20">
            <div class="flex items-center justify-between border-b nier-border-primary bg-black/[0.02] px-4 py-2 dark:bg-white/[0.02]"></div>

            <div class="grid h-[450px] grid-cols-2 divide-x divide-black/5 nier-text-primary dark:divide-white/5">
              <div class="flex flex-col gap-8 p-10">
                <div class="flex flex-col gap-2">
                  <span class="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ locale === 'ru' ? 'Диапазон дат' : 'Date Range' }}</span>
                  <span class="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-black/55 dark:text-white/55">
                    {{ locale === 'ru' ? 'Начало и конец периода' : 'Start and end of period' }}
                  </span>
                  <span class="text-[7px] uppercase tracking-[0.3em] text-black/30 dark:text-white/20">
                    {{ locale === 'ru' ? 'Выберите точку справа' : 'Select a point below' }}
                  </span>
                </div>

                <div class="flex flex-col gap-2">
                  <span class="text-[9px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ locale === 'ru' ? 'Выбор точки' : 'Select Point' }}</span>
                  <div class="flex gap-2">
                    <button
                      v-for="target in ['start', 'end']"
                      :key="target"
                      type="button"
                      @click="selectDateRangeEditorTarget(target as 'start' | 'end')"
                      class="flex-1 border border-black/20 py-3 text-[10px] uppercase tracking-[0.4em] transition-all dark:border-white/20"
                      :class="dateRangeEditorTarget === target ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/5'"
                    >
                      {{ locale === 'ru' ? (target === 'start' ? 'Начало' : 'Конец') : (target === 'start' ? 'Start' : 'End') }}
                    </button>
                  </div>
                </div>

                <div class="flex flex-col gap-4 border-t border-black/5 pt-4 dark:border-white/5">
                  <button type="button" @click="applyDateRangeEditor" class="w-full border nier-border-primary py-2 text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    {{ locale === 'ru' ? 'Применить диапазон' : 'Apply Range' }}
                  </button>
                  <button type="button" @click="clearDateRangeFilter" class="w-full border nier-border-primary py-2 text-[8px] uppercase tracking-widest text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10">
                    {{ locale === 'ru' ? 'Сбросить диапазон' : 'Reset Range' }}
                  </button>
                </div>
              </div>

              <div class="flex flex-col justify-center p-10">
                <div class="flex flex-col items-center gap-10">
                  <div class="flex items-center gap-4">
                    <div v-for="unit in ['day', 'month', 'year']" :key="unit" class="flex flex-col items-center gap-2">
                      <button type="button" @click="adjustDateRangeEditor(unit, 1)" class="p-2 opacity-20 transition-opacity hover:opacity-100"><div class="h-px w-4 nier-bg-inverted"></div></button>
                      <input
                        v-model="dateRangeEditorParts[unit as keyof DateRangeEditorParts]"
                        :maxlength="unit === 'year' ? 4 : 2"
                        @input="handleDateRangeEditorPart(unit as keyof DateRangeEditorParts, dateRangeEditorParts[unit as keyof DateRangeEditorParts])"
                        class="w-24 bg-transparent text-center font-mono text-4xl font-bold tracking-tighter outline-none nier-text-primary"
                      />
                      <button type="button" @click="adjustDateRangeEditor(unit, -1)" class="p-2 opacity-20 transition-opacity hover:opacity-100"><div class="h-px w-4 nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ dateRangeUnitLabel(unit) }}</span>
                    </div>
                  </div>

                  <div class="h-px w-20 bg-black/10 dark:bg-white/10"></div>

                  <div class="flex items-center gap-6">
                    <div v-for="unit in ['hour', 'minute']" :key="unit" class="flex flex-col items-center gap-2">
                      <button type="button" @click="adjustDateRangeEditor(unit, 1)" class="p-2 opacity-20 transition-opacity hover:opacity-100"><div class="h-px w-4 nier-bg-inverted"></div></button>
                      <input
                        v-model="dateRangeEditorParts[unit as keyof DateRangeEditorParts]"
                        maxlength="2"
                        @input="handleDateRangeEditorPart(unit as keyof DateRangeEditorParts, dateRangeEditorParts[unit as keyof DateRangeEditorParts])"
                        class="w-20 bg-transparent text-center font-mono text-4xl font-bold tracking-widest outline-none nier-text-primary"
                      />
                      <button type="button" @click="adjustDateRangeEditor(unit, -1)" class="p-2 opacity-20 transition-opacity hover:opacity-100"><div class="h-px w-4 nier-bg-inverted"></div></button>
                      <span class="text-[7px] uppercase tracking-widest text-black/40 dark:text-white/20">{{ dateRangeUnitLabel(unit) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </Transition>
    </Teleport>

    <!-- VERTICAL TRADE REGISTRY -->
    <div v-if="!filtersOnly" class="flex flex-col font-mono text-xs select-none" :class="detailsOnly ? 'pt-0' : 'space-y-3 pt-2'">
      <!-- TABLE CONTROLS & HEADER GRID -->
      <div v-if="!detailsOnly" class="flex items-center justify-between pb-1 text-[10px] opacity-60 uppercase tracking-widest px-2">
        <div class="flex items-center space-x-3">
          <button @click="toggleSelectAllTrades" class="hover:opacity-100 transition-opacity font-bold">
            {{ isAllSelected ? (locale === 'ru' ? '[Отменить выбор]' : '[Deselect All]') : (locale === 'ru' ? '[Выбрать все]' : '[Select All]') }}
          </button>
          <span v-if="selectedTradeIds.length > 0" class="opacity-70">({{ selectedTradeIds.length }} {{ locale === 'ru' ? 'Выбрано' : 'Selected' }})</span>
          <button
            v-if="selectedTradeIds.length > 0"
            @click="toggleSelectedTradesHidden"
            class="hover:opacity-100 transition-opacity font-bold flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                :d="selectedTradesAreHidden ? 'M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83M9.88 5.09A9.77 9.77 0 0112 4.91c5 0 9.27 3.11 11 7.5a11.83 11.83 0 01-4.08 5.36M6.61 6.61C4.62 7.88 3.1 9.91 2 12.41a11.82 11.82 0 004.24 5.44A9.76 9.76 0 0012 19.09c1.63 0 3.16-.37 4.52-1.02' : 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z'"
              />
            </svg>
            <span>{{ selectedTradesAreHidden ? (locale === 'ru' ? '[Вернуть]' : '[Restore]') : (locale === 'ru' ? '[Скрыть]' : '[Hide]') }}</span>
          </button>
          <button v-if="selectedTradeIds.length > 0" @click="removeSelectedTrades" class="hover:opacity-100 transition-opacity font-bold text-red-500">
            {{ locale === 'ru' ? '[Удалить]' : '[Remove]' }}
          </button>
        </div>
        <button
          v-if="hiddenTradesCount > 0"
          @click="showHiddenTrades = !showHiddenTrades"
          class="hover:opacity-100 transition-opacity font-bold"
        >
          {{ showHiddenTrades ? (locale === 'ru' ? '[Скрытые: ON]' : '[Hidden: ON]') : (locale === 'ru' ? '[Скрытые: OFF]' : '[Hidden: OFF]') }}
        </button>
      </div>

      <div v-if="!detailsOnly" class="grid grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr_auto] gap-2 items-center pb-3 border-b nier-border-primary text-[10px] opacity-40 uppercase tracking-widest px-2">
        <div class="flex items-center space-x-3">
          <button @click.stop="toggleSelectAllTrades" class="w-3.5 h-3.5 border border-black dark:border-white flex items-center justify-center transition-all hover:opacity-100 shrink-0" :class="isAllSelected ? 'nier-bg-inverted nier-text-inverted opacity-100' : 'opacity-40'">
            <span v-if="isAllSelected" class="text-[8px] font-bold">✓</span>
            <span v-else-if="selectedTradeIds.length > 0" class="text-[8px] font-bold">-</span>
          </button>
          <span>{{ locale === 'ru' ? 'Направление' : 'Direction' }}</span>
        </div>
        <span>{{ locale === 'ru' ? 'Актив' : 'Asset' }}</span>
        <span>{{ locale === 'ru' ? 'Даты' : 'Dates' }}</span>
        <span class="text-right">{{ locale === 'ru' ? 'Длительность' : 'Duration' }}</span>
        <span class="text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
        <span class="w-6"></span>
      </div>

      <div v-if="!detailsOnly && filteredTrades.length === 0" class="py-16 text-center opacity-40 text-xs uppercase tracking-widest">
        {{ locale === 'ru' ? 'Нет результатов' : 'No Results' }}
      </div>

      <!-- TRADE ROWS -->
      <div v-if="filteredTrades.length > 0" class="flex flex-col" :class="detailsOnly ? 'space-y-0' : 'space-y-3.5 pt-2'">
        <div 
          v-for="trade in filteredTrades" 
          :key="trade.id"
          class="flex flex-col group transition-opacity duration-150"
          :class="[
            detailsOnly ? '' : 'border-b border-black/5 pb-2 dark:border-white/5',
            isTradeHidden(trade) ? 'opacity-40' : ''
          ]"
        >
          <!-- ROW GRID -->
          <div 
            v-if="!detailsOnly"
            class="grid grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr_auto] gap-2 items-center py-3 px-2 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
            :class="isTradeHidden(trade) ? 'opacity-45 group-hover:opacity-70' : ''"
            @click="emit('open-trade', { tradeId: trade.id })"
          >
            <div class="flex items-center space-x-3 truncate" @click.stop="toggleSelectTrade(trade.id)">
              <button class="w-3.5 h-3.5 border border-black dark:border-white flex items-center justify-center transition-all hover:opacity-100 shrink-0 cursor-pointer" :class="selectedTradeIds.includes(trade.id) ? 'nier-bg-inverted nier-text-inverted opacity-100' : 'opacity-30'">
                <span v-if="selectedTradeIds.includes(trade.id)" class="text-[8px] font-bold">✓</span>
              </button>
              <span
                class="w-1 h-1 rounded-full shrink-0"
                :class="colorMode === 'colorful' ? '' : (trade.status === 'WIN' ? 'bg-black dark:bg-[#F9F6F0]' : trade.status === 'LOSS' ? 'bg-black/30 dark:bg-white/30' : 'bg-black/60 dark:bg-white/60')"
                :style="colorMode === 'colorful' ? { backgroundColor: resultColorValue(trade) } : undefined"
              ></span>
              <span class="font-bold uppercase tracking-widest">{{ trade.direction }}</span>
              <span v-if="isTradeHidden(trade)" class="text-[8px] uppercase tracking-[0.24em] opacity-45">
                {{ locale === 'ru' ? 'скрыто' : 'hidden' }}
              </span>
            </div>
            
            <span class="opacity-60 uppercase tracking-wider truncate">{{ trade.asset }}</span>
            <div class="flex flex-col min-w-0">
              <span class="mt-1 text-[9px] opacity-35 uppercase tracking-wider truncate">
                {{ locale === 'ru' ? 'Вход' : 'Entry' }}: {{ trade.dateEntryStr }}
              </span>
              <span class="text-[9px] opacity-35 uppercase tracking-wider truncate">
                {{ locale === 'ru' ? 'Выход' : 'Exit' }}: {{ trade.dateExitStr }}
              </span>
            </div>
            <span class="opacity-40 text-right tracking-wider truncate">{{ trade.duration }}</span>
            <span class="font-bold text-right tracking-wider" :style="{ color: resultColorValue(trade) }">{{ formatTradeResult(trade) }}</span>
            <button @click.stop="toggleTradeExpand(trade.id)" class="w-6 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="expandedTradeId === trade.id ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
              </svg>
            </button>
          </div>

          <!-- EXPANDED TELEMETRY -->
          <div
            v-if="detailsOnly || expandedTradeId === trade.id"
            class="flex flex-col space-y-6 py-3 text-[11px] opacity-80 animate-[fadeIn_0.2s_ease-out]"
            :class="detailsOnly ? '' : 'my-2 ml-2 border-l border-black/20 pl-6 dark:border-white/20'"
          >
            <!-- TRADE EXECUTION DATA GRID -->
            <div class="flex flex-col space-y-2">
              <div class="flex items-center justify-between">
                <span class="block text-[9px] opacity-40 uppercase tracking-widest">{{ locale === 'ru' ? 'МЕТРИКИ ИСПОЛНЕНИЯ' : 'EXECUTION METRICS' }}</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3.5 bg-black/5 dark:bg-white/5 border nier-border-primary font-mono text-[10px]">
                <div class="flex flex-col">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Цена Входа' : 'Entry Price' }}</span>
                  <span class="font-bold mt-0.5 text-xs">{{ formatExecutionPrice(trade.entryPrice, trade) }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Цена Выхода' : 'Exit Price' }}</span>
                  <span class="font-bold mt-0.5 text-xs">{{ formatExecutionPrice(trade.exitPrice, trade) }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Размер Позиции' : 'Position Size' }}</span>
                  <span class="font-bold mt-0.5 text-xs">{{ formatExecutionMetric(trade.size) }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
                  <span class="font-bold mt-0.5 text-xs" :style="{ color: resultColorValue(trade) }">{{ formatTradeResult(trade) }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Длительность' : 'Duration' }}</span>
                  <span class="font-bold mt-0.5">{{ trade.duration }}</span>
                </div>
                <div class="flex flex-col sm:col-span-1">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Стоп Лосс' : 'Stop Loss' }}</span>
                  <span class="font-bold mt-0.5">{{ Number(trade.stopLoss) > 0 ? formatExecutionMetric(trade.stopLoss) : (locale === 'ru' ? 'НЕТ' : 'NONE') }}</span>
                </div>
                <div class="flex flex-col sm:col-span-1">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Тейк Профит' : 'Take Profit' }}</span>
                  <span class="font-bold mt-0.5">{{ Number(trade.takeProfit) > 0 ? formatExecutionMetric(trade.takeProfit) : (locale === 'ru' ? 'НЕТ' : 'NONE') }}</span>
                </div>
                <div class="flex flex-col sm:col-span-1">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Дата Входа' : 'Date Entry' }}</span>
                  <span class="font-bold mt-0.5 opacity-80">{{ trade.dateEntryStr }}</span>
                </div>
                <div class="flex flex-col sm:col-span-1">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Дата Выхода' : 'Date Exit' }}</span>
                  <span class="font-bold mt-0.5 opacity-80">{{ trade.dateExitStr }}</span>
                </div>
                <div class="flex flex-col sm:col-span-1">
                  <span class="opacity-40 text-[9px] uppercase tracking-wider">{{ locale === 'ru' ? 'Часовой пояс' : 'Time Zone' }}</span>
                  <span class="font-bold mt-0.5 opacity-80">{{ formatTradeTimeZone(trade) }}</span>
                </div>
              </div>
            </div>

            <!-- ENTRY-EXIT METHODS -->
            <div v-if="detailsOnly || hasExecutionBreakdown(trade)" class="flex flex-col space-y-2">
              <div class="flex items-center justify-between">
                <span class="block text-[9px] opacity-40 uppercase tracking-widest">{{ locale === 'ru' ? 'Методы входа-выхода' : 'Entry-Exit Methods' }}</span>
              </div>
              <div class="p-3.5 bg-black/5 dark:bg-white/5 border nier-border-primary font-mono text-[10px]">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex flex-col space-y-2 md:pr-4 md:border-r md:border-black/10 md:dark:border-white/10">
                    <div class="flex items-center justify-between">
                      <span class="text-[8px] uppercase tracking-[0.3em] opacity-40">
                        {{ getExecutionGroupLabel(trade, 'entry') }}
                      </span>
                    </div>
                    <div class="h-28 max-h-28 overflow-y-auto custom-scrollbar pr-2">
                      <div v-if="getExecutionGroup(trade, 'entry').length > 0" class="flex flex-col space-y-2">
                        <div
                          v-for="(exec, index) in getExecutionGroup(trade, 'entry')"
                          :key="exec.id || `entry-${index}`"
                          class="flex items-center justify-end gap-2 pb-1 border-b border-black/5 dark:border-white/5"
                        >
                          <span class="font-bold whitespace-nowrap text-right">
                            {{ formatExecutionRow(exec) }}
                          </span>
                          <span v-if="Number(index) > 0" class="text-[8px] uppercase tracking-wider opacity-60">
                            {{ getEntryMethodType(trade, exec, Number(index)) }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="opacity-25 uppercase tracking-[0.2em] text-[8px]">
                        {{ locale === 'ru' ? 'НЕТ_ВХОДОВ' : 'NO_ENTRIES' }}
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col space-y-2 md:pl-4">
                    <div class="flex items-center justify-between">
                      <span class="text-[8px] uppercase tracking-[0.3em] opacity-40">
                        {{ getExecutionGroupLabel(trade, 'exit') }}
                      </span>
                      <span v-if="hasMethodLabel(getExecutionGroup(trade, 'exit'))" class="text-[8px] uppercase tracking-[0.3em] text-blue-500 opacity-90">
                        {{ getMethodLabel(getExecutionGroup(trade, 'exit')) }}
                      </span>
                    </div>
                    <div class="h-28 max-h-28 overflow-y-auto custom-scrollbar pr-2">
                      <div v-if="getExecutionGroup(trade, 'exit').length > 0" class="flex flex-col space-y-2">
                        <div
                          v-for="(exec, index) in getExecutionGroup(trade, 'exit')"
                          :key="exec.id || `exit-${index}`"
                          class="flex items-center justify-end gap-3 pb-1 border-b border-black/5 dark:border-white/5"
                        >
                          <span class="font-bold whitespace-nowrap text-right">
                            {{ formatExecutionRow(exec) }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="opacity-25 uppercase tracking-[0.2em] text-[8px]">
                        {{ locale === 'ru' ? 'НЕТ_ВЫХОДОВ' : 'NO_EXITS' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ATTACHED NOTES -->
            <div class="flex flex-col space-y-3">
              <div class="flex items-center justify-between gap-3">
                <span class="block text-[9px] opacity-40 uppercase tracking-widest">{{ locale === 'ru' ? 'Прикрепленные Заметки' : 'Attached Notes' }} ({{ trade.notes.length }})</span>
                <span class="shrink-0 text-[9px] uppercase tracking-widest opacity-40">{{ locale === 'ru' ? 'ПОСЛЕДНИЕ' : 'LATEST' }}</span>
              </div>
              <div v-if="trade.notes.length > 0" class="max-h-32 overflow-y-auto custom-scrollbar flex flex-col space-y-1.5 pt-1 pr-2">
                <div 
                  v-for="(note, nIdx) in getLatestNotes(trade.notes)"
                  :key="note.id" 
                  class="flex flex-col py-1.5 border-b nier-border-primary cursor-pointer group"
                  @click.stop="onNoteClick(trade.id, note.id)"
                >
                  <div class="flex items-center justify-between text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                    <div class="flex items-center space-x-2 truncate pr-2">
                      <span class="font-bold">[{{ note.author }}]</span>
                      <span class="truncate">{{ note.text ? note.text.slice(0, 40) + (note.text.length > 40 ? '...' : '') : `${locale === 'ru' ? 'Заметка' : 'Note'} #${Number(nIdx) + 1}` }}</span>
                    </div>
                    <span class="shrink-0 text-[9px] opacity-40 group-hover:opacity-100">{{ locale === 'ru' ? '[ОТКРЫТЬ]' : '[OPEN]' }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="pt-1 text-[10px] font-mono uppercase tracking-[0.25em] opacity-30">
                {{ locale === 'ru' ? 'НЕТ_ПРИКРЕПЛЕННЫХ_ЗАМЕТОК' : 'NO_ATTACHED_NOTES' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import globalAssets from '~/shared/data/global_assets.json'
import { getTradeDurationMs, getTradeResultPercent, getTradePnl } from '~/widgets/genesis/model/metrics'

const { locale, t } = useI18n()
const openTradeText = () => t('genesis.virtualLog.openTrade')
const isClosedTradeRecord = (trade: any) => trade?.isClosed !== false && String(trade?.status || '').toLowerCase() !== 'open'

const props = defineProps<{
  trades?: any[]
  filtersOnly?: boolean
  hideFilters?: boolean
  viewMode?: 'list' | 'timeTree'
  resultDisplayMode?: 'currency' | 'percent'
  colorMode?: 'monochrome' | 'colorful'
  filtersPanelMode?: boolean
  detailsOnly?: boolean
  showFullscreenToggle?: boolean
  timeTreeFullscreenActive?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-note', payload: { tradeId: string; noteId: string }): void
  (e: 'open-trade', payload: { tradeId: string }): void
  (e: 'filtered-trades-change', payload: any[]): void
  (e: 'filters-active-change', payload: boolean): void
  (e: 'list-view-mode-change', payload: 'list' | 'timeTree'): void
  (e: 'display-settings-change', payload: { resultDisplayMode: 'currency' | 'percent'; colorMode: 'monochrome' | 'colorful' }): void
  (e: 'toggle-time-tree-fullscreen'): void
}>()

const filtersOnly = computed(() => props.filtersOnly === true)
const showFilters = computed(() => props.hideFilters !== true)
const compactFiltersPanel = computed(() => props.filtersPanelMode === true)
const detailsOnly = computed(() => props.detailsOnly === true)
const activeListViewMode = computed(() => props.viewMode || 'list')
const showFullscreenToggle = computed(() => props.showFullscreenToggle === true)
const timeTreeFullscreenActive = computed(() => props.timeTreeFullscreenActive === true)

const expandedTradeId = ref<string | null>(null)
const colorMode = ref<'monochrome' | 'colorful'>(props.colorMode || 'colorful')
const resultDisplayMode = ref<'currency' | 'percent'>(props.resultDisplayMode || 'percent')
const openFilterId = ref<string | null>(null)
const filterBarRef = ref<HTMLElement | null>(null)
const showHiddenTrades = ref(true)

const setColorMode = (mode: 'monochrome' | 'colorful') => {
  colorMode.value = mode
}

const toggleTradeExpand = (tradeId: string) => {
  expandedTradeId.value = expandedTradeId.value === tradeId ? null : tradeId
}

watch(() => props.resultDisplayMode, (mode) => {
  if (mode && mode !== resultDisplayMode.value) resultDisplayMode.value = mode
})

watch(() => props.colorMode, (mode) => {
  if (mode && mode !== colorMode.value) colorMode.value = mode
})

watch([resultDisplayMode, colorMode], () => {
  emit('display-settings-change', {
    resultDisplayMode: resultDisplayMode.value,
    colorMode: colorMode.value
  })
})

const getNormalizedExecutionLabel = (exec: any) => {
  const rawLabel = String(exec?.label || '').toUpperCase()
  if (!rawLabel || rawLabel === 'SINGLE') return exec?.type === 'exit' ? 'EXIT' : 'ENTRY'
  return rawLabel.replace(/_/g, ' ')
}

const translateExecutionLabel = (exec: any) => {
  const rawLabel = String(exec?.label || '').toUpperCase().replace(/\s+/g, '_')
  if (rawLabel === 'PYRAMIDING') return locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING'
  if (rawLabel === 'AVERAGING' || rawLabel === 'AVERAGING_DOWN') return locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING'
  if (rawLabel === 'EXIT_SCALE' || rawLabel === 'EXIT') return locale.value === 'ru' ? 'ВЫХОД' : 'EXIT'
  return getNormalizedExecutionLabel(exec)
}

const getExecutionGroup = (trade: any, type: 'entry' | 'exit') => {
  const executions = Array.isArray(trade?.executions) ? trade.executions : []
  return executions.filter((exec: any) => exec?.type === type)
}

const getExecutionGroupLabel = (trade: any, type: 'entry' | 'exit') => {
  if (type === 'entry') {
    return locale.value === 'ru' ? 'МЕТОДЫ ВХОДА' : 'ENTRY METHODS'
  }
  return locale.value === 'ru' ? 'ВЫХОД' : 'EXITING'
}

const hasMethodLabel = (group: any[]) => {
  return group.some(exec => String(exec?.label || '').toUpperCase() !== 'SINGLE')
}

const getMethodLabel = (group: any[]) => {
  const exec = group.find(item => String(item?.label || '').toUpperCase() !== 'SINGLE')
  return exec ? translateExecutionLabel(exec) : ''
}

const formatExecutionMetric = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '—'
}

const getExecutionAssetType = (trade: any) => {
  const explicitType = trade?.assetType || trade?.instrumentType || trade?.asset?.type
  if (explicitType) return String(explicitType).trim().toLowerCase()

  const symbol = String(typeof trade?.asset === 'string' ? trade.asset : trade?.symbol || '')
    .split(/[/:\s]/)[0]
    ?.toUpperCase() || ''
  return String((globalAssets as any[]).find((asset: any) => String(asset.symbol || '').toUpperCase() === symbol)?.type || '')
    .trim()
    .toLowerCase()
}

const formatExecutionPrice = (value: unknown, trade: any) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const assetType = getExecutionAssetType(trade)
  const usesThreeDecimals = ['stocks', 'stock', 'xstocks', 'xstock', 'crypto', 'cryptocurrency'].includes(assetType)
  return number.toFixed(usesThreeDecimals ? 3 : 2)
}

const getLatestNotes = (notes: any[]) => {
  if (notes.length <= 2) return notes

  const getNoteTime = (note: any) => {
    const rawDate = note?.date || note?.createdAt || note?.timestamp
    const time = rawDate instanceof Date ? rawDate.getTime() : new Date(rawDate || 0).getTime()
    return Number.isFinite(time) ? time : 0
  }

  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const timeDifference = getNoteTime(b.note) - getNoteTime(a.note)
      return timeDifference !== 0 ? timeDifference : b.index - a.index
    })
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map(({ note }) => note)
}

const formatExecutionRow = (exec: any) => {
  const price = Number(exec?.price || 0)
  const size = Number(exec?.size || 0)
  return `${price} · ${size} L`
}

const getEntryMethodType = (trade: any, exec: any, index: number | string) => {
  if (Number(index) === 0) return ''
  const explicitLabel = String(exec?.label || '').toUpperCase().replace(/\s+/g, '_')
  if (explicitLabel && explicitLabel !== 'SINGLE') return translateExecutionLabel(exec)
  const entries = getExecutionGroup(trade, 'entry')
  const firstPrice = Number(entries[0]?.price || 0)
  const currentPrice = Number(exec?.price || 0)
  
  let sideStr = String(trade?.side || '').toUpperCase()
  if (!sideStr && entries.length > 0) {
    sideStr = String(entries[0]?.side || '').toUpperCase()
  }
  
  const isLong = sideStr === 'LONG' || sideStr === 'BUY' || sideStr === ''
  
  if (isLong) {
    return currentPrice > firstPrice
      ? (locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING')
      : (locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING')
  } else {
    return currentPrice < firstPrice
      ? (locale.value === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING')
      : (locale.value === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING')
  }
}

const hasExecutionBreakdown = (trade: any) => {
  const executions = Array.isArray(trade?.executions) ? trade.executions : []
  const entryExecutions = executions.filter((exec: any) => exec?.type === 'entry')
  const exitExecutions = executions.filter((exec: any) => exec?.type === 'exit')

  return (
    entryExecutions.length > 1 ||
    exitExecutions.length > 1 ||
    entryExecutions.some((exec: any) => String(exec?.label || '').toUpperCase() !== 'SINGLE') ||
    exitExecutions.some((exec: any) => String(exec?.label || '').toUpperCase() !== 'SINGLE')
  )
}

const formatTradeTimeZone = (trade: any) => {
  const zone = String(trade?.timeZone || trade?.timezone || '').trim()
  if (!zone) return locale.value === 'ru' ? 'НЕТ ДАННЫХ' : 'NO DATA'

  try {
    const date = trade?.dateObj instanceof Date ? trade.dateObj : new Date(trade?.dateRaw || trade?.date || Date.now())
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset'
    }).formatToParts(Number.isNaN(date.getTime()) ? new Date() : date)
    const offset = parts.find(part => part.type === 'timeZoneName')?.value || ''
    return offset && offset !== 'GMT' ? `${zone} (${offset})` : zone
  } catch {
    return zone
  }
}

const onNoteClick = (tradeId: string, noteId: string) => {
  emit('open-note', { tradeId, noteId })
}

const getResultMetricValue = (trade: any) => {
  if (!isClosedTradeRecord(trade)) return Number.NaN
  if (resultDisplayMode.value === 'currency') {
    return getTradePnl(trade, strategyStore.getInitialDeposit(resolveTradeStrategyId(trade)))
  }

  const storedPercent = Number(trade.profitValue)
  if (Number.isFinite(storedPercent)) return storedPercent

  const initialDeposit = strategyStore.getInitialDeposit(resolveTradeStrategyId(trade))
  return getTradeResultPercent(trade, initialDeposit) || 0
}

const resultMetricLabel = computed(() => resultDisplayMode.value === 'currency' ? '$' : '%')

const formatTradeResult = (trade: any) => {
  if (!isClosedTradeRecord(trade)) {
    return openTradeText()
  }
  const rawValue = getResultMetricValue(trade)
  const value = Number.isFinite(rawValue) ? rawValue : 0
  const sign = value > 0 ? '+' : ''
  const fixedValue = Math.abs(value).toFixed(2)
  if (resultDisplayMode.value === 'currency') return `${value < 0 ? '-' : sign}$${fixedValue}`
  return `${sign}${Number(value).toFixed(2)}%`
}

const getSharedResultColor = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return 'currentColor'
  const intensity = Math.min(Math.abs(value) / 5, 1)
  if (value > 0) return `hsl(145 72% ${42 + intensity * 16}%)`
  return `hsl(350 78% ${48 + intensity * 12}%)`
}

const resultColorValue = (trade: any) => {
  if (!isClosedTradeRecord(trade)) return colorMode.value === 'colorful' ? 'hsl(45 80% 58%)' : 'currentColor'
  if (colorMode.value !== 'colorful') return 'currentColor'
  const value = getResultMetricValue(trade)
  return getSharedResultColor(value)
}

const setResultDisplayMode = (mode: 'currency' | 'percent') => {
  if (resultDisplayMode.value === mode) return
  resultDisplayMode.value = mode
  if (selectedProfitTier.value !== 'ALL' && selectedProfitTier.value !== 'CUSTOM') {
    selectedProfitTier.value = 'ALL'
  }
}

const activeFilterChips = computed(() => {
  const chips: { id: string, type: string, label: string }[] = []
  selectedScenario.value.forEach(scenarioId => {
    chips.push({ id: `scenario-${scenarioId}`, type: 'SCENARIO', label: scenariosList.value.find(x => x.id === scenarioId)?.label || scenarioId })
  })
  if (selectedCondition.value.length > 0) {
    selectedCondition.value.forEach(condId => {
      chips.push({ id: `condition-${condId}`, type: 'CONDITION', label: conditionsList.value.find(x => x.id === condId)?.label || condId })
    })
  }
  if (selectedDirection.value !== 'ALL') chips.push({ id: 'direction', type: 'DIRECTION', label: directionList.value.find(x => x.id === selectedDirection.value)?.label || selectedDirection.value })
  selectedAsset.value.forEach(assetId => {
    chips.push({ id: `asset-${assetId}`, type: 'ASSET', label: assetsList.value.find(x => x.id === assetId)?.label || assetId })
  })
  selectedStatus.value.forEach(statusId => {
    chips.push({ id: `status-${statusId}`, type: 'STATUS', label: statusList.value.find(x => x.id === statusId)?.label || statusId })
  })
  if (selectedProfitTier.value !== 'ALL') {
    const label = selectedProfitTier.value === 'CUSTOM'
      ? `${customProfitMin.value !== null && customProfitMin.value !== '' as any ? customProfitMin.value : '-∞'}${resultMetricLabel.value} .. ${customProfitMax.value !== null && customProfitMax.value !== '' as any ? customProfitMax.value : '+∞'}${resultMetricLabel.value}`
      : profitTierOptions.value.find(x => x.id === selectedProfitTier.value)?.label || selectedProfitTier.value
    chips.push({ id: 'profitTier', type: 'PROFIT', label })
  }
  if (hasDateRangeFilter.value) chips.push({ id: 'dateRange', type: 'DATE', label: dateRangeLabel.value })
  if (selectedMarketSession.value !== 'ALL') chips.push({ id: 'marketSession', type: 'SESSION', label: marketSessionOptions.value.find(x => x.id === selectedMarketSession.value)?.label || selectedMarketSession.value })
  if (hasTimeWindowFilter.value) chips.push({ id: 'timeWindow', type: 'TIME', label: timeWindowLabel.value })
  if (hasDurationWindowFilter.value) chips.push({ id: 'durationWindow', type: 'DURATION', label: durationWindowLabel.value })
  return chips
})

const removeFilterChip = (id: string) => {
  if (id.startsWith('scenario-')) {
    const scenarioId = id.replace('scenario-', '')
    selectedScenario.value = selectedScenario.value.filter(x => x !== scenarioId)
  }
  if (id.startsWith('condition-')) {
    const condId = id.replace('condition-', '')
    selectedCondition.value = selectedCondition.value.filter(x => x !== condId)
  }
  if (id === 'direction') selectedDirection.value = 'ALL'
  if (id.startsWith('asset-')) {
    const assetId = id.replace('asset-', '')
    selectedAsset.value = selectedAsset.value.filter(x => x !== assetId)
  }
  if (id.startsWith('status-')) {
    const statusId = id.replace('status-', '')
    selectedStatus.value = selectedStatus.value.filter(x => x !== statusId)
  }
  if (id === 'profitTier') {
    selectedProfitTier.value = 'ALL'
    customProfitMin.value = null
    customProfitMax.value = null
  }
  if (id === 'dateRange') clearDateRangeFilter()
  if (id === 'marketSession') selectedMarketSession.value = 'ALL'
  if (id === 'timeWindow') resetFilterById('time')
  if (id === 'durationWindow') resetFilterById('duration')
}



const ABS_MIN_TIME_MIN = 0
const ABS_MAX_TIME_MIN = 1440
const minTimeMinute = ref(ABS_MIN_TIME_MIN)
const maxTimeMinute = ref(ABS_MAX_TIME_MIN)

const formatTimeMinuteStr = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hh = h < 10 ? '0' + h : h
  const mm = m < 10 ? '0' + m : m
  return `${hh}:${mm}`
}

const hasTimeWindowFilter = computed(() => minTimeMinute.value > ABS_MIN_TIME_MIN || maxTimeMinute.value < ABS_MAX_TIME_MIN)
const manualMinTime = computed(() => formatTimeMinuteStr(minTimeMinute.value))
const manualMaxTime = computed(() => maxTimeMinute.value === ABS_MAX_TIME_MIN ? '23:59' : formatTimeMinuteStr(maxTimeMinute.value))
const timeWindowLabel = computed(() => hasTimeWindowFilter.value ? `${formatTimeMinuteStr(minTimeMinute.value)} .. ${manualMaxTime.value}` : (locale.value === 'ru' ? 'Всё время' : 'All Times'))

type MinutePreset = { id: string; label: string; description: string; min: number; max: number }

const timeWindowPresets = computed<MinutePreset[]>(() => [
  { id: 'ALL', label: locale.value === 'ru' ? 'Всё время' : 'All Times', description: locale.value === 'ru' ? 'Без ограничений внутри дня' : 'No intraday restriction', min: ABS_MIN_TIME_MIN, max: ABS_MAX_TIME_MIN },
  { id: 'PREMARKET', label: locale.value === 'ru' ? 'Премаркет' : 'Pre Market', description: '04:00 .. 09:30', min: 240, max: 570 },
  { id: 'OPEN', label: locale.value === 'ru' ? 'Открытие' : 'Opening Drive', description: '09:30 .. 11:00', min: 570, max: 660 },
  { id: 'MIDDAY', label: locale.value === 'ru' ? 'Полдень' : 'Midday', description: '11:00 .. 14:00', min: 660, max: 840 },
  { id: 'POWER_HOUR', label: locale.value === 'ru' ? 'Пауэр-ауэр' : 'Power Hour', description: '15:00 .. 16:00', min: 900, max: 960 },
  { id: 'AFTER_HOURS', label: locale.value === 'ru' ? 'После закрытия' : 'After Hours', description: '16:00 .. 20:00', min: 960, max: 1200 },
  { id: 'OVERNIGHT', label: locale.value === 'ru' ? 'Овернайт' : 'Overnight', description: '20:00 .. 23:59', min: 1200, max: 1439 }
])

const normalizeTimeMax = (value: number) => value >= 1439 ? ABS_MAX_TIME_MIN : value

const applyTimeWindowPreset = (preset: MinutePreset) => {
  minTimeMinute.value = preset.min
  maxTimeMinute.value = normalizeTimeMax(preset.max)
}

const isTimeWindowPresetActive = (preset: MinutePreset) => {
  return minTimeMinute.value === preset.min && maxTimeMinute.value === normalizeTimeMax(preset.max)
}

const parseTimeInput = (value: string) => {
  const parts = value.split(':').map(Number)
  const hours = parts[0]
  const minutes = parts[1]
  if (hours === undefined || minutes === undefined || !Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return Math.max(ABS_MIN_TIME_MIN, Math.min(ABS_MAX_TIME_MIN, hours * 60 + minutes))
}

const setManualTime = (edge: 'min' | 'max', event: Event) => {
  const value = (event.target as HTMLInputElement | null)?.value || ''
  const parsed = parseTimeInput(value)
  if (parsed === null) return
  if (edge === 'min') {
    minTimeMinute.value = Math.min(parsed, maxTimeMinute.value)
  } else {
    maxTimeMinute.value = normalizeTimeMax(Math.max(parsed, minTimeMinute.value))
  }
}

type MarketSessionId = 'ALL' | 'SYDNEY' | 'TOKYO' | 'FRANKFURT' | 'LONDON' | 'NEW_YORK'
type MarketSessionOption = {
  id: MarketSessionId
  label: string
  description: string
  timeZone: string
  min: number
  max: number
}

const selectedMarketSession = ref<MarketSessionId>('ALL')

const parseFixedOffsetTimeZone = (timeZone: string) => {
  const normalized = String(timeZone || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  const match = normalized.match(/^(?:GMT|UTC)?([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!match) return null

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2] || 0)
  const minutes = Number(match[3] || 0)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return sign * (hours * 60 + minutes)
}

const getTimeZoneOffsetMinutes = (timeZone: string, date: Date) => {
  const fixedOffset = parseFixedOffsetTimeZone(timeZone)
  if (fixedOffset !== null) return fixedOffset

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset'
    }).formatToParts(date)
    const label = parts.find(part => part.type === 'timeZoneName')?.value || 'GMT'
    const match = label.match(/^GMT([+-])?(\d{1,2})?(?::?(\d{2}))?$/)
    if (!match) return 0
    const sign = match[1] === '-' ? -1 : 1
    const hours = Number(match[2] || 0)
    const minutes = Number(match[3] || 0)
    return sign * (hours * 60 + minutes)
  } catch (e) {
    return 0
  }
}

const getZonedDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value || date.getUTCFullYear()),
    month: Number(parts.find(part => part.type === 'month')?.value || date.getUTCMonth() + 1),
    day: Number(parts.find(part => part.type === 'day')?.value || date.getUTCDate())
  }
}

const getSessionBoundaryDate = (timeZone: string, minute: number, addDay = 0) => {
  const now = new Date()
  const localParts = getZonedDateParts(now, timeZone)
  const hour = Math.floor(minute / 60)
  const min = minute % 60
  const utcGuess = new Date(Date.UTC(localParts.year, localParts.month - 1, localParts.day + addDay, hour, min))
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, utcGuess)
  return new Date(utcGuess.getTime() - offsetMinutes * 60000)
}

const formatSessionTimeInUTC = (date: Date) => {
  return new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const formatMarketSessionDescription = (timeZone: string, min: number, max: number) => {
  const start = getSessionBoundaryDate(timeZone, min)
  const end = getSessionBoundaryDate(timeZone, max, max <= min ? 1 : 0)
  return `${formatSessionTimeInUTC(start)} .. ${formatSessionTimeInUTC(end)} UTC`
}

const marketSessionOptions = computed<MarketSessionOption[]>(() => [
  {
    id: 'ALL',
    label: locale.value === 'ru' ? 'Все сессии' : 'All Sessions',
    description: '00:00 .. 24:00 UTC',
    timeZone: 'UTC',
    min: 0,
    max: 1440
  },
  {
    id: 'SYDNEY',
    label: locale.value === 'ru' ? 'Сиднейская' : 'Sydney',
    description: formatMarketSessionDescription('Australia/Sydney', 8 * 60, 17 * 60),
    timeZone: 'Australia/Sydney',
    min: 8 * 60,
    max: 17 * 60
  },
  {
    id: 'TOKYO',
    label: locale.value === 'ru' ? 'Токийская' : 'Tokyo',
    description: formatMarketSessionDescription('Asia/Tokyo', 9 * 60, 18 * 60),
    timeZone: 'Asia/Tokyo',
    min: 9 * 60,
    max: 18 * 60
  },
  {
    id: 'FRANKFURT',
    label: locale.value === 'ru' ? 'Франкфуртская' : 'Frankfurt',
    description: formatMarketSessionDescription('Europe/Berlin', 8 * 60, 17 * 60),
    timeZone: 'Europe/Berlin',
    min: 8 * 60,
    max: 17 * 60
  },
  {
    id: 'LONDON',
    label: locale.value === 'ru' ? 'Лондонская' : 'London',
    description: formatMarketSessionDescription('Europe/London', 8 * 60, 17 * 60),
    timeZone: 'Europe/London',
    min: 8 * 60,
    max: 17 * 60
  },
  {
    id: 'NEW_YORK',
    label: locale.value === 'ru' ? 'Нью-Йоркская' : 'New York',
    description: formatMarketSessionDescription('America/New_York', 8 * 60, 17 * 60),
    timeZone: 'America/New_York',
    min: 8 * 60,
    max: 17 * 60
  }
])

const sessionMinuteFormatters = new Map<string, Intl.DateTimeFormat>()

const getSessionMinuteFormatter = (timeZone: string) => {
  const zone = String(timeZone || 'UTC')
  const cached = sessionMinuteFormatters.get(zone)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  sessionMinuteFormatters.set(zone, formatter)
  return formatter
}

const getZonedMinuteOfDay = (date: Date, timeZone: string) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null

  try {
    const parts = getSessionMinuteFormatter(timeZone).formatToParts(date)
    const rawHour = Number(parts.find(part => part.type === 'hour')?.value)
    const minute = Number(parts.find(part => part.type === 'minute')?.value)
    if (!Number.isFinite(rawHour) || !Number.isFinite(minute)) return null
    const hour = rawHour === 24 ? 0 : rawHour
    return hour * 60 + minute
  } catch (e) {
    return null
  }
}

const isMinuteInWindow = (minute: number, min: number, max: number) => {
  if (max >= min) return minute >= min && minute < max
  return minute >= min || minute < max
}

const getTradeEntryDate = (trade: any) => {
  const entryExecution = Array.isArray(trade?.executions)
    ? trade.executions.find((exec: any) => exec?.type === 'entry' && exec?.date)
    : null
  const rawDate = entryExecution?.date || trade?.dateRaw || trade?.dateObj || trade?.date || trade?.dateTime
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate)
  return Number.isNaN(date.getTime()) ? null : date
}

const getWallClockInstantInTimeZone = (rawDate: any, timeZone: string) => {
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate)
  if (Number.isNaN(date.getTime())) return null

  const zone = String(timeZone || '').trim()
  if (!zone) return date

  const utcWallGuess = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ))

  const firstOffset = getTimeZoneOffsetMinutes(zone, utcWallGuess)
  const firstInstant = new Date(utcWallGuess.getTime() - firstOffset * 60000)
  const finalOffset = getTimeZoneOffsetMinutes(zone, firstInstant)
  return new Date(utcWallGuess.getTime() - finalOffset * 60000)
}

const getTradeEntryInstant = (trade: any) => {
  const entryExecution = Array.isArray(trade?.executions)
    ? trade.executions.find((exec: any) => exec?.type === 'entry' && exec?.date)
    : null
  const rawDate = entryExecution?.date || trade?.dateRaw || trade?.dateObj || trade?.date || trade?.dateTime
  const tradeTimeZone = entryExecution?.timeZone || trade?.timeZone || trade?.timezone || ''

  return getWallClockInstantInTimeZone(rawDate, tradeTimeZone) || getTradeEntryDate(trade)
}

const isTradeInMarketSession = (trade: any) => {
  if (selectedMarketSession.value === 'ALL') return true
  const session = marketSessionOptions.value.find(item => item.id === selectedMarketSession.value)
  if (!session) return true

  const entryDate = getTradeEntryInstant(trade)
  if (!entryDate) return false

  const sessionMinute = getZonedMinuteOfDay(entryDate, session.timeZone)
  if (sessionMinute === null) return false

  return isMinuteInWindow(sessionMinute, session.min, session.max)
}

const ABS_MIN_DURATION = 0
const ABS_MAX_DURATION = 720
const minDuration = ref(ABS_MIN_DURATION)
const maxDuration = ref(ABS_MAX_DURATION)
const hasDurationWindowFilter = computed(() => minDuration.value > ABS_MIN_DURATION || maxDuration.value < ABS_MAX_DURATION)
const durationWindowLabel = computed(() => {
  if (!hasDurationWindowFilter.value) return locale.value === 'ru' ? 'Все длительности' : 'All Durations'
  const maxLabel = maxDuration.value >= ABS_MAX_DURATION ? (locale.value === 'ru' ? 'Безлимит' : 'Unlimited') : `${maxDuration.value}${locale.value === 'ru' ? 'м' : 'm'}`
  return `${minDuration.value}${locale.value === 'ru' ? 'м' : 'm'} .. ${maxLabel}`
})

const durationWindowPresets = computed<MinutePreset[]>(() => [
  { id: 'ALL', label: locale.value === 'ru' ? 'Все длительности' : 'All Durations', description: locale.value === 'ru' ? 'Без ограничений' : 'No duration restriction', min: ABS_MIN_DURATION, max: ABS_MAX_DURATION },
  { id: 'SCALP', label: locale.value === 'ru' ? 'Скальп' : 'Scalp', description: locale.value === 'ru' ? '0 .. 15 минут' : '0 .. 15 minutes', min: 0, max: 15 },
  { id: 'INTRADAY_SHORT', label: locale.value === 'ru' ? 'Быстрый Интрадей' : 'Fast Intraday', description: locale.value === 'ru' ? '15 .. 60 минут' : '15 .. 60 minutes', min: 15, max: 60 },
  { id: 'INTRADAY_CORE', label: locale.value === 'ru' ? 'Основной Интрадей' : 'Core Intraday', description: locale.value === 'ru' ? '1 .. 4 часа' : '1 .. 4 hours', min: 60, max: 240 },
  { id: 'EXTENDED', label: locale.value === 'ru' ? 'Длительное удержание' : 'Extended Hold', description: locale.value === 'ru' ? '4 .. 12 часов' : '4 .. 12 hours', min: 240, max: ABS_MAX_DURATION }
])

const applyDurationWindowPreset = (preset: MinutePreset) => {
  minDuration.value = preset.min
  maxDuration.value = preset.max
}

const isDurationWindowPresetActive = (preset: MinutePreset) => {
  return minDuration.value === preset.min && maxDuration.value === preset.max
}

const setManualDuration = (edge: 'min' | 'max', event: Event) => {
  const raw = (event.target as HTMLInputElement | null)?.value
  const parsed = raw === '' || raw === undefined ? null : Number(raw)
  if (parsed !== null && !Number.isFinite(parsed)) return

  if (edge === 'min') {
    minDuration.value = Math.max(ABS_MIN_DURATION, Math.min(parsed ?? ABS_MIN_DURATION, maxDuration.value))
  } else {
    maxDuration.value = Math.max(minDuration.value, Math.min(parsed ?? ABS_MAX_DURATION, ABS_MAX_DURATION))
  }
}

const selectedScenario = ref<string[]>([])
const selectedCondition = ref<string[]>([])
const conditionMatchMode = ref<'INCLUDED' | 'EXACT'>('INCLUDED')
const selectedAsset = ref<string[]>([])
const selectedStatus = ref<string[]>([])
const selectedDirection = ref('ALL')
const dateRangeStart = ref<Date | null>(null)
const dateRangeEnd = ref<Date | null>(null)

type DateRangeEditorTarget = 'start' | 'end'
type DateRangeEditorParts = {
  day: string
  month: string
  year: string
  hour: string
  minute: string
}

const isDateRangeEditorOpen = ref(false)
const dateRangeEditorTarget = ref<DateRangeEditorTarget>('start')
const dateRangeDraftStart = ref<Date | null>(null)
const dateRangeDraftEnd = ref<Date | null>(null)
const dateRangeEditorParts = ref<DateRangeEditorParts>({
  day: '01',
  month: '01',
  year: '2024',
  hour: '00',
  minute: '00'
})

const statusList = computed(() => [
  { id: 'ALL', label: locale.value === 'ru' ? 'ВСЕ' : 'ALL' },
  { id: 'WIN', label: locale.value === 'ru' ? 'ПРИБЫЛЬ' : 'WIN' },
  { id: 'LOSS', label: locale.value === 'ru' ? 'УБЫТОК' : 'LOSS' },
  { id: 'SCRATCH', label: locale.value === 'ru' ? 'БЕЗУБЫТОК' : 'SCRATCH' },
  { id: 'OPEN', label: openTradeText() }
])

const directionList = computed(() => [
  { id: 'ALL', label: locale.value === 'ru' ? 'ВСЕ' : 'ALL' },
  { id: 'LONG', label: locale.value === 'ru' ? 'ЛОНГ' : 'LONG' },
  { id: 'SHORT', label: locale.value === 'ru' ? 'ШОРТ' : 'SHORT' }
])

const selectedProfitTier = ref('ALL')
const profitTierSearch = ref('')
const customProfitMin = ref<number | null>(null)
const customProfitMax = ref<number | null>(null)

const getConditionFilterName = (condition: any) => {
  if (typeof condition === 'string') return condition
  return condition?.info?.name || condition?.name || condition?.label || condition?.id || ''
}

const isVisibleConditionFilterName = (name: unknown) => {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (!normalized) return false
  return !/(^|_)(and|or)_?protocol($|_)/.test(normalized)
}

type ProfitTierOption = {
  id: string
  label: string
  description: string
  min?: number
  max?: number
}

const profitTierOptions = computed<ProfitTierOption[]>(() => {
  if (resultDisplayMode.value === 'currency') {
    return [
      { id: 'ABOVE_5000', label: locale.value === 'ru' ? 'Больше $5,000' : 'Above $5,000', description: locale.value === 'ru' ? 'Исключительный рост' : 'Exceptional up', min: 5000 },
      { id: 'ABOVE_1000', label: locale.value === 'ru' ? 'Больше $1,000' : 'Above $1,000', description: locale.value === 'ru' ? 'Очень сильный рост' : 'Very strong up', min: 1000 },
      { id: 'ABOVE_500', label: locale.value === 'ru' ? 'Больше $500' : 'Above $500', description: locale.value === 'ru' ? 'Сильный рост' : 'Strong up', min: 500 },
      { id: 'ABOVE_100', label: locale.value === 'ru' ? 'Больше $100' : 'Above $100', description: locale.value === 'ru' ? 'Умеренный рост' : 'Moderate up', min: 100 },
      { id: 'ZERO_TO_100', label: locale.value === 'ru' ? '$0 до $100' : '$0 to $100', description: locale.value === 'ru' ? 'Слабый рост' : 'Weak up', min: 0, max: 100 },
      { id: 'ABOVE_0', label: locale.value === 'ru' ? 'Больше $0' : 'Above $0', description: locale.value === 'ru' ? 'Рост' : 'Up', min: 0 },
      { id: 'BELOW_0', label: locale.value === 'ru' ? 'Меньше $0' : 'Below $0', description: locale.value === 'ru' ? 'Падение' : 'Down', max: 0 },
      { id: 'MINUS_100_TO_0', label: locale.value === 'ru' ? '-$100 до $0' : '-$100 to $0', description: locale.value === 'ru' ? 'Слабое падение' : 'Weak down', min: -100, max: 0 },
      { id: 'BELOW_MINUS_100', label: locale.value === 'ru' ? 'Меньше -$100' : 'Below -$100', description: locale.value === 'ru' ? 'Сильное падение' : 'Strong down', max: -100 }
    ]
  }

  return [
    { id: 'ABOVE_30', label: locale.value === 'ru' ? 'Больше 30%' : 'Above 30%', description: locale.value === 'ru' ? 'Исключительный рост' : 'Exceptional up', min: 30 },
    { id: 'ABOVE_20', label: locale.value === 'ru' ? 'Больше 20%' : 'Above 20%', description: locale.value === 'ru' ? 'Очень сильный рост' : 'Very strong up', min: 20 },
    { id: 'ABOVE_10', label: locale.value === 'ru' ? 'Больше 10%' : 'Above 10%', description: locale.value === 'ru' ? 'Сильный рост' : 'Strong up', min: 10 },
    { id: 'ABOVE_5', label: locale.value === 'ru' ? 'Больше 5%' : 'Above 5%', description: locale.value === 'ru' ? 'Умеренный рост' : 'Moderate up', min: 5 },
    { id: 'ZERO_TO_5', label: locale.value === 'ru' ? '0% до 5%' : '0% to 5%', description: locale.value === 'ru' ? 'Слабый рост' : 'Weak up', min: 0, max: 5 },
    { id: 'ABOVE_0', label: locale.value === 'ru' ? 'Больше 0%' : 'Above 0%', description: locale.value === 'ru' ? 'Рост' : 'Up', min: 0 },
    { id: 'BELOW_0', label: locale.value === 'ru' ? 'Меньше 0%' : 'Below 0%', description: locale.value === 'ru' ? 'Падение' : 'Down', max: 0 },
    { id: 'MINUS_5_TO_0', label: locale.value === 'ru' ? '-5% до 0%' : '-5% to 0%', description: locale.value === 'ru' ? 'Слабое падение' : 'Weak down', min: -5, max: 0 },
    { id: 'BELOW_MINUS_5', label: locale.value === 'ru' ? 'Меньше -5%' : 'Below -5%', description: locale.value === 'ru' ? 'Сильное падение' : 'Strong down', max: -5 }
  ]
})

const filteredProfitTierOptions = computed(() => {
  const query = profitTierSearch.value.trim().toLowerCase()
  if (!query) return profitTierOptions.value
  return profitTierOptions.value.filter(item => {
    return item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
  })
})

const getTradeDateForRange = (trade: any) => {
  const rawDate = trade?.dateObj || trade?.dateRaw || trade?.date || trade?.dateTime
  const date = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate)
  return Number.isFinite(date.getTime()) ? date : null
}

const getDateRangeBounds = () => {
  const dates = activeTrades.value
    .map(getTradeDateForRange)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    start: dates[0] ? new Date(dates[0]) : new Date(),
    end: dates.at(-1) ? new Date(dates.at(-1) as Date) : new Date()
  }
}

const hasDateRangeFilter = computed(() => dateRangeStart.value !== null || dateRangeEnd.value !== null)

const formatDateTimeFilter = (date: Date | null) => {
  if (!date || !Number.isFinite(date.getTime())) return locale.value === 'ru' ? 'НЕ ВЫБРАНО' : 'NOT SET'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const dateRangeLabel = computed(() => {
  if (!hasDateRangeFilter.value) return locale.value === 'ru' ? 'Диапазон дат' : 'Date Range'
  return `${formatDateTimeFilter(dateRangeStart.value)} .. ${formatDateTimeFilter(dateRangeEnd.value)}`
})

const getDateRangeEditorDate = () => dateRangeEditorTarget.value === 'start' ? dateRangeDraftStart.value : dateRangeDraftEnd.value

const setDateRangeEditorDate = (date: Date) => {
  if (dateRangeEditorTarget.value === 'start') dateRangeDraftStart.value = new Date(date)
  else dateRangeDraftEnd.value = new Date(date)
}

const syncDateRangeEditorParts = () => {
  const date = getDateRangeEditorDate()
  if (!date || !Number.isFinite(date.getTime())) return
  dateRangeEditorParts.value = {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0')
  }
}

const dateRangeUnitLabel = (unit: string) => {
  const labels: Record<string, string> = locale.value === 'ru'
    ? { day: 'ДЕНЬ', month: 'МЕСЯЦ', year: 'ГОД', hour: 'ЧАС', minute: 'МИНУТА' }
    : { day: 'DAY', month: 'MONTH', year: 'YEAR', hour: 'HOUR', minute: 'MINUTE' }
  return labels[unit] || unit
}

const selectDateRangeEditorTarget = (target: DateRangeEditorTarget) => {
  dateRangeEditorTarget.value = target
  syncDateRangeEditorParts()
}

const openDateRangeEditor = (target: DateRangeEditorTarget = 'start') => {
  const bounds = getDateRangeBounds()
  dateRangeDraftStart.value = new Date(dateRangeStart.value || bounds.start)
  dateRangeDraftEnd.value = new Date(dateRangeEnd.value || bounds.end)
  dateRangeEditorTarget.value = target
  syncDateRangeEditorParts()
  isDateRangeEditorOpen.value = true
  openFilterId.value = null
}

const adjustDateRangeEditor = (unit: string, delta: number) => {
  const current = getDateRangeEditorDate()
  if (!current) return
  const date = new Date(current)

  if (unit === 'year') date.setFullYear(date.getFullYear() + delta)
  if (unit === 'month') {
    const day = date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() + delta)
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  }
  if (unit === 'day') date.setDate(date.getDate() + delta)
  if (unit === 'hour') date.setHours(date.getHours() + delta)
  if (unit === 'minute') date.setMinutes(date.getMinutes() + delta)

  setDateRangeEditorDate(date)
  syncDateRangeEditorParts()
}

const handleDateRangeEditorPart = (unit: keyof DateRangeEditorParts, value: string) => {
  dateRangeEditorParts.value[unit] = value
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return

  const parts = dateRangeEditorParts.value
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  if (!year || month < 1 || month > 12 || day < 1 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return

  const lastDay = new Date(year, month, 0).getDate()
  if (day > lastDay) {
    parts.day = String(lastDay).padStart(2, '0')
  }

  const date = new Date(year, month - 1, Math.min(day, lastDay), hour, minute)
  setDateRangeEditorDate(date)
}

const applyDateRangeEditor = () => {
  if (!dateRangeDraftStart.value || !dateRangeDraftEnd.value) return
  const startTime = dateRangeDraftStart.value.getTime()
  const endTime = dateRangeDraftEnd.value.getTime()
  dateRangeStart.value = new Date(Math.min(startTime, endTime))
  dateRangeEnd.value = new Date(Math.max(startTime, endTime))
  isDateRangeEditorOpen.value = false
}

const cancelDateRangeEditor = () => {
  isDateRangeEditorOpen.value = false
}

const clearDateRangeFilter = () => {
  dateRangeStart.value = null
  dateRangeEnd.value = null
  dateRangeDraftStart.value = null
  dateRangeDraftEnd.value = null
  isDateRangeEditorOpen.value = false
}

const mockTrades = ref([
  {
    id: 'TRD-01',
    scenario: 'Tactical_Entry_Alpha',
    condition: 'Market_Structure_Break',
    profitValue: 1250,
    timeValue: 12,
    dateTime: '10.05.2026',
    duration: '45m',
    durationMinutes: 45,
    status: 'WIN',
    asset: 'BTC/USD',
    session: 'NEW_YORK',
    direction: 'LONG',
    notes: [
      { id: 'n1-1', text: 'Clean impulse over VWAP. High relative volume detected.', timestamp: '10.05 // 23:05', author: 'SYSTEM_ALPHA' },
      { id: 'n1-2', text: 'Partial profit taken at 2R. Trailing stop activated.', timestamp: '10.05 // 23:30', author: 'TRADER' },
      { id: 'n1-3', text: 'Position closed at target. Reification complete.', timestamp: '10.05 // 23:49', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-02',
    scenario: 'Sniper_Pullback_Bravo',
    condition: 'VWAP_Reclamation',
    profitValue: -450,
    timeValue: 22,
    dateTime: '11.05.2026',
    duration: '15m',
    durationMinutes: 15,
    status: 'LOSS',
    asset: 'ETH/USD',
    session: 'LONDON',
    direction: 'SHORT',
    notes: [
      { id: 'n2-1', text: 'Entered on lower timeframe liquidity sweep.', timestamp: '11.05 // 18:16', author: 'TRADER' },
      { id: 'n2-2', text: 'Unexpected absorption at key support level. Stop loss triggered.', timestamp: '11.05 // 18:31', author: 'SYSTEM_BRAVO' }
    ]
  },
  {
    id: 'TRD-03',
    scenario: 'Breakout_Core_Gamma',
    condition: 'Delta_Divergence',
    profitValue: 3420,
    timeValue: 35,
    dateTime: '12.05.2026',
    duration: '2h 10m',
    durationMinutes: 130,
    status: 'WIN',
    asset: 'SOL/USD',
    session: 'NEW_YORK',
    direction: 'LONG',
    notes: [
      { id: 'n3-1', text: 'Massive cumulative delta divergence breakout identified.', timestamp: '12.05 // 19:23', author: 'SYSTEM_GAMMA' },
      { id: 'n3-2', text: 'Pyramiding added on first consolidation flag.', timestamp: '12.05 // 20:15', author: 'TRADER' },
      { id: 'n3-3', text: 'Full exit on climatic volume spike.', timestamp: '12.05 // 21:33', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-04',
    scenario: 'Liquidity_Grab_Delta',
    condition: 'Orderflow_Imbalance',
    profitValue: 890,
    timeValue: 48,
    dateTime: '13.05.2026',
    duration: '32m',
    durationMinutes: 32,
    status: 'WIN',
    asset: 'AVAX/USD',
    session: 'TOKYO',
    direction: 'SHORT',
    notes: [
      { id: 'n4-1', text: 'Aggressive absorption at session low. Short entry executed.', timestamp: '13.05 // 20:06', author: 'TRADER' },
      { id: 'n4-2', text: 'Quick scalp exit achieved at previous day POC.', timestamp: '13.05 // 20:38', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-05',
    scenario: 'Tactical_Entry_Alpha',
    condition: 'VWAP_Reclamation',
    profitValue: -150,
    timeValue: 55,
    dateTime: '14.05.2026',
    duration: '12m',
    durationMinutes: 12,
    status: 'SCRATCH',
    asset: 'BTC/USD',
    session: 'LONDON',
    direction: 'LONG',
    notes: [
      { id: 'n5-1', text: 'Long entry on VWAP test.', timestamp: '14.05 // 09:31', author: 'TRADER' },
      { id: 'n5-2', text: 'Manual abort due to stalling momentum and orderflow divergence.', timestamp: '14.05 // 09:43', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-06',
    scenario: 'Breakout_Core_Gamma',
    condition: 'Volume_Profile_POC',
    profitValue: 5400,
    timeValue: 65,
    dateTime: '15.05.2026',
    duration: '4h 25m',
    durationMinutes: 265,
    status: 'WIN',
    asset: 'ETH/USD',
    session: 'NEW_YORK',
    direction: 'LONG',
    notes: [
      { id: 'n6-1', text: 'Perfect bounce off Point of Control. Core position established.', timestamp: '15.05 // 04:46', author: 'SYSTEM_GAMMA' },
      { id: 'n6-2', text: 'Holding through New York open volatility.', timestamp: '15.05 // 07:30', author: 'TRADER' },
      { id: 'n6-3', text: 'Final target hit. Exceptional risk-reward capture.', timestamp: '15.05 // 09:11', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-07',
    scenario: 'Sniper_Pullback_Bravo',
    condition: 'Market_Structure_Break',
    profitValue: 2100,
    timeValue: 72,
    dateTime: '15.05.2026',
    duration: '1h 05m',
    durationMinutes: 65,
    status: 'WIN',
    asset: 'SOL/USD',
    session: 'LONDON',
    direction: 'SHORT',
    notes: [
      { id: 'n7-1', text: 'Textbook lower timeframe market structure shift.', timestamp: '15.05 // 22:11', author: 'TRADER' },
      { id: 'n7-2', text: 'Target reached cleanly without drawdown.', timestamp: '15.05 // 23:16', author: 'SYSTEM_BRAVO' }
    ]
  },
  {
    id: 'TRD-08',
    scenario: 'Liquidity_Grab_Delta',
    condition: 'Delta_Divergence',
    profitValue: -620,
    timeValue: 80,
    dateTime: '16.05.2026',
    duration: '20m',
    durationMinutes: 20,
    status: 'LOSS',
    asset: 'BTC/USD',
    session: 'TOKYO',
    direction: 'LONG',
    notes: [
      { id: 'n8-1', text: 'Attempted long on liquidity grab.', timestamp: '16.05 // 13:41', author: 'TRADER' },
      { id: 'n8-2', text: 'Failed breakdown. High slippage on stop execution.', timestamp: '16.05 // 14:01', author: 'SYSTEM_DELTA' }
    ]
  },
  {
    id: 'TRD-09',
    scenario: 'Tactical_Entry_Alpha',
    condition: 'Orderflow_Imbalance',
    profitValue: 1650,
    timeValue: 85,
    dateTime: '16.05.2026',
    duration: '50m',
    durationMinutes: 50,
    status: 'WIN',
    asset: 'AVAX/USD',
    session: 'NEW_YORK',
    direction: 'LONG',
    notes: [
      { id: 'n9-1', text: 'Stacked imbalance on the ask detected by scanner.', timestamp: '16.05 // 23:16', author: 'SYSTEM_ALPHA' },
      { id: 'n9-2', text: 'Clean continuation. Exit on momentum divergence.', timestamp: '16.05 // 00:06', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-10',
    scenario: 'Sniper_Pullback_Bravo',
    condition: 'Volume_Profile_POC',
    profitValue: 430,
    timeValue: 90,
    dateTime: '17.05.2026',
    duration: '18m',
    durationMinutes: 18,
    status: 'WIN',
    asset: 'ETH/USD',
    session: 'LONDON',
    direction: 'SHORT',
    notes: [
      { id: 'n10-1', text: 'Quick scalp off value area low.', timestamp: '17.05 // 08:31', author: 'TRADER' },
      { id: 'n10-2', text: 'Target filled instantly.', timestamp: '17.05 // 08:49', author: 'TRADER' }
    ]
  },
  {
    id: 'TRD-11',
    scenario: 'Breakout_Core_Gamma',
    condition: 'Market_Structure_Break',
    profitValue: -880,
    timeValue: 95,
    dateTime: '17.05.2026',
    duration: '35m',
    durationMinutes: 35,
    status: 'LOSS',
    asset: 'SOL/USD',
    session: 'NEW_YORK',
    direction: 'LONG',
    notes: [
      { id: 'n11-1', text: 'Breakout entry on high timeframe resistance break.', timestamp: '17.05 // 18:01', author: 'TRADER' },
      { id: 'n11-2', text: 'Fakeout trap. Heavy aggressive selling triggered stop loss.', timestamp: '17.05 // 18:36', author: 'SYSTEM_GAMMA' }
    ]
  },
  {
    id: 'TRD-12',
    scenario: 'Liquidity_Grab_Delta',
    condition: 'VWAP_Reclamation',
    profitValue: 3950,
    timeValue: 98,
    dateTime: '17.05.2026',
    duration: '1h 50m',
    durationMinutes: 110,
    status: 'WIN',
    asset: 'BTC/USD',
    session: 'TOKYO',
    direction: 'LONG',
    notes: [
      { id: 'n12-1', text: 'Massive short squeeze reclamation setup.', timestamp: '17.05 // 23:46', author: 'SYSTEM_DELTA' },
      { id: 'n12-2', text: 'Pyramiding executed at VWAP retest.', timestamp: '18.05 // 00:30', author: 'TRADER' },
      { id: 'n12-3', text: 'Full liquidation at macro liquidity pool.', timestamp: '18.05 // 01:36', author: 'TRADER' }
    ]
  }
])

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedScenario.value.length > 0) count += selectedScenario.value.length
  if (selectedCondition.value.length > 0) count += selectedCondition.value.length
  if (selectedAsset.value.length > 0) count += selectedAsset.value.length
  if (selectedStatus.value.length > 0) count += selectedStatus.value.length
  if (selectedDirection.value !== 'ALL') count++
  if (hasDateRangeFilter.value) count++
  if (selectedProfitTier.value !== 'ALL') count++
  if (selectedMarketSession.value !== 'ALL') count++
  if (minTimeMinute.value > ABS_MIN_TIME_MIN || maxTimeMinute.value < ABS_MAX_TIME_MIN) count++
  if (minDuration.value > ABS_MIN_DURATION || maxDuration.value < ABS_MAX_DURATION) count++
  return count
})

watch(activeFilterCount, (count) => {
  if (filtersOnly.value) emit('filters-active-change', count > 0)
}, { immediate: true })

const resetAllFilters = () => {
  selectedScenario.value = []
  selectedCondition.value = []
  selectedAsset.value = []
  selectedStatus.value = []
  selectedDirection.value = 'ALL'
  clearDateRangeFilter()
  selectedProfitTier.value = 'ALL'
  customProfitMin.value = null
  customProfitMax.value = null
  selectedMarketSession.value = 'ALL'
  minTimeMinute.value = ABS_MIN_TIME_MIN
  maxTimeMinute.value = ABS_MAX_TIME_MIN
  minDuration.value = ABS_MIN_DURATION
  maxDuration.value = ABS_MAX_DURATION
}

import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { loadFromDisk } from '~/shared/diskStorage'
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis'

const strategyStore = useStrategyTradesStore()
const genesisTrades = useGenesisTrades()
const genesisMatrix = useGenesisMatrixData()


const resolveTradeStrategyId = (trade: any) => trade.strategyId || strategyStore.selectedStrategyId

const isTradeHidden = (trade: any) => {
  return strategyStore.isTradeHidden(resolveTradeStrategyId(trade), trade.id)
}

const activeTrades = computed(() => {
  if (props.trades) {
    const tradesByStrat: Record<string, any[]> = {}
    props.trades.forEach(t => {
      const sId = t.strategyId || strategyStore.selectedStrategyId
      if (!tradesByStrat[sId]) tradesByStrat[sId] = []
      tradesByStrat[sId].push(t)
    })

    const enrichedTradesMap: Record<string, any> = {}
    for (const sId of Object.keys(tradesByStrat)) {
      const stratTrades = [...(tradesByStrat[sId] || [])].sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0
        const timeB = b.date ? new Date(b.date).getTime() : 0
        return timeA - timeB
      })

      let runningCapital = strategyStore.getInitialDeposit(sId)
      for (const t of stratTrades) {
        const closed = isClosedTradeRecord(t)
        const capAtTrade = runningCapital > 0 ? runningCapital : 1000
        const currencyProfit = closed ? getTradePnl(t, capAtTrade) : 0
        const calcPercent = closed ? Math.round((currencyProfit / capAtTrade) * 10000) / 100 : 0
        
        if (closed) runningCapital += currencyProfit

        enrichedTradesMap[t.id || 'TRD-XX'] = { currencyProfit, calcPercent }
      }
    }

    return props.trades.map(t => {
      const strategyId = resolveTradeStrategyId(t)
      const enriched = enrichedTradesMap[t.id || 'TRD-XX'] || {
        currencyProfit: isClosedTradeRecord(t)
          ? getTradePnl(t, strategyStore.getInitialDeposit(strategyId))
          : 0,
        calcPercent: isClosedTradeRecord(t)
          ? (getTradeResultPercent(t, strategyStore.getInitialDeposit(strategyId)) || 0)
          : 0
      }
      const currencyProfit = enriched.currencyProfit
      const calcPercent = enriched.calcPercent
      const isClosed = isClosedTradeRecord(t)

      const start = t.date ? new Date(t.date).getTime() : Date.now()
      const durationMs = isClosed ? getTradeDurationMs(t) : 0
      const diffMins = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs / 60000)) : 0
      const hours = Math.floor(diffMins / 60)
      const durStr = isClosed ? (hours > 0 ? `${hours}h ${diffMins % 60}m` : `${diffMins}m`) : openTradeText()
      
      const notesArr = Array.isArray(t.notesList)
        ? t.notesList
            .filter((n: any) => n && n.id)
            .map((n: any, idx: number) => ({
              id: n.id || `note-${idx}`,
              text: n.content || '',
              timestamp: n.date ? new Date(n.date).toLocaleDateString() : new Date(start).toLocaleDateString(),
              author: n.title || 'TRADER'
            }))
        : []

      return {
        id: t.id || 'TRD-XX',
        strategyId,
        scenario: t.boardScenarioEntry?.info?.name || t.scenario || 'Tactical_Entry_Alpha',
        condition: t.boardScenarioEntry?.info?.conditions?.[0]?.info?.name || t.boardScenarioEntry?.info?.conditions?.[0]?.name || t.conditions?.[0]?.info?.name || t.conditions?.[0]?.name || t.boardConditions?.[0]?.info?.name || t.boardConditions?.[0]?.name || t.condition || 'Market_Structure_Break',
        boardScenarioEntry: t.boardScenarioEntry,
        boardScenarioExit: t.boardScenarioExit,
        conditions: t.conditions,
        boardConditions: t.boardConditions,
        entryPrice: t.entry !== undefined ? t.entry : (t.entryPrice || 0),
        exitPrice: isClosed ? (t.exit !== undefined ? t.exit : (t.exitPrice || 0)) : '—',
        size: t.size !== undefined ? t.size : (t.positionSize || 1),
        stopLoss: t.stopLoss !== undefined ? t.stopLoss : 0,
        takeProfit: t.takeProfit !== undefined ? t.takeProfit : 0,
        profitInCurrency: currencyProfit,
        isClosed,
        executions: Array.isArray(t.executions) ? t.executions : [],
        dateEntryStr: t.date ? new Date(t.date).toLocaleString() : '10.05.2026, 14:30:00',
        dateExitStr: isClosed && t.dateExit ? new Date(t.dateExit).toLocaleString() : openTradeText(),
        profitValue: calcPercent,
        timeValue: 50,
        dateTime: t.date ? new Date(t.date).toLocaleDateString() : '10.05.2026',
        dateObj: t.date ? new Date(t.date) : new Date(),
        dateRaw: t.date,
        timeZone: t.timeZone || t.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        assetType: t.assetType || t.instrumentType || t.asset?.type || '',
        duration: durStr,
        durationMinutes: diffMins,
        status: isClosed ? (currencyProfit > 0 ? 'WIN' : currencyProfit < 0 ? 'LOSS' : 'SCRATCH') : 'OPEN',
        asset: t.asset || 'BTC/USD',
        direction: t.side ? t.side.toUpperCase() : 'LONG',
        notes: notesArr
      }
    })
  }
  return mockTrades.value.map(t => ({
    ...t,
    entryPrice: (t as any).entryPrice || 50000,
    exitPrice: (t as any).exitPrice || 51250,
    size: (t as any).size || 1,
    stopLoss: (t as any).stopLoss || 49500,
    takeProfit: (t as any).takeProfit || 52000,
    profitInCurrency: getTradePnl(t, strategyStore.getInitialDeposit(resolveTradeStrategyId(t))),
    dateEntryStr: (t as any).dateEntryStr || '10.05.2026, 14:30:00',
    dateExitStr: (t as any).dateExitStr || '10.05.2026, 15:15:00',
    dateObj: new Date(2026, 4, parseInt((t.dateTime || '10.05.2026').split('.')[0] || '10', 10)),
    dateRaw: new Date(2026, 4, parseInt((t.dateTime || '10.05.2026').split('.')[0] || '10', 10), Number((t as any).timeValue || 12) <= 24 ? Number((t as any).timeValue || 12) : Math.floor(Number((t as any).timeValue || 12 * 60) / 60), Number((t as any).timeValue || 0) > 24 ? Number((t as any).timeValue || 0) % 60 : 0),
    timeZone: (t as any).timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }))
})
const matrixNodes = ref<any[]>([])
const matrixConnections = ref<any[]>([])
const matrixZones = ref<any[]>([])

onMounted(async () => {
  window.addEventListener('mousedown', closeFilterDropdownOnOutside)

  try {
    const saved = await loadFromDisk<any>('genesis_matrix_v2')
    if (saved) {
      if (saved.nodes) matrixNodes.value = saved.nodes
      if (saved.connections) matrixConnections.value = saved.connections
      if (saved.zones) matrixZones.value = saved.zones
    }
  } catch (err) {
    console.error('Failed to load matrix nodes:', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousedown', closeFilterDropdownOnOutside)
})

const selectedStrategyId = computed(() => strategyStore.selectedStrategyId)

const selectedScenarioNode = computed(() => {
  if (selectedStrategyId.value === 'MAIN_DIARY') return null
  return matrixNodes.value.find(n => n.id === selectedStrategyId.value)
})

const getNodesForStrategy = (type: string, entryExit = 'ALL') => {
  let candidates: any[] = []
  if (selectedStrategyId.value === 'MAIN_DIARY') {
    candidates = matrixNodes.value.filter(n => n.type === type)
  } else {
    const parent = selectedScenarioNode.value
    if (!parent) return []
    
    const subGraphNodes = parent.subGraph?.nodes || []
    const connectedIds = matrixConnections.value
      .filter(c => c.fromId === parent.id)
      .map(c => c.toId)
    const connectedNodes = matrixNodes.value.filter(n => connectedIds.includes(n.id))
    
    candidates = [...subGraphNodes, ...connectedNodes].filter(n => n.type === type)
  }

  if (entryExit === 'ALL') return candidates

  return candidates.filter(node => {
    return matrixZones.value.some(zone => {
      const isMatch = zone.type.toUpperCase() === entryExit.toUpperCase()
      if (!isMatch) return false
      return (
        node.x >= zone.x &&
        node.x <= zone.x + zone.width &&
        node.y >= zone.y &&
        node.y <= zone.y + zone.height
      )
    })
  })
}

const strategyScenarios = computed(() => {
  return getNodesForStrategy('scenario', 'ALL')
})

const getScenarioConditions = (scenarioId: string) => {
  if (scenarioId.startsWith('default-')) {
    if (scenarioId === 'default-exit-system') {
      return [
        { id: 'cond-exit-tp', name: 'TAKE_PROFIT', description: 'STRATEGIC_PROFIT_CAPTURE_TARGET' },
        { id: 'cond-exit-sl', name: 'STOP_LOSS', description: 'CAPITAL_PRESERVATION_THRESHOLD' },
        { id: 'cond-exit-fl', name: 'FULL_LIQUIDATION', description: 'TOTAL_EXPOSURE_TERMINATION' }
      ]
    }
    return []
  }

  const scenario = matrixNodes.value.find(n => n.id === scenarioId)
  if (!scenario) return []

  const subNodes = scenario.subGraph?.nodes || []
  const subConns = scenario.subGraph?.connections || []

  const connectedIds = [
    ...matrixConnections.value.filter(c => c.fromId === scenarioId).map(c => c.toId),
    ...subConns.filter((c: any) => c.fromId === scenarioId).map((c: any) => c.toId)
  ]
  
  const allConditions = [
    ...matrixNodes.value.filter(n => connectedIds.includes(n.id) && n.type === 'condition'),
    ...subNodes.filter((n: any) => n.type === 'condition' && connectedIds.includes(n.id))
  ]

  const getIndicatorData = (nodeId: string, parentCond: any) => {
     const n = matrixNodes.value.find(node => node.id === nodeId) || 
               subNodes.find((node: any) => node.id === nodeId) ||
               (parentCond.subGraph?.nodes || []).find((node: any) => node.id === nodeId)
               
     if (!n || n.type === 'placeholder') return null
     
     return {
        id: n.id,
        label: (n.params?.customName || n.label).toUpperCase(),
        description: n.params?.description || n.params?.value || n.params?.info || '',
        direction: n.params?.direction,
        priority: parentCond.params?.priority || 'NONE'
     }
  }

  const tacticalUnits: any[] = []

  allConditions.forEach(cond => {
    const structure = cond.params?.logicalStructure || []
    const priority = cond.params?.priority || 'NONE'
    
    if (structure && structure.length > 0) {
      structure.forEach((unit: any) => {
        if (unit.type === 'bundle') {
          const items = unit.nodeIds.map((id: string) => getIndicatorData(id, cond)).filter(Boolean)
          if (items.length > 0) {
            tacticalUnits.push({
              id: `${cond.id}_${unit.logic}_${items[0].id}`,
              name: `${unit.logic}_PROTOCOL`,
              description: `Grouped tactical requirements from ${cond.params?.customName || cond.label}.`,
              priority,
              indicatorUnits: [{
                type: 'bundle',
                logic: unit.logic,
                items
              }]
            })
          }
        } else {
          const item = getIndicatorData(unit.id, cond)
          if (item) {
            tacticalUnits.push({
              id: item.id,
              name: item.label,
              description: item.description,
              direction: item.direction,
              priority,
              indicatorUnits: [{ type: 'single', item }]
            })
          }
        }
      })
    } else {
      const indicatorIds = [
        ...matrixConnections.value.filter(c => c.fromId === cond.id).map(c => c.toId),
        ...subConns.filter((c: any) => c.fromId === cond.id).map((c: any) => c.toId)
      ]
      const indicators = [
        ...matrixNodes.value.filter(n => indicatorIds.includes(n.id)),
        ...subNodes.filter((n: any) => indicatorIds.includes(n.id)),
        ...(cond.subGraph?.nodes || [])
      ]
      
      indicators.forEach(i => {
        const item = {
          id: i.id,
          label: (i.params?.customName || i.label).toUpperCase(),
          description: i.params?.description || i.params?.value || i.params?.info || '',
          direction: i.params?.direction,
          priority
        }
        tacticalUnits.push({
          id: i.id,
          name: item.label,
          description: item.description,
          direction: item.direction,
          priority,
          indicatorUnits: [{ type: 'single', item }]
        })
      })
    }
  })

  return tacticalUnits
}

const formatScenarioFilterLabel = (value: unknown) => {
  const raw = String(value || '').trim()
  const normalized = raw.toUpperCase()
  const defaultScenarioIds = new Set(['TAKE_PROFIT', 'STOP_LOSS', 'FULL_LIQUIDATION'])
  return defaultScenarioIds.has(normalized) ? normalized.replace(/_/g, ' ') : raw
}

const scenariosList = computed(() => {
  const items = new Map<string, string>()
  if (props.trades && props.trades.length > 0) {
    props.trades.forEach(t => { 
      const s = t.boardScenarioEntry?.info?.name || t.scenario
      if (s) items.set(s, formatScenarioFilterLabel(s))
    })
  } else {
    mockTrades.value.forEach((t: any) => { 
      const s = t.boardScenarioEntry?.info?.name || t.scenario
      if (s) items.set(s, formatScenarioFilterLabel(s))
    })
  }

  strategyScenarios.value.forEach(s => {
    const name = (s.params?.customName || s.label || '').toUpperCase()
    if (name) items.set(name, formatScenarioFilterLabel(name))
  })

  // Exit scenarios requested by user
  items.set('TAKE_PROFIT', formatScenarioFilterLabel('TAKE_PROFIT'))
  items.set('STOP_LOSS', formatScenarioFilterLabel('STOP_LOSS'))
  items.set('FULL_LIQUIDATION', formatScenarioFilterLabel('FULL_LIQUIDATION'))

  const list = Array.from(items.entries())
    .sort(([, leftLabel], [, rightLabel]) => leftLabel.localeCompare(rightLabel))
    .map(([id, label]) => ({ id, label }))
  return [{ id: 'ALL', label: 'ALL' }, ...list]
})

const conditionsList = computed(() => {
  const items = new Map<string, string>()
  const addConditionName = (condition: any) => {
    const name = getConditionFilterName(condition)
    if (isVisibleConditionFilterName(name)) items.set(name, name)
  }
  const sourceTrades = (props.trades && props.trades.length > 0) ? props.trades : mockTrades.value
  sourceTrades.forEach((t: any) => {
    if (t.boardScenarioEntry?.info?.conditions && Array.isArray(t.boardScenarioEntry.info.conditions)) {
      t.boardScenarioEntry.info.conditions.forEach(addConditionName)
    }
    if (t.conditions && Array.isArray(t.conditions)) {
      t.conditions.forEach(addConditionName)
    }
    if (t.boardConditions && Array.isArray(t.boardConditions)) {
      t.boardConditions.forEach(addConditionName)
    }
    if (t.condition && typeof t.condition === 'string') {
      addConditionName(t.condition)
    }
  })

  strategyScenarios.value.forEach(scen => {
    getScenarioConditions(scen.id).forEach(c => {
      addConditionName(c)
    })
  })

  const list = Array.from(items.values()).sort().map(s => ({ id: s, label: s }))
  return [{ id: 'ALL', label: 'ALL' }, ...list]
})

watch(conditionsList, (list) => {
  const visibleIds = new Set(list.map(item => item.id))
  selectedCondition.value = selectedCondition.value.filter(id => visibleIds.has(id) && isVisibleConditionFilterName(id))
})

const assetsList = computed(() => {
  const items = new Map<string, string>()
  if (props.trades && props.trades.length > 0) {
    props.trades.forEach(t => { if (t.asset) items.set(t.asset, t.asset) })
  } else {
    mockTrades.value.forEach(t => { if (t.asset) items.set(t.asset, t.asset) })
  }

  matrixNodes.value.filter(n => n.type === 'asset' || n.type === 'data').forEach(n => {
    const name = (n.params?.customName || n.label || '').toUpperCase()
    if (name) items.set(name, name)
  })

  const list = Array.from(items.values()).sort().map(s => ({ id: s, label: s }))
  return [{ id: 'ALL', label: 'ALL' }, ...list]
})

watch(scenariosList, (list) => {
  const visibleIds = new Set(list.map(item => item.id))
  selectedScenario.value = selectedScenario.value.filter(id => visibleIds.has(id))
})

watch(assetsList, (list) => {
  const visibleIds = new Set(list.map(item => item.id))
  selectedAsset.value = selectedAsset.value.filter(id => visibleIds.has(id))
})

watch(statusList, (list) => {
  const visibleIds = new Set(list.map(item => item.id))
  selectedStatus.value = selectedStatus.value.filter(id => visibleIds.has(id))
})

const filterDropdowns = computed(() => [
  { id: 'scenarios', label: locale.value === 'ru' ? 'Сценарии' : 'Scenarios', type: 'options', options: scenariosList.value, isActive: selectedScenario.value.length > 0 },
  { id: 'conditions', label: locale.value === 'ru' ? 'Условия' : 'Conditions', type: 'options', options: conditionsList.value.filter(i => i.id !== 'ALL'), isActive: selectedCondition.value.length > 0 },
  { id: 'direction', label: locale.value === 'ru' ? 'Направление' : 'Direction', type: 'options', options: directionList.value, isActive: selectedDirection.value !== 'ALL' },
  { id: 'asset', label: locale.value === 'ru' ? 'Актив' : 'Asset', type: 'options', options: assetsList.value, isActive: selectedAsset.value.length > 0 },
  { id: 'status', label: locale.value === 'ru' ? 'Статус' : 'Status', type: 'options', options: statusList.value, isActive: selectedStatus.value.length > 0 },
  { id: 'profit', label: locale.value === 'ru' ? 'Уровень прибыли' : 'Profit Tier', type: 'custom', options: [], isActive: selectedProfitTier.value !== 'ALL' },
  { id: 'dateRange', label: locale.value === 'ru' ? 'Диапазон дат' : 'Date Range', type: 'range', options: [], isActive: hasDateRangeFilter.value },
  { id: 'session', label: locale.value === 'ru' ? 'Сессия' : 'Session', type: 'options', options: marketSessionOptions.value, isActive: selectedMarketSession.value !== 'ALL' },
  { id: 'time', label: locale.value === 'ru' ? 'Временное окно' : 'Time Window', type: 'custom', options: [], isActive: hasTimeWindowFilter.value },
  { id: 'duration', label: locale.value === 'ru' ? 'Длительность' : 'Duration Window', type: 'custom', options: [], isActive: hasDurationWindowFilter.value }
])

const filterButtonLabel = (id: string) => {
  if (id === 'scenarios') return selectedScenario.value.length === 0 ? (locale.value === 'ru' ? 'Сценарии' : 'Scenarios') : `${locale.value === 'ru' ? 'Сценарии' : 'Scenarios'} (${selectedScenario.value.length})`
  if (id === 'conditions') return selectedCondition.value.length === 0 ? (locale.value === 'ru' ? 'Условия' : 'Conditions') : `${locale.value === 'ru' ? 'Условия' : 'Conditions'} (${selectedCondition.value.length})`
  if (id === 'direction') return selectedDirection.value === 'ALL' ? (locale.value === 'ru' ? 'Направление' : 'Direction') : directionList.value.find(x => x.id === selectedDirection.value)?.label || selectedDirection.value
  if (id === 'asset') return selectedAsset.value.length === 0 ? (locale.value === 'ru' ? 'Актив' : 'Asset') : `${locale.value === 'ru' ? 'Актив' : 'Asset'} (${selectedAsset.value.length})`
  if (id === 'status') return selectedStatus.value.length === 0 ? (locale.value === 'ru' ? 'Статус' : 'Status') : `${locale.value === 'ru' ? 'Статус' : 'Status'} (${selectedStatus.value.length})`
  if (id === 'profit') return selectedProfitTier.value === 'ALL' ? (locale.value === 'ru' ? 'Уровень прибыли' : 'Profit Tier') : selectedProfitTier.value === 'CUSTOM' ? (locale.value === 'ru' ? 'Польз. Прибыль' : 'Custom Profit') : profitTierOptions.value.find(x => x.id === selectedProfitTier.value)?.label || selectedProfitTier.value
  if (id === 'dateRange') return dateRangeLabel.value
  if (id === 'session') return selectedMarketSession.value === 'ALL' ? (locale.value === 'ru' ? 'Сессия' : 'Session') : marketSessionOptions.value.find(x => x.id === selectedMarketSession.value)?.label || selectedMarketSession.value
  if (id === 'time') return hasTimeWindowFilter.value ? timeWindowLabel.value : (locale.value === 'ru' ? 'Временное окно' : 'Time Window')
  if (id === 'duration') return hasDurationWindowFilter.value ? durationWindowLabel.value : (locale.value === 'ru' ? 'Длительность' : 'Duration Window')
  return id
}

const isDropdownOptionActive = (filterId: string, optionId: string) => {
  if (filterId === 'scenarios') return optionId === 'ALL' ? selectedScenario.value.length === 0 : selectedScenario.value.includes(optionId)
  if (filterId === 'conditions') return selectedCondition.value.includes(optionId)
  if (filterId === 'direction') return selectedDirection.value === optionId
  if (filterId === 'asset') return optionId === 'ALL' ? selectedAsset.value.length === 0 : selectedAsset.value.includes(optionId)
  if (filterId === 'status') return optionId === 'ALL' ? selectedStatus.value.length === 0 : selectedStatus.value.includes(optionId)
  if (filterId === 'session') return selectedMarketSession.value === optionId
  return false
}

const selectDropdownOption = (filterId: string, optionId: string) => {
  const toggleMultiOption = (current: string[], id: string) => {
    if (id === 'ALL') return []
    return current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id]
  }

  if (filterId === 'conditions') {
    selectedCondition.value = selectedCondition.value.includes(optionId)
      ? selectedCondition.value.filter(x => x !== optionId)
      : [...selectedCondition.value, optionId]
    return
  }

  if (filterId === 'scenarios') selectedScenario.value = toggleMultiOption(selectedScenario.value, optionId)
  if (filterId === 'direction') selectedDirection.value = selectedDirection.value === optionId ? 'ALL' : optionId
  if (filterId === 'asset') selectedAsset.value = toggleMultiOption(selectedAsset.value, optionId)
  if (filterId === 'status') selectedStatus.value = toggleMultiOption(selectedStatus.value, optionId)
  if (filterId === 'session') selectedMarketSession.value = selectedMarketSession.value === optionId ? 'ALL' : optionId as MarketSessionId
}

const resetFilterById = (id: string) => {
  if (id === 'scenarios') selectedScenario.value = []
  if (id === 'conditions') selectedCondition.value = []
  if (id === 'direction') selectedDirection.value = 'ALL'
  if (id === 'asset') selectedAsset.value = []
  if (id === 'status') selectedStatus.value = []
  if (id === 'profit') {
    selectedProfitTier.value = 'ALL'
    customProfitMin.value = null
    customProfitMax.value = null
  }
  if (id === 'dateRange') clearDateRangeFilter()
  if (id === 'session') selectedMarketSession.value = 'ALL'
  if (id === 'time') {
    minTimeMinute.value = ABS_MIN_TIME_MIN
    maxTimeMinute.value = ABS_MAX_TIME_MIN
  }
  if (id === 'duration') {
    minDuration.value = ABS_MIN_DURATION
    maxDuration.value = ABS_MAX_DURATION
  }
}

const closeFilterDropdownOnOutside = (event: MouseEvent) => {
  if (!filterBarRef.value) return
  if (!filterBarRef.value.contains(event.target as Node)) openFilterId.value = null
}

const getTradeTimeMinutes = (trade: any) => {
  if (trade.dateObj) return trade.dateObj.getHours() * 60 + trade.dateObj.getMinutes()
  return 12 * 60
}

const filteredTrades = computed(() => {
  return activeTrades.value.filter((trade: any) => {
    if (!showHiddenTrades.value && isTradeHidden(trade)) return false
    if (selectedScenario.value.length > 0) {
      const matchesScenario = selectedScenario.value.some((scenarioId) => {
        const isExitScen = ['TAKE_PROFIT', 'STOP_LOSS', 'FULL_LIQUIDATION'].includes(scenarioId)
        if (isExitScen) {
          const exitName = trade.boardScenarioExit?.info?.name || trade.condition
          return exitName === scenarioId
        }
        return trade.scenario === scenarioId
      })
      if (!matchesScenario) return false
    }
    if (selectedCondition.value.length > 0) {
      let tradeConds: string[] = []
      if (trade.boardScenarioEntry?.info?.conditions && Array.isArray(trade.boardScenarioEntry.info.conditions)) {
        tradeConds.push(...trade.boardScenarioEntry.info.conditions.map(getConditionFilterName).filter(isVisibleConditionFilterName))
      }
      if (trade.conditions && Array.isArray(trade.conditions)) {
        tradeConds.push(...trade.conditions.map(getConditionFilterName).filter(isVisibleConditionFilterName))
      }
      if (trade.boardConditions && Array.isArray(trade.boardConditions)) {
        tradeConds.push(...trade.boardConditions.map(getConditionFilterName).filter(isVisibleConditionFilterName))
      }
      if (tradeConds.length === 0 && trade.condition) {
        const fallbackCondition = getConditionFilterName(trade.condition)
        if (isVisibleConditionFilterName(fallbackCondition)) tradeConds.push(fallbackCondition)
      }
      
      tradeConds = Array.from(new Set(tradeConds.filter(isVisibleConditionFilterName)))
      
      if (conditionMatchMode.value === 'EXACT') {
        if (tradeConds.length !== selectedCondition.value.length) return false
        if (!selectedCondition.value.every(c => tradeConds.includes(c))) return false
      } else {
        if (!selectedCondition.value.every(c => tradeConds.includes(c))) return false
      }
    }
    if (selectedAsset.value.length > 0 && !selectedAsset.value.includes(trade.asset)) return false
    if (selectedStatus.value.length > 0 && !selectedStatus.value.includes(trade.status)) return false
    if (selectedDirection.value !== 'ALL' && trade.direction !== selectedDirection.value) return false
    
    if (hasDateRangeFilter.value) {
      const tradeDate = getTradeDateForRange(trade)
      if (!tradeDate) return false
      const rangeStart = dateRangeStart.value?.getTime() ?? -Infinity
      const rangeEnd = dateRangeEnd.value?.getTime() ?? Infinity
      const min = Math.min(rangeStart, rangeEnd)
      const max = Math.max(rangeStart, rangeEnd)
      if (tradeDate.getTime() < min || tradeDate.getTime() > max) return false
    }

    if (selectedProfitTier.value !== 'ALL') {
      if (!isClosedTradeRecord(trade)) return false
      const p = getResultMetricValue(trade)
      if (selectedProfitTier.value === 'CUSTOM') {
        if (customProfitMin.value !== null && customProfitMin.value !== undefined && customProfitMin.value !== '' as any) {
          if (p < customProfitMin.value) return false
        }
        if (customProfitMax.value !== null && customProfitMax.value !== undefined && customProfitMax.value !== '' as any) {
          if (p > customProfitMax.value) return false
        }
      } else {
        const tier = profitTierOptions.value.find(item => item.id === selectedProfitTier.value)
        if (!tier) return false
        if (tier.min !== undefined && p < tier.min) return false
        if (tier.max !== undefined && p > tier.max) return false
      }
    }

    if (!isTradeInMarketSession(trade)) return false

    const tm = getTradeTimeMinutes(trade)
    if (minTimeMinute.value > ABS_MIN_TIME_MIN && tm < minTimeMinute.value) return false
    if (maxTimeMinute.value < ABS_MAX_TIME_MIN && tm > maxTimeMinute.value) return false

    if (minDuration.value > ABS_MIN_DURATION && trade.durationMinutes < minDuration.value) return false
    if (maxDuration.value < ABS_MAX_DURATION && trade.durationMinutes > maxDuration.value) return false

    return true
  })
})

watch(filteredTrades, (trades) => {
  if (filtersOnly.value) emit('filtered-trades-change', trades)
}, { immediate: true })

const selectedTradeIds = ref<string[]>([])

const selectedTrades = computed(() => {
  return activeTrades.value.filter(t => selectedTradeIds.value.includes(t.id))
})

const hiddenTradesCount = computed(() => {
  return activeTrades.value.filter(trade => isTradeHidden(trade)).length
})

const selectedTradesAreHidden = computed(() => {
  if (selectedTrades.value.length === 0) return false
  return selectedTrades.value.every(trade => isTradeHidden(trade))
})

const toggleHiddenButtonTitle = computed(() => {
  return selectedTradesAreHidden.value
    ? (locale.value === 'ru' ? 'Вернуть скрытые сделки в стратегию' : 'Restore hidden trades into the strategy')
    : (locale.value === 'ru' ? 'Скрыть сделки из стратегии и всех расчетов' : 'Hide trades from the strategy and all analytics')
})

const isAllSelected = computed(() => {
  if (filteredTrades.value.length === 0) return false
  return filteredTrades.value.every(t => selectedTradeIds.value.includes(t.id))
})

const toggleSelectAllTrades = () => {
  if (isAllSelected.value) {
    selectedTradeIds.value = []
  } else {
    selectedTradeIds.value = filteredTrades.value.map(t => t.id)
  }
}

const toggleSelectTrade = (id: string) => {
  if (selectedTradeIds.value.includes(id)) {
    selectedTradeIds.value = selectedTradeIds.value.filter(x => x !== id)
  } else {
    selectedTradeIds.value.push(id)
  }
}

const removeSelectedTrades = async () => {
  if (props.trades && props.trades.length > 0) {
    for (const tId of selectedTradeIds.value) {
      const tradeObj = props.trades.find(t => t.id === tId)
      if (tradeObj) {
        const sId = tradeObj.strategyId || strategyStore.selectedStrategyId
        await strategyStore.removeTrade(sId, tId)
      }
    }
  } else {
    mockTrades.value = mockTrades.value.filter(t => !selectedTradeIds.value.includes(t.id))
  }
  selectedTradeIds.value = []
}

const toggleSelectedTradesHidden = async () => {
  if (selectedTrades.value.length === 0) return

  const hideTrades = !selectedTradesAreHidden.value
  const tradeIdsByStrategy = new Map<string, string[]>()

  selectedTrades.value.forEach(trade => {
    const strategyId = resolveTradeStrategyId(trade)
    const strategyTradeIds = tradeIdsByStrategy.get(strategyId) || []
    strategyTradeIds.push(trade.id)
    tradeIdsByStrategy.set(strategyId, strategyTradeIds)
  })

  for (const [strategyId, tradeIds] of tradeIdsByStrategy.entries()) {
    await strategyStore.setTradesHidden(strategyId, tradeIds, hideTrades)
  }

  selectedTradeIds.value = []
}

</script>

<style scoped lang="postcss">
.filter-input {
  @apply px-2 py-1 text-[9px] bg-transparent border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
