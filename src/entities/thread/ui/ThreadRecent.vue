<template>
  <NuxtLink :to="`/forum/thread/${thread.id}`">
  <div class="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-4 mb-2">
          <div>
            <div class="text-sm font-serif">
              {{ thread.title }}
            </div>
            <div class="text-xs text-[#666] dark:text-[#aaa] font-serif ">
              {{ capitalize(thread.category) }}: {{ capitalize(thread.subcategory) }}
            </div>
          </div>
          <div class="text-xs text-[#999]">{{ timeAgo(thread.createdAt) }}</div>
      </div>
    </NuxtLink>
</template>

<script setup lang="ts">
import type { Thread } from "~/entities/thread/model/thread.types";
import { timeAgo } from "~/composables/timeAgo";
import { capitalize } from "~/shared/capitalise";

interface Props {
  thread: Thread;
}

const props = defineProps<Props>();
</script>
