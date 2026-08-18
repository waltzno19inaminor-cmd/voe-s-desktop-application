<script setup lang="ts">
withDefaults(defineProps<{
  active?: boolean
  disabled?: boolean
  tooltip?: string
  tooltipPosition?: 'top' | 'right'
}>(), {
  active: false,
  disabled: false,
  tooltip: '',
  tooltipPosition: 'top'
})
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :class="[
      'ex-genesis-hud-button group relative flex h-10 w-10 items-center justify-center border border-transparent text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white',
      { 'is-active': active, 'is-disabled': disabled }
    ]"
  >
    <slot />
    <span
      v-if="tooltip"
      :class="[
        'ex-genesis-hud-tooltip pointer-events-none absolute z-20 whitespace-nowrap border border-white/20 bg-white px-3 py-1.5 text-[9px] font-mono font-normal uppercase tracking-widest text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100',
        tooltipPosition === 'right' ? 'is-right' : 'is-top'
      ]"
    >
      [ {{ tooltip }} ]
    </span>
  </button>
</template>

<style scoped>
.ex-genesis-hud-button.is-active {
  border-color: rgb(255 255 255 / 0.3);
  background: rgb(255 255 255 / 0.1);
  color: #fff;
}

.ex-genesis-hud-button.is-disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.ex-genesis-hud-tooltip.is-top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.ex-genesis-hud-tooltip.is-right {
  top: 50%;
  left: calc(100% + 10px);
  transform: translateY(-50%);
}
</style>
