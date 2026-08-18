<template>
  <article class="mb-0 group cursor-pointer" @click="navigateToThread">
    <div class="relative overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-gradient-to-r from-white/80 to-[#fdfdff]/80 dark:from-[#1c1c1c]/80 dark:to-[#161616]/80 backdrop-blur-md p-4 transition-all duration-500 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
      
      <!-- Background Accent -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div class="relative z-10 flex items-center justify-between gap-6">
        <div class="flex items-center gap-4 overflow-hidden">
          <!-- Pulse Icon -->
          <div class="relative flex items-center justify-center shrink-0">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div class="absolute w-4 h-4 rounded-full border border-emerald-500/30 animate-ping"></div>
          </div>

          <div class="flex flex-col min-w-0">
             <div class="flex items-center gap-2 mb-1">
                <span class="text-[7px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                  Recommendations for you
                </span>
                <span class="text-[8px] uppercase tracking-widest text-[#777] dark:text-[#888]">
                  {{ thread?.category || 'General' }}
                </span>
             </div>
             <h3 class="text-sm font-serif text-[#050505] dark:text-[#f0f0f0] leading-tight truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
               {{ thread?.title || 'Untitled Discussion' }}
             </h3>
          </div>
        </div>

        <div class="flex items-center gap-6 shrink-0 border-l border-black/5 dark:border-white/10 pl-6">
          <div class="text-[10px] text-[#666] dark:text-[#999] text-right">
            <div class="font-serif italic text-[#050505] dark:text-[#d0d0d0] truncate max-w-[100px] mb-0.5">by {{ authorName }}</div>
            <div class="text-[8px] uppercase tracking-tighter opacity-70">{{ timeAgo }}</div>
          </div>
          <div class="w-8 h-8 rounded-full nier-bg-inverted flex items-center justify-center nier-text-primary shadow-md transition-transform group-hover:scale-110">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>
      </div>
      
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Thread, ParagraphBlock } from '~/entities/thread/model/thread.types';
import { useForumStore } from '~/features/store/useForum';

const props = defineProps<{
  thread: Thread | null;
}>();

const router = useRouter();
const forum = useForumStore();

const authorName = computed(() => {
  if (!props.thread) return 'Unknown';
  return forum.getAuthor(props.thread.authorId)?.displayName || 'Unknown';
});

const snippet = computed(() => {
  if (!props.thread) return '';
  if (props.thread.description) return props.thread.description;
  
  if (props.thread.thesis && props.thread.thesis.blocks) {
     const pBlock = props.thread.thesis.blocks.find(b => b.type === 'paragraph') as ParagraphBlock | undefined;
     if (pBlock) return pBlock.text;
  }
  return 'A detailed discussion documented inside.';
});

const timeAgo = computed(() => {
    if (!props.thread?.lastActivityAt) return '';
    const date = new Date(((props.thread.lastActivityAt as any)?.seconds || 0) * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
});

const navigateToThread = () => {
    if (props.thread) {
        router.push(`/forum/thread/${props.thread.id}`);
    }
};
</script>
