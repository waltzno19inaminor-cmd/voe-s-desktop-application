import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { getTradeCashPnl } from '~/widgets/genesis/model/tradePnl'

export interface CalendarDay {
  dateStr: string
  dayNum: number
  pnl: number
  pnlPercent: number
  tradesCount: number
  isToday: boolean
  isInMonth: boolean
  trades: any[]
}

export function useExCalendar(
  getTrades: () => any[],
  initialDeposit: Ref<number>,
  locale: Ref<string>,
  calendarValueMode: Ref<'currency' | 'percentage'>
) {
  const currentCalendarMonthStr = ref('') // Format: 'YYYY-MM'
  const hoveredCalendarDayTooltip = ref<{ x: number; y: number; value: string; date: string; pnl: number, trades: any[] } | null>(null)

  const isRu = computed(() => locale.value === 'ru')

  // Group all trades by YYYY-MM
  const calendarMonthsList = computed(() => {
    const months = new Set<string>()
    const currentTrades = getTrades()
    currentTrades.forEach(trade => {
      const dVal = trade.dateExit || trade.date
      const date = dVal instanceof Date ? dVal : new Date(dVal)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        months.add(`${year}-${month}`)
      }
    })
    const sorted = Array.from(months).sort()
    return sorted.length ? sorted : ['2023-01']
  })

  watch(calendarMonthsList, (newList) => {
    if (newList.length > 0 && !currentCalendarMonthStr.value) {
      currentCalendarMonthStr.value = newList[newList.length - 1]!
    } else if (newList.length === 0) {
      currentCalendarMonthStr.value = ''
    }
  }, { immediate: true })

  const currentCalendarMonthIndex = computed(() => {
    return calendarMonthsList.value.indexOf(currentCalendarMonthStr.value)
  })

  const nextCalendarMonth = () => {
    const idx = currentCalendarMonthIndex.value
    if (idx < calendarMonthsList.value.length - 1) {
      currentCalendarMonthStr.value = calendarMonthsList.value[idx + 1]!
    }
  }

  const prevCalendarMonth = () => {
    const idx = currentCalendarMonthIndex.value
    if (idx > 0) {
      currentCalendarMonthStr.value = calendarMonthsList.value[idx - 1]!
    }
  }

  const currentCalendarMonthName = computed(() => {
    if (!currentCalendarMonthStr.value) {
      return locale.value === 'ru' ? 'НЕТ ДАННЫХ' : 'NO DATA'
    }
    const [y, m] = currentCalendarMonthStr.value.split('-')
    const date = new Date(parseInt(y!), parseInt(m!) - 1, 1)
    const loc = locale.value === 'ru' ? 'ru-RU' : 'en-US'
    return date.toLocaleString(loc, { month: 'long', year: 'numeric' })
  })

  const calendarDaysOfWeek = computed(() => {
    return locale.value === 'ru' 
      ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] 
      : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  })

  function formatCalendarDayValue(day: CalendarDay) {
    const sign = day.pnl > 0 ? '+' : ''
    if (calendarValueMode.value === 'currency') {
      return `${sign}${day.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
    }
    return `${sign}${day.pnlPercent.toFixed(2)}%`
  }

  function getCalendarTradePnl(trade: any) {
    return getTradeCashPnl(trade, initialDeposit.value || 1000)
  }

  function setCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
    if (!day.isInMonth || day.tradesCount <= 0) {
      hoveredCalendarDayTooltip.value = null
      return
    }
    hoveredCalendarDayTooltip.value = {
      x: event.clientX + 16,
      y: event.clientY + 16,
      value: formatCalendarDayValue(day),
      date: day.dateStr,
      pnl: day.pnl,
      trades: day.trades || []
    }
  }

  function showCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
    setCalendarDayTooltip(event, day)
  }

  function moveCalendarDayTooltip(event: MouseEvent, day: CalendarDay) {
    setCalendarDayTooltip(event, day)
  }

  function hideCalendarDayTooltip() {
    hoveredCalendarDayTooltip.value = null
  }

  const calendarDays = computed(() => {
    if (!currentCalendarMonthStr.value) return []
    const [y, m] = currentCalendarMonthStr.value.split('-')
    const year = parseInt(y!)
    const month = parseInt(m!) - 1
    
    // Get trades for this month
    const currentTrades = getTrades()
    const tradesForMonth = currentTrades.filter(trade => {
      const dVal = trade.dateExit || trade.date
      const date = dVal instanceof Date ? dVal : new Date(dVal)
      return date.getFullYear() === year && date.getMonth() === month
    })
    
    // Map day -> stats
    const dayStats = new Map<number, { pnl: number, count: number, trades: any[] }>()
    tradesForMonth.forEach(trade => {
      const dVal = trade.dateExit || trade.date
      const date = dVal instanceof Date ? dVal : new Date(dVal)
      const day = date.getDate()
      
      if (!dayStats.has(day)) {
        dayStats.set(day, { pnl: 0, count: 0, trades: [] })
      }
      const stat = dayStats.get(day)!
      stat.pnl += getCalendarTradePnl(trade)
      stat.count++
      stat.trades.push(trade)
    })

    // Build grid
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday
    
    const days: CalendarDay[] = []
    
    // Pad beginning
    const startPad = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Make Monday = 0
    for (let i = 0; i < startPad; i++) {
      days.push({ dateStr: '', dayNum: 0, pnl: 0, pnlPercent: 0, tradesCount: 0, isToday: false, isInMonth: false, trades: [] })
    }
    
    const today = new Date()
    
    for (let i = 1; i <= daysInMonth; i++) {
      const stat = dayStats.get(i)
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i
      const pnl = stat ? stat.pnl : 0
      days.push({
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayNum: i,
        pnl,
        pnlPercent: (pnl / initialDeposit.value) * 100,
        tradesCount: stat ? stat.count : 0,
        isToday,
        isInMonth: true,
        trades: stat ? stat.trades : []
      })
    }
    
    return days
  })

  return {
    currentCalendarMonthStr,
    currentCalendarMonthIndex,
    calendarMonthsList,
    currentCalendarMonthName,
    calendarDaysOfWeek,
    calendarDays,
    hoveredCalendarDayTooltip,
    nextCalendarMonth,
    prevCalendarMonth,
    showCalendarDayTooltip,
    moveCalendarDayTooltip,
    hideCalendarDayTooltip,
    formatCalendarDayValue,
    getCalendarTradePnl
  }
}
