<template>
  <div
    class="relative h-6 flex items-center cursor-pointer group"
    @mousedown="startDrag"
    @touchstart.passive="startDrag"
    ref="sliderRef"
  >
    <!-- Track -->
    <div class="w-full h-[2px] bg-black/10 dark:bg-white/10 relative">
      <!-- Fill -->
      <div
        class="absolute left-0 top-0 h-full bg-black dark:bg-white"
        :style="{ width: `${percent}%` }"
      ></div>
      
      <!-- Thumb -->
      <div
        class="absolute top-1/2 -translate-y-1/2 -ml-[6px] w-3 h-3 bg-theme-bg border border-black dark:border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        :class="{ '!opacity-100': isDragging }"
        :style="{ left: `${percent}%` }"
      >
        <!-- Inner dot -->
        <div class="absolute inset-[2px] bg-black dark:bg-white opacity-0 transition-opacity" :class="{ 'opacity-100': isDragging }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
  (e: 'change', val: number): void
  (e: 'input', val: number): void
}>()

const min = computed(() => props.min ?? 0)
const max = computed(() => props.max ?? 100)

const percent = computed(() => {
  const p = ((props.modelValue - min.value) / (max.value - min.value)) * 100
  return Math.max(0, Math.min(100, p))
})

const sliderRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const updateValue = (clientX: number) => {
  if (!sliderRef.value) return
  const rect = sliderRef.value.getBoundingClientRect()
  let p = (clientX - rect.left) / rect.width
  p = Math.max(0, Math.min(1, p))
  const val = Math.round(min.value + p * (max.value - min.value))
  emit('update:modelValue', val)
  emit('input', val)
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  updateValue(e.clientX)
}

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  updateValue(e.touches[0].clientX)
}

const onMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    emit('change', props.modelValue)
  }
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  if (e instanceof MouseEvent) {
    updateValue(e.clientX)
  } else {
    updateValue(e.touches[0].clientX)
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('touchend', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onMouseUp)
})
</script>
