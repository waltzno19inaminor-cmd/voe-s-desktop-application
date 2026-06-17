<template>
  <div class="skill-chip absolute cursor-pointer group pointer-events-auto"
       :style="{
         left: Math.round(node.x * scale) + 'px',
         top: Math.round(node.y * scale) + 'px',
         zIndex: isSelected ? 1000 : 1,
         width: nodeWidth,
         height: nodeHeight
       }"
       @mousedown.stop="startDrag"
       @click="$emit('click')"
       @contextmenu.prevent="$emit('contextmenu', { x: $event.clientX, y: $event.clientY, nodeId: node.id })">

     <!-- NIER STYLE SKILL CHIP (Reified with Design System) -->
     <ExNTtooltip :title="tooltipTitle" :disabled="isScenarioContentNode" class="w-full h-full">
       <template #trigger>
          <!-- Editing Description Overlay -->
          <div v-if="node.params?.isEditingDescription" class="w-full h-full relative pointer-events-auto z-50">
            <ExPanel variant="light" :showCorners="true" noPadding class="w-full h-full">
              <textarea
                v-model="node.params.customDescription"
                @blur="node.params.isEditingDescription = false"
                v-autofocus
                placeholder="ENTER_DESCRIPTION..."
                class="w-full h-full bg-transparent text-nier-text-light dark:text-nier-text-dark p-4 text-[12px] font-mono tracking-widest outline-none resize-none"
              ></textarea>
            </ExPanel>
          </div>

          <!-- Normal Node View -->
          <div v-else class="relative w-full h-full border-[2px] flex flex-col items-center justify-center transition-all duration-500"
               :class="[
                 node.type === 'placeholder' ? 'border-dashed border-[1px] opacity-80' : '',
                 isRiskPanel ? '' : (
                   isSelected ? (node.type === 'risk-element' ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]' : 'border-nier-text-light dark:border-nier-text-dark shadow-[0_0_60px_rgba(44,44,42,0.3)] dark:shadow-[0_0_60px_rgba(255,255,255,0.3)]') : (node.type === 'risk-element' ? 'border-red-500/40 group-hover:border-red-500' : 'border-nier-border-light dark:border-nier-border-dark group-hover:border-nier-text-light dark:group-hover:border-nier-text-dark group-hover:shadow-[0_0_60px_rgba(44,44,42,0.2)] dark:group-hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]')
                 ),
                 (node.type === 'image' || node.type === 'step' || node.type === 'scaling-entry' || isRiskPanel) ? 'border-none shadow-none' : ''
               ]"
               :style="displayColor ? { borderColor: displayColor, boxShadow: isSelected ? `0 0 60px ${displayColor}40` : `0 0 30px ${displayColor}20` } : {}"
               @dblclick.stop="$emit('doubleclick')">

             <!-- Separate Background Layer -->
             <div class="absolute inset-0 pointer-events-none -z-10 transition-colors duration-500"
                  :class="[
                    (node.type === 'step' || node.type === 'scaling-entry') ? 'rounded-full bg-nier-text-light dark:bg-nier-text-dark' : 'bg-nier-white/10 dark:bg-nier-black/10',
                    '',
                    node.type === 'image' ? '!bg-transparent' : '',
                    isRiskPanel ? '!bg-transparent' : '',
                    node.params?.direction === 'LONG' ? '!bg-green-500/50' : '',
                    node.params?.direction === 'SHORT' ? '!bg-red-500/50' : '',
                    node.type === 'risk-element' ? '!bg-red-500/5' : ''
                  ]"></div>

           <!-- Selection Brackets -->
            <div v-if="isSelected && !isRiskPanel" class="absolute -inset-4 pointer-events-none">
               <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-nier-text-light dark:border-nier-text-dark animate-pulse"></div>
               <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-nier-text-light dark:border-nier-text-dark animate-pulse"></div>
               <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-nier-text-light dark:border-nier-text-dark animate-pulse"></div>
               <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark animate-pulse"></div>
            </div>

           <div
             :class="isRiskPanel
               ? 'relative w-full flex flex-col items-center justify-center'
               : 'absolute inset-0 w-full h-full flex flex-col items-center justify-center'">

           <!-- Skill Icon / Label / Image Content -->
           <div v-if="node.type === 'instrument' || ['indicator', 'pattern', 'smc', 'emotion-state', 'step', 'scaling-entry', 'risk-element'].includes(node.type)"
                class="w-full h-full flex items-center justify-center overflow-hidden relative"
                :class="(node.type === 'step' || node.type === 'scaling-entry') ? 'p-0' : 'p-[15%]'">
              <img v-if="node.type === 'instrument' && node.params?.logo && !imageError"
                   :src="node.params.logo"
                   @error="imageError = true"
                   draggable="false"
                   class="w-full h-full object-contain opacity-100 grayscale transition-all duration-700 select-none pointer-events-none"
                   style="image-rendering: -webkit-optimize-contrast; transform: translateZ(0); will-change: transform, opacity;"
                   :class="{ 'opacity-100 grayscale-0': isSelected }" />
              <div v-else class="font-mono transition-all tracking-tighter text-center"
                     :class="[
                      (node.type === 'step' || node.type === 'scaling-entry') ? 'text-nier-white dark:text-nier-black opacity-100 font-light' : 'text-nier-text-light dark:text-nier-text-dark opacity-100 font-black',
                      isSelected ? 'opacity-100' : ''
                    ]"
                    :style="{
                      ...(displayColor ? { color: displayColor } : (node.type === 'risk-element' ? { color: '#ef4444' } : {})),
                      fontSize: node.type === 'emotion-state' ? `${36 * scale}px` : 
                                (node.type === 'scaling-entry' || node.type === 'step') ? (node.label && node.label.length > 3 ? `${12 * scale}px` : `${24 * scale}px`) : 
                                `${24 * scale}px`
                    }">
                {{
                   node.type === 'emotion-state' ? (node.label || 'EN').slice(0, 2).toUpperCase() :
                   (node.type === 'step' || node.type === 'scaling-entry') ? (node.label || '') :
                   node.type === 'risk-element' ? (node.params?.riskType === 'trade' ? 'RT' : node.params?.riskType === 'day' ? 'RD' : node.params?.riskType === 'style' ? (node.label || 'ST').slice(0, 2).toUpperCase() : 'RR') :
                   (node.label || 'NOD').slice(0, 3).toUpperCase()
                }}
              </div>
           </div>

           <!-- Risk Management Panel -->
            <div
              v-if="isRiskPanel"
              class="cursor-pointer pointer-events-auto"
              :style="riskPanelShellStyle"
              @click.stop="$emit('click')">
              <div :style="riskPanelScalerStyle">
                <ExPanel
                  variant="light"
                  no-padding
                  no-shadow
                  class="w-[360px] min-h-[320px] !border-red-500/30 dark:!border-red-400/30"
                  :class="{ 'risk-panel-collapsed': isRiskPanelContentHidden }">
                  <div v-if="isRiskPanelContentHidden" class="risk-panel-hatch"></div>
                  <div class="relative z-10 flex items-center justify-between border-b nier-border-primary px-4 py-2 bg-red-500/[0.03]">
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 rotate-45 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"></div>
                      <span class="text-[9px] font-mono uppercase tracking-[0.28em] font-black nier-text-primary">Risk_Management</span>
                    </div>
                    <span class="text-[8px] font-mono uppercase tracking-[0.18em] text-red-500/70">Panel</span>
                  </div>

                  <div v-show="!isRiskPanelContentHidden" class="flex flex-col gap-3 p-4 pb-7">
                    <label class="risk-panel-field">
                      <span>Risk / Trade</span>
                      <div class="risk-panel-control">
                        <input v-model.number="riskParams.riskLossTrade" type="number" step="0.1" @change="commitRiskPanel" />
                        <button @click="toggleRiskUnit('riskLossTradeUnit')" @mousedown.stop>{{ riskParams.riskLossTradeUnit }}</button>
                      </div>
                    </label>

                    <label class="risk-panel-field">
                      <span>Risk / Session</span>
                      <div class="risk-panel-control">
                        <input v-model.number="riskParams.riskLossDay" type="number" step="0.1" @change="commitRiskPanel" />
                        <button @click="toggleRiskUnit('riskLossDayUnit')" @mousedown.stop>{{ riskParams.riskLossDayUnit }}</button>
                      </div>
                    </label>

                    <label class="risk-panel-field">
                      <span>Risk Reward</span>
                      <div class="risk-panel-control">
                        <span class="risk-panel-prefix">1:</span>
                        <input v-model.number="riskParams.riskRR" type="number" step="0.1" @change="commitRiskPanel" />
                      </div>
                    </label>

                    <label class="risk-panel-field">
                      <span>Trading Style</span>
                      <div class="risk-style-control">
                        <button
                          v-for="style in riskTradingStyles"
                          :key="style"
                          type="button"
                          :class="{ 'is-active': riskParams.tradingStyle === style }"
                          @click.stop="setRiskTradingStyle(style)"
                          @mousedown.stop>
                          {{ formatRiskTradingStyle(style) }}
                        </button>
                      </div>
                    </label>
                  </div>
                </ExPanel>
              </div>
            </div>

           <!-- Image Content Rendering -->
            <div v-if="node.type === 'image'" class="w-full h-full relative group/img overflow-visible">
               <div v-if="!node.params?.imageUrl" class="w-full h-full border-2 border-dashed border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center bg-nier-white/40 dark:bg-nier-black/40">
                  <div class="w-8 h-8 border border-nier-border-light dark:border-nier-border-dark mb-4 animate-pulse rotate-45 flex items-center justify-center">
                     <div class="w-2 h-2 bg-nier-text-light dark:bg-nier-text-dark"></div>
                  </div>
                  <ExText variant="telemetry" class="opacity-40">Awaiting_Visual_Protocol</ExText>
               </div>
                            <div v-else class="w-full h-full border-2 border-nier-border-light dark:border-nier-border-dark p-1 bg-nier-white dark:bg-nier-black relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                 <img :src="node.params.imageUrl"
                      class="w-full h-full object-contain opacity-100 transition-all duration-700 select-none pointer-events-none"
                      style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; transform: translateZ(0); will-change: transform, opacity;" />
                                  <!-- Scanning Lines overlay -->
                  <div class="absolute inset-0 pointer-events-none bg-scan-line opacity-5"></div>
                  <div class="absolute inset-0 border border-nier-text-light/5 dark:border-nier-text-dark/5 pointer-events-none"></div>

                  <!-- Mini Corners -->
                  <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-nier-text-light dark:border-nier-text-dark"></div>
                  <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark"></div>
               </div>

               <!-- Resize Handle -->
               <div class="absolute -bottom-3 -right-3 w-8 h-8 cursor-nwse-resize flex items-center justify-center group-hover/img:opacity-100 opacity-0 transition-opacity z-50 pointer-events-auto"
                    @mousedown.stop.prevent="startResize">
                  <div class="w-3 h-3 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark"></div>
               </div>
                            <!-- Outer floating frames -->
               <div class="absolute -inset-2 border border-nier-border-light dark:border-nier-border-dark opacity-50 pointer-events-none"></div>
               <div class="absolute -inset-4 border border-nier-border-light dark:border-nier-border-dark opacity-20 pointer-events-none"></div>
            </div>

            <!-- Audio Player Rendering -->
            <div v-if="node.type === 'audio-note'" class="w-full h-full border border-nier-border-light dark:border-nier-border-dark bg-nier-white/90 dark:bg-nier-black/90 flex items-center px-3 gap-3 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] pointer-events-auto relative">
                 <button @mousedown.stop
                         @click.stop="toggleAudioPlayback"
                         :disabled="!node.params.audioDataUrl"
                         class="border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:border-nier-text-light dark:hover:border-nier-text-dark transition-colors flex-shrink-0 w-8 h-8 bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03]">
                    <span v-if="!isAudioPlaying" class="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-nier-text-light dark:border-l-nier-text-dark ml-0.5"></span>
                    <span v-else class="w-3 h-3 border-x-4 border-nier-text-light dark:border-nier-text-dark"></span>
                 </button>
                 <div class="flex-1 min-w-0 flex flex-col gap-1.5 py-1">
                    <div class="relative h-4 cursor-pointer flex items-center"
                         @mousedown.stop.prevent="seekAudio">
                       <div class="w-full h-[2px] bg-nier-border-light dark:bg-nier-border-dark"></div>
                       <div class="absolute left-0 h-[2px] bg-nier-text-light dark:bg-nier-text-dark"
                            :style="{ width: `${audioProgressPercent}%` }"></div>
                       <div class="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 border-[1.5px] border-nier-text-light dark:border-nier-text-dark bg-nier-white dark:bg-nier-black transition-[left] duration-75"
                            :class="isAudioSeeking ? '!transition-none' : ''"
                            :style="{ left: `${audioProgressPercent}%` }"></div>
                    </div>
                    <div class="flex items-center justify-between text-[8px] font-mono opacity-60">
                       <span>{{ formatAudioTime(audioCurrentTime) }}</span>
                       <span class="truncate px-2 flex-1 text-center font-black">{{ node.params.audioName || 'AUDIO_NOTE' }}</span>
                       <span>{{ formatAudioTime(audioDuration) }}</span>
                    </div>
                 </div>
                 <audio ref="audioElement"
                        v-if="node.params.audioDataUrl"
                        :src="node.params.audioDataUrl"
                        class="hidden"
                        @timeupdate="updateAudioProgress"
                        @loadedmetadata="updateAudioProgress"
                        @ended="handleAudioEnded"></audio>
                 
                 <!-- Inner Corner Accents -->
                 <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-40"></div>
                 <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-40"></div>
            </div>

           <!-- Scenario documentation panels -->
            <div v-if="isScenarioPanel"
                 class="w-full h-full flex flex-col bg-nier-white/70 dark:bg-nier-black/70 overflow-hidden">
               <div v-if="true" class="flex items-center justify-between border-b border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03] flex-shrink-0"
                    :style="{ padding: `${8 * scale * headerScaleMult}px ${12 * scale * headerScaleMult}px` }">
                  <span class="font-mono tracking-[0.18em] uppercase font-black opacity-60 truncate" :style="{ fontSize: `${8 * scale * headerScaleMult}px` }">{{ locale === 'ru' ? t(scenarioPanelHeaderTitle) : scenarioPanelHeaderTitle }}</span>
                  <span class="font-mono tracking-widest uppercase opacity-30 truncate" :style="{ fontSize: `${8 * scale * headerScaleMult}px`, maxWidth: `${96 * scale * headerScaleMult}px` }">{{ scenarioPanelHeaderCode }}</span>
               </div>

               <div v-if="isDrawingPanel"
                    class="relative flex-1 m-3 border border-dashed border-nier-border-light dark:border-nier-border-dark bg-[linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] bg-[size:18px_18px] text-nier-text-light/10 dark:text-nier-text-dark/10 overflow-hidden">
                  <svg class="absolute inset-0 w-full h-full pointer-events-none text-nier-text-light dark:text-nier-text-dark"
                       viewBox="0 0 100 100"
                       preserveAspectRatio="none">
                     <polyline v-for="stroke in node.params?.strokes || []"
                               :key="stroke.id"
                               :points="formatPanelStroke(stroke)"
                               fill="none"
                               :stroke="stroke.color || 'currentColor'"
                               :stroke-width="Math.max(0.7, (stroke.size || 2) * 0.45)"
                               stroke-linecap="round"
                               stroke-linejoin="round"
                               vector-effect="non-scaling-stroke"
                               class="opacity-70" />
                  </svg>
                  <div v-if="!node.params?.strokes?.length" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span class="text-[8px] font-mono tracking-[0.28em] uppercase text-nier-text-light/35 dark:text-nier-text-dark/35">Double_Click_To_Draw</span>
                  </div>
               </div>

               <div v-else-if="node.type === 'checklist-panel'" class="flex-1 min-h-0 px-3 py-2 overflow-y-auto custom-scrollbar space-y-2">
                  <div v-for="item in node.params.items || []" :key="item.id" class="flex items-center gap-2">
                     <button @mousedown.stop
                             @click.stop="item.done = !item.done"
                             class="w-3.5 h-3.5 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center flex-shrink-0">
                        <div v-if="item.done" class="w-1.5 h-1.5 bg-nier-text-light dark:bg-nier-text-dark rotate-45"></div>
                     </button>
                     <input v-model="item.text"
                            @mousedown.stop
                            @click.stop
                            class="flex-1 min-w-0 bg-transparent outline-none text-[9px] font-mono uppercase tracking-wide text-nier-text-light dark:text-nier-text-dark"
                            :class="item.done ? 'line-through opacity-35' : ''" />
                  </div>
                  <button @mousedown.stop
                          @click.stop="addChecklistItem"
                          class="w-full h-7 border border-dashed border-nier-border-light dark:border-nier-border-dark text-[8px] font-mono tracking-[0.25em] uppercase opacity-45 hover:opacity-100 transition-opacity">
                     +
                  </button>
               </div>

               <div v-else-if="node.type === 'embed-panel'" class="flex-1 min-h-0 p-3 flex flex-col gap-2">
                  <input v-model="node.params.embedUrl"
                         @mousedown.stop
                         @click.stop
                         placeholder="https://..."
                         class="h-8 bg-transparent border border-nier-border-light dark:border-nier-border-dark px-2 text-[9px] font-mono outline-none text-nier-text-light dark:text-nier-text-dark" />
                  <div class="flex-1 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03] flex items-center justify-center overflow-hidden">
                     <span class="text-[8px] font-mono tracking-[0.25em] uppercase opacity-35 break-all px-3 text-center">{{ node.params.embedUrl || 'Embed_URL' }}</span>
                  </div>
               </div>

               <div v-else-if="node.type === 'table-panel'" class="flex-1 w-full h-full min-h-0 flex flex-col bg-nier-white/40 dark:bg-nier-black/40">
                  <div class="h-11 flex items-center justify-between border-b border-nier-border-light dark:border-nier-border-dark px-3 bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03] gap-3">
                     <div class="table-stepper">
                        <span class="table-stepper-label">Rows</span>
                        <div class="table-stepper-control">
                           <button @mousedown.stop @click.stop="resizeTable(-1, 0)" class="table-stepper-button" aria-label="Remove row">-</button>
                           <span class="table-stepper-value">{{ tableRows }}</span>
                           <button @mousedown.stop @click.stop="resizeTable(1, 0)" class="table-stepper-button" aria-label="Add row">+</button>
                        </div>
                     </div>
                     <div class="table-stepper">
                        <span class="table-stepper-label">Cols</span>
                        <div class="table-stepper-control">
                           <button @mousedown.stop @click.stop="resizeTable(0, -1)" class="table-stepper-button" aria-label="Remove column">-</button>
                           <span class="table-stepper-value">{{ tableCols }}</span>
                           <button @mousedown.stop @click.stop="resizeTable(0, 1)" class="table-stepper-button" aria-label="Add column">+</button>
                        </div>
                     </div>
                  </div>
                  <div class="flex-1 min-h-0 relative overflow-hidden w-full">
                     <div class="matrix-table-grid absolute top-0 left-0 grid" 
                          :style="{
                             ...tableGridStyle,
                             transform: `scale(${scale})`,
                             transformOrigin: 'top left',
                             width: `${100 / scale}%`,
                             height: `${100 / scale}%`
                          }">
                        <input v-for="cell in tableCells"
                               :key="`${cell.row}-${cell.col}`"
                               :value="tableDraft[cell.row]?.[cell.col] || ''"
                               @focus="isEditingTable = true"
                               @input="updateTableCell(cell.row, cell.col, $event)"
                               @blur="finishTableEditing"
                               @mousedown.stop
                               @click.stop
                               class="matrix-table-input w-full h-full min-w-0 min-h-0 bg-transparent border-r border-b border-nier-border-light dark:border-nier-border-dark px-2 py-0 font-mono outline-none text-nier-text-light dark:text-nier-text-dark"
                               :style="{ fontSize: '11px' }" />
                     </div>
                  </div>
               </div>

               <div v-else-if="node.type === 'file-attachment'" class="flex-1 min-h-0 p-3 flex flex-col items-center justify-center gap-3">
                  <div class="w-10 h-10 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center">
                     <span class="text-[10px] font-mono font-black">FILE</span>
                  </div>
                  <span class="text-[8px] font-mono tracking-[0.18em] uppercase opacity-55 text-center break-all">{{ node.params.fileName || 'Double_Click_To_Attach' }}</span>
                  <a v-if="node.params.fileDataUrl" :href="node.params.fileDataUrl" :download="node.params.fileName" @mousedown.stop @click.stop class="text-[8px] font-mono uppercase underline opacity-60 hover:opacity-100">Open</a>
               </div>

               <div v-else v-show="scale > 0.25" class="flex-1 w-full min-h-0 relative overflow-hidden">
                   <div ref="textEditorElement"
                        contenteditable="true"
                        :data-text-node-id="node.id"
                        data-text-editable="true"
                        :data-placeholder="textPanelPlaceholder"
                        :style="{ 
                           ...textPanelEditorStyle, 
                           fontSize: '16px',
                           transform: `scale(${scale})`,
                           transformOrigin: 'top left',
                           width: `${100 / scale}%`,
                           height: `${100 / scale}%`
                        }"
                        @mousedown.stop
                        @click.stop="$emit('doubleclick')"
                        @focus="focusTextPanel"
                        @blur="blurTextPanel"
                        @beforeinput="handleTextPanelBeforeInput"
                        @input="updateTextPanelHtml"
                        class="matrix-text-rich absolute top-0 left-0 bg-transparent px-3 py-2 font-mono tracking-wide text-nier-text-light dark:text-nier-text-dark outline-none custom-scrollbar select-text cursor-text overflow-y-auto"></div>
               </div>

               <div v-if="!isTablePanel"
                    class="absolute -bottom-3 -right-3 w-8 h-8 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto"
                    @mousedown.stop.prevent="startResize">
                  <div class="w-3 h-3 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark"></div>
               </div>

               <!-- Invisible drag borders removed in favor of topbar -->
            </div>
            <!-- Placeholder / Empty Cell -->
            <div v-if="node.type === 'placeholder'" class="flex items-center justify-center">
               <div class="w-3 h-3 bg-nier-text-light dark:bg-nier-text-dark rotate-45"></div>
            </div>

           <!-- Configuration Node Preview Match -->
           <div v-if="node.params?.isConfig"
                class="w-full h-full flex items-center justify-center text-nier-text-light dark:text-nier-text-dark">
              <span class="text-[24px] font-mono font-black tracking-tighter uppercase leading-none">
                {{ configNodeCode }}
              </span>
           </div>

           <!-- Default SVGs for other types -->
           <svg v-if="!node.params?.isConfig && !isScenarioPanel && !['placeholder', 'risk', 'risk-element', 'scaling-entry', 'step', 'instrument', 'indicator', 'pattern', 'smc', 'emotion-state', 'image', 'audio-note'].includes(node.type)"
               class="w-[60%] h-[60%] opacity-60 group-hover:opacity-100 transition-opacity text-nier-text-light dark:text-nier-text-dark"
               :class="{ 'opacity-100': isSelected }"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path v-if="node.type === 'strategy'" d="M12 4L20 18H4L12 4z" />
            <template v-else-if="node.type === 'scenario'">
              <rect v-if="!node.params?.phase || node.params.phase === 'NONE'" key="scenario-none" x="3" y="3" width="18" height="18" />
              <path v-else-if="node.params.phase === 'ENTRY'" key="scenario-entry" d="M12 5v14M19 12l-7 7-7-7" />
              <path v-else-if="node.params.phase === 'EXIT'" key="scenario-exit" d="M12 19V5M5 12l7-7 7 7" />
            </template>
            <circle v-else-if="node.type === 'condition'" cx="12" cy="12" r="9" />
            <path v-else-if="node.type === 'emotion'" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            <g v-else-if="node.type === 'risk'">
               <path d="M12 5v8M12 18v0.01" stroke-width="2.5" stroke-linecap="round" />
            </g>
            <path v-else-if="node.type === 'pyramiding'" d="M21 21H3M18 17H6M15 13H9M12 9V3" />
            <g v-else-if="node.type === 'averaging'">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </g>
            <path v-else d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           </div>

            <!-- Connection Points -->
            <!-- Left (Passive) -->
            <div v-if="!node.isRoot" @mousedown.stop="$emit('pickup-input', { node, port: 'left' })" @mouseup.stop="$emit('drop', { node, port: 'left' })"
                 @dblclick.stop="$emit('clear-input', node)"
                 :class="[
                   isClosest ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100',
                   isRiskPanel ? '!shadow-none dark:!shadow-none' : ''
                 ]"
                 class="absolute top-1/2 -translate-y-1/2 w-[12px] h-[12px] -left-[6px] border-[2px] border-nier-text-light dark:border-nier-text-dark rotate-45 bg-nier-white dark:bg-nier-black transition-all shadow-[0_0_20px_rgba(44,44,42,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]"></div>
            
            <!-- Right (Active) -->
            <div @mousedown.stop="$emit('start-output', { node, port: 'right' })"
                 @dblclick.stop="$emit('clear-output', node)"
                 :class="isRiskPanel ? '!shadow-none dark:!shadow-none' : ''"
                 class="absolute top-1/2 -translate-y-1/2 w-[12px] h-[12px] -right-[6px] border-[2px] border-nier-text-light dark:border-nier-text-dark rotate-45 bg-nier-white dark:bg-nier-black opacity-0 group-hover:opacity-100 transition-all hover:bg-nier-text-light dark:hover:bg-nier-text-dark shadow-[0_0_20px_rgba(44,44,42,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]"></div>

            <!-- Top (Passive) -->
            <div v-if="!node.isRoot" @mousedown.stop="$emit('pickup-input', { node, port: 'top' })" @mouseup.stop="$emit('drop', { node, port: 'top' })"
                 @dblclick.stop="$emit('clear-input', node)"
                 :class="[
                   isClosest ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100',
                   isRiskPanel ? '!shadow-none dark:!shadow-none' : ''
                 ]"
                 class="absolute left-1/2 -translate-x-1/2 w-[12px] h-[12px] -top-[6px] border-[2px] border-nier-text-light dark:border-nier-text-dark rotate-45 bg-nier-white dark:bg-nier-black transition-all shadow-[0_0_20px_rgba(44,44,42,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]"></div>

            <!-- Bottom (Active) -->
            <div @mousedown.stop="$emit('start-output', { node, port: 'bottom' })"
                 @dblclick.stop="$emit('clear-output', node)"
                 :class="isRiskPanel ? '!shadow-none dark:!shadow-none' : ''"
                 class="absolute left-1/2 -translate-x-1/2 w-[12px] h-[12px] -bottom-[6px] border-[2px] border-nier-text-light dark:border-nier-text-dark rotate-45 bg-nier-white dark:bg-nier-black opacity-0 group-hover:opacity-100 transition-all hover:bg-nier-text-light dark:hover:bg-nier-text-dark shadow-[0_0_20px_rgba(44,44,42,0.3)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]"></div>
            <div v-if="node.type === 'condition' && node.params?.priority && node.params.priority !== 'NONE'"
                 class="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 border border-white/70"
                 :class="node.params.priority === 'REQUIRED' ? 'bg-[#ff0000]' : 'bg-[#00d4ff]'"
                 :style="node.params.priority === 'REQUIRED'
                   ? { boxShadow: '0 0 8px rgba(255,0,0,0.95), 0 0 18px rgba(255,0,0,0.55)' }
                   : { boxShadow: '0 0 8px rgba(0,212,255,0.95), 0 0 18px rgba(0,212,255,0.55)' }"></div>
                       <div v-if="!isRiskPanel" class="absolute inset-x-0 bottom-0 bg-nier-text-light/10 dark:bg-nier-text-dark/10 h-0 group-hover:h-full transition-all duration-700 -z-10"></div>
         </div>
       </template>
         <div class="flex flex-col space-y-2 p-1">
           <!-- Risk-element contextual tooltip body -->
           <template v-if="node.type === 'risk-element' && node.params?.riskType !== 'style'">
             <p class="text-[11px] leading-relaxed text-red-500 font-bold uppercase tracking-wide">
               <template v-if="node.params.riskType === 'trade'">
                 <template v-if="locale === 'ru'">
                   Нельзя рисковать более чем {{ node.params.value }}{{ node.params.unit }} за одну сделку.
                 </template>
                 <template v-else>
                   You cannot risk more than {{ node.params.value }}{{ node.params.unit }} per trade.
                 </template>
               </template>
               <template v-else-if="node.params.riskType === 'day'">
                 <template v-if="locale === 'ru'">
                   Нельзя терять более чем {{ node.params.unit === '$' ? '$' : '' }}{{ node.params.value }}{{ node.params.unit === '%' ? '%' : '' }} за одну сессию.
                 </template>
                 <template v-else>
                   You cannot lose more than {{ node.params.unit === '$' ? '$' : '' }}{{ node.params.value }}{{ node.params.unit === '%' ? '%' : '' }} in a single session.
                 </template>
               </template>
               <template v-else-if="node.params.riskType === 'rr'">
                 <template v-if="locale === 'ru'">
                   Каждая сделка должна иметь соотношение риска к прибыли не ниже 1:{{ node.params.value }}.
                 </template>
                 <template v-else>
                   Every trade must target a minimum risk-to-reward ratio of 1:{{ node.params.value }}.
                 </template>
               </template>
             </p>
           </template>
           <template v-else-if="node.type === 'emotion-state'">
             <div class="flex min-w-[180px] flex-col gap-2">
               <p class="font-mono text-[13px] font-black uppercase tracking-wide nier-text-primary">
                 {{ emotionTooltipData.title }}
               </p>
               <div class="h-px w-full bg-white/20"></div>
               <p class="font-mono text-[9px] font-bold uppercase leading-relaxed text-black/55 dark:text-white/55">
                 {{ emotionTooltipData.description }}
               </p>
             </div>
           </template>
           <!-- Default tooltip body for other node types -->
           <div v-else-if="node.params?.customDescription || node.params?.description || node.params?.value || node.type === 'scaling-entry'">
              <p v-if="node.params?.customDescription" class="text-[11px] leading-relaxed text-nier-text-light dark:text-nier-text-dark font-bold uppercase tracking-wide whitespace-pre-wrap">
                 {{ node.params.customDescription }}
              </p>
              <p v-else class="text-[11px] leading-relaxed text-nier-text-light dark:text-nier-text-dark font-bold uppercase tracking-wide">
                 <template v-if="node.type === 'scaling-entry'">
                    <template v-if="locale === 'ru'">
                       {{ node.params.lotsMode === 'PERCENT' ? node.params.lots + '% КАПИТАЛА' : node.params.lots + ' ЛОТОВ' }} в {{ node.params.step === 0 && node.params.unit === '$' ? 'ЦЕНА_ВХОДА' : `${node.params.step > 0 ? '+' : ''}${node.params.step}${node.params.unit}` }}
                    </template>
                    <template v-else>
                       {{ node.params.lotsMode === 'PERCENT' ? node.params.lots + '% CAP' : node.params.lots + ' LOTS' }} in {{ node.params.step === 0 && node.params.unit === '$' ? 'ENTRY_PRICE' : `${node.params.step > 0 ? '+' : ''}${node.params.step}${node.params.unit}` }}
                    </template>
                 </template>
                 <template v-else-if="node.type === 'smc'">
                    {{ smcTooltipData?.description }}
                 </template>
                 <template v-else>
                   {{ locale === 'ru' ? t(node.params.description || node.params.value || '') : (node.params.description || node.params.value || '') }}
                 </template>
              </p>
           </div>
          <div class="flex items-center space-x-4 opacity-40 text-[8px] font-mono">
             <span>{{ locale === 'ru' ? 'ТИП' : 'TYPE' }}: {{ locale === 'ru' && t(node.type) && t(node.type) !== node.type ? t(node.type).toUpperCase() : node.type.toUpperCase() }}</span>
             <span v-if="node.type === 'condition'">{{ locale === 'ru' ? 'ПРИОРИТЕТ' : 'PRIORITY' }}: {{ node.params?.priority === 'REQUIRED' ? (locale === 'ru' ? 'ОБЯЗАТЕЛЬНО' : 'REQUIRED') : node.params?.priority === 'ADDITIONAL' ? (locale === 'ru' ? 'ДОПОЛНИТЕЛЬНО' : 'ADDITIONAL') : (locale === 'ru' ? 'НЕТ' : 'NONE') }}</span>
             <span>{{ locale === 'ru' ? 'СТАТУС' : 'STATUS' }}: {{ locale === 'ru' ? 'АКТИВИРОВАНО' : 'REIFIED' }}</span>
           </div>
        </div>
     </ExNTtooltip>

      <!-- MERGE BUTTON -->
      <div v-if="node.params?.canMerge"
           class="absolute top-full left-1/2 -translate-x-1/2 mt-4 pointer-events-auto z-[2000]">
        <button @click.stop="$emit('merge', node.params.isIndicatorSide ? { fromId: node.id, toId: node.params.mergePartnerId } : { fromId: node.params.mergePartnerId, toId: node.id })"
                class="bg-nier-white dark:bg-nier-black border border-nier-text-light dark:border-nier-text-dark px-8 py-3 text-[10px] font-mono tracking-[0.3em] uppercase font-black hover:bg-nier-text-light dark:hover:bg-nier-text-dark hover:text-nier-white dark:hover:text-nier-black transition-all shadow-xl whitespace-nowrap">
          MERGE_PROTOCOL
        </button>
      </div>



      <!-- Scaling Entry Subtitle -->
       <div v-if="node.type === 'scaling-entry'"
            v-show="scale > 0.25"
            class="absolute top-full left-1/2 mt-4 flex flex-col items-center pointer-events-none z-50"
            :style="{ transform: `translate(-50%, 0) scale(${scale})`, transformOrigin: 'top center' }">
          <div class="px-5 py-2 bg-nier-white dark:bg-nier-black border-[1.5px] border-nier-border-light dark:border-nier-border-dark flex items-center space-x-2 shadow-[0_15px_35px_rgba(0,0,0,0.4)] relative">
             <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-40"></div>
             <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-40"></div>

             <span class="text-[13px] font-mono font-black tracking-[0.06em] text-nier-text-light dark:text-nier-text-dark uppercase leading-none whitespace-nowrap">
               {{ node.params.lotsMode === 'PERCENT' ? (locale === 'ru' ? node.params.lots + '%депо' : node.params.lots + '%cap') : (locale === 'ru' ? node.params.lots + ' ЛОТОВ' : node.params.lots + ' LOTS') }}
             </span>
             <span class="text-[10px] font-mono opacity-35 leading-none">{{ locale === 'ru' ? 'в' : 'in' }}</span>
             <span class="text-[13px] font-mono font-bold tracking-tight text-nier-text-light dark:text-nier-text-dark/60 uppercase leading-none whitespace-nowrap">{{ node.params.step === 0 && node.params.unit === '$' ? (locale === 'ru' ? 'ВХОД' : 'ENTRY') : `${node.params.step > 0 ? '+' : ''}${node.params.step}${node.params.unit}` }}</span>
          </div>
      </div>

      <!-- Risk Element Overlay -->
      <div v-if="node.type === 'risk-element' && node.params"
           v-show="scale > 0.25"
           class="absolute top-full left-1/2 mt-3 flex flex-col items-center pointer-events-none min-w-max"
           :style="{ transform: `translate(-50%, 0) scale(${scale})`, transformOrigin: 'top center' }">
         <!-- Connector Line -->
         <div class="w-0.5 h-3 bg-red-500/40"></div>
         <div class="px-5 py-2 bg-red-500/10 border-2 border-red-500/40 backdrop-blur-md flex flex-col items-center shadow-[0_10px_30px_rgba(239,68,68,0.25)] relative overflow-hidden">
            <!-- Glitch Scanning Line -->
            <div class="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent h-1/2 animate-scan pointer-events-none"></div>
            <ExText variant="telemetry" class="!text-red-500 !opacity-100 font-black tracking-[0.2em] whitespace-nowrap !text-[12px]">
              <template v-if="node.params.riskType === 'trade'">RISK PER TRADE</template>
              <template v-else-if="node.params.riskType === 'day'">RISK PER SESSION</template>
              <template v-else-if="node.params.riskType === 'rr'">RISK REWARD RATIO</template>
              <template v-else>{{ node.label }}</template>
            </ExText>
            <ExText variant="telemetry" class="!text-red-500/60 !opacity-100 font-mono tracking-[0.12em] whitespace-nowrap !text-[11px] mt-0.5">
              <template v-if="node.params.riskType === 'trade'">{{ node.params.value }}{{ node.params.unit }}</template>
              <template v-else-if="node.params.riskType === 'day'">{{ node.params.unit === '$' ? '$' : '' }}{{ node.params.value }}{{ node.params.unit === '%' ? '%' : '' }}</template>
              <template v-else-if="node.params.riskType === 'rr'">1:{{ node.params.value }}</template>
            </ExText>
            <!-- Technical corner accents -->
            <div class="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-500"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-500"></div>
         </div>
      </div>

     <!-- Custom Labels Container -->
      <div v-if="['condition', 'scenario', 'strategy'].includes(node.type) && (node.params?.customName || node.params?.isEditingName || node.params?.customDescription || node.params?.isEditingDescription)"
           v-show="scale > 0.25"
           class="absolute top-full left-1/2 mt-2 flex flex-col items-center gap-2 z-50"
           :style="{ transform: `translate(-50%, 0) scale(${scale})`, transformOrigin: 'top center' }">
           
       <!-- Custom Identity Label -->
       <template v-if="node.params?.customName || node.params?.isEditingName">
         <!-- Editing Mode -->
         <div v-if="node.params?.isEditingName" class="min-w-full w-max pointer-events-auto relative">
            <ExInput
              variant="terminal"
              :modelValue="node.params.customName"
              @update:modelValue="node.params.customName = $event.toUpperCase()"
              @blur="node.params.isEditingName = false"
              @keyup.enter="node.params.isEditingName = false"
              v-autofocus
              placeholder="ENTER_ID..."
              class="bg-nier-white dark:bg-nier-black"
            />
         </div>
         <!-- Display Mode -->
         <div v-else-if="node.params?.customName"
              class="min-w-full w-max bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark shadow-[0_5px_15px_rgba(0,0,0,0.5)] pointer-events-none relative text-center px-4 py-1.5 flex flex-col items-center">
            <ExText variant="telemetry" class="!opacity-100 font-black">{{ node.params.customName }}</ExText>
            <!-- Mini Corners -->
            <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-border-light dark:border-nier-border-dark"></div>
            <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-border-light dark:border-nier-border-dark"></div>
         </div>
       </template>

       <!-- End Custom Labels -->
      </div>

      <!-- Emotion State Label -->
       <div v-if="node.type === 'emotion-state' && node.label"
            v-show="scale > 0.25"
            class="absolute top-full left-1/2 mt-2 flex flex-col items-center z-50"
            :style="{ transform: `translate(-50%, 0) scale(${scale})`, transformOrigin: 'top center' }">
         <div class="min-w-full w-max bg-nier-text-light dark:bg-nier-text-dark border border-nier-white dark:border-nier-black shadow-[0_5px_15px_rgba(0,0,0,0.3)] pointer-events-none relative text-center px-4 py-1.5 flex flex-col items-center">
            <ExText variant="telemetry" class="!text-nier-white dark:!text-nier-black !opacity-100 font-black">{{ node.label }}</ExText>
            <!-- Mini Corners -->
            <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-white/40 dark:border-nier-black/40"></div>
            <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-white/40 dark:border-nier-black/40"></div>
         </div>
       </div>

    <!-- TACTICAL COMMENTS -->
    <div v-if="isSelected && node.params?.comments?.length"
         class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[500]"
         style="width: 2000px; height: 2000px;">

       <svg class="absolute inset-0 w-full h-full overflow-visible opacity-60">
          <g v-for="comment in node.params.comments" :key="'path-'+comment.id">
             <path :d="(() => {
               const cx = comment.x * scale;
               const cy = comment.y * scale;
               const origin = getEdgeOrigin(1000, 1000, 1000 + cx/2, 1000 + cy/2, node.type === 'step');
               return `M ${origin.x} ${origin.y} L ${1000 + cx/2} ${1000 + cy/2} L ${1000 + cx} ${1000 + cy}`;
             })()"
                   fill="none" stroke="currentColor" stroke-width="2" class="text-nier-text-light dark:text-nier-text-dark" />
          </g>
       </svg>

        <div v-for="(comment, idx) in node.params.comments" :key="comment.id"
             class="absolute pointer-events-auto"
             :style="{
               left: Math.round(1000 + comment.x * scale) + 'px',
               top: Math.round(1000 + comment.y * scale) + 'px',
               zIndex: 1000 + Number(idx)
             }"
             @mousedown.stop="startCommentDrag($event, comment)"
             @click.stop>

          <Transition name="callout-pop" appear>
            <div class="bg-nier-white dark:bg-nier-black border border-nier-border-light dark:border-nier-border-dark relative group flex flex-col overflow-hidden"
                 :style="{
                    width: (comment.width || 450) + 'px',
                    height: comment.isEditing ? 'auto' : (comment.height || 280) + 'px',
                    minWidth: '450px',
                    minHeight: '280px',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left'
                 }">

               <!-- ExPanel Corners -->
               <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-nier-text-light dark:border-nier-text-dark opacity-30 pointer-events-none"></div>
               <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark opacity-30 pointer-events-none"></div>

               <!-- Tactical Header -->
               <div class="flex-shrink-0 flex items-center justify-between bg-nier-black dark:bg-nier-white text-nier-white dark:text-nier-black px-4 py-2 cursor-move border-b border-nier-white/10">
                  <div class="flex items-center space-x-3">
                     <span class="font-black tracking-[0.4em] uppercase font-sans" :style="{ fontSize: '13px' }">Comment {{ Number(idx) + 1 }}</span>
                  </div>
                  <button @mousedown.stop.prevent
                          @click.stop="removeComment(comment.id)"
                          class="hover:scale-125 transition-transform p-1">
                     <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 1 L9 9 M9 1 L1 9" />
                     </svg>
                  </button>
               </div>

               <!-- Content Region -->
               <div class="flex-1 flex flex-col overflow-hidden">
                  <!-- Editing State -->
                  <div v-if="comment.isEditing" class="flex-1 p-6">
                     <textarea v-model="comment.text"
                               @blur="comment.isEditing = false"
                               @keyup.enter.shift="comment.isEditing = false"
                               @input="adjustTextareaHeight($event)"
                               v-autofocus
                               placeholder="ENTRY_DATA_REQUIRED..."
                               class="w-full bg-transparent text-nier-text-light dark:text-nier-text-dark font-mono outline-none resize-none uppercase tracking-wide leading-relaxed p-0 overflow-hidden"
                               :style="{ height: 'auto', minHeight: '180px', fontSize: '22px' }"></textarea>
                  </div>

                  <!-- Display State -->
                  <div v-else @click="comment.isEditing = true"
                       class="flex-1 p-6 overflow-y-auto custom-scrollbar cursor-pointer">
                     <p class="font-mono text-nier-text-light dark:text-nier-text-dark uppercase tracking-wide whitespace-pre-wrap leading-relaxed"
                        :style="{ fontSize: '22px' }">
                        {{ comment.text || '[ NO_DATA_AVAILABLE ]' }}
                     </p>
                  </div>

               </div>

               <!-- High-Visibility Resize Handle -->
               <div class="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-20 group-hover:opacity-100 opacity-0 transition-opacity flex items-end justify-end p-1.5"
                    @mousedown.stop="startCommentResize($event, comment)">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-nier-black dark:text-nier-white">
                     <path d="M16 0 L0 16 M16 8 L8 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                  </svg>
               </div>
            </div>
          </Transition>
       </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExText from '~/shared/ui/ExText.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExInput from '~/shared/ui/ExInput.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue'
import { useI18n } from '~/shared/i18n/useI18n'
import { GENESIS_EMOTION_LIBRARY } from '~/widgets/genesis/model/emotionLibrary'

const { locale, t } = useI18n()

const vAutofocus = {
  mounted: (el: HTMLElement) => el.focus()
}

const props = defineProps<{
  node: {
    id: string
    label: string
    type: string
    x: number
    y: number
    color: string
    params: any
    isRoot?: boolean
  }
  scale: number
  isClosest?: boolean
  isSelected?: boolean
  isDark?: boolean
}>()

const emit = defineEmits(['click', 'start-output', 'pickup-input', 'drop', 'remove', 'moved', 'doubleclick', 'clear-input', 'clear-output', 'contextmenu', 'merge', 'comment-drag-start', 'comment-drag-end'])

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, option, [contenteditable="true"], [data-text-editable="true"], .matrix-text-rich, .matrix-table-input'))
}

const displayColor = computed(() => {
  // Only apply custom color logic for personal instruments (custom nodes)
  if (props.node.params?.isCustom) {
    const baseColor = props.node.params?.color || props.node.color
    const hex = baseColor?.toLowerCase()

    // If they have default white/black colors, swap them based on theme
    if (hex === '#ffffff' || hex === '#000000') {
      return props.isDark ? '#ffffff' : '#000000'
    }
    return baseColor
  }

  // For system nodes, return null so they use theme-based CSS classes (text-theme-text, etc.)
  return null
})

const riskElementTooltipTitle = computed(() => {
  const riskType = props.node.params?.riskType
  if (riskType === 'trade') return 'Risk Per Trade'
  if (riskType === 'day') return 'Risk Per Session'
  if (riskType === 'rr') return 'Risk Reward Ratio'
  return 'RISK-ELEMENT'
})

interface Comment { id: string, text: string, x: number, y: number, isEditing: boolean }

const isDragging = ref(false)
const imageError = ref(false)
const scenarioPanelTypes = [
  'text-panel',
  'drawing-panel',
  'checklist-panel',
  'embed-panel',
  'table-panel',
  'file-attachment',
]
const isScenarioPanel = computed(() => scenarioPanelTypes.includes(props.node.type))

const headerScaleMult = computed(() => (props.scale <= 0.25 && props.node.type === 'text-panel') ? 2.5 : 1)

const isScenarioContentNode = computed(() => (
  isScenarioPanel.value ||
  (props.node.type === 'image' && props.node.params?.shortCode === 'IMG') ||
  isAudioNote.value ||
  props.node.type === 'risk'
))
const isDrawingPanel = computed(() => props.node.type === 'drawing-panel')
const isAudioNote = computed(() => props.node.type === 'audio-note')
const isTablePanel = computed(() => props.node.type === 'table-panel')
const isRiskPanel = computed(() => props.node.type === 'risk')
const isRiskPanelContentHidden = computed(() => props.scale <= 0.25)
const riskPanelVisualScale = computed(() => Math.min(Math.max(props.scale, 0.01), 1))
const riskPanelBaseHeight = 320
const riskPanelShellStyle = computed(() => ({
  width: `${360 * riskPanelVisualScale.value}px`,
  height: `${riskPanelBaseHeight * riskPanelVisualScale.value}px`,
  overflow: 'visible'
}))
const riskPanelScalerStyle = computed(() => ({
  width: '360px',
  minHeight: `${riskPanelBaseHeight}px`,
  transform: `scale(${riskPanelVisualScale.value})`,
  transformOrigin: 'top left'
}))
const configNodeCode = computed(() => (props.node.label || 'CFG').slice(0, 3).toUpperCase())
const riskTradingStyles = ['DAY_TRADING', 'SWING_TRADING', 'INVESTING']
const riskParams = computed(() => {
  if (!props.node.params) props.node.params = {}
  if (props.node.params.riskLossTrade === undefined) props.node.params.riskLossTrade = 1
  if (!props.node.params.riskLossTradeUnit) props.node.params.riskLossTradeUnit = '%'
  if (props.node.params.riskLossDay === undefined) props.node.params.riskLossDay = 5
  if (!props.node.params.riskLossDayUnit) props.node.params.riskLossDayUnit = '$'
  if (props.node.params.riskRR === undefined) props.node.params.riskRR = 3
  if (!props.node.params.tradingStyle) props.node.params.tradingStyle = 'DAY_TRADING'
  return props.node.params
})
const tableRows = computed(() => (
  isTablePanel.value ? Math.max(1, Math.min(12, Number(props.node.params?.rows) || 3)) : 0
))
const tableCols = computed(() => (
  isTablePanel.value ? Math.max(1, Math.min(8, Number(props.node.params?.cols) || 3)) : 0
))
const tablePanelSize = computed(() => ({
  width: Math.max(320, tableCols.value * 112),
  height: Math.max(180, tableRows.value * 54 + 36)
}))
const scenarioPanelSize = computed(() => (
  isAudioNote.value ? { width: 320, height: 56 } :
    isDrawingPanel.value ? { width: 300, height: 190 } :
      isTablePanel.value ? tablePanelSize.value : 
        isScenarioPanel.value ? (
          props.node.type === 'text-panel' ? { width: 420, height: 200 } :
          { width: 260, height: 180 }
        ) : { width: 260, height: 180 }
))
const nodeWidth = computed(() => {
  if (props.node.params?.isEditingDescription) return `${Math.round(400 * props.scale)}px`
  const getW = () => {
    if (props.node.type === 'image') return props.node.params?.width || 300
    if (isAudioNote.value) return scenarioPanelSize.value.width
    if (isTablePanel.value) return tablePanelSize.value.width
    if (isScenarioPanel.value) {
      const w = props.node.params?.width || scenarioPanelSize.value.width
      if (props.scale <= 0.25 && props.node.type === 'text-panel') return w / 2
      return w
    }
    return props.node.type === 'scaling-entry' || props.node.type === 'step' ? 56 : 112
  }
  if (isRiskPanel.value) return `${360 * riskPanelVisualScale.value}px`
  return `${Math.round((getW() * props.scale) / 2) * 2}px`
})
const nodeHeight = computed(() => {
  if (props.node.params?.isEditingDescription) return `${Math.round(250 * props.scale)}px`
  const getH = () => {
    if (props.node.type === 'image') return props.node.params?.height || 200
    if (isAudioNote.value) return scenarioPanelSize.value.height
    if (isTablePanel.value) return tablePanelSize.value.height
    if (isScenarioPanel.value) {
      if (props.scale <= 0.25 && props.node.type === 'text-panel') return 70
      return props.node.params?.height || scenarioPanelSize.value.height
    }
    return props.node.type === 'scaling-entry' || props.node.type === 'step' ? 56 : 112
  }
  if (isRiskPanel.value) return `${riskPanelBaseHeight * riskPanelVisualScale.value}px`
  return `${Math.round((getH() * props.scale) / 2) * 2}px`
})

const tableDraft = ref<string[][]>([])
const isEditingTable = ref(false)
const textEditorElement = ref<HTMLElement | null>(null)
const isEditingTextPanel = ref(false)
let isSyncingTextEditor = false
let tableCommitTimeout: ReturnType<typeof setTimeout> | null = null
const audioElement = ref<HTMLAudioElement | null>(null)
const isAudioPlaying = ref(false)
const isAudioSeeking = ref(false)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
let audioSeekTrackElement: HTMLElement | null = null
let audioAnimationId = 0

function commitRiskPanel() {
  emit('moved')
}

function toggleRiskUnit(key: 'riskLossTradeUnit' | 'riskLossDayUnit') {
  riskParams.value[key] = riskParams.value[key] === '%' ? '$' : '%'
  commitRiskPanel()
}

function setRiskTradingStyle(style: string) {
  riskParams.value.tradingStyle = style
  commitRiskPanel()
}

function formatRiskTradingStyle(style: string) {
  return style.replace('_TRADING', '').replace(/_/g, ' ')
}

function startAudioAnimationLoop() {
  const loop = () => {
    if (isAudioPlaying.value && audioElement.value) {
      if (!isAudioSeeking.value) {
        audioCurrentTime.value = Number.isFinite(audioElement.value.currentTime) ? audioElement.value.currentTime : 0
      }
      audioAnimationId = requestAnimationFrame(loop)
    }
  }
  audioAnimationId = requestAnimationFrame(loop)
}

function stopAudioAnimationLoop() {
  cancelAnimationFrame(audioAnimationId)
}
const scenarioPanelHeaderTitle = computed(() => {
  if (isAudioNote.value) return props.node.params?.audioName || props.node.label || 'Audio_Note'
  return props.node.params?.menuLabel || props.node.label
})
const scenarioPanelHeaderCode = computed(() => {
  if (isAudioNote.value) return props.node.params?.audioType || ''
  return props.node.params?.shortCode || props.node.type.slice(0, 3)
})
const audioProgressPercent = computed(() => (
  audioDuration.value > 0 ? Math.min(100, Math.max(0, (audioCurrentTime.value / audioDuration.value) * 100)) : 0
))
const tableCells = computed(() => {
  if (!isTablePanel.value) return []
  const cells: Array<{ row: number; col: number }> = []
  for (let row = 0; row < tableRows.value; row++) {
    for (let col = 0; col < tableCols.value; col++) {
      cells.push({ row, col })
    }
  }
  return cells
})
const tableGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${tableCols.value || 1}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${tableRows.value || 1}, minmax(0, 1fr))`
}))
const textPanelPlaceholder = computed(() => {
  return t('ENTER_SCENARIO_DETAILS...')
})
const textPanelHtml = computed(() => {
  if (props.node.type !== 'text-panel') return ''
  if (typeof props.node.params?.html === 'string') return props.node.params.html
  return escapeTextHtml(props.node.params?.value || '').replace(/\n/g, '<br>')
})
const textPanelEditorStyle = computed(() => {
  if (props.node.type !== 'text-panel') return {}
  const color = props.node.params?.activeTextColor
  const defaultColor = props.isDark ? '#ffffff' : '#2c2c2a'
  return {
    '--matrix-text-default-color': defaultColor,
    caretColor: color && color !== 'currentColor' ? color : defaultColor
  }
})

function syncTextEditorFromNode() {
  if (props.node.type !== 'text-panel') return
  nextTick(() => {
    const editor = textEditorElement.value
    if (!editor || isEditingTextPanel.value || editor.contains(document.activeElement)) return
    const nextHtml = textPanelHtml.value
    if (editor.innerHTML === nextHtml) return
    isSyncingTextEditor = true
    editor.innerHTML = nextHtml
    isSyncingTextEditor = false
  })
}

function escapeTextHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function focusTextPanel() {
  isEditingTextPanel.value = true
  emit('doubleclick')
}

function blurTextPanel(event: FocusEvent) {
  updateTextPanelHtml(event)
  isEditingTextPanel.value = false
}

function handleTextPanelBeforeInput(event: InputEvent) {
  if (props.node.type !== 'text-panel') return
  if (event.inputType !== 'insertText' || !event.data || event.isComposing) return
  const color = props.node.params?.activeTextColor
  const shouldWrapColor = !!color && color !== 'currentColor'
  if (!shouldWrapColor) return

  const editor = textEditorElement.value
  const selection = window.getSelection()
  if (!editor || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return

  event.preventDefault()
  range.deleteContents()

  const span = document.createElement('span')
  if (shouldWrapColor) span.style.color = color
  span.appendChild(document.createTextNode(event.data))
  range.insertNode(span)

  const nextRange = document.createRange()
  nextRange.setStartAfter(span)
  nextRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(nextRange)

  updateTextPanelHtml({ currentTarget: editor } as unknown as Event)
}

function updateTextPanelHtml(event: Event) {
  if ((props.node.type !== 'text-panel') || isSyncingTextEditor) return
  if (!props.node.params) props.node.params = {}
  const target = event.currentTarget as HTMLElement
  props.node.params.html = target.innerHTML
  props.node.params.value = target.innerText
  emit('moved')
}

watch(
  () => [props.node.id, props.node.params?.html, props.node.params?.value],
  syncTextEditorFromNode,
  { immediate: true, flush: 'post' }
)

watch(
  () => props.node.id,
  () => syncTableDraft(),
  { immediate: true }
)

watch(
  () => [props.node.params?.rows, props.node.params?.cols],
  () => {
    if (!isTablePanel.value) return
    ensureTableShape()
    if (isEditingTable.value) return
    syncTableDraft()
  }
)

onBeforeUnmount(() => {
  commitTableDraft()
  stopAudioPlayback()
  stopAudioSeekDrag()
})

watch(
  () => props.node.params?.audioDataUrl,
  () => {
    stopAudioPlayback()
    audioCurrentTime.value = 0
    audioDuration.value = 0
  }
)

function formatPanelStroke(stroke: any) {
  return (stroke.points || []).map((point: any) => `${point.x},${point.y}`).join(' ')
}

function addChecklistItem() {
  if (!Array.isArray(props.node.params.items)) props.node.params.items = []
  props.node.params.items.push({
    id: 'c' + Date.now().toString(36),
    text: 'NEW_CHECK',
    done: false
  })
}

function ensureTableShape() {
  if (!props.node.params) props.node.params = {}
  const rows = Math.max(1, Math.min(12, Number(props.node.params.rows) || 3))
  const cols = Math.max(1, Math.min(8, Number(props.node.params.cols) || 3))
  props.node.params.rows = rows
  props.node.params.cols = cols
  if (!Array.isArray(props.node.params.table)) props.node.params.table = []
  for (let row = 0; row < rows; row++) {
    if (!Array.isArray(props.node.params.table[row])) props.node.params.table[row] = []
    for (let col = 0; col < cols; col++) {
      if (typeof props.node.params.table[row][col] !== 'string') props.node.params.table[row][col] = ''
    }
    props.node.params.table[row] = props.node.params.table[row].slice(0, cols)
  }
  props.node.params.table = props.node.params.table.slice(0, rows)
}

function cloneTableShape(source: any[][] = [], rows = tableRows.value, cols = tableCols.value) {
  return Array.from({ length: rows }, (_, row) => (
    Array.from({ length: cols }, (_, col) => {
      const value = source[row]?.[col]
      return typeof value === 'string' ? value : ''
    })
  ))
}

function syncTableDraft() {
  if (!isTablePanel.value) return
  ensureTableShape()
  tableDraft.value = cloneTableShape(props.node.params.table)
}

function commitTableDraft() {
  if (!isTablePanel.value) return
  if (tableCommitTimeout) {
    clearTimeout(tableCommitTimeout)
    tableCommitTimeout = null
  }
  ensureTableShape()
  props.node.params.table = cloneTableShape(tableDraft.value)
}

function finishTableEditing() {
  isEditingTable.value = false
  commitTableDraft()
}

function scheduleTableCommit() {
  if (tableCommitTimeout) clearTimeout(tableCommitTimeout)
  tableCommitTimeout = setTimeout(() => {
    commitTableDraft()
  }, 250)
}

function updateTableCell(row: number, col: number, e: Event) {
  const target = e.target as HTMLInputElement
  const next = tableDraft.value.slice()
  const nextRow = (next[row] || []).slice()
  nextRow[col] = target.value
  next[row] = nextRow
  tableDraft.value = next
  scheduleTableCommit()
}

function resizeTable(rowDelta: number, colDelta: number) {
  commitTableDraft()
  props.node.params.rows = Math.max(1, Math.min(12, (Number(props.node.params.rows) || 3) + rowDelta))
  props.node.params.cols = Math.max(1, Math.min(8, (Number(props.node.params.cols) || 3) + colDelta))
  ensureTableShape()
  syncTableDraft()
}

async function toggleAudioPlayback() {
  const audio = audioElement.value
  if (!audio || !props.node.params?.audioDataUrl) return
  if (isAudioPlaying.value) {
    audio.pause()
    isAudioPlaying.value = false
    stopAudioAnimationLoop()
    return
  }

  try {
    await audio.play()
    isAudioPlaying.value = true
    startAudioAnimationLoop()
  } catch {
    isAudioPlaying.value = false
  }
}

function stopAudioPlayback() {
  const audio = audioElement.value
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  isAudioPlaying.value = false
  stopAudioAnimationLoop()
}

function updateAudioProgress() {
  const audio = audioElement.value
  if (!audio) return
  audioCurrentTime.value = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
  audioDuration.value = Number.isFinite(audio.duration) ? audio.duration : 0
}

function handleAudioEnded() {
  isAudioPlaying.value = false
  updateAudioProgress()
  stopAudioAnimationLoop()
}

function getAudioSeekRatioFromEvent(e: MouseEvent) {
  const track = audioSeekTrackElement
  if (!track) return 0
  const rect = track.getBoundingClientRect()
  const physicalLeft = rect.left * (props.scale || 1)
  const physicalWidth = rect.width * (props.scale || 1)
  return Math.max(0, Math.min(1, (e.clientX - physicalLeft) / Math.max(1, physicalWidth)))
}

function setAudioSeekRatio(ratio: number) {
  const audio = audioElement.value
  if (!audio || !audioDuration.value) return
  audio.currentTime = Math.max(0, Math.min(1, ratio)) * audioDuration.value
  updateAudioProgress()
}

function moveAudioSeekDrag(e: MouseEvent) {
  if (!isAudioSeeking.value) return
  const nextRatio = getAudioSeekRatioFromEvent(e)
  setAudioSeekRatio(nextRatio)
}

function stopAudioSeekDrag() {
  isAudioSeeking.value = false
  audioSeekTrackElement = null
  window.removeEventListener('mousemove', moveAudioSeekDrag)
  window.removeEventListener('mouseup', stopAudioSeekDrag)
}

function seekAudio(e: MouseEvent) {
  audioSeekTrackElement = e.currentTarget as HTMLElement
  isAudioSeeking.value = true
  const nextRatio = getAudioSeekRatioFromEvent(e)
  setAudioSeekRatio(nextRatio)
  window.addEventListener('mousemove', moveAudioSeekDrag)
  window.addEventListener('mouseup', stopAudioSeekDrag)
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

const startDrag = (e: MouseEvent) => {
  if (isTextEditingTarget(e.target)) return
  if (isResizing.value) return
  isDragging.value = true
  const startX = e.clientX
  const startY = e.clientY
  const initialX = props.node.x
  const initialY = props.node.y

  const move = (mE: MouseEvent) => {
    if (!isDragging.value) return
    props.node.x = initialX + (mE.clientX - startX) / props.scale
    props.node.y = initialY + (mE.clientY - startY) / props.scale
    emit('moved')
  }

  const stop = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', stop)
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', stop)
}

const startCommentResize = (e: MouseEvent, comment: any) => {
  e.stopPropagation()
  const startX = e.clientX
  const startY = e.clientY
  const initialWidth = comment.width || 300
  const initialHeight = comment.height || 160

  const move = (mE: MouseEvent) => {
    comment.width = Math.max(450, initialWidth + (mE.clientX - startX) / props.scale)
    comment.height = Math.max(280, initialHeight + (mE.clientY - startY) / props.scale)
    emit('moved')
  }

  const stop = () => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', stop)
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', stop)
}

const isResizing = ref(false)
const startResize = (e: MouseEvent) => {
  if (isAudioNote.value || isTablePanel.value) return
  isResizing.value = true
  const startX = e.clientX
  const startY = e.clientY
  const initialWidth = props.node.params?.width || (isScenarioPanel.value ? scenarioPanelSize.value.width : 300)
  const initialHeight = props.node.params?.height || (isScenarioPanel.value ? scenarioPanelSize.value.height : 200)
  const aspectRatio = initialWidth / Math.max(1, initialHeight)

  const move = (mE: MouseEvent) => {
    if (!isResizing.value) return
    const dx = (mE.clientX - startX) / props.scale
    const dy = (mE.clientY - startY) / props.scale
    if (isDrawingPanel.value || props.node.type === 'image') {
      const widthFromX = Math.max(100, initialWidth + dx)
      const heightFromY = Math.max(100, initialHeight + dy)
      if (heightFromY * aspectRatio > widthFromX) {
        props.node.params.height = Math.round(heightFromY)
        props.node.params.width = Math.round(heightFromY * aspectRatio)
      } else {
        props.node.params.width = Math.round(widthFromX)
        props.node.params.height = Math.round(widthFromX / Math.max(0.001, aspectRatio))
      }
    } else {
      props.node.params.width = Math.round(Math.max(100, initialWidth + dx))
      props.node.params.height = Math.round(Math.max(100, initialHeight + dy))
    }
    emit('moved')
  }

  const stop = () => {
    isResizing.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', stop)
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', stop)
}

const startCommentDrag = (e: MouseEvent, comment: any) => {
  if (isTextEditingTarget(e.target)) return
  if (comment.isEditing) return

  emit('comment-drag-start')

  const startX = e.clientX
  const startY = e.clientY
  const initialX = comment.x
  const initialY = comment.y

  const move = (mE: MouseEvent) => {
    comment.x = initialX + (mE.clientX - startX) / props.scale
    comment.y = initialY + (mE.clientY - startY) / props.scale
    emit('moved')
  }

  const stop = () => {
    emit('comment-drag-end')
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', stop)
  }

  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', stop)
}


const removeComment = (id: string) => {
  props.node.params.comments = props.node.params.comments.filter((c: Comment) => c.id !== id)
  emit('moved')
}

const adjustTextareaHeight = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = target.scrollHeight + 'px'
}

const getRemedyCoords = (idx: number) => {
  const repulsion = Math.max(0, (0.6 - props.scale) * 350)
  const isTop = idx < 2
  const isLeft = idx % 2 === 0
  const baseY = isTop ? 400 : 600
  const baseX = isLeft ? 320 : 880
  const baseStyleTop = isTop ? 360 : 560
  const baseStyleLeft = isLeft ? 0 : 880

  return {
    x: baseX + (isLeft ? -repulsion : repulsion),
    y: baseY + (isTop ? -repulsion : repulsion),
    styleTop: baseStyleTop + (isTop ? -repulsion : repulsion),
    styleLeft: baseStyleLeft + (isLeft ? -repulsion : repulsion)
  }
}

const getEdgeOrigin = (centerX: number, centerY: number, targetX: number, targetY: number, isCircle: boolean) => {
  const dx = targetX - centerX
  const dy = targetY - centerY
  const radius = 62

  if (isCircle) {
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return { x: centerX, y: centerY }
    return {
      x: centerX + (dx / dist) * radius,
      y: centerY + (dy / dist) * radius
    }
  } else {
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (absDx === 0 && absDy === 0) return { x: centerX, y: centerY }
    const t = radius / Math.max(absDx, absDy)
    return {
      x: centerX + dx * t,
      y: centerY + dy * t
    }
  }
}

const getRemedyPath = (idx: number) => {
  const coords = getRemedyCoords(idx)
  const midX = idx % 2 === 0 ? 500 : 700
  const origin = getEdgeOrigin(600, 500, midX, coords.y, props.node.type === 'step')
  return `M ${origin.x} ${origin.y} L ${midX} ${coords.y} L ${coords.x} ${coords.y}`
}

const smcTooltipData = computed(() => {
  if (props.node.type !== 'smc') return null
  const baseDesc = props.node.params?.description || props.node.params?.value || ''
  
  const parts = baseDesc.split(' - ')
  if (parts.length > 1) {
    const rawTitle = parts[0].trim()
    const rawDesc = parts.slice(1).join(' - ').trim()
    return {
      title: t(rawTitle).toUpperCase(),
      description: t(rawDesc)
    }
  }
  return {
    title: t(props.node.label || 'SMC').toUpperCase(),
    description: t(baseDesc)
  }
})

const tooltipTitle = computed(() => {
  if (props.node.type === 'emotion-state') return undefined
  if (props.node.type === 'instrument') return props.node.label
  if (props.node.type === 'indicator') return props.node.label
  if (props.node.type === 'smc') return smcTooltipData.value?.title || 'SMC'
  if (props.node.type === 'risk-element') return locale.value === 'ru' ? t(riskElementTooltipTitle.value) : riskElementTooltipTitle.value

  const typeKey = props.node.type.toUpperCase()
  const translatedType = t(typeKey)
  return locale.value === 'ru' && translatedType ? translatedType : typeKey
})

const normalizeEmotionKey = (value: string | undefined) => {
  return String(value || '').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

const emotionAliasMap: Record<string, string> = {
  fearofmissingout: 'FOMO',
  страхупуститьдвижение: 'FOMO',
  compulsoryrecovery: 'Revenge',
  компульсивноевосстановление: 'Revenge',
  overexpectation: 'Greed',
  завышенныеожидания: 'Greed',
  executionparalysis: 'Fear',
  параличисполнения: 'Fear',
  systemoverride: 'Tilt',
  отключениесистемы: 'Tilt',
  cognitivefriction: 'Anxiety',
  когнитивноетрение: 'Anxiety',
  neuralstability: 'Calmness',
  нейроннаястабильность: 'Calmness',
  protocoladherence: 'Discipline',
  соблюдениепротокола: 'Discipline',
  sensoryawareness: 'Focus',
  сенсорнаяосознанность: 'Focus',
  temporalresilience: 'Patience',
  временнаяустойчивость: 'Patience',
  executioncertainty: 'Confidence',
  уверенностьисполнения: 'Confidence',
  logicgap: 'Hope',
  разрывлогики: 'Hope',
  stimulusvoid: 'Boredom',
  пустотастимула: 'Boredom',
  biologicaldecay: 'Fatigue',
  биологическийспад: 'Fatigue'
}

const emotionTooltipData = computed(() => {
  const keys = [
    props.node.label,
    props.node.params?.customName,
    props.node.params?.description,
    props.node.params?.value,
    props.node.params?.info
  ].map(normalizeEmotionKey)
  const aliasLabel = keys.map((key) => emotionAliasMap[key]).find(Boolean)
  const emotion = GENESIS_EMOTION_LIBRARY.find((item) => {
    const itemKey = normalizeEmotionKey(item.label)
    return item.label === aliasLabel || keys.includes(itemKey)
  })

  return {
    title: emotion?.label || props.node.label || 'Emotion',
    description: emotion?.description || props.node.params?.description || ''
  }
})
</script>

<style scoped>
.skill-chip {
  transform: translate(-50%, -50%);
  user-select: none;
}

input, textarea, .matrix-text-rich, .matrix-table-input {
  will-change: transform, width, height;
  text-size-adjust: none;
  -webkit-text-size-adjust: none;
}

.matrix-table-input {
  appearance: none;
  border-radius: 0;
  box-sizing: border-box;
}

.matrix-text-rich {
  --matrix-text-default-color: #2c2c2a;
  line-height: 1.3;
  text-transform: none;
  user-select: text;
  cursor: text;
}

:global(html.dark) .matrix-text-rich {
  --matrix-text-default-color: #ffffff;
}

.matrix-text-rich:empty::before {
  content: attr(data-placeholder);
  opacity: 0.35;
}

.matrix-text-rich :deep(h2) {
  font-size: 2em;
  font-weight: 800;
  line-height: 1.15;
}

.matrix-text-rich :deep(p) {
  margin: 0 0 0.55em;
}

.matrix-text-rich :deep(blockquote) {
  border-left: 2px solid currentColor;
  margin: 0.25em 0;
  opacity: 0.78;
  padding-left: 0.8em;
}

.matrix-text-rich :deep(ul),
.matrix-text-rich :deep(ol) {
  list-style-position: inside;
  margin: 0.25em 0;
  padding-left: 0.35em;
}

.table-stepper {
  align-items: center;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  display: flex;
  flex: 1 1 0;
  height: 28px;
  justify-content: space-between;
  min-width: 0;
}

.table-stepper-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 8px;
  letter-spacing: 0.18em;
  opacity: 0.48;
  padding-left: 8px;
  text-transform: uppercase;
}

.table-stepper-control {
  align-items: stretch;
  border-left: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  display: flex;
  height: 100%;
}

.risk-panel-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.risk-panel-collapsed {
  background: rgb(10 10 10 / 0.62);
  border-color: rgb(239 68 68 / 0.85) !important;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.2), 0 0 22px rgb(239 68 68 / 0.28);
  overflow: hidden;
  position: relative;
}

:deep(.risk-panel-collapsed > div:first-child) {
  display: none;
}

.risk-panel-hatch {
  background-image: repeating-linear-gradient(
    135deg,
    rgb(239 68 68 / 0.28) 0,
    rgb(239 68 68 / 0.28) 1px,
    transparent 1px,
    transparent 12px
  );
  inset: 30px 0 0 0;
  pointer-events: none;
  position: absolute;
  z-index: 1;
}

.risk-panel-field > span {
  color: rgb(255 255 255 / 0.72);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

:global(html.dark) .risk-panel-field > span {
  color: rgb(255 255 255 / 0.72);
}

.risk-panel-control,
.risk-style-control {
  align-items: center;
  background: rgb(0 0 0 / 0.035);
  border: 1px solid rgb(255 255 255 / 0.16);
  display: flex;
  height: 38px;
  min-width: 0;
}

:global(html.dark) .risk-panel-control,
:global(html.dark) .risk-style-control {
  background: rgb(255 255 255 / 0.035);
  border-color: rgb(255 255 255 / 0.16);
}

.risk-panel-control input {
  appearance: none;
  background: transparent;
  border: 0;
  color: #000;
  flex: 1 1 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  font-weight: 900;
  min-width: 0;
  outline: none;
  padding: 0 10px;
  text-align: center;
}

:global(html.dark) .risk-panel-control input {
  color: #fff;
}

.risk-panel-control input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.risk-panel-control input[type='number']::-webkit-inner-spin-button,
.risk-panel-control input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.risk-panel-control button {
  border-left: 1px solid rgb(0 0 0 / 0.16);
  color: rgb(0 0 0 / 0.9);
  flex: 0 0 34px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  font-weight: 900;
  height: 100%;
  transition: background-color 0.2s ease, color 0.2s ease;
}

:global(html.dark) .risk-panel-control button {
  border-left-color: rgb(255 255 255 / 0.14);
  color: rgb(255 255 255 / 0.9);
}

.risk-panel-control button:hover {
  background: rgb(239 68 68 / 0.14);
}

.risk-panel-prefix {
  border-right: 1px solid rgb(0 0 0 / 0.12);
  color: rgb(0 0 0 / 0.78);
  flex: 0 0 38px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  font-weight: 900;
  line-height: 38px;
  text-align: center;
}

:global(html.dark) .risk-panel-prefix {
  border-right-color: rgb(255 255 255 / 0.14);
  color: rgb(255 255 255 / 0.78);
}

.risk-style-control {
  gap: 4px;
  height: auto;
  padding: 4px;
}

.risk-style-control button {
  color: rgb(0 0 0 / 0.6);
  flex: 1 1 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 9px;
  font-weight: 900;
  height: 32px;
  letter-spacing: 0.12em;
  min-width: 0;
  overflow: hidden;
  padding: 0 6px;
  position: relative;
  text-transform: uppercase;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.risk-style-control button::before {
  border-left: 1px solid rgb(0 0 0 / 0.16);
  border-top: 1px solid rgb(0 0 0 / 0.16);
  content: '';
  height: 6px;
  left: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  transition: opacity 0.2s ease;
  width: 6px;
}

:global(html.dark) .risk-style-control button::before {
  border-left-color: rgb(255 255 255 / 0.16);
  border-top-color: rgb(255 255 255 / 0.16);
}

.risk-style-control button.is-active {
  background: rgb(239 68 68 / 0.18);
  box-shadow: inset 0 0 0 1px rgb(239 68 68 / 0.45), 0 0 18px rgb(239 68 68 / 0.18);
  color: #fff;
}

.risk-style-control button:not(.is-active):hover {
  color: rgb(0 0 0 / 0.9);
}
:global(html.dark) .risk-style-control button:not(.is-active):hover {
  color: rgb(255 255 255 / 0.78);
}

.risk-style-control button.is-active::before {
  opacity: 1;
}

.table-stepper-button {
  align-items: center;
  display: flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  height: 100%;
  justify-content: center;
  line-height: 1;
  opacity: 0.55;
  transition: background-color 160ms ease, opacity 160ms ease;
  width: 26px;
}

.table-stepper-button:hover {
  background: color-mix(in srgb, currentColor 8%, transparent);
  opacity: 1;
}

.table-stepper-value {
  align-items: center;
  border-left: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  border-right: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  display: flex;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  justify-content: center;
  min-width: 30px;
  padding: 0 8px;
}

.callout-pop-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--delay, 0s);
}
.callout-pop-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  filter: blur(10px);
}

@keyframes scan {
  from { transform: translateY(-100%); }
  to { transform: translateY(100%); }
}

.animate-scan {
  animation: scan 3s linear infinite;
}

@keyframes config-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.35); border-color: rgba(239, 68, 68, 0.7); }
  50%       { box-shadow: 0 0 28px rgba(239, 68, 68, 0.7);  border-color: rgba(239, 68, 68, 1);   }
}

.needs-config-pulse {
  border-color: rgba(239, 68, 68, 0.8);
  animation: config-pulse 1.8s ease-in-out infinite;
}
</style>
