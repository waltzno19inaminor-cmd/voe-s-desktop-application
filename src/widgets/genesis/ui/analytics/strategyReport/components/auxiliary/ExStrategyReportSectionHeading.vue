<script setup lang="ts">
import ExHeading from '~/shared/ui/ExHeading.vue'
</script>

<template>
  <ExHeading level="h2" variant="cinematic" class="!max-w-5xl !text-3xl !font-light !leading-[1.15] !tracking-[0.14em] sm:!text-5xl lg:!text-6xl">
    <slot />
  </ExHeading>
</template>
