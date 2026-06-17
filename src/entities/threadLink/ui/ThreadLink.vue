<template>
  <div
    class="cursor-pointer transition-colors"
  >
    <p
      class="font-serif text-sm text-[#050505] dark:text-white
             group-hover:text-[#666] dark:group-hover:text-[#ccc]
             transition-colors"
    >
      {{ thread.title }}
    </p>

    <p class="text-[11px] text-[#777] mt-1 flex items-center gap-2">
      <span
        v-if="linkType"
        class="uppercase tracking-widest border nier-border-primary px-2 py-0.5 text-[9px]"
      >{{ linkType }}</span>
      <span>{{ capitalize(thread.subcategory) }} · {{ capitalize(thread.status) }}</span>
    </p>
  </div>
</template>


<script setup lang="ts">
import { capitalize } from "~/shared/capitalise";
import type { Thread } from '~/entities/thread/model/thread.types';
import type { LinkType } from '~/entities/threadLink/model/threadLink.types';

defineProps<{
    thread: Thread
    linkType?: LinkType
}>()

</script>
