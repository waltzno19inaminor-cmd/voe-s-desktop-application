<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  placement?: 'right' | 'bottom'
  parentOrientation?: 'horizontal' | 'vertical'
}>(), {
  placement: 'right',
  parentOrientation: 'vertical'
})

const contentOrientation = computed(() => (
  props.parentOrientation === 'horizontal' ? 'vertical' : 'horizontal'
))

</script>

<template>
  <div :class="['ex-genesis-hud-flyout', `is-${props.placement}`, `content-${contentOrientation}`]">
    <slot name="trigger" />
    <div class="ex-genesis-hud-flyout-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ex-genesis-hud-flyout {
  position: relative;
  pointer-events: auto;
}

.ex-genesis-hud-flyout-content {
  position: absolute;
  z-index: 20;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
}

.ex-genesis-hud-flyout.is-right .ex-genesis-hud-flyout-content {
  top: 50%;
  left: 100%;
  padding-left: 10px;
  transform: translateY(-50%) translateX(-4px);
}

.ex-genesis-hud-flyout.is-bottom .ex-genesis-hud-flyout-content {
  top: 100%;
  left: 50%;
  padding-top: 10px;
  transform: translateX(-50%) translateY(-4px);
}

.ex-genesis-hud-flyout.content-horizontal :deep(.ex-genesis-hud-panel) {
  flex-direction: row;
}

.ex-genesis-hud-flyout.content-vertical :deep(.ex-genesis-hud-panel) {
  flex-direction: column;
}

.ex-genesis-hud-flyout:hover .ex-genesis-hud-flyout-content,
.ex-genesis-hud-flyout:focus-within .ex-genesis-hud-flyout-content {
  opacity: 1;
  pointer-events: auto;
  transform: translate(0, 0);
}

.ex-genesis-hud-flyout.is-right:hover .ex-genesis-hud-flyout-content,
.ex-genesis-hud-flyout.is-right:focus-within .ex-genesis-hud-flyout-content {
  transform: translateY(-50%) translateX(0);
}

.ex-genesis-hud-flyout.is-bottom:hover .ex-genesis-hud-flyout-content,
.ex-genesis-hud-flyout.is-bottom:focus-within .ex-genesis-hud-flyout-content {
  transform: translateX(-50%) translateY(0);
}
</style>
