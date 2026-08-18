<template>
  <div 
    :class="[
      'px-3 py-1 font-mono uppercase tracking-[0.2em] text-[9px] flex items-center space-x-3 transition-all duration-300',
      variantClasses[variant]
    ]"
  >
    
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'ghost',
    validator: (v) => ['ghost', 'solid', 'outline'].includes(v)
  },
  showDot: {
    type: Boolean,
    default: false
  }
})

const variantClasses = {
  ghost: 'border border-theme-border text-theme-text',
  solid: 'bg-theme-text text-theme-bg font-black',
  outline: 'border border-theme-text/40 text-theme-text opacity-60 hover:opacity-100 hover:border-theme-text cursor-default'
}
</script>
