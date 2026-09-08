<template>
  <div ref="element" class="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" :aria-label="label" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ label: string }>()
const element = ref<HTMLDivElement | null>(null)
defineExpose({ element })
</script>
