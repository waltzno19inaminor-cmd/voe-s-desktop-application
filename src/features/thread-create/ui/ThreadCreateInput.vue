<template>
  <input
    type="text"
    placeholder="Formulate a thought, trade or note"
    v-model="content"
    @keydown.enter="create"
    class="text-[#121212] dark:text-white w-full bg-transparent text-sm border-b border-black/20 dark:border-white/20 pb-2 focus:outline-none"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{ create: [content: string] }>();

const content = ref("");

const create = () => {
  emit("create", content.value);
};
</script>
