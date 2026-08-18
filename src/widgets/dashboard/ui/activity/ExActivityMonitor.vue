<template>
  <div class="w-full h-full flex items-center justify-center p-4 md:p-8 xl:p-10 relative">

    <!-- Activity Matrix Container -->
    <div class="w-full h-full max-w-[1500px] p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden relative">
      
      <!-- Header Section -->
      <div class="flex flex-col items-center mb-12 md:mb-14 text-center z-10 w-full">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-serif uppercase tracking-[0.18em] mb-5">{{ t('activityMonitor.title') }}</h1>
        <p class="text-xs md:text-sm font-mono uppercase tracking-[0.36em] text-[#2c2c2a] max-w-3xl">{{ t('activityMonitor.subtitle') }}</p>
      </div>

      <!-- The Grid Aspect Ratio Wrapper -->
      <div 
        class="grid grid-flow-col grid-rows-7 gap-[3px] md:gap-[5px]"
        style="aspect-ratio: 52 / 7; width: min(100%, 1480px); max-height: min(36vh, 260px); height: auto;"
      >
        <ExTooltip v-for="cell in heatmapCells" :key="cell.date" position="top" :is-dark="isDark">
          <template #trigger>
            <div 
              class="w-full h-full border transition-all duration-700 rounded-[1px] md:rounded-sm hover:bg-theme-text/20"
              :class="[
                cell.active 
                  ? 'bg-[#050505] dark:bg-white border-black/15 dark:border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.1)]' 
                  : 'bg-[#2c2c2a]/35 border-[#2c2c2a]/25 opacity-20 dark:bg-[#1f1f1f] dark:border-white/10'
              ]"
            ></div>
          </template>
          <template #default>
            <div class="flex flex-col space-y-1">
              <span class="opacity-50">{{ t('activityMonitor.archiveDate') }} {{ cell.label }}</span>
              <span v-if="cell.note" class="italic opacity-80 mt-1 font-sans">"{{ cell.note }}"</span>
            </div>
          </template>
        </ExTooltip>
      </div>

    </div>

    <!-- Action Button (Absolute Bottom) -->
    <div class="absolute bottom-6 md:bottom-8 left-0 w-full flex justify-center pointer-events-none">
      <div class="pointer-events-auto flex flex-col items-center gap-4">
        <ExButton 
           variant="tactical" 
           @click="handleCheckIn" 
           :disabled="isSubmittingActivity || checkInUsedToday"
           :class="[
             '!bg-[#050505] !text-white !border-black',
             checkInUsedToday && isDark ? '!bg-white !text-[#050505] !opacity-100' : '',
             checkInUsedToday && !isDark ? '!bg-[#050505] !text-white !opacity-100' : ''
           ]"
        >
           {{ isSubmittingActivity ? t('activityMonitor.initializing') : (checkInUsedToday ? t('activityMonitor.sessionActive') : t('activityMonitor.initializeSession')) }}
        </ExButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { useThemeStore } from '~/features/store/useTheme'
import { useAuthStore } from '~/entities/user/auth.store'
import { useForumStore } from '~/features/store/useForum'
import { submitDailyActivity, isSubmittingActivity, calculateStreak, type DailyActivity } from '~/widgets/dashboard/model/useActivity'

const emit = defineEmits(['exit'])

const { t } = useI18n()

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

const auth = useAuthStore()
const forum = useForumStore()

const activeUserId = computed(() => auth.user?.uid)

onMounted(async () => {
    if (activeUserId.value) {
        await forum.fetchUser(activeUserId.value)
    }
})

watch(activeUserId, async (newVal) => {
    if (newVal) {
        await forum.fetchUser(newVal)
    }
})
const activeUser = computed(() => activeUserId.value ? forum.users.get(activeUserId.value) : null)
const dailyActivityList = computed<DailyActivity[]>(() => activeUser.value?.dailyActivity || [])

const getTodayDateString = () => {
    const d = new Date()
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0] || ''
}

const todayStr = getTodayDateString()
const todaysNote = ref('')

const checkInUsedToday = computed(() => dailyActivityList.value.some(a => a.date === todayStr))

const heatmapCells = computed(() => {
    const cells = []
    const now = new Date()
    
    const totalDays = 364
    const dayOfWeek = now.getDay()
    const daysToEndOfWeek = 6 - dayOfWeek
    const totalVisible = totalDays - 1
    
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
            label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d),
            note: activity?.note || ''
        })
    }
    return cells
})

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
    
    if (activeUser.value) {
        const list = [...(activeUser.value.dailyActivity || [])]
        const idx = list.findIndex(a => a.date === todayStr)
        if (idx >= 0 && list[idx]) {
            list[idx].note = todaysNote.value
        } else {
            list.push({ date: todayStr, note: todaysNote.value })
        }
        activeUser.value.dailyActivity = list
    }
}
</script>

<style scoped>
</style>
