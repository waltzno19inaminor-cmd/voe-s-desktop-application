<template>
  <button 
    :class="[
      'font-mono uppercase transition-all duration-500 relative overflow-hidden flex items-center justify-center',
      variantClasses[variant],
      sizeClasses[size],
      { 'opacity-50 cursor-not-allowed': disabled }
    ]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <!-- GHOST HOVER SLIDE (Nier-style) -->
    <template v-if="variant === 'ghost'">
      <div class="absolute inset-0 bg-nier-text-light dark:bg-[#F6F0E6] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0"></div>
      <span class="relative z-10 font-mono uppercase font-black transition-colors duration-300 group-hover:text-nier-white dark:group-hover:text-[#0A0A0A]">
        <slot></slot>
      </span>
    </template>

    <!-- TACTICAL ACCENTS -->
    <template v-else-if="variant === 'tactical'">
      <ExGothicCorners variant="light" :opacity="0.6" class="transition-opacity duration-500 group-hover:opacity-100" />
      <div class="absolute inset-0 border border-nier-text-light/10 dark:border-[#F6F0E6]/10 m-1"></div>
      
      <!-- Ghost container to reserve space and prevent layout shift -->
      <div class="relative flex items-center justify-center">
        <!-- Invisible ghost text with MAX tracking to hold the width -->
        <span class="invisible font-mono uppercase tracking-[0.8em] pointer-events-none select-none">
          <slot></slot>
        </span>
        <!-- Visible animated text -->
        <span class="absolute inset-0 flex items-center justify-center z-10 group-hover:tracking-[0.8em] transition-all duration-500 whitespace-nowrap">
          <slot></slot>
        </span>
      </div>
    </template>

    <!-- DEFAULT / SOLID -->
    <template v-else>
      <span class="relative z-10 font-mono uppercase transition-all duration-500 group-hover:scale-105">
        <slot></slot>
      </span>
    </template>
  </button>
</template>

<script setup>
import ExGothicCorners from './ExGothicCorners.vue'

defineProps({
  variant: {
    type: String,
    default: 'solid',
    validator: (v) => ['solid', 'ghost', 'tactical'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'none'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const variantClasses = {
  solid: 'group bg-nier-text-light dark:bg-[#F6F0E6] text-nier-white dark:text-[#0A0A0A] border border-nier-text-light dark:border-[#F6F0E6] hover:opacity-90 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]',
  ghost: 'group border border-nier-text-light dark:border-[#F6F0E6] bg-nier-white dark:bg-nier-black text-nier-text-light dark:text-[#F6F0E6]',
  tactical: 'group px-10 py-4 bg-transparent text-nier-text-light dark:text-[#F6F0E6] border-2 border-nier-border-light dark:border-[#F6F0E6]/20 hover:border-nier-text-light dark:hover:border-[#F6F0E6]'
}

const sizeClasses = {
  none: 'px-0 py-0',
  sm: 'px-4 py-1.5 text-[8px] tracking-[0.2em] font-bold',
  md: 'px-8 py-3 text-[10px] tracking-[0.4em] font-black',
  lg: 'px-12 py-4 text-[12px] tracking-[0.6em] font-black'
}
</script>
