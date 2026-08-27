<script setup lang="ts">
defineProps<{
  muted?: boolean
}>()
</script>

<template>
  <p class="mt-7 max-w-2xl font-serif text-base font-normal uppercase leading-relaxed tracking-[0.12em] sm:text-xl" :class="muted ? 'text-white/55' : 'text-white/75'">
    <slot />
  </p>
</template>
