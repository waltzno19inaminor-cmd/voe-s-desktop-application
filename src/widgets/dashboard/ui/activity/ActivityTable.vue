<template>
  <div class="bg-transparent rounded-2xl border border-black/5 dark:border-white/5 p-6 md:p-10 relative overflow-hidden group/board font-sans">
    
    <!-- Background subtle ambient glow - softened -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-slate-500/5 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none group-hover/board:bg-slate-500/10 dark:group-hover/board:bg-white/10 transition-colors duration-1000"></div>

    <div class="relative z-10">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 class="text-2xl font-bold text-[#050505] dark:text-white flex items-center gap-3 mb-1 tracking-tight">
            Activity Log
          </h2>
          <p class="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#888] dark:text-[#555]">
            Session Consistency & Focus
          </p>
        </div>
        
        <div class="flex items-center gap-6">
          <div class="text-right">
            <span class="block text-[10px] uppercase tracking-widest text-[#888] dark:text-[#555] font-bold mb-1">Current Streak</span>
            <div class="flex items-center justify-end gap-2">
              <span class="text-2xl font-medium text-[#050505] dark:text-white leading-none">{{ currentStreak }}</span>
              <div class="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full opacity-60"><path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.41-1.09-2.12-1.61.12-.07.26-.14.37-.24.58-.51.85-1.29.58-2.03-.1-.31-.24-.59-.47-.83-.84-.9-2.28-1-3.37-.36-.4.23-.74.55-.99.94C10.15 7.42 10.02 8.7 10.3 9.6c.03.11.05.21.05.33 0 .22-.19.43-.45.43-.13 0-.27-.06-.34-.14-.23-.27-.33-.63-.44-.98-.18-.58-.3-1.15-.36-1.74 0-.17-.02-.34-.14-.46-.07-.07-.12-.13-.19-.13-.08 0-.15.06-.21.12-.47.45-.8 1.01-1.01 1.62-.25.7-.35 1.5-.08 2.22.06.18.15.36.26.52.27.42.59.81.95 1.14.73.66 1.57 1.2 2.3 1.89.7.67 1.34 1.45 1.57 2.4.08.33.12.68.12 1.02 0 .61-.13 1.23-.41 1.77-.32.61-.83 1.1-1.4 1.44-.09.05-.18.1-.25.17-.14.12-.11.23-.05.33.26.43.68.74 1.14.88.59.18 1.23.16 1.83.02.6-.14 1.18-.46 1.62-.91.49-.49.88-1.06 1.13-1.7.27-.68.32-1.44.25-2.18-.04-.61-.19-1.22-.49-1.76-.3-.54-.69-1.02-1.12-1.46-.37-.4-.78-.77-1.18-1.14-.14-.14-.26-.29-.41-.42-.07-.07-.1-.13-.05-.22.12-.22.42-.25.56-.05.81.82 1.65 1.62 2.29 2.58.11.17.38.2.53.07.13-.1.17-.25.16-.4-.05-.44-.31-.83-.54-1.21z" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Heatmap Grid -->
      <div class="mb-12">
        <div class="flex justify-between items-center mb-4 border-b border-black/5 dark:border-white/5 pb-2">
          <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-[#888] dark:text-[#444]">Historical Consistency</span>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-[2px] bg-[#050505] dark:bg-white/80"></div>
            <span class="text-[8px] uppercase tracking-widest text-[#aaa] dark:text-[#333] font-bold">Logged Session</span>
          </div>
        </div>
        
        <div ref="heatmapContainer" class="overflow-x-auto pb-4 pt-10 scrollbar-hide">
          <div class="grid grid-flow-col grid-rows-7 gap-1.5 min-w-max px-10">
            <div 
              v-for="cell in heatmapCells" 
              :key="cell.date"
              class="w-3.5 h-3.5 rounded-[3px] transition-all duration-700 relative group hover:z-50"
              :class="[
                cell.active 
                  ? 'bg-[#050505] dark:bg-white shadow-[0_0_12px_rgba(255,255,255,0.1)]' 
                  : 'bg-black/5 dark:bg-white/[0.03] hover:bg-black/10 dark:hover:bg-white/[0.07]',
                cell.isFuture ? 'opacity-20' : ''
              ]"
              @mouseenter="e => handleMouseEnter(e, cell)"
              @mouseleave="handleMouseLeave"
            >
            </div>
          </div>
        </div>
      </div>

      <!-- Check-in Action -->
      <div class="mt-8 flex flex-col md:flex-row items-center gap-8">
        
        <div class="grow w-full">
           <div class="relative">
             <textarea
               v-model="todaysNote"
               rows="2"
               placeholder="Briefly describe your today's objective..."
               class="w-full bg-transparent border-b nier-border-primary py-2 text-sm text-[#050505] dark:text-white placeholder:text-[#999] dark:placeholder:text-[#333] focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none italic font-sans"
             ></textarea>
           </div>
        </div>

        <div class="shrink-0 relative">
          <!-- Reward Aura - Softened -->
          <transition name="pop">
            <div v-if="showingReward" class="absolute inset-0 bg-slate-400 dark:bg-white rounded-full blur-2xl opacity-20 animate-ping"></div>
          </transition>

          <button 
            @click="handleCheckIn"
            :disabled="isSubmittingActivity || checkInUsedToday"
            class="relative z-10 overflow-hidden h-14 min-w-44 px-8 rounded-full transition-all duration-500 transform active:scale-95 disabled:opacity-50"
            :class="[
              checkInUsedToday 
                ? 'nier-bg-inverted text-white dark:text-[#050505] shadow-lg shadow-black/10 dark:shadow-white/5' 
                : 'bg-transparent border border-black/20 dark:border-white/20 text-[#050505] dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-[#050505] hover:border-transparent'
            ]"
          >
            <div class="flex items-center justify-center gap-3">
              <span v-if="isSubmittingActivity" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <template v-else>
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold">
                  {{ checkInUsedToday ? 'Active' : 'Start Session' }}
                </span>
                <svg v-if="checkInUsedToday" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-4 h-4"><path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </template>
            </div>

            <!-- Subtle Shine -->
            <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/board:animate-[shine_1.8s_ease-in-out]"></div>
          </button>
        </div>
      </div>

      <!-- Private Note -->
      <div class="mt-12 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 text-[#aaa] dark:text-[#444]"><path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm11 13H4v-8h16v8zm-8-5a2 2 0 100 4 2 2 0 000-4z"/></svg>
            <span class="text-[9px] uppercase tracking-widest text-[#aaa] dark:text-[#333] font-bold">Encrypted activity record</span>
        </div>
        <span v-if="checkInUsedToday" class="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Session authenticated</span>
      </div>
    </div>

    <!-- Global Tooltip Teleport -->
    <Teleport to="body">
      <div 
        v-if="tooltipState.show"
        class="fixed px-2 py-1.5 bg-[#050505] dark:bg-white text-white dark:text-[#050505] text-[8px] rounded-md pointer-events-none whitespace-nowrap z-[9999] uppercase tracking-widest font-bold shadow-2xl transition-all duration-200"
        :style="{ 
          left: `${tooltipState.x}px`, 
          top: `${tooltipState.y}px`,
          transform: 'translate(-50%, -100%) translateY(-10px)'
        }"
      >
        {{ tooltipState.content }}
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/entities/user/auth.store'
import { useForumStore } from '~/features/store/useForum'
import { submitDailyActivity, isSubmittingActivity, calculateStreak, type DailyActivity } from '../../model/useActivity'

const auth = useAuthStore()
const forum = useForumStore()

const activeUserId = computed(() => auth.user?.uid)
const activeUser = computed(() => activeUserId.value ? forum.users.get(activeUserId.value) : null)

const getTodayDateString = () => {
    const d = new Date()
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0] || ''
}

const todayStr = getTodayDateString()
const todaysNote = ref('')
const showingReward = ref(false)
const heatmapContainer = ref<HTMLElement | null>(null)

const tooltipState = ref({
    show: false,
    x: 0,
    y: 0,
    content: ''
})

const handleMouseEnter = (event: MouseEvent, cell: any) => {
    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    
    let statusText = cell.active ? 'Active Session' : 'No Activity'
    if (cell.isFuture) statusText = 'Upcoming'

    tooltipState.value = {
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top,
        content: `${cell.label} • ${statusText}`
    }
}

const handleMouseLeave = () => {
    tooltipState.value.show = false
}

const dailyActivityList = computed<DailyActivity[]>(() => activeUser.value?.dailyActivity || [])
const checkInUsedToday = computed(() => dailyActivityList.value.some(a => a.date === todayStr))
const currentStreak = computed(() => calculateStreak(dailyActivityList.value))

// Generate Heatmap Data (approx 18 weeks)
const heatmapCells = computed(() => {
    const cells = []
    const now = new Date()
    
    // Calculate how many days to show (approx 18 weeks)
    const totalDays = 126 
    
    // Find the end of the current week (Saturday = 6)
    const dayOfWeek = now.getDay() // 0-6 (Sun-Sat)
    const daysToEndOfWeek = 6 - dayOfWeek
    
    // Total cells = past days + today + future days in the same week
    // We want the total to be a multiple of 7 for a clean grid
    const totalVisible = totalDays + daysToEndOfWeek
    
    for (let i = totalVisible; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i + daysToEndOfWeek)
        
        const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
        const isFuture = d > now
        const activity = !isFuture ? dailyActivityList.value.find(a => a.date === dateStr) : null
        
        cells.push({
            date: dateStr,
            active: !!activity,
            isFuture,
            label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
        })
    }
    return cells
})

// Initialize todaysNote if it already exists
watch(dailyActivityList, (newList) => {
    const todayEntry = newList.find(a => a.date === todayStr)
    if (todayEntry && !todaysNote.value) {
        todaysNote.value = todayEntry.note
    }
}, { immediate: true })

const handleCheckIn = async () => {
    const userId = activeUserId.value
    if (!userId) return
    
    await submitDailyActivity(userId, todaysNote.value, todayStr)
    
    // Optimistic update
    if (activeUser.value) {
        const list = [...(activeUser.value.dailyActivity || [])]
        const idx = list.findIndex((a: DailyActivity) => a.date === todayStr)
        if (idx >= 0 && list[idx]) list[idx].note = todaysNote.value
        else list.push({ date: todayStr, note: todaysNote.value })
        activeUser.value.dailyActivity = list
    }
    
    // Reward animation
    showingReward.value = true
    setTimeout(() => {
        showingReward.value = false
    }, 1500)
}

import { onMounted } from 'vue'
onMounted(() => {
    if (heatmapContainer.value) {
        heatmapContainer.value.scrollLeft = heatmapContainer.value.scrollWidth
    }
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes shine {
  100% {
    transform: translateX(100%);
  }
}

.pop-enter-active {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: opacity 0.4s ease;
}
.pop-leave-to {
  opacity: 0;
}

@keyframes pop-in {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
