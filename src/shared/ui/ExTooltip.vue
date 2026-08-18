<template>
  <div 
    class="relative inline-block"
    v-bind="$attrs"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="triggerRef"
  >
    <!-- Trigger -->
    <slot name="trigger"></slot>
    
    <!-- Tooltip Content (Teleported to Body) -->
    <Teleport to="body">
      <Transition name="tooltip-fade">
        <div 
          v-if="isVisible"
          ref="tooltipRef"
          :style="tooltipStyle"
          class="fixed pointer-events-none z-[2147483647] transition-colors duration-500"
          :class="[isDark ? 'is-dark theme-tooltip-dark' : 'theme-tooltip-light']"
        >
          <div v-if="variant === 'tactical'" class="theme-tooltip-panel border-2 p-7 min-w-[390px] relative shadow-[6px_6px_0_0_rgba(0,0,0,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]">
            <div class="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 theme-tooltip-divider"></div>
            <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 theme-tooltip-divider"></div>
            <div class="flex flex-col space-y-5">
              <h4 v-if="title" class="text-[17px] font-mono font-black uppercase tracking-[0.5em] border-b theme-tooltip-divider pb-3">{{ title }}</h4>
              <p class="text-[14px] font-mono leading-loose uppercase tracking-widest opacity-100">
                <slot></slot>
              </p>
            </div>
          </div>

          <!-- BASIC VARIANT -->
          <div v-else class="flex flex-col" :class="effectivePlacement === 'bottom' ? 'flex-col' : 'flex-col-reverse'">
            <!-- Arrow stem: sibling of the box, sits outside it -->
            <div class="flex" :style="{ paddingLeft: stemStyle.left, boxSizing: 'content-box' }">
              <div
                class="theme-tooltip-stem w-3 h-3 shrink-0 -ml-[6px]"
                :class="effectivePlacement === 'bottom'
                  ? 'border-l border-t'
                  : 'border-r border-b'"
                :style="{ transform: 'rotate(45deg)', marginBottom: effectivePlacement === 'bottom' ? '-6px' : '0', marginTop: effectivePlacement !== 'bottom' ? '-6px' : '0', opacity: 1 }"
              ></div>
            </div>
            <div class="theme-tooltip-panel border p-5 min-w-[200px] flex flex-col space-y-2 relative shadow-[6px_6px_0_0_rgba(0,0,0,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]">
              <div v-if="title" class="flex items-center justify-between border-b theme-tooltip-divider pb-2">
                <span class="text-[11px] font-mono uppercase tracking-[0.3em] font-black">{{ title }}</span>
                <div class="w-2 h-2 bg-current opacity-70 rotate-45"></div>
              </div>
              <p class="text-[13px] font-mono leading-relaxed opacity-100">
                <slot></slot>
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  title: String,
  isDark: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'basic',
    validator: (v) => ['basic', 'tactical'].includes(v)
  },
  forceShow: {
    type: Boolean,
    default: false
  },
  scale: {
    type: Number,
    default: 1
  },
  placement: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const isVisible = ref(false)
const triggerPos = ref({ x: 0, y: 0, width: 0, height: 0 })
const triggerRef = ref(null)
const tooltipRef = ref(null)
const tooltipSize = ref({ width: 0, height: 0 })
const viewportSize = ref({
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0
})

const baseTooltipWidth = computed(() => props.variant === 'tactical' ? 600 : 300)
const tooltipWidth = computed(() => {
  const margin = 16
  if (typeof window === 'undefined') return baseTooltipWidth.value
  return Math.min(baseTooltipWidth.value, Math.max(180, viewportSize.value.width - (margin * 2)))
})

const measureTooltip = async () => {
  await nextTick()
  if (!tooltipRef.value) return
  const rect = tooltipRef.value.getBoundingClientRect()
  tooltipSize.value = {
    width: rect.width || tooltipWidth.value,
    height: rect.height || tooltipSize.value.height
  }
}

const updateViewportSize = () => {
  if (typeof window === 'undefined') return
  viewportSize.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  if (isVisible.value) {
    updateTriggerPosition()
    measureTooltip()
  }
}

const updateTriggerPosition = () => {
  if (triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    triggerPos.value = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    }
  }
}

const handleMouseEnter = () => {
  if (props.disabled) return
  updateTriggerPosition()
  isVisible.value = true
  measureTooltip()
}

const handleMouseLeave = () => isVisible.value = false

watch(() => props.forceShow, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      handleMouseEnter()
    }, 0)
  } else {
    handleMouseLeave()
  }
}, { immediate: true })

if (typeof window !== 'undefined') {
  window.addEventListener('resize', updateViewportSize, { passive: true })
  window.addEventListener('scroll', updateViewportSize, { passive: true })
}

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('scroll', updateViewportSize)
})

const tooltipStyle = computed(() => {
  // Center above/below the trigger element
  const centerX = triggerPos.value.x + (triggerPos.value.width / 2)
  const topY = triggerPos.value.y
  const bottomY = triggerPos.value.y + triggerPos.value.height

  const w = tooltipWidth.value
  const measuredHeight = tooltipSize.value.height
  const estimatedHeight = props.variant === 'tactical' ? 280 : 220
  const h = measuredHeight || estimatedHeight
  const margin = 16
  const gap = 20

  // Center-align by default
  let left = centerX - (w / 2)
  
  // Strict viewport clamping
  if (left < margin) {
    left = margin
  } else if (left + w > viewportSize.value.width - margin) {
    left = viewportSize.value.width - w - margin
  }

  const preferredBottom = props.placement === 'bottom'
  const spaceAbove = topY - margin
  const spaceBelow = viewportSize.value.height - bottomY - margin
  const shouldFlipToBottom = !preferredBottom && h + gap > spaceAbove && spaceBelow > spaceAbove
  const shouldFlipToTop = preferredBottom && h + gap > spaceBelow && spaceAbove > spaceBelow
  const placeBottom = shouldFlipToBottom || (preferredBottom && !shouldFlipToTop)

  let top = placeBottom ? bottomY + gap : topY - h - gap
  const maxTop = Math.max(margin, viewportSize.value.height - h - margin)
  top = Math.max(margin, Math.min(top, maxTop))

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    maxWidth: `calc(100vw - ${margin * 2}px)`,
    transform: `scale(${props.scale})`,
    transformOrigin: placeBottom ? 'top center' : 'bottom center'
  }
})

const effectivePlacement = computed(() => {
  const topY = triggerPos.value.y
  const bottomY = triggerPos.value.y + triggerPos.value.height
  const h = tooltipSize.value.height || (props.variant === 'tactical' ? 280 : 220)
  const margin = 16
  const gap = 20
  const spaceAbove = topY - margin
  const spaceBelow = viewportSize.value.height - bottomY - margin

  if (props.placement === 'bottom') {
    return h + gap > spaceBelow && spaceAbove > spaceBelow ? 'top' : 'bottom'
  }
  return h + gap > spaceAbove && spaceBelow > spaceAbove ? 'bottom' : 'top'
})

const stemStyle = computed(() => {
  const centerX = triggerPos.value.x + (triggerPos.value.width / 2)
  const w = tooltipWidth.value
  const margin = 16
  let left = centerX - (w / 2)
  
  if (left < margin) {
    left = margin
  } else if (left + w > viewportSize.value.width - margin) {
    left = viewportSize.value.width - w - margin
  }

  const offset = centerX - left
  const clampedOffset = Math.max(16, Math.min(w - 16, offset))

  return {
    left: `${clampedOffset}px`,
    transform: 'translateX(-50%) rotate(45deg)'
  }
})
</script>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-100%) translateY(-10px);
}
</style>
