<script setup lang="ts">
withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
}>(), {
  orientation: 'horizontal'
})
</script>

<template>
  <div
    :class="[
      'ex-genesis-hud-panel',
      orientation === 'vertical' ? 'is-vertical' : 'is-horizontal'
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.ex-genesis-hud-panel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 2px;
  background: rgb(10 10 10 / 0.9);
  padding: 6px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  pointer-events: auto;
}

.ex-genesis-hud-panel.is-vertical {
  flex-direction: column;
}
</style>
