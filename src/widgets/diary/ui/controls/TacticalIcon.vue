<template>
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="1.5" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="w-full h-full"
    v-bind="$attrs"
  >
    <!-- Neutral -->
    <template v-if="name === 'neutral'">
      <path d="M12 3l9 4v10l-9 4-9-4V7l9-4z" opacity="0.2" />
      <path d="M12 8v8M8 12h8" />
    </template>

    <!-- Greed -->
    <template v-else-if="name === 'greed'">
      <path d="M12 3l9 4v10l-9 4-9-4V7l9-4z" opacity="0.2" />
      <path d="M7 17l5-5 3 3 5-5" />
      <path d="M17 7h3v3" />
      <path d="M12 9v1" opacity="0.5" />
    </template>

    <!-- Fear -->
    <template v-else-if="name === 'fear'">
      <path d="M12 3l9 4v10l-9 4-9-4V7l9-4z" opacity="0.2" />
      <path d="M13 3l-2 3 3 2-4 5 3 2-2 6" />
      <circle cx="12" cy="12" r="2" opacity="0.5" />
    </template>

    <!-- Frustration -->
    <template v-else-if="name === 'frustration'">
      <path d="M3 12h18" opacity="0.2" />
      <path d="M13 3l-5 8h6l-5 10" />
      <path d="M8 8l-2-2m10 10l2 2m-2-10l2-2m-10 10l-2 2" opacity="0.5" />
    </template>

    <!-- Confidence -->
    <template v-else-if="name === 'confidence'">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.2" />
      <path d="M12 7l1.5 3h3.5l-2.5 2 1 3.5-3.5-2-3.5 2 1-3.5-2.5-2h3.5L12 7z" />
    </template>

    <!-- Boredom -->
    <template v-else-if="name === 'boredom'">
      <rect x="4" y="4" width="16" height="16" rx="2" opacity="0.2" />
      <path d="M8 12h8" />
      <path d="M6 8h2m8 0h2m-10 8h2m6 0h2" opacity="0.3" />
    </template>

    <!-- Calm -->
    <template v-else-if="name === 'calm'">
      <circle cx="12" cy="12" r="9" opacity="0.2" />
      <path d="M6 12h12" />
      <path d="M12 9v1m0 4v1" opacity="0.5" />
    </template>

    <!-- FOMO -->
    <template v-else-if="name === 'fomo'">
      <path d="M12 3l9 4v10l-9 4-9-4V7l9-4z" opacity="0.2" />
      <path d="M12 8v4l2 2" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3-7l-1.5 1.5M6.5 17.5l-1.5 1.5m12.5 0l1.5 1.5M6.5 6.5l-1.5-1.5" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>
