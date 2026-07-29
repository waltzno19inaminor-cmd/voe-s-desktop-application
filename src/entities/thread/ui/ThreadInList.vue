<template>
  
  <li class="group">
    <NuxtLink :to="`/forum/thread/${thread.id}`" class="block p-3 -mx-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <div class="flex items-center gap-3 mb-2">
        <!-- Avatar -->
        <div class="relative w-5 h-5 shrink-0">
          <div class="absolute inset-0 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[9px] font-sans border dark:border-white/5 border-black/5 select-none text-[#777]">
             {{ displayStr.charAt(0) }}
          </div>
          <img v-if="userAvatar && !imgError" @error="imgError = true" :src="userAvatar" referrerpolicy="no-referrer" class="absolute inset-0 w-5 h-5 rounded-full object-cover shadow-sm" alt="Avatar"/>
        </div>
        <p class="text-xs text-[#666] dark:text-[#aaa] flex items-center gap-1.5">
          <span class="font-medium text-[#c49b6b] dark:text-[#d8b488]">{{ displayStr }}</span> 
          <span class="opacity-50">·</span> 
          {{ timeAgo(thread.lastActivityAt) }}
        </p>
      </div>

      <p class="font-serif text-base mb-1 dark:text-[#f3f3f3] group-hover:text-black dark:group-hover:text-white transition-colors">
        {{ thread.title }}
      </p>

      <div class="flex flex-wrap items-center gap-3 text-[11px] text-[#888] dark:text-[#777]">
        <div class="flex items-center gap-1">
          <svg class="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.38-.432 1.628-1.52 3.25-1.52 3.25s2.5 .25 4.604-1.28A9.37 9.37 0 0012 20.25z"/></svg>
          {{ thread.repliesCount || 0 }} replies
        </div>
        <div class="flex items-center gap-1">
          <svg class="w-3.5 h-3.5 fill-current text-rose-500/80" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          {{ thread.likesCount || 0 }}
        </div>
      </div>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Thread } from "~/entities/thread/model/thread.types";
import { timeAgo } from "~/composables/timeAgo";
import { useForumStore } from "~/features/store/useForum";

interface Props {
  thread: Thread;
  displayName: any; // Can be string or ComputedRef depending on parent
}

const props = defineProps<Props>();

const forum = useForumStore();

const displayStr = computed(() => {
  return typeof props.displayName === 'object' && props.displayName.value 
    ? props.displayName.value 
    : String(props.displayName || props.thread.author || 'Anonymous');
});

const userAvatar = computed(() => {
    const u = forum.users.get(props.thread.authorId);
    return u?.avatarUrl || u?.photoURL || u?.avatar || null;
});
const imgError = ref(false);

onMounted(async () => {
    if (props.thread.authorId) {
        await forum.fetchUser(props.thread.authorId);
    }
});
</script>
