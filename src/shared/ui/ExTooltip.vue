<template>
  <div 
    class="relative inline-block"
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
          <div v-else class="flex flex-col" :class="placement === 'bottom' ? 'flex-col' : 'flex-col-reverse'">
            <!-- Arrow stem: sibling of the box, sits outside it -->
            <div class="flex" :style="{ paddingLeft: stemStyle.left, boxSizing: 'content-box' }">
              <div
                class="theme-tooltip-stem w-3 h-3 shrink-0 -ml-[6px]"
                :class="placement === 'bottom'
                  ? 'border-l border-t'
                  : 'border-r border-b'"
                :style="{ transform: 'rotate(45deg)', marginBottom: placement === 'bottom' ? '-6px' : '0', marginTop: placement !== 'bottom' ? '-6px' : '0', opacity: 1 }"
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
import { ref, computed, watch } from 'vue'

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
  }
})

const isVisible = ref(false)
const triggerPos = ref({ x: 0, y: 0, width: 0, height: 0 })
const triggerRef = ref(null)

const handleMouseEnter = () => {
  if (triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    triggerPos.value = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    }
  }
  isVisible.value = true
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

const tooltipStyle = computed(() => {
  // Center above/below the trigger element
  const centerX = triggerPos.value.x + (triggerPos.value.width / 2)
  const topY = triggerPos.value.y
  const bottomY = triggerPos.value.y + triggerPos.value.height
  
  // Base width
  const w = props.variant === 'tactical' ? 600 : 300
  const margin = 16
  
  // Center-align by default
  let left = centerX - (w / 2)
  
  // Strict viewport clamping
  if (left < margin) {
    left = margin
  } else if (left + w > window.innerWidth - margin) {
    left = window.innerWidth - w - margin
  }

  if (props.placement === 'bottom') {
    return {
      left: `${left}px`,
      top: `${bottomY}px`,
      width: `${w}px`,
      transform: `translateY(20px) scale(${props.scale})`,
      transformOrigin: 'top center'
    }
  }

  return {
    left: `${left}px`,
    top: `${topY}px`,
    width: `${w}px`,
    transform: `translateY(-100%) translateY(-20px) scale(${props.scale})`,
    transformOrigin: 'bottom center'
  }
})

const stemStyle = computed(() => {
  const centerX = triggerPos.value.x + (triggerPos.value.width / 2)
  const w = props.variant === 'tactical' ? 600 : 300
  const margin = 16
  let left = centerX - (w / 2)
  
  if (left < margin) {
    left = margin
  } else if (left + w > window.innerWidth - margin) {
    left = window.innerWidth - w - margin
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
