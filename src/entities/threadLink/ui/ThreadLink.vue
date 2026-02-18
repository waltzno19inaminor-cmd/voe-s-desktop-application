<template>
  <div
    class="cursor-pointer transition-colors"
  >
    <p
      class="font-serif text-sm text-[#121212] dark:text-white
             group-hover:text-[#666] dark:group-hover:text-[#ccc]
             transition-colors"
    >
      {{ thread.title }}
    </p>

    <p class="text-[11px] text-[#777] mt-1">
      {{ capitalize(thread.subcategory) }} · {{ capitalize(thread.status) }}
    </p>
  </div>
</template>


<script setup lang="ts">
import { capitalize } from "~/shared/capitalise";
import type { Thread } from '~/entities/thread/model/thread.types';

defineProps<{
    thread: Thread
}>()

</script>
