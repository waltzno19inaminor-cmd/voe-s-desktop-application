<template>
  <li class="flex items-center justify-between">
    <span class="text-[#121212] dark:text-white">{{ network.name }}</span>
    <span
      :class="
        network.isOnline
          ? 'text-[#666] dark:text-[#ccc]'
          : 'text-[#ccc] dark:text-[#666]'
      "
      class="text-xs"
      >{{ network.lastActive }}</span
    >
  </li>
</template>

<script setup lang="ts">
import type { Network } from "~/entities/network/model/network.type";

interface Props {
  network: Network;
}

const props = defineProps<Props>();
</script>
