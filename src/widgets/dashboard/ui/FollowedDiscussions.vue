<template>
  <article>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-base font-serif tracking-wide text-[#050505] dark:text-[#dcdcdc]">
        Followed Discussions
      </h2>
    </div>

    <div class="mb-8">
      <input
        type="text"
        placeholder="Search discussions"
        v-model="searchQuery"
        class="bg-transparent border-b border-black/20 dark:border-white/20 outline-none text-xs py-1 text-[#050505] dark:text-[#bcbcbc] placeholder:text-[#5f5f5f] w-full transition focus:border-black/50 dark:focus:border-white/50"
      />
    </div>

    <div class="space-y-6 text-xs text-[#050505] dark:text-[#bcbcbc]">
      <NuxtLink v-for="thread in filteredThreads" :key="thread.id" :to="`/forum/thread/${thread.id}`" class="block border-b nier-border-primary pb-4 hover:opacity-80 transition">
        <span class="font-medium">{{ thread.title }}</span>
        <div class="text-[#666] dark:text-[#6f6f6f] mt-1">
          by {{ forum.getAuthor(thread.authorId)?.displayName || 'Unknown' }} · {{ thread.repliesCount || 0 }} contributions · updated {{ new Date(((thread.lastActivityAt as any)?.seconds || 0) * 1000).toLocaleDateString() }}
        </div>
      </NuxtLink>

      <div v-if="filteredThreads.length === 0" class="text-[#666] dark:text-[#6f6f6f] py-4">
        <span v-if="searchQuery">No discussions match "{{ searchQuery }}"</span>
        <span v-else>No followed discussions found. Discover researchers to follow on the forum.</span>
      </div>
    </div>

    <p class="text-xs leading-relaxed text-[#666] dark:text-[#6f6f6f] mt-8">
      Discussions are filtered by the researchers you follow.
      Engagement depth reflects analytical relevance rather than popularity.
    </p>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Thread } from '~/entities/thread/model/thread.types';
import { useForumStore } from '~/features/store/useForum';

const props = defineProps<{
    threads: Thread[];
}>();

const forum = useForumStore();
const searchQuery = ref('');

const filteredThreads = computed(() => {
    if (!searchQuery.value) return props.threads.slice(0, 5);
    return props.threads
        .filter(t => t.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
        .slice(0, 5);
});
</script>
