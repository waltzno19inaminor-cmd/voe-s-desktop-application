<script setup>
import { inject } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'

const { locale } = useI18n()

const {
  activeProtocolTab,
  activeMultipleEntries,
  removeMultipleEntry,
  addMultipleEntry,
  hasActiveMethodNode,
  showAutoPrompt,
  toggleAutoPrompt,
  autoEntryBasePrice,
  autoEntryBaseLots,
  sanitizeTradeNumberInput,
  setExitSizeManual,
  confirmAutoGenerate,
  exitEntries,
  removeExitEntry,
  addExitEntry,
  totalSize,
  totalExitSize,
  entryMethodEnabled,
  entryMethodPriceViolations,
  entryMethodPriceViolationMessage,
  averageEntry,
  averageExit
} = inject('tradeState')

const sanitizeInlineNumberInput = (event, target, key) => {
  const raw = String(event?.target?.value ?? '').replace(',', '.')
  let seenDot = false
  const sanitized = raw.split('').filter((char) => {
    if (/\d/.test(char)) return true
    if (char === '.' && !seenDot) {
      seenDot = true
      return true
    }
    return false
  }).join('')

  if (event?.target && event.target.value !== sanitized) event.target.value = sanitized
  if (target && key) target[key] = sanitized
}

const handleExitSizeInput = (event, target) => {
  sanitizeInlineNumberInput(event, target, 'size')
  setExitSizeManual()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col nier-text-primary">
    <div class="min-h-0 flex-1 overflow-y-auto pr-4 pb-10 custom-scrollbar">
      <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex flex-col gap-4 transition-all">
        <div v-for="(ent, idx) in activeMultipleEntries" :key="ent.id" class="flex items-center gap-4">
          <span class="w-6 text-[8px] font-mono font-black tracking-widest opacity-40">#{{ idx + 1 }}</span>
          <div class="flex flex-1 flex-col gap-1">
            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'УРОВЕНЬ ЦЕНЫ' : 'Price Lvl' }}</span>
            <input v-model="ent.price" type="text" inputmode="decimal" placeholder="0.00" :aria-invalid="entryMethodPriceViolations.includes(idx)" class="nier-input w-full border-b border-black/20 pb-1 !text-black dark:border-white/20 dark:!text-white" :class="entryMethodPriceViolations.includes(idx) ? '!border !border-rose-500/80 !bg-rose-500/5 !pl-3 !text-rose-500 dark:!text-rose-300 placeholder:!text-rose-500/40 dark:placeholder:!text-rose-300/30 focus:!border-rose-400' : ''" @input="sanitizeInlineNumberInput($event, ent, 'price')" />
          </div>
          <div class="flex flex-1 flex-col gap-1">
            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РАЗМЕР ЛОТА' : 'Lot Size' }}</span>
            <input v-model="ent.size" type="text" inputmode="decimal" placeholder="0.01" class="nier-input w-full border-b border-black/20 pb-1 !text-black dark:border-white/20 dark:!text-white" @input="sanitizeInlineNumberInput($event, ent, 'size')" />
          </div>
          <button type="button" class="mt-4 flex h-8 w-8 items-center justify-center border border-rose-500/30 text-rose-500 transition-all hover:bg-rose-500 hover:text-white" @click="removeMultipleEntry(ent.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div v-if="entryMethodPriceViolationMessage" class="border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.16em] text-rose-500 dark:text-rose-300">
          {{ entryMethodPriceViolationMessage }}
        </div>

        <div class="mt-2 flex items-center gap-2">
          <button type="button" class="flex flex-1 items-center justify-center gap-2 border border-dashed border-black/20 py-4 text-[9px] font-mono uppercase tracking-widest text-black/40 transition-all hover:border-black hover:text-black dark:border-white/20 dark:text-white/40 dark:hover:border-white dark:hover:text-white" @click="addMultipleEntry">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            {{ locale === 'ru' ? 'ДОБАВИТЬ ПОЗИЦИЮ' : 'Add Position Node' }}
          </button>
          <button v-if="hasActiveMethodNode && !showAutoPrompt && activeMultipleEntries.length === 0" type="button" class="flex flex-1 items-center justify-center gap-2 border border-dashed border-black/50 py-4 text-[9px] font-mono uppercase tracking-widest transition-all hover:bg-black/5 dark:border-white/50 dark:hover:bg-white/5" @click="toggleAutoPrompt">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m13 2-10 12h9l-1 8 10-12h-9l1-8Z" /></svg>
            {{ locale === 'ru' ? 'АВТО' : 'AUTO' }}
          </button>
        </div>

        <div v-if="showAutoPrompt" class="mt-2 flex flex-col gap-3 border border-black/30 bg-black/5 p-3 dark:border-white/30 dark:bg-white/5">
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <span class="mb-1 block text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'Базовая Цена' : 'Base Price' }}</span>
              <input v-model="autoEntryBasePrice" type="text" inputmode="decimal" placeholder="Price..." class="nier-input w-full border-b border-black/30 bg-transparent pb-1 !text-black dark:border-white/30 dark:!text-white" @input="sanitizeTradeNumberInput($event, 'autoEntryBasePrice')" />
            </div>
            <div class="flex-1">
              <span class="mb-1 block text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РАЗМЕР ЛОТА' : 'Lot Size' }}</span>
              <input v-model="autoEntryBaseLots" type="text" inputmode="decimal" placeholder="Lots..." class="nier-input w-full border-b border-black/30 bg-transparent pb-1 !text-black dark:border-white/30 dark:!text-white" @input="sanitizeTradeNumberInput($event, 'autoEntryBaseLots')" />
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="border border-black/30 px-4 py-2 text-[9px] font-mono font-bold uppercase tracking-widest transition-all hover:bg-black hover:text-white dark:border-white/30 dark:hover:bg-white dark:hover:text-black" @click="showAutoPrompt = false">
              {{ locale === 'ru' ? 'ОТМЕНА' : 'CANCEL' }}
            </button>
            <button type="button" class="bg-black/10 px-4 py-2 text-[9px] font-mono font-bold uppercase tracking-widest transition-all hover:bg-black hover:text-white dark:bg-white/10 dark:hover:bg-white dark:hover:text-black" @click="confirmAutoGenerate">
              {{ locale === 'ru' ? 'ПОДТВЕРДИТЬ' : 'CONFIRM' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeProtocolTab === 'EXIT'" class="flex flex-col gap-4 transition-all">
        <div class="flex items-center justify-between gap-4 border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РАЗМЕР ПОЗИЦИИ ИЗ ОСНОВНЫХ' : 'POSITION SIZE FROM MAIN' }}</span>
          <span class="flex items-center gap-3 text-sm font-mono font-black">
            {{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}
            <span v-if="exitEntriesSizeLinked" class="text-[8px] font-mono uppercase tracking-[0.2em] text-emerald-500">{{ locale === 'ru' ? 'СИНХРО' : 'SYNC' }}</span>
          </span>
        </div>
        <div v-for="(ent, idx) in exitEntries" :key="ent.id" class="flex items-center gap-4">
          <span class="w-6 text-[8px] font-mono font-black tracking-widest opacity-40">#{{ idx + 1 }}</span>
          <div class="flex flex-1 flex-col gap-1">
            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'УРОВЕНЬ ВЫХОДА' : 'Exit Lvl' }}</span>
            <input v-model="ent.price" type="text" inputmode="decimal" placeholder="0.00" class="nier-input w-full border-b border-black/20 pb-1 !text-black dark:border-white/20 dark:!text-white" @input="sanitizeInlineNumberInput($event, ent, 'price')" />
          </div>
          <div class="flex flex-1 flex-col gap-1">
            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'РАЗМЕР ЛОТА' : 'Lot Size' }}</span>
            <input v-model="ent.size" type="text" inputmode="decimal" placeholder="0.01" class="nier-input w-full border-b border-black/20 pb-1 !text-black dark:border-white/20 dark:!text-white" @input="handleExitSizeInput($event, ent)" />
          </div>
          <button type="button" class="mt-4 flex h-8 w-8 items-center justify-center border border-rose-500/30 text-rose-500 transition-all hover:bg-rose-500 hover:text-white" @click="removeExitEntry(ent.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <button type="button" :disabled="totalSize - totalExitSize <= 0" class="mt-2 flex w-full items-center justify-center gap-2 border border-dashed py-4 text-[9px] font-mono uppercase tracking-widest transition-all" :class="totalSize - totalExitSize <= 0 ? 'border-black/5 text-black/20 dark:border-white/5 dark:text-white/20' : 'border-black/20 text-black/40 hover:border-black hover:text-black dark:border-white/20 dark:text-white/40 dark:hover:border-white dark:hover:text-white'" @click="addExitEntry">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          {{ totalSize - totalExitSize <= 0 ? (locale === 'ru' ? 'ОБЪЕМ ИСЧЕРПАН' : 'VOLUME DEPLETED') : (locale === 'ru' ? 'ДОБАВИТЬ ВЫХОД' : 'Add Exit Node') }}
        </button>
      </div>
    </div>

    <div class="shrink-0 border-t nier-border-primary pt-6">
      <div v-if="activeProtocolTab === 'PYRAMIDING' || activeProtocolTab === 'AVERAGING_DOWN'" class="flex flex-wrap items-center justify-between gap-6" :class="{ 'opacity-30 grayscale': !entryMethodEnabled }">
        <div class="flex flex-col gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ТЕКУЩАЯ ПОЗИЦИЯ' : 'CURRENT POSITION' }}</span>
          <span class="text-sm font-mono font-black">{{ activeMultipleEntries.length }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВХОДА' : 'Aggregated Avg Entry' }}</span>
          <span class="text-sm font-mono font-black">{{ averageEntry > 0 ? averageEntry.toFixed(5) : '0.00' }}</span>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ' : 'Total Volume' }}</span>
          <span class="text-sm font-mono font-black">{{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
        </div>
      </div>

      <div v-if="activeProtocolTab === 'EXIT'" class="flex flex-wrap items-center justify-between gap-6">
        <div class="flex flex-col gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ТЕКУЩАЯ ПОЗИЦИЯ ВЫХОДА' : 'CURRENT EXIT POSITION' }}</span>
          <span class="text-sm font-mono font-black">{{ exitEntries.length }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'СРЕДНЯЯ ЦЕНА ВЫХОДА' : 'Aggregated Avg Exit' }}</span>
          <span class="text-sm font-mono font-black">{{ averageExit > 0 ? averageExit.toFixed(5) : '0.00' }}</span>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ locale === 'ru' ? 'ОБЩИЙ ОБЪЕМ ВЫХОДА' : 'Total Exit Volume' }}</span>
          <span class="text-sm font-mono font-black" :class="totalExitSize > totalSize ? 'text-rose-500' : ''">
            {{ totalExitSize > 0 ? totalExitSize.toFixed(2) : '0.00' }} <span class="text-xs opacity-40">/ {{ totalSize > 0 ? totalSize.toFixed(2) : '0.00' }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
