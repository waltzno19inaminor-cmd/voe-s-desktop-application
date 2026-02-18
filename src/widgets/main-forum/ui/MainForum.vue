<template>
<main class="min-h-screen   text-[#121212] dark:text-white">


 
  <section class="max-w-6xl mx-auto px-8 pt-24 pb-20">
    <h1 class="text-3xl md:text-4xl font-serif tracking-wide mb-6">
      A forum for traders who think in systems, not signals
    </h1>

    <p class="max-w-2xl text-sm leading-relaxed text-[#555] dark:text-[#aaa]">
      This is a long-term research space for traders across all markets.
      Ideas are tested, discussed, challenged — and slowly assembled into coherent models.
    </p>
  </section>

  <section class="border-t border-b border-black/10 dark:border-white/10">
    <div class="max-w-6xl mx-auto px-8 py-16 grid md:grid-cols-3 gap-10">

      <div class="md:col-span-2">
        <h2 class="text-xs font-serif uppercase tracking-widest mb-4 text-[#777]">
          Core Project
        </h2>

        <h3 class="text-2xl font-serif mb-6">
          Project: Key to the Market
        </h3>

        <p class="text-sm leading-relaxed text-[#555] dark:text-[#aaa] mb-6 max-w-xl">
          A collective attempt to uncover durable principles of successful trading.
          The project grows through connected discussions — theory, practice, failure, refinement.
          No signals. No shortcuts.
        </p>

        <NuxtLink
          :to="{ path: 'main', query: { search: 'project' } }"
          class="inline-block text-xs uppercase tracking-widest border-b border-black dark:border-white pb-1 hover:opacity-70 transition"
        >
          Enter the project
        </NuxtLink>
      </div>

      <div class="text-sm text-[#666] dark:text-[#aaa] space-y-3">
        <div>• Theory threads</div>
        <div>• Practical experiments</div>
        <div>• Cross-market models</div>
        <div>• Collective summaries</div>
      </div>

    </div>
  </section>


 


  <section class="border-t border-black/10 dark:border-white/10">
    <div class="max-w-6xl mx-auto px-8 py-20">

      <h2 class="text-xs font-serif uppercase tracking-widest mb-10 text-[#777]">
        Recent Discussions
      </h2>

      <div class="space-y-6">

        
          <ThreadRecent v-for="thread in recentThreads" :key="thread.id" :thread="thread" />
      
      </div>

    </div>
  </section>

</main>

</template>

<script setup lang="ts">
import ThreadRecent from "@/entities/thread/ui/ThreadRecent.vue";
import { useMainForum } from "~/widgets/main-forum/model/useMainForum"
import type { Thread } from "~/entities/thread/model/thread.types"

const props = defineProps({
    threads: {
        type: Array,
        required: true
    }
})

const { recentThreads } = useMainForum(props.threads as Thread[])

</script>