<script setup lang="ts">
import { toRefs } from 'vue'
import { useExCalendar } from '../../model/useExCalendar'

const props = defineProps<{
  trades: any[]
  initialDeposit: number
  valueMode: 'currency' | 'percentage'
  locale: string
}>()

const { trades, initialDeposit, valueMode, locale } = toRefs(props)

const {
  currentCalendarMonthName,
  calendarDaysOfWeek,
  calendarDays,
  hoveredCalendarDayTooltip,
  nextCalendarMonth,
  prevCalendarMonth,
  currentCalendarMonthIndex,
  calendarMonthsList,
  showCalendarDayTooltip,
  moveCalendarDayTooltip,
  hideCalendarDayTooltip,
  formatCalendarDayValue
} = useExCalendar(
  () => trades.value,
  initialDeposit,
  locale,
  valueMode
)
</script>

<template>
  <!-- CALENDAR OVERLAY -->
  <Transition name="fade">
    <div class="absolute inset-0 z-[100] bg-theme-bg pointer-events-auto flex flex-col font-mono nier-text-primary">
      <div class="relative flex flex-col items-center h-full pt-24 pb-8 px-12 w-full max-w-4xl mx-auto">
        <!-- CALENDAR HEADER -->
        <div class="flex-shrink-0 flex items-center justify-center w-full mb-6 border-b nier-border-primary pb-6">
          <h2 class="text-3xl font-black tracking-[0.2em] uppercase">{{ currentCalendarMonthName }}</h2>
        </div>

        <!-- CALENDAR GRID -->
        <div class="w-full flex-1 min-h-0 flex flex-col">
          <div class="flex-shrink-0 grid grid-cols-7 gap-4 mb-4 text-center text-[10px] uppercase tracking-widest opacity-50">
            <div v-for="d in calendarDaysOfWeek" :key="d">{{ d }}</div>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
            <div class="grid grid-cols-7 gap-4 pb-4">
              <div v-for="(day, idx) in calendarDays" :key="idx" 
                 class="calendar-day-cell relative aspect-square border transition-all duration-300"
                 :class="[
                   !day.isInMonth ? 'border-transparent bg-transparent' : 
                   day.tradesCount === 0 ? 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5' :
                   day.pnl > 0 ? 'border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10' :
                   day.pnl < 0 ? 'border-red-500/30 bg-red-500/10' :
                   'border-yellow-500/30 bg-yellow-500/10'
                 ]"
                 @mouseenter="showCalendarDayTooltip($event, day)"
                 @mousemove="moveCalendarDayTooltip($event, day)"
                 @mouseleave="hideCalendarDayTooltip">
              <template v-if="day.isInMonth">
                <div class="absolute top-2 right-2 text-[10px] opacity-40 font-bold" :class="{ 'nier-text-primary opacity-100': day.isToday }">{{ day.dayNum }}</div>
                
                <div v-if="day.tradesCount > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="calendar-day-result font-black"
                        :title="formatCalendarDayValue(day)"
                        :class="day.pnl > 0 ? 'nier-text-primary' : day.pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'">
                    {{ formatCalendarDayValue(day) }}
                  </span>
                  <span class="text-[9px] uppercase tracking-widest opacity-50 mt-1">{{ day.tradesCount }} TRADES</span>
                </div>
              </template>
            </div>
          </div>
          </div>
        </div>

        <!-- CALENDAR FOOTER -->
        <div class="flex-shrink-0 flex items-center justify-center w-full mt-6">
          <!-- Pagination — centered -->
          <div class="flex items-center space-x-2">
            <button @click="prevCalendarMonth" 
                    class="w-7 h-7 flex items-center justify-center border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20"
                    :disabled="currentCalendarMonthIndex <= 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button @click="nextCalendarMonth" 
                    class="w-7 h-7 flex items-center justify-center border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-20"
                    :disabled="currentCalendarMonthIndex >= calendarMonthsList.length - 1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <Teleport to="body">
    <Transition name="tooltip-dist-fade">
      <div v-if="hoveredCalendarDayTooltip"
           class="theme-tooltip-panel fixed z-[2147483647] pointer-events-none border px-5 py-4 min-w-[240px] shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
           :style="{ left: hoveredCalendarDayTooltip.x + 'px', top: hoveredCalendarDayTooltip.y + 'px' }">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-black/10 dark:border-white/10">
          <div class="text-[10px] font-mono uppercase tracking-[0.32em] opacity-40">{{ hoveredCalendarDayTooltip.date }}</div>
          <div class="text-[13px] font-mono font-black tracking-[0.12em] whitespace-nowrap ml-4"
               :class="hoveredCalendarDayTooltip.pnl > 0 ? 'nier-text-primary' : hoveredCalendarDayTooltip.pnl < 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'">
            {{ hoveredCalendarDayTooltip.value }}
          </div>
        </div>
        <div class="flex flex-col space-y-2">
          <div v-for="(trade, idx) in hoveredCalendarDayTooltip.trades" :key="idx"
               class="flex items-center justify-between text-[11px] font-mono gap-4">
            <div class="flex items-center space-x-3">
              <span class="opacity-40">{{ new Date(trade.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
              <span class="opacity-80 font-bold">{{ trade.asset || 'UNKNOWN' }}</span>
            </div>
            <span class="font-black whitespace-nowrap" :class="(trade.profitInCurrency || 0) > 0 ? 'text-emerald-500' : (trade.profitInCurrency || 0) < 0 ? 'text-rose-500' : 'text-white'">
              {{ (trade.profitInCurrency || 0) > 0 ? '+' : '' }}{{ (trade.profitInCurrency || 0).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
