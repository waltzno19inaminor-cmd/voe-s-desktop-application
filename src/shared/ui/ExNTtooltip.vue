<template>
  <div
    class="relative inline-block"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="triggerRef"
  >
    <!-- Trigger -->
    <slot name="trigger"></slot>
    
    <!-- Non-Tactical Tooltip Content (Teleported to Body) -->
    <Teleport to="body">
      <Transition name="nt-tooltip-fade">
        <div 
          v-if="isVisible"
          ref="tooltipRef"
          :style="tooltipStyle"
          class="fixed pointer-events-none z-[2147483647]"
        >
          <div class="theme-tooltip-panel border p-6 min-w-[320px] max-w-[450px] flex flex-col space-y-4 relative shadow-[6px_6px_0_0_rgba(0,0,0,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]">
            <div v-if="title" class="flex items-center justify-between border-b theme-tooltip-divider pb-3">
              <span class="text-[10px] font-mono uppercase tracking-[0.4em] font-black">{{ title }}</span>
              <div class="w-2 h-2 bg-current opacity-70 rotate-45"></div>
            </div>
            <div class="text-[12px] font-mono leading-relaxed opacity-100">
              <slot></slot>
            </div>
          </div>
          <!-- Tooltip Stem -->
          <div class="theme-tooltip-stem absolute h-3 w-3"
               :class="stemClass"
               :style="stemStyle"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  title?: string
  disabled?: boolean
}>()

const isVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipPosition = ref<{ left: number, top: number, stemLeft: number, placement: 'top' | 'bottom' }>({
  left: 0,
  top: 0,
  stemLeft: 0,
  placement: 'top'
})
const viewportPadding = 20
const tooltipGap = 24

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const positionTooltip = () => {
  const trigger = triggerRef.value
  if (!trigger || typeof window === 'undefined') return

  const triggerRect = trigger.getBoundingClientRect()
  const tooltipRect = tooltipRef.value?.getBoundingClientRect()
  const tooltipWidth = tooltipRect?.width || 450
  const tooltipHeight = tooltipRect?.height || 160
  const triggerCenterX = triggerRect.left + triggerRect.width / 2
  const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding)
  const left = clamp(triggerCenterX - tooltipWidth / 2, viewportPadding, maxLeft)
  const preferredTop = triggerRect.top - tooltipHeight - tooltipGap
  const fallbackTop = triggerRect.bottom + tooltipGap
  const maxTop = Math.max(viewportPadding, window.innerHeight - tooltipHeight - viewportPadding)
  const top = clamp(preferredTop >= viewportPadding ? preferredTop : fallbackTop, viewportPadding, maxTop)
  const placement = top > triggerRect.top ? 'bottom' : 'top'

  tooltipPosition.value = {
    left: Math.round(left),
    top: Math.round(top),
    stemLeft: Math.round(clamp(triggerCenterX - left, 12, tooltipWidth - 12)),
    placement
  }
}

const handleMouseEnter = () => {
  if (props.disabled) return
  positionTooltip()
  isVisible.value = true
  nextTick(positionTooltip)
}

const handleMouseLeave = () => {
  isVisible.value = false
}

watch(() => props.disabled, (disabled) => {
  if (disabled) isVisible.value = false
})

if (typeof window !== 'undefined') {
  window.addEventListener('resize', positionTooltip, { passive: true })
  window.addEventListener('scroll', positionTooltip, { passive: true })
}

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', positionTooltip)
  window.removeEventListener('scroll', positionTooltip)
})

const tooltipStyle = computed(() => {
  return {
    left: `${tooltipPosition.value.left}px`,
    top: `${tooltipPosition.value.top}px`
  }
})

const stemStyle = computed(() => {
  return {
    left: `${tooltipPosition.value.stemLeft}px`,
    transform: 'translateX(-50%) rotate(45deg)'
  }
})

const stemClass = computed(() => {
  return tooltipPosition.value.placement === 'bottom'
    ? '-top-1.5 border-l border-t'
    : '-bottom-1.5 border-r border-b'
})
</script>

<style scoped>
.nt-tooltip-fade-enter-active,
.nt-tooltip-fade-leave-active {
  transition: opacity 0.18s ease-out;
}

.nt-tooltip-fade-enter-from,
.nt-tooltip-fade-leave-to {
  opacity: 0;
}
</style>
