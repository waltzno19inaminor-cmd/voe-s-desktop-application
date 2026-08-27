<script setup lang="ts">
defineProps<{
  muted?: boolean
}>()
</script>

<template>
  <p class="font-serif text-base font-normal leading-relaxed tracking-normal sm:text-lg" :class="muted ? 'text-white/55' : 'text-white/70'">
    <slot />
  </p>
</template>
