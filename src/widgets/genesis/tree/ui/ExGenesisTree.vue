<template>
  <div class="absolute inset-0 z-50 overflow-hidden pointer-events-auto touch-none"
       :class="isPanning ? 'cursor-grabbing' : 'cursor-grab'"
       @pointerdown="startPan"
       @pointermove="movePan"
       @pointerup="endPan"
       @pointercancel="endPan">
    <div class="absolute inset-0" :style="panLayerStyle" :key="`tree-render-${treeRenderKey}`">
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
      <svg class="overflow-visible" width="2" height="2">
        <path :d="emotionConnectorPath"
              fill="none"
              :stroke="isDark ? '#333333' : '#d1cfc9'"
              stroke-width="1" />
        <path :d="highlightedEmotionConnectorPath"
              fill="none"
              :stroke="isDark ? '#ffffff' : '#000000'"
              stroke-width="1.3" />
        <path :d="connectorPath(1, 1, strategyNodePositions, 'x', 'y')"
              fill="none"
              :stroke="isDark ? '#333333' : '#d1cfc9'"
              stroke-width="1" />
        <path :d="connectorPath(1, 1, highlightedStrategies, 'x', 'y')"
              fill="none"
              :stroke="isDark ? '#ffffff' : '#000000'"
              stroke-width="1.3" />
        <template v-for="node in strategyNodePositions" :key="'line-group-'+(node.treeKey || node.id)">
          <path :d="connectorPath(node.x + 1, node.y + 1, node.scenarios, 'globalX', 'globalY')"
                fill="none"
                :stroke="isDark ? '#333333' : '#d1cfc9'"
                stroke-dasharray="2 2"
                stroke-width="1" />
          <path :d="connectorPath(node.x + 1, node.y + 1, highlightedScenarios(node), 'globalX', 'globalY')"
                fill="none"
                :stroke="isDark ? '#ffffff' : '#000000'"
                stroke-width="1.3" />
          <template v-for="sc in node.scenarios" :key="'line-content-group-'+(sc.treeKey || sc.id)">
            <path :d="conditionRowsPath(sc.globalX + 1, sc.globalY + 1, sc.contents || [])"
                  fill="none"
                  :stroke="isDark ? '#2e2e2e' : '#b2b0a9'"
                  stroke-width="1" />
            <path :d="conditionRowsPath(sc.globalX + 1, sc.globalY + 1, highlightedContents(sc))"
                  fill="none"
                  :stroke="isDark ? '#ffffff' : '#000000'"
                  stroke-width="1.3" />
          </template>
        </template>
      </svg>
    </div>

    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <ExNTtooltip>
        <template #trigger>
          <div class="relative w-16 h-16 border flex items-center justify-center cursor-pointer transition-all duration-500 group/node nier-border-primary hover:border-black dark:hover:border-white shadow-[0_0_40px_rgba(0,0,0,0.05)] backdrop-blur-md"
               :class="isRootHighlighted ? 'bg-white border-white shadow-[0_0_18px_rgba(255,255,255,0.35)]' : 'bg-[#ffffff] dark:bg-[#0a0a0a]'"
               @pointerdown.stop>
            <div v-if="!isHeatmapActive" class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rotate-45 border border-white/70 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.35)]"></div>
            <div class="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t transition-colors duration-500"
                 :class="isRootHighlighted ? 'border-black' : 'border-black/20 dark:border-white/20 group-hover/node:border-black dark:group-hover/node:border-white'"></div>

            <span class="text-[16px] font-mono font-black tracking-tighter uppercase transition-colors"
                  :class="isRootHighlighted ? 'text-black' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white'">
              USR
            </span>
          </div>
        </template>
        <div class="flex flex-col gap-1 min-w-[120px] p-1">
          <div class="flex flex-col space-y-1 font-mono leading-relaxed uppercase nier-text-primary">
            <span class="font-black text-[14px] tracking-widest pb-0.5">{{ authStore.user?.displayName || authStore.user?.email || 'Operator_0x4F' }}</span>
            <div class="w-full h-[1px] bg-black/10 dark:bg-white/10 mb-1"></div>
            <span class="text-[9px] opacity-60">ID. {{ authStore.user?.uid?.slice(0, 10) || 'UNKNOWN' }}</span>
            <span class="text-[9px] opacity-60">TYPE. {{ authStore.user?.type || 'COMMON' }}</span>
            <span class="text-[9px] opacity-60">EST. {{ formatCreationDate(authStore.user?.joinedAt) }}</span>
          </div>
        </div>
      </ExNTtooltip>
    </div>

    <template v-for="block in emotionBlocks" :key="'emotion-group-'+block.id">
      <div class="absolute top-1/2 left-1/2 z-[6] pointer-events-none font-mono text-[8px] font-black uppercase tracking-[0.32em]"
           :class="block.colorClass"
           :style="{ transform: `translate(calc(-50% + ${block.x}px), calc(-50% + ${block.y - 72}px))` }">
        {{ block.label }}
      </div>

      <div v-for="emotion in emotionNodePositions(block)"
           :key="'emotion-node-'+emotion.label"
           class="absolute top-1/2 left-1/2 z-[6] transition-all duration-700"
           :style="{ transform: `translate(calc(-50% + ${emotion.x}px), calc(-50% + ${emotion.y}px))` }">
        <ExNTtooltip>
          <template #trigger>
            <div class="group/node relative flex h-12 w-12 cursor-pointer items-center justify-center border border-black/10 font-mono font-black uppercase tracking-[0.16em] backdrop-blur-md transition-all duration-500 hover:border-black hover:text-black dark:border-white/10 dark:hover:border-white dark:hover:text-white"
                 :class="[
                   nodeSurfaceClass(emotion),
                   isHeatmapActive ? heatmapMetricSizeClass(emotion) : 'text-[10px]',
                   isNodeHighlighted(emotion)
                     ? 'text-black'
                     : isHeatmapActive
                       ? heatmapMetricColorClass(emotion)
                       : 'text-black/45 dark:text-white/45'
                 ]"
                 @pointerdown.stop
                 @click.stop="selectTreeNode(emotion, 'emotion')">
              <div v-if="!isHeatmapActive"
                   class="absolute -bottom-1 -right-1 h-2 w-2 rotate-45 border border-white/70 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                   :class="block.accentClass"></div>
              <div class="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t transition-colors duration-500"
                   :class="isNodeHighlighted(emotion) ? 'border-black' : 'nier-border-primary group-hover/node:border-black dark:group-hover/node:border-white'"></div>
              {{ isHeatmapActive ? heatmapMetricLabel(emotion) : (emotion.shortName || emotion.label.slice(0, 3)) }}
            </div>
          </template>
          <div class="flex max-w-[280px] flex-col gap-2.5">
            <p class="font-mono text-[14px] font-black uppercase tracking-wide nier-text-primary">
              {{ emotion.label }}
            </p>
            <div class="h-px w-full bg-black/15 dark:bg-white/20"></div>
            <p class="font-mono text-[11px] font-black uppercase leading-[1.65] tracking-[0.04em] text-black/78 dark:text-white/78">
              {{ emotion.description }}
            </p>
            <div class="grid grid-cols-4 gap-2 border-t nier-border-primary pt-2 font-mono uppercase">
              <div class="flex flex-col gap-0.5">
                <span class="text-[7px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.trades') }}</span>
                <span class="text-[12px] font-black tracking-wide nier-text-primary">{{ emotion.tradeCountLabel || '0' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[7px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.winrate') }}</span>
                <span class="text-[12px] font-black tracking-wide" :class="emotion.winrateColorClass || 'text-rose-400'">{{ emotion.winrateLabel || '0%' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[7px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.frequency') }}</span>
                <span class="text-[12px] font-black tracking-wide" :class="emotion.frequencyColorClass || 'text-rose-400'">{{ emotion.frequencyLabel || '0%' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[7px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.pfRatio') }}</span>
                <span class="text-[12px] font-black tracking-wide" :class="emotion.profitFactorRatioColorClass || 'text-amber-400'">{{ emotion.profitFactorRatioLabel || '0.00' }}</span>
              </div>
            </div>
          </div>
        </ExNTtooltip>
      </div>
    </template>

    <template v-for="node in strategyNodePositions" :key="'strat-'+(node.treeKey || node.id)">
      <div class="absolute top-1/2 left-1/2 transition-all duration-1000 z-[5]"
           :style="{ transform: `translate(calc(-50% + ${node.x}px), calc(-50% + ${node.y}px))` }">
        <ExNTtooltip>
          <template #trigger>
            <div class="relative w-12 h-12 border flex items-center justify-center cursor-pointer transition-all duration-500 group/node backdrop-blur-md nier-border-primary hover:border-black dark:hover:border-white"
               :class="nodeSurfaceClass(node)"
               @pointerdown.stop
               @click.stop="selectTreeNode(node, 'strategy')">
              <div v-if="!isHeatmapActive" class="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 border border-white/70 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.35)]"></div>
              <div class="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t transition-colors duration-500"
                   :class="isNodeHighlighted(node) ? 'border-black' : 'nier-border-primary group-hover/node:border-black dark:group-hover/node:border-white'"></div>

              <span class="font-mono font-black uppercase leading-none transition-colors"
                    :class="isHeatmapActive
                      ? [heatmapMetricSizeClass(node), 'tracking-tight', isNodeHighlighted(node) ? 'text-black' : heatmapMetricColorClass(node)]
                      : ['text-[12px] tracking-tighter', isNodeHighlighted(node) ? 'text-black' : 'text-black/40 dark:text-white/40 group-hover/node:text-black dark:group-hover/node:text-white']">
                {{ isHeatmapActive ? heatmapMetricLabel(node) : (node.name || '').slice(0, 3) }}
              </span>
            </div>
          </template>
          <div class="flex min-w-[140px] flex-col gap-2">
            <p class="text-[13px] font-mono font-black leading-snug uppercase tracking-wide nier-text-primary">
              {{ node.name }}
            </p>
            <div class="h-px w-full bg-black/15 dark:bg-white/25"></div>
            <div class="grid grid-cols-3 gap-3 pt-1 font-mono uppercase">
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.frequency') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="node.frequencyColorClass || 'text-rose-400'">{{ node.frequencyLabel || '0%' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.pfRatio') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="node.profitFactorRatioColorClass || 'text-amber-400'">{{ node.profitFactorRatioLabel || '0.00' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.winrate') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="node.winrateColorClass || 'text-rose-400'">{{ node.winrateLabel || '0%' }}</span>
              </div>
            </div>
            <div class="border-t nier-border-primary pt-2 font-mono text-[9px] font-bold uppercase tracking-widest text-black/45 dark:text-white/45">
              {{ t('genesis.tree.tooltip.trades') }}: {{ node.tradeCountLabel || '0' }}
            </div>
          </div>
        </ExNTtooltip>
      </div>

      <div v-for="sc in node.scenarios" :key="'sc-'+(sc.treeKey || sc.id)"
           class="absolute top-1/2 left-1/2 transition-all duration-1000 z-[4]"
           :style="{ transform: `translate(calc(-50% + ${sc.globalX}px), calc(-50% + ${sc.globalY}px))` }">
        <ExNTtooltip>
          <template #trigger>
            <div class="relative w-12 h-12 border flex items-center justify-center cursor-pointer transition-all duration-500 group/node backdrop-blur-md nier-border-primary hover:border-black dark:hover:border-white"
                 :class="nodeSurfaceClass(sc)"
                 @pointerdown.stop
                 @click.stop="selectTreeNode(sc, 'scenario')">
              <div v-if="!isHeatmapActive" class="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 border border-white/70 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.35)]"></div>
              <div class="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t transition-colors duration-500"
                   :class="isNodeHighlighted(sc) ? 'border-black' : 'nier-border-primary group-hover/node:border-black dark:group-hover/node:border-white'"></div>
              <span class="px-1 font-mono font-black uppercase leading-tight text-center transition-colors break-words"
                    :class="isHeatmapActive
                      ? [heatmapMetricSizeClass(sc), 'tracking-tight', isNodeHighlighted(sc) ? 'text-black' : heatmapMetricColorClass(sc)]
                      : ['text-[10px] tracking-[0.16em]', isNodeHighlighted(sc) ? 'text-black' : 'text-black/45 dark:text-white/45 group-hover/node:text-black dark:group-hover/node:text-white']">
                {{ isHeatmapActive ? heatmapMetricLabel(sc) : (sc.shortName || sc.displayName || sc.label || sc.name || 'SCN') }}
              </span>
            </div>
          </template>
          <div class="flex min-w-[150px] flex-col gap-2">
            <p class="text-[13px] font-mono font-black leading-snug uppercase tracking-wide nier-text-primary">
              {{ sc.displayName || sc.label || sc.name || t('genesis.tree.tooltip.scenario') }}
            </p>
            <div class="h-px w-full bg-black/15 dark:bg-white/25"></div>
            <p class="text-[9px] font-mono font-bold uppercase tracking-wide text-black/60 dark:text-white/60">
              {{ t('genesis.tree.tooltip.type') }}: {{ translateTooltipType(sc.typeLabel || 'ENTRY SCENARIO') }}
            </p>
            <div class="grid grid-cols-3 gap-3 pt-1 font-mono uppercase">
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.frequency') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="sc.frequencyColorClass || 'text-rose-400'">{{ sc.frequencyLabel || '0%' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.pfRatio') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="sc.profitFactorRatioColorClass || 'text-amber-400'">{{ sc.profitFactorRatioLabel || '0.00' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.winrate') }}</span>
                <span class="text-[13px] font-black tracking-wide" :class="sc.winrateColorClass || 'text-rose-400'">{{ sc.winrateLabel || '0%' }}</span>
              </div>
            </div>
            <div class="border-t nier-border-primary pt-2 font-mono text-[9px] font-bold uppercase tracking-widest text-black/45 dark:text-white/45">
              {{ t('genesis.tree.tooltip.trades') }}: {{ sc.tradeCountLabel || '0' }}
            </div>
          </div>
        </ExNTtooltip>
      </div>

      <template v-for="sc in node.scenarios" :key="'content-group-'+(sc.treeKey || sc.id)">
        <div v-for="content in (sc.contents || [])" :key="'content-'+(content.treeKey || content.id)"
             class="absolute top-1/2 left-1/2 transition-all duration-1000 z-[2]"
             :style="{ transform: `translate(calc(-50% + ${content.globalX}px), calc(-50% + ${content.globalY}px))` }">
          <ExNTtooltip>
            <template #trigger>
              <div class="relative w-12 h-12 border flex items-center justify-center cursor-pointer transition-all duration-500 group/node backdrop-blur-md nier-border-primary hover:border-black dark:hover:border-white"
                   :class="nodeSurfaceClass(content)"
                   @pointerdown.stop
                   @click.stop="selectTreeNode(content, 'condition')">
                <div v-if="!isHeatmapActive" class="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 border border-white/70 bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.35)]"></div>
                <div class="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t transition-colors duration-500"
                     :class="isNodeHighlighted(content) ? 'border-black' : 'nier-border-primary group-hover/node:border-black dark:group-hover/node:border-white'"></div>
                <span class="px-1 font-mono font-black uppercase leading-tight text-center transition-colors break-words"
                      :class="isHeatmapActive
                        ? [heatmapMetricSizeClass(content), 'tracking-tight', isNodeHighlighted(content) ? 'text-black' : heatmapMetricColorClass(content)]
                        : ['text-[10px] tracking-[0.16em]', isNodeHighlighted(content) ? 'text-black' : 'text-black/45 dark:text-white/45 group-hover/node:text-black dark:group-hover/node:text-white']">
                  {{ isHeatmapActive ? heatmapMetricLabel(content) : (content.shortName || content.displayName || content.label || content.name || 'CNT') }}
                </span>
              </div>
            </template>
            <div class="flex min-w-[140px] flex-col gap-2">
              <p class="text-[13px] font-mono font-black leading-snug uppercase tracking-wide nier-text-primary">
                {{ content.displayName || content.label || content.name || t('genesis.tree.tooltip.condition') }}
              </p>
              <div class="h-px w-full bg-black/15 dark:bg-white/25"></div>
              <p class="text-[9px] font-mono font-bold uppercase tracking-wide text-black/60 dark:text-white/60">
                {{ t('genesis.tree.tooltip.type') }}: {{ translateTooltipType(content.typeLabel || 'CONDITION') }}
              </p>
              <div class="grid grid-cols-3 gap-3 pt-1 font-mono uppercase">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.frequency') }}</span>
                  <span class="text-[13px] font-black tracking-wide" :class="content.frequencyColorClass || 'text-rose-400'">{{ content.frequencyLabel || '0%' }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.pfRatio') }}</span>
                  <span class="text-[13px] font-black tracking-wide" :class="content.profitFactorRatioColorClass || 'text-amber-400'">{{ content.profitFactorRatioLabel || '0.00' }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[8px] font-bold tracking-wide text-black/35 dark:text-white/35">{{ t('genesis.tree.tooltip.winrate') }}</span>
                  <span class="text-[13px] font-black tracking-wide" :class="content.winrateColorClass || 'text-rose-400'">{{ content.winrateLabel || '0%' }}</span>
                </div>
              </div>
              <div class="border-t nier-border-primary pt-2 font-mono text-[9px] font-bold uppercase tracking-widest text-black/45 dark:text-white/45">
                {{ t('genesis.tree.tooltip.trades') }}: {{ content.tradeCountLabel || '0' }}
              </div>
            </div>
          </ExNTtooltip>
        </div>
      </template>
    </template>
    </div> <!-- Close panLayerStyle -->

    <div class="absolute left-8 top-1/2 z-[80] -translate-y-1/2 pointer-events-auto"
         @pointerdown.stop
         @pointermove.stop
         @click.stop>
      <div class="relative h-[620px] transition-[width] duration-500"
           :class="isPresetPanelCollapsed ? 'w-0' : 'w-80'">
      <ExPanel variant="light" no-padding no-shadow :show-corners="false"
             class="absolute left-0 top-0 h-[620px] w-80 transition-all duration-500 !bg-white dark:!bg-[#0a0a0a]"
             :class="isPresetPanelCollapsed ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'">
        <div class="h-full w-full p-4 flex flex-col">
        <div class="mb-4 flex items-center justify-between border-b nier-border-primary pb-3">
          <span class="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-black/80 dark:text-white/80">{{ t('genesis.tree.re.title') }}</span>
          <button class="font-mono text-[9px] font-bold uppercase tracking-widest text-black/35 dark:text-white/35 transition-colors hover:text-black dark:hover:text-white"
                  @click="activePresetId = null">
            {{ t('genesis.tree.presets.clear') }}
          </button>
        </div>
        <input v-model="presetSearch"
               class="mb-3 h-10 w-full border nier-border-primary bg-black/[0.03] dark:bg-white/[0.03] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] nier-text-primary outline-none transition-colors placeholder:text-black/25 dark:placeholder:text-white/25 focus:border-black/45 dark:focus:border-white/45"
               :placeholder="t('genesis.tree.presets.searchPlaceholder')"
               @keydown.stop />
        <div class="mb-3">
          <div class="mb-2 font-mono text-[7px] font-black uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
            {{ t('genesis.tree.controls.heatmap') }}
          </div>
          <div class="grid grid-cols-4 border nier-border-primary">
            <button v-for="mode in heatmapModes"
                    :key="mode.id"
                    class="border-r nier-border-primary px-2 py-2 font-mono text-[8px] font-black uppercase tracking-[0.14em] transition-colors last:border-r-0"
                    :class="heatmapMode === mode.id ? heatmapButtonClass(mode.id) : 'bg-black/[0.02] dark:bg-white/[0.02] text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white'"
                    @click="heatmapMode = mode.id">
              <span class="relative z-10">{{ t(mode.labelKey) }}</span>
            </button>
          </div>
          <div class="mt-3 w-full border-t nier-border-primary"></div>
        </div>
        <div class="mb-3 grid grid-cols-4 border nier-border-primary">
          <button v-for="tab in presetTabs"
                  :key="tab.id"
                  class="border-r nier-border-primary px-2 py-2 font-mono text-[8px] font-black uppercase tracking-[0.14em] transition-colors last:border-r-0"
                  :class="activePresetTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.02] dark:bg-white/[0.02] text-black/35 dark:text-white/35 hover:text-black dark:hover:text-white'"
                  @click="activePresetTab = tab.id">
            {{ t(tab.labelKey) }}
          </button>
        </div>
        <div class="flex h-[374px] flex-col gap-2 overflow-y-auto pr-1">
          <button v-for="preset in filteredPresetOptions"
                  :key="preset.id"
                  class="group relative border px-4 py-3 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
                  :class="activePresetId === preset.id ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'nier-border-primary text-black/50 dark:text-white/50 hover:border-black/35 dark:hover:border-white/35 hover:text-black dark:hover:text-white'"
                  :disabled="preset.empty"
                  @click="activePresetId = activePresetId === preset.id ? null : preset.id">
            <span class="block font-mono text-[10px] font-black uppercase tracking-[0.16em]">{{ translatePresetLabel(preset.label) }}</span>
            <span class="mt-1 block font-mono text-[8px] font-bold uppercase tracking-widest opacity-45">
              {{ translatePresetType(preset.typeLabel) }} / {{ preset.empty ? t('genesis.tree.presets.noData') : `${preset.targetNodeIds.length} ${t('genesis.tree.presets.nodes')}` }}
            </span>
          </button>
          <div v-if="filteredPresetOptions.length === 0"
               class="border nier-border-primary px-4 py-5 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30">
            {{ t('genesis.tree.presets.noPresetsFound') }}
          </div>
        </div>
        </div>
      </ExPanel>
      </div>
    </div>

</div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import { useGenesisTree } from '../model/useGenesisTree'
import { useMatrixState } from '../../model/matrix/useMatrixState'
import { useI18n } from '~/shared/i18n/useI18n'
import { useThemeStore } from '~/features/store/useTheme'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

const {
  authStore,
  formatCreationDate,
  strategyNodePositions,
  emotionBlocks,
  treePresetOptions
} = useGenesisTree()
const { t } = useI18n()

const pan = ref({ x: 0, y: 0 })
const lastPointer = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const activePresetId = ref<string | null>(null)
const presetSearch = ref('')
const activePresetTab = ref<'strategy' | 'scenario' | 'condition' | 'emotion'>('strategy')
const isPresetPanelCollapsed = ref(true)
const heatmapMode = ref<'none' | 'winrate' | 'pf' | 'frequency'>('none')
const selectedTreeNode = ref<any | null>(null)
const selectedTreeNodeType = ref<'strategy' | 'scenario' | 'condition' | 'emotion' | null>(null)
const selectedTreeNodeKey = ref<string | null>(null)

const presetTabs = [
  { id: 'strategy', labelKey: 'genesis.tree.presets.tabs.strategy' },
  { id: 'scenario', labelKey: 'genesis.tree.presets.tabs.scenario' },
  { id: 'condition', labelKey: 'genesis.tree.presets.tabs.condition' },
  { id: 'emotion', labelKey: 'genesis.tree.presets.tabs.emotion' }
] as const

const heatmapModes = [
  { id: 'none', labelKey: 'genesis.tree.heatmap.none' },
  { id: 'winrate', labelKey: 'genesis.tree.heatmap.winrate' },
  { id: 'pf', labelKey: 'genesis.tree.heatmap.pf' },
  { id: 'frequency', labelKey: 'genesis.tree.heatmap.frequency' }
] as const

const panLayerStyle = computed(() => ({
  transform: `translate3d(${pan.value.x}px, ${pan.value.y}px, 0)`
}))

const isHeatmapActive = computed(() => heatmapMode.value !== 'none')

const normalizePresetSearch = (value: string) => value.toLocaleLowerCase().trim()

const filteredPresetOptions = computed(() => {
  const query = normalizePresetSearch(presetSearch.value)
  const tabbedPresets = treePresetOptions.value.filter((preset) => {
    if (activePresetTab.value === 'strategy') return preset.typeLabel === 'Strategies'
    if (activePresetTab.value === 'scenario') return preset.typeLabel === 'Scenarios'
    if (activePresetTab.value === 'emotion') return preset.typeLabel === 'Emotions'
    return preset.typeLabel === 'Conditions' || preset.typeLabel === 'Combinations'
  })

  if (!query) return tabbedPresets

  return tabbedPresets.filter((preset) => {
    const searchableText = [
      preset.label,
      preset.typeLabel,
      translatePresetLabel(preset.label),
      translatePresetType(preset.typeLabel)
    ].join(' ')

    return normalizePresetSearch(searchableText).includes(query)
  })
})

const translatePresetLabel = (label: string) => {
  return t(`genesis.tree.presets.labels.${label}`)
}

const translatePresetType = (typeLabel: string) => {
  return t(`genesis.tree.presets.types.${typeLabel}`)
}

const translateTooltipType = (typeLabel: string) => {
  const key = `genesis.tree.tooltip.types.${typeLabel}`
  const translatedType = t(key)
  return translatedType === key ? typeLabel : translatedType
}

const resetView = () => {
  pan.value = { x: 0, y: 0 }
}

const openPresetPanel = () => {
  isPresetPanelCollapsed.value = false
  return true
}

const closePresetPanel = () => {
  isPresetPanelCollapsed.value = true
  return false
}

const togglePresetPanel = () => {
  isPresetPanelCollapsed.value = !isPresetPanelCollapsed.value
  return !isPresetPanelCollapsed.value
}

const isPresetPanelOpen = () => {
  return !isPresetPanelCollapsed.value
}

const selectTreeNode = (_node: any, _type: 'strategy' | 'scenario' | 'condition' | 'emotion') => {
  closeSelectedTreeNode()
}

const closeSelectedTreeNode = () => {
  selectedTreeNode.value = null
  selectedTreeNodeType.value = null
  selectedTreeNodeKey.value = null
}

const { strategyVersions, selectedStrategyVersionId, selectStrategyVersion, updateKey } = useMatrixState()

const findCurrentTreeNode = (treeKey: string) => {
  for (const strategy of strategyNodePositions.value) {
    if ((strategy.treeKey || strategy.id) === treeKey) return strategy

    for (const scenario of strategy.scenarios || []) {
      if ((scenario.treeKey || scenario.id) === treeKey) return scenario

      const content = (scenario.contents || []).find((item: any) => (item.treeKey || item.id) === treeKey)
      if (content) return content
    }
  }

  for (const block of emotionBlocks.value) {
    const emotion = block.emotions.find(item => (item.treeKey || item.id) === treeKey)
    if (emotion) return emotion
  }

  return null
}

const treeRenderKey = ref(0)
watch([selectedStrategyVersionId, updateKey, strategyVersions], async () => {
  await nextTick()
  treeRenderKey.value++

  if (!selectedTreeNodeKey.value) return

  const currentNode = findCurrentTreeNode(selectedTreeNodeKey.value)
  if (currentNode) {
    selectedTreeNode.value = currentNode
  } else {
    closeSelectedTreeNode()
  }
}, { deep: true })

const currentVersionIndex = computed(() => {
  const index = strategyVersions.value.findIndex(v => v.id === selectedStrategyVersionId.value)
  return index === -1 ? Math.max(0, strategyVersions.value.length - 1) : index
})

const hasPrevVersion = computed(() => currentVersionIndex.value > 0)
const hasNextVersion = computed(() => currentVersionIndex.value < strategyVersions.value.length - 1)

const currentVersionLabel = computed(() => {
  const v = strategyVersions.value[currentVersionIndex.value]
  return v ? v.label : 'UNKNOWN'
})

const navigateVersion = (direction: 'prev' | 'next') => {
  let nextIndex = direction === 'prev' ? currentVersionIndex.value - 1 : currentVersionIndex.value + 1
  if (nextIndex < 0) nextIndex = 0
  if (nextIndex >= strategyVersions.value.length) nextIndex = strategyVersions.value.length - 1

  const v = strategyVersions.value[nextIndex]
  if (v) selectStrategyVersion(v.id)
}

defineExpose({
  resetView,
  openPresetPanel,
  closePresetPanel,
  togglePresetPanel,
  isPresetPanelOpen
})

const getNodeMetricValue = (node: any) => {
  if (heatmapMode.value === 'winrate') return Number(node?.winrateValue || 0)
  if (heatmapMode.value === 'pf') return Math.min(Number(node?.profitFactorRatioValue || 0) / 2, 1)
  if (heatmapMode.value === 'frequency') return Number(node?.frequencyValue || 0)
  return 0
}

const getHeatmapClass = (_node: any) => {
  return ''
}

const heatmapMetricLabel = (node: any) => {
  if (heatmapMode.value === 'pf') {
    return node?.profitFactorRatioLabel || '0.00'
  }

  const value = heatmapMode.value === 'frequency'
    ? Number(node?.frequencyValue || 0)
    : Number(node?.winrateValue || 0)

  return `${Math.round(value * 100)}%`
}

const heatmapMetricSizeClass = (node: any) => {
  const length = heatmapMetricLabel(node).length
  if (length >= 6) return 'text-[7px]'
  if (length >= 5) return 'text-[8px]'
  if (length >= 4) return 'text-[9px]'
  return 'text-[11px]'
}

const heatmapMetricColorClass = (node: any) => {
  const value = getNodeMetricValue(node)
  if (value >= 0.8) return 'text-emerald-300'
  if (value >= 0.6) return 'text-green-300'
  if (value >= 0.4) return 'text-lime-300'
  if (value >= 0.2) return 'text-orange-300'
  return 'text-rose-400'
}

const heatmapButtonClass = (_mode: string) => {
  return 'bg-black text-white dark:bg-white dark:text-black'
}

const nodeSurfaceClass = (node: any) => {
  if (isNodeHighlighted(node)) return 'bg-white border-white text-black shadow-[0_0_18px_rgba(255,255,255,0.35)]'

  return getHeatmapClass(node) || 'bg-[#ffffff] dark:bg-[#0a0a0a]'
}

const activePreset = computed(() => {
  return treePresetOptions.value.find(preset => preset.id === activePresetId.value) || null
})

const targetNodeIds = computed(() => {
  return new Set(activePreset.value?.targetNodeIds || [])
})

const highlightedNodeIds = computed(() => {
  const highlighted = new Set<string>()
  if (targetNodeIds.value.size === 0) return highlighted

  strategyNodePositions.value.forEach((strategy: any) => {
    if (isTargetNode(strategy)) {
      highlighted.add(strategy.treeKey || strategy.id)
    }

    strategy.scenarios.forEach((scenario: any) => {
      const hasScenarioTarget = isTargetNode(scenario)
      const targetContents = (scenario.contents || []).filter((content: any) => isTargetNode(content))

      if (hasScenarioTarget || targetContents.length > 0) {
        highlighted.add(strategy.treeKey || strategy.id)
        highlighted.add(scenario.treeKey || scenario.id)
      }

      targetContents.forEach((content: any) => {
        highlighted.add(content.treeKey || content.id)
      })
    })
  })

  emotionBlocks.value.forEach((block: any) => {
    block.emotions.forEach((emotion: any) => {
      if (isTargetNode(emotion)) {
        highlighted.add(emotion.treeKey || emotion.id)
      }
    })
  })

  return highlighted
})

const isRootHighlighted = computed(() => targetNodeIds.value.size > 0)

const isTargetNode = (node: any) => {
  return targetNodeIds.value.has(node?.treeKey || '') || targetNodeIds.value.has(node?.id || '')
}

const isNodeHighlighted = (node: any) => {
  if (typeof node === 'string') return highlightedNodeIds.value.has(node)

  return highlightedNodeIds.value.has(node?.treeKey || '') || highlightedNodeIds.value.has(node?.id || '')
}

const strategyHasHighlight = (strategy: any) => {
  return isNodeHighlighted(strategy) ||
    strategy.scenarios.some((scenario: any) => scenarioHasHighlight(scenario))
}

const scenarioHasHighlight = (scenario: any) => {
  return isNodeHighlighted(scenario) ||
    (scenario.contents || []).some((content: any) => isNodeHighlighted(content))
}

const highlightedStrategies = computed(() => {
  return strategyNodePositions.value.filter(strategyHasHighlight)
})

const highlightedScenarios = (strategy: any) => {
  return (strategy.scenarios || []).filter((scenario: any) => scenarioHasHighlight(scenario))
}

const highlightedContents = (scenario: any) => {
  return (scenario.contents || []).filter((content: any) => isNodeHighlighted(content))
}

const emotionNodePositions = (block: any) => {
  const columns = Math.min(3, block.emotions.length)
  const columnGap = 62
  const rowGap = 62
  const startX = block.x - (((columns - 1) * columnGap) / 2)

  return block.emotions.map((emotion: any, index: number) => {
    const row = Math.floor(index / 3)
    const column = index % 3
    const rowColumns = Math.min(3, block.emotions.length - (row * 3))
    const rowStartX = block.x - (((rowColumns - 1) * columnGap) / 2)

    return {
      ...emotion,
      x: rowColumns === columns ? startX + (column * columnGap) : rowStartX + (column * columnGap),
      y: block.y + (row * rowGap)
    }
  })
}

const emotionConnectorPath = computed(() => {
  if (!emotionBlocks.value.length) return ''

  return emotionConnectorPathFor(emotionBlocks.value.flatMap((block) => emotionNodePositions(block)))
})

const highlightedEmotionConnectorPath = computed(() => {
  const highlightedEmotionNodes = emotionBlocks.value
    .flatMap((block) => emotionNodePositions(block))
    .filter((emotion) => isNodeHighlighted(emotion))

  return emotionConnectorPathFor(highlightedEmotionNodes)
})

const emotionConnectorPathFor = (points: Array<{ x: number, y: number }>) => {
  if (!points.length) return ''

  const branchY = -118
  const minX = Math.min(...points.map((point) => point.x + 1))
  const maxX = Math.max(...points.map((point) => point.x + 1))

  return [
    `M 1 1 V ${branchY}`,
    `M ${minX} ${branchY} H ${maxX}`,
    ...points.map((point) => `M ${point.x + 1} ${branchY} V ${point.y + 1}`)
  ].join(' ')
}

const startPan = (event: PointerEvent) => {
  if (event.button !== 0) return

  isPanning.value = true
  lastPointer.value = { x: event.clientX, y: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const movePan = (event: PointerEvent) => {
  if (!isPanning.value) return

  const dx = event.clientX - lastPointer.value.x
  const dy = event.clientY - lastPointer.value.y

  pan.value = {
    x: pan.value.x + dx,
    y: pan.value.y + dy
  }
  lastPointer.value = { x: event.clientX, y: event.clientY }
}

const endPan = (event: PointerEvent) => {
  if (!isPanning.value) return

  isPanning.value = false

  if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  }
}

const connectorPath = (
  parentX: number,
  parentY: number,
  children: Array<Record<string, any>>,
  childXKey: string,
  childYKey: string
) => {
  if (!children.length) return ''

  const points = children.map(child => ({
    x: Number(child[childXKey]) + 1,
    y: Number(child[childYKey]) + 1
  }))
  
  if (!points.length || !points[0]) return ''

  const childY = points[0].y
  const busY = parentY + ((childY - parentY) / 2)
  const minX = Math.min(...points.map(point => point.x))
  const maxX = Math.max(...points.map(point => point.x))
  const busStartX = Math.min(parentX, minX)
  const busEndX = Math.max(parentX, maxX)
  const childDrops = points.map(point => `M ${point.x} ${busY} V ${point.y}`)

  return [
    `M ${parentX} ${parentY} V ${busY}`,
    `M ${busStartX} ${busY} H ${busEndX}`,
    ...childDrops
  ].join(' ')
}

const conditionRowsPath = (
  scenarioX: number,
  scenarioY: number,
  contents: Array<Record<string, any>>
) => {
  if (!contents.length) return ''

  const points = contents.map(content => ({
    x: Number(content.globalX) + 1,
    y: Number(content.globalY) + 1
  }))
  const rowMap = new Map<number, Array<{ x: number, y: number }>>()

  points.forEach((point) => {
    rowMap.set(point.y, [...(rowMap.get(point.y) || []), point])
  })

  const rows = Array.from(rowMap.entries())
    .sort(([rowA], [rowB]) => rowA - rowB)
    .map(([, row]) => row.sort((a, b) => a.x - b.x))
    
  const firstRow = rows[0]
  if (!firstRow || !firstRow.length || !firstRow[0]) return ''

  const firstRowY = firstRow[0].y
  const rootBusY = scenarioY + ((firstRowY - scenarioY) / 2)
  const rootMinX = Math.min(scenarioX, ...firstRow.map(point => point.x))
  const rootMaxX = Math.max(scenarioX, ...firstRow.map(point => point.x))
  const paths = [
    `M ${scenarioX} ${scenarioY} V ${rootBusY}`,
    `M ${rootMinX} ${rootBusY} H ${rootMaxX}`,
    ...firstRow.map(point => `M ${point.x} ${rootBusY} V ${point.y}`)
  ]

  rows.slice(1).forEach((row, rowIndex) => {
    const previousRow = rows[rowIndex]
    if (!previousRow || !previousRow.length) return
    
    const parentPoint = previousRow[Math.min(1, previousRow.length - 1)]
    if (!parentPoint) return
    
    const rowY = row[0]?.y ?? 0
    const rowBusY = parentPoint.y + ((rowY - parentPoint.y) / 2)
    const minX = Math.min(...row.map(point => point.x))
    const maxX = Math.max(...row.map(point => point.x))
    const childDrops = row.map(point => `M ${point.x} ${rowBusY} V ${point.y}`)

    paths.push(`M ${parentPoint.x} ${parentPoint.y} V ${rowBusY}`)
    paths.push(`M ${Math.min(parentPoint.x, minX)} ${rowBusY} H ${Math.max(parentPoint.x, maxX)}`)
    paths.push(...childDrops)
  })

  return paths.join(' ')
}

</script>
