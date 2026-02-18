<template>
    <span
    class="text-[10px] uppercase tracking-[0.25em] font-mono
            text-[#888] mb-4 block"
    >
    overview
    </span>

    <h3 class="text-xl font-serif mb-4 pb-3 border-b border-black/10 dark:border-white/10">
    {{ thread.title }}
    </h3>

    <p class="text-sm leading-relaxed text-[#555]">
        {{ thread.description }}
    </p>

    <div
    class="mt-8 pt-4 border-t border-black/10 dark:border-white/10
            flex gap-6 text-[11px] tracking-wide text-[#666]"
    >
        <span v-if="thread.repliesCount > 0">{{ thread.repliesCount }} replies</span>
        <span v-else>Be the first to reply</span>
    </div>
</template>

<script setup  lang="ts">
import type { Thread } from "~/entities/thread/model/thread.types";


interface Props {
  thread: Thread;
}

const props = defineProps<Props>();
</script>

