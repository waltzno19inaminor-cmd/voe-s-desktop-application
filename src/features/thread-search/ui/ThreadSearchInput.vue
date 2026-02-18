<template>
  <input
    type="text"
    placeholder="Search your theories, critiques, or applications"
    v-model="searchQuery"
    @input="emit('search', searchQuery)"
    class="text-[#121212] dark:text-white w-full bg-transparent text-xl font-serif border-b border-black/20 dark:border-white/20 pb-3 focus:outline-none"
  />
</template>

<script setup lang="ts">
const searchQuery = ref("");

const emit = defineEmits<{ search: [query: string] }>();
</script>
