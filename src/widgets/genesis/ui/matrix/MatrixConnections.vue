<template>
  <svg class="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
    <g :transform="`scale(${state.viewState.value.scale})`">
      <g v-for="(group, gIdx) in state.bundleGroups.value" :key="group.id">
        <!-- SHARED MAIN STEM (Once per Parent) -->
        <path v-if="group.type === 'bundle' && group.isFirstForParent"
              :d="pathMath.getMainStemPath(group.fromId, group.bundleId)"
              stroke-width="1.2" fill="none"
              vector-effect="non-scaling-stroke"
              class="nier-conn-path pointer-events-none" />

        <!-- SHARED BUNDLE STEM (Once per Bundle) -->
        <path v-if="group.type === 'bundle'"
              :d="pathMath.getBundleStemPath(group.fromId, group.bundleId)"
              stroke-width="1.2" fill="none"
              vector-effect="non-scaling-stroke"
              class="nier-conn-path pointer-events-none" />

        <!-- INDIVIDUAL BRANCHES OR SIMPLE CONNECTIONS -->
        <g v-for="line in (group.type === 'bundle' ? group.connections : [group.connection])" :key="line.toId" class="group/line">
          <!-- Interactive Hit Area (Always Full Path for easy clicking) -->
          <path :d="pathMath.createRootPath(line.fromId, line.toId)" 
                stroke="transparent" 
                stroke-width="16"
                fill="none"
                class="pointer-events-auto cursor-pointer"
                @click.stop="menu.handleConnectionClick($event, line)" />

          <!-- Visual Path (Branch only if bundle, full path if simple) -->
          <path :d="group.type === 'bundle' ? pathMath.getBranchPath(line) : pathMath.createRootPath(line.fromId, line.toId)" 
                stroke-width="1.2"
                fill="none" 
                vector-effect="non-scaling-stroke"
                class="nier-conn-path pointer-events-none" />

          <circle v-if="state.getNode(line.toId)" 
                  :cx="pathMath.getConnectionEndPoint(line).x" 
                  :cy="pathMath.getConnectionEndPoint(line).y" 
                  :r="2 / state.viewState.value.scale" fill="currentColor" class="opacity-40" />
        </g>
      </g>
    </g>

    <!-- CONNECTION LABELS (Rendered last to ensure they are on top and capture clicks) -->
    <foreignObject v-for="line in state.connections.value.filter((c: any) => c.label && pathMath.shouldShowLabel(c))" 
                   :key="'label-' + line.fromId + '-' + line.toId"
                   :x="(pathMath.getConnectionMidpoint(line).x * state.viewState.value.scale) - (60 * state.viewState.value.scale)" 
                   :y="(pathMath.getConnectionMidpoint(line).y * state.viewState.value.scale) - (20 * state.viewState.value.scale)" 
                   :width="120 * state.viewState.value.scale" :height="40 * state.viewState.value.scale" 
                   class="pointer-events-none select-none overflow-visible">
       <div class="w-full h-full flex items-center justify-center">
          <div class="cursor-pointer pointer-events-auto hover:bg-nier-white/10 dark:hover:bg-nier-black/10 transition-colors"
               :style="{ padding: `${4 * state.viewState.value.scale}px ${8 * state.viewState.value.scale}px` }"
               @mousedown.stop="pathMath.handleLabelDrag($event, line)">
              <div class="font-mono text-nier-text-light dark:text-nier-text-dark tracking-widest lowercase italic font-bold"
                   :style="{ fontSize: `${16 * state.viewState.value.scale}px` }">
                 {{ locale === 'ru' ? t(line.label || '') : line.label }}
              </div>
          </div>
       </div>
    </foreignObject>

    <!-- Active Drag Line -->
    <g v-if="canvas.activeWire.value" :transform="`scale(${state.viewState.value.scale})`">
      <path :d="pathMath.createCurvedPath(canvas.activeWire.value.from, canvas.activeWire.value.to, canvas.activeWire.value.fromPort)" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-dasharray="4 8"
            fill="none" 
            class="opacity-60" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { useMatrixState } from '../../model/matrix/useMatrixState'
import type { useMatrixCanvas } from '../../model/matrix/useMatrixCanvas'
import type { useMatrixMenu } from '../../model/matrix/useMatrixMenu'
import type { usePathMath } from '../../model/matrix/usePathMath'
import { useI18n } from '~/shared/i18n/useI18n'

defineProps<{
  state: ReturnType<typeof useMatrixState>
  canvas: ReturnType<typeof useMatrixCanvas>
  menu: ReturnType<typeof useMatrixMenu>
  pathMath: ReturnType<typeof usePathMath>
}>()

const { locale, t } = useI18n()
</script>

<style scoped>
.nier-conn-path {
  stroke: #505050;
  transition: stroke 0.3s ease;
}

.group\/line:hover .nier-conn-path {
  stroke: #9b9b9b;
}

html:not(.dark) .nier-conn-path {
  stroke: #d0d0d0;
}

html:not(.dark) .group\/line:hover .nier-conn-path {
  stroke: #a0a0a0;
}
</style>
