<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

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

const isOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function cancelClose() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function openFlyout() {
  cancelClose()
  isOpen.value = true
}

function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => {
    isOpen.value = false
    closeTimer = null
  }, 120)
}

onBeforeUnmount(cancelClose)

</script>

<template>
  <div :class="['ex-genesis-hud-flyout', `is-${props.placement}`, `content-${contentOrientation}`]">
    <div
      class="ex-genesis-hud-flyout-trigger"
      @mouseenter="openFlyout"
      @mouseleave="scheduleClose"
      @focusin="openFlyout"
      @focusout="scheduleClose"
    >
      <slot name="trigger" />
    </div>
    <div
      class="ex-genesis-hud-flyout-content"
      :class="{ 'is-open': isOpen }"
      @mouseenter="cancelClose"
      @mouseleave="scheduleClose"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ex-genesis-hud-flyout {
  position: relative;
  width: max-content;
  height: max-content;
  pointer-events: auto;
}

.ex-genesis-hud-flyout-trigger {
  display: inline-flex;
  position: relative;
  z-index: 1;
  width: max-content;
  height: max-content;
}

.ex-genesis-hud-flyout-content {
  position: absolute;
  z-index: 20;
  opacity: 0;
  visibility: hidden;
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

.ex-genesis-hud-flyout-content.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate(0, 0);
}

.ex-genesis-hud-flyout.is-right .ex-genesis-hud-flyout-content.is-open {
  transform: translateY(-50%) translateX(0);
}

.ex-genesis-hud-flyout.is-bottom .ex-genesis-hud-flyout-content.is-open {
  transform: translateX(-50%) translateY(0);
}
</style>
