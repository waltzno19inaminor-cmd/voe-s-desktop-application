<template>
  <section class="min-h-[50vh] flex items-center justify-center px-4">
    <div class="max-w-lg w-full">

      <!-- STATUS -->
      <span class="block text-xs uppercase tracking-widest text-[#777] mb-6">
        Thread published
      </span>

      <!-- MAIN TEXT -->
      <h1 class="text-2xl font-serif leading-snug mb-6 text-black dark:text-white">
        Your thread is now live
      </h1>

      <p class="text-sm leading-relaxed text-[#555] dark:text-[#aaa] mb-10">
        The discussion has been successfully added to the forum.
        You can now open the thread and continue developing the idea.
      </p>

      <!-- LINK CARD -->
      <a
        :href="`/forum/thread/${url}`"
        class="block border border-black/10 dark:border-white/10
               p-6 rounded-lg
               hover:border-black/30 dark:hover:border-white/30
               transition"
      >
        <span class="block text-xs uppercase tracking-widest text-[#777] mb-2">
          New thread
        </span>

        <h2 class="font-serif text-lg mb-2 text-black dark:text-white">
          {{ threadTitle }}
        </h2>

        <p class="text-sm text-[#666] dark:text-[#aaa]">
          {{ threadSubTitle }}
        </p>
      </a>

      <!-- ACTION -->
      <div class="mt-10">
        <a
          :href="`/forum/thread/${url}`"
          class="inline-block px-6 py-3 text-sm
                 bg-black text-white
                 rounded-full
                 hover:bg-[#222]
                 transition"
        >
          Go to thread
        </a>
      </div>

    </div>
  </section>
  
</template>



<script setup lang="ts">
const props = defineProps<{ url: string,
    threadTitle: string,
    threadSubTitle: string,
    
 }>()

function copy() {
  navigator.clipboard.writeText(props.url)
}

</script>