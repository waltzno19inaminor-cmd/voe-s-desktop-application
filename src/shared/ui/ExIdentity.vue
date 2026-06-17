<template>
  <div :class="['flex items-center space-x-4 group cursor-default', detailed ? 'p-4 border border-theme-border bg-theme-text/[0.02]' : '']">
    
    <!-- Avatar Slot / Icon -->
    <div 
      :class="detailed ? 'w-12 h-12 bg-theme-text flex items-center justify-center overflow-hidden' : 'w-10 h-10 relative overflow-hidden flex items-center justify-center bg-theme-text'"
    >
      <template v-if="avatarUrl">
        <img :src="avatarUrl" alt="avatar" class="w-full h-full object-cover" />
      </template>
      <template v-else-if="detailed">
        <span class="text-theme-bg font-mono font-black text-xl">
          <slot name="avatar">{{ name?.charAt(0)?.toUpperCase() }}</slot>
        </span>
      </template>
      <template v-else>
        <span class="font-mono font-black text-sm text-theme-bg">{{ name?.charAt(0)?.toUpperCase() }}</span>
      </template>
    </div>

    <!-- Info Block -->
    <div class="flex flex-col">
      <div class="flex items-center space-x-2">
        <span class="text-[11px] font-mono uppercase tracking-widest text-theme-text font-black">{{ name }}</span>
        <div v-if="detailed" class="w-1.5 h-1.5 bg-theme-accent rounded-full animate-pulse"></div>
      </div>
      <span class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-30 text-theme-text">{{ rank || 'Operator' }}</span>
    </div>

  </div>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  rank: String,
  avatarUrl: String,
  detailed: {
    type: Boolean,
    default: false
  }
})
</script>
