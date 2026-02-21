<template>
  
    <li>
        <NuxtLink :to="`thread/${thread.id}`">
            <p class="font-serif">
                {{ thread.title }}
            </p>
            <p class="text-xs text-[#666]">
            by {{ displayName }} · {{ thread.repliesCount }} replies · updated {{ timeAgo(thread.lastActivityAt) }}
                </p>
        </NuxtLink>
    </li>
   
</template>

<script setup  lang="ts">
import type { Thread } from "~/entities/thread/model/thread.types";
import { timeAgo } from "~/composables/timeAgo";

interface Props {
  thread: Thread;
  displayName: ComputedRef<string>;
}

const props = defineProps<Props>();
</script>

