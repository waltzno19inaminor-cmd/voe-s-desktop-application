<template>
  <div>
    <!-- NODE CONTEXT MENU Overlay (Screen Space) -->
    <Teleport to="body">
      <Transition name="nt-tooltip-fade">
        <div v-if="menu.nodeContextMenu.value" 
             class="fixed z-[100000000] pointer-events-auto context-menu-container"
             :style="{ left: menu.nodeContextMenu.value.x + 'px', top: menu.nodeContextMenu.value.y + 'px' }"
             @click.stop>
            
            <div class="flex flex-col space-y-1.5">
              <!-- Anchor Point Indicator -->
              <div class="w-2 h-2 bg-nier-text-light dark:bg-nier-text-dark rotate-45 absolute -left-1 -top-1 animate-pulse"></div>

              <!-- Segmented Blades -->
              <div v-for="(btn, i) in [
                { label: t('matrix.setIdentity'), id: '0x01', condition: menu.nodeContextMenu.value && ['condition', 'scenario', 'strategy'].includes(state.getNode(menu.nodeContextMenu.value.nodeId)?.type || ''), action: () => menu.nodeContextMenu.value && menu.setNodeCustomName(menu.nodeContextMenu.value.nodeId) },
                { label: t('matrix.setDescription'), id: '0x01_desc', condition: menu.nodeContextMenu.value && ['condition', 'scenario', 'strategy'].includes(state.getNode(menu.nodeContextMenu.value.nodeId)?.type || ''), action: () => menu.nodeContextMenu.value && menu.setNodeCustomDescription(menu.nodeContextMenu.value.nodeId) },
                { label: t('matrix.addComment'), id: '0x02', action: () => menu.nodeContextMenu.value && menu.addCommentToNode(menu.nodeContextMenu.value.nodeId) },
                { 
                  label: menu.nodeContextMenu.value && (function() {
                    const dir = state.getNode(menu.nodeContextMenu.value!.nodeId)?.params?.direction;
                    if (!dir || dir === 'NONE') return t('matrix.setLong');
                    if (dir === 'LONG') return t('matrix.setShort');
                    return t('matrix.removeDirection');
                  })(),
                  id: '0x03', 
                  condition: menu.nodeContextMenu.value && state.getNode(menu.nodeContextMenu.value.nodeId)?.type === 'scenario', 
                  action: () => menu.nodeContextMenu.value && menu.cycleNodeDirection(menu.nodeContextMenu.value.nodeId) 
                },
                { 
                  label: t('matrix.updateVisual'),
                  id: '0x04', 
                  condition: menu.nodeContextMenu.value && state.getNode(menu.nodeContextMenu.value.nodeId)?.type === 'image', 
                  action: () => menu.nodeContextMenu.value && $emit('trigger-image-upload', menu.nodeContextMenu.value.nodeId) 
                },
                { 
                  label: menu.nodeContextMenu.value && (function() {
                    const phase = state.getNode(menu.nodeContextMenu.value!.nodeId)?.params?.phase;
                    if (!phase || phase === 'NONE') return t('matrix.setEntry');
                    if (phase === 'ENTRY') return t('matrix.setExit');
                    return t('matrix.removeType');
                  })(),
                  id: '0x05', 
                  condition: menu.nodeContextMenu.value && state.getNode(menu.nodeContextMenu.value.nodeId)?.type === 'scenario', 
                  action: () => menu.nodeContextMenu.value && menu.cycleNodePhase(menu.nodeContextMenu.value.nodeId) 
                },
                { 
                  label: menu.nodeContextMenu.value && (function() {
                    const prio = state.getNode(menu.nodeContextMenu.value!.nodeId)?.params?.priority;
                    if (!prio || prio === 'NONE') return t('matrix.setRequired');
                    if (prio === 'REQUIRED') return t('matrix.setAdditional');
                    return t('matrix.removePriority');
                  })(),
                  id: '0x06', 
                  condition: menu.nodeContextMenu.value && state.getNode(menu.nodeContextMenu.value.nodeId)?.type === 'condition', 
                  action: () => menu.nodeContextMenu.value && menu.cycleNodePriority(menu.nodeContextMenu.value.nodeId) 
                }
              ].filter(b => b.condition !== false)" 
                   :key="btn.id"
                   :style="{ marginLeft: i * 12 + 'px' }"
                   class="group relative">
                
                <!-- Blade Fragment -->
                <button @click="btn.action"
                        class="bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark px-6 py-2.5 min-w-[180px] text-left transition-all duration-500 hover:border-nier-text-light dark:hover:border-nier-text-dark hover:translate-x-4 flex items-center justify-between relative overflow-hidden shadow-[10px_10px_0_rgba(0,0,0,0.1)]">
                  
                  <!-- Scanline Overlay -->
                  <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                  
                  <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black group-hover:tracking-[0.8em] transition-all duration-500 relative z-10 text-nier-text-light dark:text-nier-text-dark">{{ btn.label }}</span>
                  <span class="text-[7px] font-mono opacity-20 group-hover:opacity-100 transition-opacity relative z-10 text-nier-text-light dark:text-nier-text-dark">[{{ btn.id }}]</span>

                  <!-- Hover Fill Accent -->
                  <div class="absolute inset-y-0 left-0 w-0 bg-nier-text-light dark:bg-nier-text-dark group-hover:w-1.5 transition-all duration-500"></div>
                </button>

                <!-- Tactical Metadata Revealed on Hover -->
                <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-nier-text-light dark:text-nier-text-dark">{{ t('matrix.contextProtocolReady') }}</span>
                </div>
              </div>

              <!-- Danger Blade (Staggered) -->
              <div v-if="menu.nodeContextMenu.value.nodeId !== 'root' && menu.nodeContextMenu.value.nodeId !== 'root-strategy'"
                   :style="{ marginLeft: 3 * 12 + 'px' }"
                   class="group relative pt-2">
                 <button @click="state.removeNode(menu.nodeContextMenu.value.nodeId); menu.nodeContextMenu.value = null"
                         class="bg-nier-white dark:bg-nier-black border border-red-500/30 px-6 py-3 min-w-[180px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden">
                   <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500 group-hover:text-red-400">{{ t('matrix.removeNode') }}</span>
                   <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                   <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                 </button>
                 <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">{{ t('matrix.archiveWarning') }}</span>
                </div>
              </div>
            </div>
          </div>
      </Transition>
    </Teleport>

    <!-- CONNECTION CONTEXT MENU Overlay -->
    <Teleport to="body">
      <Transition name="nt-tooltip-fade">
         <div v-if="menu.connectionContextMenu.value" 
              class="fixed z-[100000001] pointer-events-auto context-menu-container"
              :style="{ left: menu.connectionContextMenu.value.x + 'px', top: menu.connectionContextMenu.value.y + 'px' }"
              @click.stop>
            
            <div class="flex flex-col space-y-1.5">
              <!-- Segmented Blades -->
              <div v-for="(opt, idx) in ['IF', 'THEREFORE', 'AND', 'OR']" :key="opt"
                   :style="{ marginLeft: idx * 8 + 'px' }"
                   class="group relative">
                
                <button @click="menu.setConnectionLabel(opt)"
                        class="bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark px-6 py-2 min-w-[160px] text-left transition-all duration-500 hover:border-nier-text-light dark:hover:border-nier-text-dark hover:translate-x-4 flex items-center justify-between relative overflow-hidden shadow-[10px_10px_0_rgba(0,0,0,0.1)]">
                  <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black group-hover:tracking-[0.8em] transition-all duration-500 relative z-10 text-nier-text-light dark:text-nier-text-dark">{{ connectionLabel(opt) }}</span>
                  <span class="text-[7px] font-mono opacity-20 group-hover:opacity-100 transition-opacity relative z-10 text-nier-text-light dark:text-nier-text-dark">[0x0{{ idx + 1 }}]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-nier-text-light dark:bg-nier-text-dark group-hover:w-1.5 transition-all duration-500"></div>
                </button>
              </div>

              <div class="group relative pt-2" :style="{ marginLeft: '32px' }">
                <button @click="menu.setConnectionLabel(null)"
                        class="bg-nier-white dark:bg-nier-black border border-red-500/30 px-6 py-2.5 min-w-[160px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden">
                  <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500">{{ t('matrix.clearLink') }}</span>
                  <span class="text-[7px] font-mono text-red-500 opacity-40">[CLR]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                </button>
              </div>
            </div>
         </div>
      </Transition>
    </Teleport>

    <!-- PERSONAL CONDITION CONTEXT MENU Overlay -->
    <Teleport to="body">
      <Transition name="nt-tooltip-fade">
         <div v-if="menu.personalCondContextMenu.value" 
              class="fixed z-[100000001] pointer-events-auto context-menu-container"
              :style="{ left: menu.personalCondContextMenu.value.x + 'px', top: menu.personalCondContextMenu.value.y + 'px' }"
              @click.stop>
            
            <div class="flex flex-col space-y-1.5">
              <!-- Anchor Point Indicator -->
              <div class="w-2 h-2 bg-nier-text-light dark:bg-nier-text-dark rotate-45 absolute -left-1 -top-1 animate-pulse"></div>

              <div class="group relative">
                <button @click="menu.removePersonalCondition(menu.personalCondContextMenu.value.indicator)"
                        class="bg-nier-white dark:bg-nier-black border border-red-500/30 px-6 py-2.5 min-w-[160px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden group">
                  <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500 group-hover:text-red-400">{{ t('matrix.remove') }}</span>
                  <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                </button>
                <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">
                    {{ t('matrix.permanentWarning') }}
                  </span>
                </div>
              </div>
            </div>
         </div>
      </Transition>
    </Teleport>

    <!-- MATRIX PAGE CONTEXT MENU Overlay -->
    <Teleport to="body">
      <Transition name="nt-tooltip-fade">
         <div v-if="menu.pageContextMenu.value"
              class="fixed z-[100000001] pointer-events-auto context-menu-container"
              :style="{ left: menu.pageContextMenu.value.x + 'px', top: menu.pageContextMenu.value.y + 'px' }"
              @click.stop>

            <div class="flex flex-col space-y-1.5">
              <div class="w-2 h-2 bg-nier-text-light dark:bg-nier-text-dark rotate-45 absolute -left-1 -top-1 animate-pulse"></div>

              <div class="group relative">
                <button @click="state.removeMatrixPage(menu.pageContextMenu.value.pageId); menu.pageContextMenu.value = null"
                        class="bg-nier-white dark:bg-nier-black border border-red-500/30 px-6 py-3 min-w-[190px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden">
                  <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500 group-hover:text-red-400">{{ t('matrix.removeBoard') }}</span>
                  <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                  <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                </button>
                <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">{{ t('matrix.strategyPageWarning') }}</span>
                </div>
              </div>
            </div>
         </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { useMatrixState } from '../../model/matrix/useMatrixState'
import type { useMatrixMenu } from '../../model/matrix/useMatrixMenu'
import { useI18n } from '~/shared/i18n/useI18n'

defineProps<{
  state: ReturnType<typeof useMatrixState>
  menu: ReturnType<typeof useMatrixMenu>
  isDark?: boolean
}>()

defineEmits(['trigger-image-upload'])

const { locale, t } = useI18n()

function connectionLabel(option: string) {
  const keys: Record<string, string> = {
    IF: 'matrix.connectionIf',
    THEREFORE: 'matrix.connectionTherefore',
    AND: 'matrix.connectionAnd',
    OR: 'matrix.connectionOr'
  }
  return t(keys[option] || option)
}
</script>

<style scoped>
.nt-tooltip-fade-enter-active, .nt-tooltip-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.nt-tooltip-fade-enter-from { opacity: 0; transform: scale(0.95); }
.nt-tooltip-fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>
