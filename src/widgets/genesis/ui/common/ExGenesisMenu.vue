<template>
  <div class="h-full flex flex-col space-y-12 relative justify-center items-center overflow-hidden">

    <!-- Header Telemetry -->
    <div class="flex flex-col items-center space-y-4">
      <ExText variant="telemetry" class="animate-pulse">0x00 // SYSTEM_INITIALIZATION</ExText>
      <ExHeading level="h2" variant="cinematic" class="!text-4xl pr-2">Genesis Protocol</ExHeading>
    </div>

    <!-- The Selection Lattice -->
    <div class="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-12">
      <template v-for="(item, index) in items" :key="item.id">
        <div class="relative group flex items-center opacity-60 hover:opacity-100 transition-all duration-500">
          <!-- Tactical Corner Borders (Outside) -->
          <ExGothicCorners variant="light" :opacity="0.5" class="group-hover:opacity-100 transition-opacity duration-500" />

          <!-- THE CARD -->
          <button 
            @click="$emit('select', item.id)" 
            class="relative overflow-hidden border border-theme-border p-12 h-80 transition-all duration-700 hover:border-theme-text/60 "
          >
            <div class="flex flex-col items-center justify-center h-full space-y-6 relative z-10 w-48">
              <!-- Icon/Glyph -->
              <div class="flex space-x-1.5 mb-4 group-hover:scale-110 transition-transform duration-700">
                <div v-for="n in (index + 1)" :key="n" class="w-1.5 h-1.5 border border-theme-text rotate-45 group-hover:bg-theme-text transition-colors"></div>
              </div>
              
              <ExText variant="telemetry" class="opacity-40 group-hover:opacity-100">{{ item.code }} // {{ item.title }}</ExText>
              
              <p class="text-[9px] font-serif italic opacity-20 text-center leading-relaxed group-hover:opacity-60 transition-opacity text-theme-text">
                "{{ item.description }}"
              </p>
            </div>

            <!-- Hover Overlay -->
            <div class="absolute inset-0 bg-theme-text opacity-5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-[var(--nier-ease)]"></div>
          </button>
        </div>

        <!-- Divider Lattices (Between items, outside the card group) -->
        <div v-if="index < items.length - 1" class="hidden md:block w-px h-24 bg-theme-border mx-6 self-center"></div>
      </template>
    </div>

    <!-- System Wait Registry -->
    <div class="flex flex-col items-center space-y-2 opacity-10">
      <div class="w-px h-16 bg-theme-text"></div>
      <ExText variant="small" class="italic">Wait for operator input...</ExText>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import ExHeading from "~/shared/ui/ExHeading.vue"
import ExText from "~/shared/ui/ExText.vue"
import ExGothicCorners from "~/shared/ui/ExGothicCorners.vue"

defineProps({
  items: {
    type: Array,
    default: () => [
      { id: 'diary', code: '0x01', title: 'VIRTUAL_LOG', description: 'Node-based knowledge graph for mapping trading concepts and relationships.' },
      { id: 'genesis-diary', code: '0x02', title: 'GENESIS_DIARY', description: 'Interactive 3D visualization of equity curve and performance metrics.' },
      { id: 'matrix', code: '0x03', title: 'GENESIS_MATRIX', description: 'Comprehensive repository for trading strategies, systems, and risk management templates.' }
    ]
  }
})

const emit = defineEmits(['select', 'back'])
</script>
