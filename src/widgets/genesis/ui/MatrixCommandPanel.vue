<template>
  <Transition name="hud-pop">
    <div v-if="!activeWire && activeTab === 'genesis'"
         class="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center w-full max-w-3xl bg-nier-white/90 dark:bg-nier-black/90 backdrop-blur-xl border border-nier-border-light dark:border-nier-border-dark shadow-[0_30px_60px_rgba(0,0,0,0.4)] pointer-events-auto text-nier-text-light dark:text-nier-text-dark transition-colors duration-500"
         style="-webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); transform: translateX(-50%) translateZ(0);">

      <!-- Corner Brackets -->
      <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-nier-text-light dark:border-nier-text-dark opacity-40"></div>
      <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-nier-text-light dark:border-nier-text-dark opacity-40"></div>

      <!-- Header Registry (Nier Style) -->
      <div class="w-full flex items-center justify-between px-6 py-2 border-b border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.03] dark:bg-nier-text-dark/[0.03]">
        <div class="flex items-center space-x-3">
          <div class="w-1.5 h-1.5 bg-nier-text-light dark:bg-nier-text-dark rotate-45 opacity-50"></div>
          <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black opacity-60">Command_Panel</span>
        </div>
        <div class="flex items-center space-x-4">
           <div class="flex space-x-1">
              <div v-for="i in 3" :key="i" class="w-1 h-2 border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
           </div>
        </div>
      </div>

      <!-- Tier 2: Expansion Layer -->
      <div
        ref="menuExpansionElement"
        class="command-menu-expansion relative w-full px-6"
        :class="{
          'is-open': state.activeMenuCategory.value,
          'allows-overflow': isMenuExpansionSettled
        }"
        :style="{ height: menuExpansionHeight }">
        <div
          v-if="state.activeMenuCategory.value"
          ref="menuContentElement"
          class="command-menu-content w-full flex justify-center"
          :class="[
            { 'is-visible': isMenuContentVisible },
            isMenuContentVisible ? 'overflow-visible' : 'overflow-hidden'
          ]"
          :aria-hidden="!isMenuContentVisible">

          <!-- TEXT FORMAT TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'TEXT_FORMAT' && state.activeTextNode.value" class="flex flex-wrap items-center justify-center gap-4 pointer-events-auto px-4 w-full">
            <div class="flex items-center border border-nier-border-light dark:border-nier-border-dark">
              <button v-for="preset in menu.textFormatPresets"
                      :key="preset.id"
                      @mousedown.stop.prevent="menu.applyTextBlock(preset.id)"
                      class="h-9 px-4 border-l first:border-l-0 border-nier-border-light dark:border-nier-border-dark text-[9px] font-mono font-black tracking-[0.25em] uppercase opacity-60 hover:opacity-100 transition-all">
                {{ preset.label }}
              </button>
            </div>

            <div class="flex items-center border border-nier-border-light dark:border-nier-border-dark">
              <button @mousedown.stop.prevent="menu.applyTextCommand('bold')"
                      class="h-9 w-11 flex items-center justify-center font-mono text-[13px] font-black opacity-60 hover:opacity-100 transition-all">B</button>
              <button @mousedown.stop.prevent="menu.applyTextCommand('italic')"
                      class="h-9 w-11 border-l border-nier-border-light dark:border-nier-border-dark flex items-center justify-center font-serif italic text-[15px] opacity-60 hover:opacity-100 transition-all">I</button>
              <button @mousedown.stop.prevent="menu.applyTextCommand('underline')"
                      class="h-9 w-11 border-l border-nier-border-light dark:border-nier-border-dark flex items-center justify-center font-mono text-[13px] underline opacity-60 hover:opacity-100 transition-all">U</button>
            </div>

            <div class="flex items-center border border-nier-border-light dark:border-nier-border-dark">
              <button @mousedown.stop.prevent="menu.applyTextCommand('insertUnorderedList')"
                      class="h-9 w-11 flex items-center justify-center font-mono text-[13px] font-black opacity-60 hover:opacity-100 transition-all">•</button>
              <button @mousedown.stop.prevent="menu.applyTextBlock('quote')"
                      class="h-9 w-11 border-l border-nier-border-light dark:border-nier-border-dark flex items-center justify-center font-serif text-[18px] opacity-60 hover:opacity-100 transition-all">“</button>
            </div>

            <label class="h-9 w-11 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center cursor-pointer relative overflow-hidden">
              <span class="w-5 h-5 border border-nier-border-light dark:border-nier-border-dark"
                    :style="{ backgroundColor: menu.activeTextColor.value }"></span>
              <input :value="menu.activeTextColor.value === 'currentColor' ? '#2c2c2a' : menu.activeTextColor.value"
                     type="color"
                     class="absolute inset-0 opacity-0 cursor-pointer"
                     @mousedown.stop
                     @input="menu.applyTextColor($event)" />
            </label>
            <button @mousedown.stop.prevent="menu.resetTextColor"
                    class="h-9 w-11 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center opacity-60 hover:opacity-100 transition-all"
                    aria-label="Default text color">
              <span class="w-5 h-5 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light dark:bg-nier-text-dark relative">
                <span class="absolute left-1/2 top-[-3px] h-[26px] w-px bg-red-500 rotate-45 origin-center"></span>
              </span>
            </button>
          </div>

          <!-- INDICATORS TOOLS (Universal Library) -->
          <div v-if="state.activeMenuCategory.value === 'INDICATORS' && !state.isScenarioContext.value" class="flex flex-col items-center pointer-events-auto px-4 w-full">
              <!-- Indicator Categories -->
              <div v-if="!menu.indicatorSearchQuery.value" class="flex space-x-4 mb-3 border-b border-current/10 pb-2 w-full justify-center">
                 <button v-for="cat in indicatorCategories" :key="cat.id"
                         @click="menu.activeIndicatorCategory.value = cat.id"
                         :class="menu.activeIndicatorCategory.value === cat.id ? 'opacity-100 text-current' : 'opacity-30'"
                         class="text-[8px] font-mono tracking-[0.2em] uppercase hover:opacity-100 transition-all">
                   {{ cat.id }}
                 </button>
                 <div class="w-px h-3 bg-current opacity-10 mx-2"></div>
                 <button @click="menu.activeIndicatorCategory.value = 'PERSONAL'"
                         :class="menu.activeIndicatorCategory.value === 'PERSONAL' ? 'opacity-100 text-current' : 'opacity-30'"
                         class="text-[8px] font-mono tracking-[0.2em] uppercase hover:opacity-100 transition-all">
                   PERSONAL
                 </button>
              </div>

              <!-- Search Field & Action -->
              <div class="flex items-center space-x-3 w-full max-w-sm mb-4">
                 <div class="relative flex-grow">
                    <ExInput v-model="menu.indicatorSearchQuery.value"
                             :prefix="`search`"
                             placeholder="IDENTIFY_INDICATOR // FILTER..." />
                 </div>
                 <ExButton @click="menu.isConditionCreatorOpen.value = true" variant="ghost" size="none" class="w-12 h-[34px] border-nier-border-light dark:border-nier-border-dark">
                    <span class="text-nier-text-light dark:text-nier-text-dark group-hover:text-nier-text-dark dark:group-hover:text-nier-text-light transition-colors font-black">+</span>
                 </ExButton>
              </div>

              <!-- Creator Component -->
              <ExConditionCreator :is-open="menu.isConditionCreatorOpen.value"
                                  :is-dark="isDark"
                                  @close="menu.isConditionCreatorOpen.value = false"
                                  @create="menu.handleCreateCustomIndicator" />

              <!-- Indicators Grid -->
              <div class="flex space-x-4 overflow-x-auto pb-4 w-full max-w-full justify-start px-2 no-scrollbar scroll-smooth">
                <div v-if="menu.activeIndicatorCategory.value === 'PERSONAL' && menu.indicatorTypes.value.length === 0"
                     class="flex flex-col items-center justify-center w-full py-4 opacity-30">
                   <span class="text-[8px] font-mono tracking-[0.5em] uppercase">no personal conditions</span>
                </div>
                <ExNTtooltip v-for="type in menu.indicatorTypes.value" :key="type.label" :title="type.label">
                  <template #trigger>
                    <button @click="state.setPendingNode(type)"
                            @contextmenu.prevent="menu.activeIndicatorCategory.value === 'PERSONAL' && $emit('personal-contextmenu', $event, type)"
                            class="group relative flex h-12 w-12 flex-shrink-0 items-center justify-center border border-nier-border-light bg-nier-text-light/5 backdrop-blur-md transition-all hover:scale-110 hover:border-nier-text-light dark:border-nier-border-dark dark:bg-nier-text-dark/5 dark:hover:border-nier-text-dark">
                       <div class="font-mono text-[14px] font-black tracking-tighter opacity-40 transition-all group-hover:opacity-100">
                         {{ type.label.slice(0, 3).toUpperCase() }}
                       </div>
                       <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                       <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                    </button>
                  </template>
                  <div class="flex flex-col gap-1 min-w-[180px]">
                    <p class="text-[11px] font-mono font-bold leading-relaxed uppercase text-nier-text-light dark:text-nier-text-dark">{{ type.description || type.params?.description || 'INITIALIZE_SIGNAL_INDICATOR' }}</p>
                  </div>
                </ExNTtooltip>
              </div>
          </div>



          <!-- EMOTIONS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'EMOTIONS' && !state.isScenarioContext.value" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex flex-col items-center w-full relative">
               <div class="flex items-center space-x-6 mb-2">
                  <button v-for="tab in (['NEGATIVE', 'POSITIVE', 'NEUTRAL'] as const)" :key="tab"
                          @click="state.activeEmotionTab.value = tab"
                          class="relative py-2 px-1 text-[9px] font-mono tracking-[0.3em] transition-all"
                          :class="state.activeEmotionTab.value === tab ? 'text-current font-black' : 'opacity-20 hover:opacity-100'">
                    {{ tab }}
                    <div v-if="state.activeEmotionTab.value === tab" class="absolute bottom-0 left-0 w-full h-[2px] bg-current"></div>
                  </button>
               </div>

                <div class="flex space-x-3 overflow-x-auto pt-6 pb-8 w-full justify-start px-12 no-scrollbar scroll-smooth">
                  <ExNTtooltip v-for="emotion in GENESIS_EMOTION_LIBRARY.filter((e: any) => e.type === state.activeEmotionTab.value.toLowerCase())" :key="emotion.label">
                    <template #trigger>
                      <button @click="state.setPendingNode({ label: emotion.label, type: 'emotion-state', params: { emotionType: emotion.type, description: emotion.description } })"
                              class="group relative w-12 h-12 flex-shrink-0 border border-nier-text-light/20 bg-nier-text-light/5 text-nier-text-light backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-nier-text-light dark:border-nier-text-dark/20 dark:bg-nier-text-dark/5 dark:text-nier-text-dark dark:hover:border-nier-text-dark">
                         <span class="text-[12px] font-mono font-black tracking-tighter uppercase leading-none">
                           {{ emotion.label.slice(0, 2) }}
                         </span>
                         <!-- Corner decorations -->
                         <div class="absolute top-0 left-0 w-1 h-1 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                         <div class="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                      </button>
                    </template>
                    <div class="flex min-w-[180px] flex-col gap-2">
                      <p class="font-mono text-[13px] font-black uppercase tracking-wide nier-text-primary">
                        {{ emotion.label }}
                      </p>
                      <div class="h-px w-full bg-white/20"></div>
                      <p class="font-mono text-[9px] font-bold uppercase leading-relaxed text-black/55 dark:text-white/55">
                        {{ emotion.description }}
                      </p>
                    </div>
                  </ExNTtooltip>
                </div>
            </div>
          </div>

          <!-- STEPS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'STEPS' && !state.isScenarioContext.value" class="flex flex-col items-center pointer-events-auto px-4 w-full">
             <!-- Pagination Wrapper -->
             <div class="flex items-center space-x-12 mb-8 w-full justify-center">
                <button @click="menu.currentStepPage.value = (menu.currentStepPage.value - 1 + menu.stepPagesCount) % menu.stepPagesCount"
                        class="opacity-20 hover:opacity-100 transition-opacity p-2 hover:scale-110">
                   <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M15 18L9 12L15 6" />
                   </svg>
                </button>

                <div class="flex flex-col items-center min-w-[300px]">
                   <!-- Page 0: Numeric -->
                   <div v-if="menu.currentStepPage.value === 0" class="flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-500">
                      <div class="flex flex-col items-center mb-4">
                         <span class="text-[7px] font-mono uppercase opacity-30 tracking-[0.3em] italic">Registry</span>
                         <span class="text-[9px] font-mono uppercase font-black tracking-widest text-nier-text-light dark:text-nier-text-dark">01 // NUMERIC_PROTOCOL</span>
                      </div>
                      <div class="flex gap-3">
                         <ExNTtooltip v-for="num in stepPresets.numeric" :key="num" :title="`Step ${num}`">
                           <template #trigger>
                             <button @click="state.setPendingNode({ type: 'step', label: num })"
                                     class="group relative w-12 h-12 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:scale-110 hover:border-nier-text-light dark:hover:border-nier-text-dark bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black backdrop-blur-md">
                               <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <span class="text-[14px] font-mono font-black">{{ num }}</span>
                             </button>
                           </template>
                           <span class="text-xs">Initialize numerical sequence step {{ num }}</span>
                         </ExNTtooltip>
                      </div>
                   </div>

                   <!-- Page 1: Alpha -->
                   <div v-if="menu.currentStepPage.value === 1" class="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500">
                      <div class="flex flex-col items-center mb-4">
                         <span class="text-[7px] font-mono uppercase opacity-30 tracking-[0.3em] italic">Protocol</span>
                         <span class="text-[9px] font-mono uppercase font-black tracking-widest text-nier-text-light dark:text-nier-text-dark">02 // ALPHA_PROTOCOL</span>
                      </div>
                      <div class="flex gap-3">
                         <ExNTtooltip v-for="alpha in stepPresets.alpha" :key="alpha" :title="`Step ${alpha}`">
                           <template #trigger>
                             <button @click="state.setPendingNode({ type: 'step', label: alpha })"
                                     class="group relative w-12 h-12 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:scale-110 hover:border-nier-text-light dark:hover:border-nier-text-dark bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black backdrop-blur-md">
                               <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <span class="text-[14px] font-mono font-black">{{ alpha }}</span>
                             </button>
                           </template>
                           <span class="text-xs">Initialize alphabetic sequence step {{ alpha }}</span>
                         </ExNTtooltip>
                      </div>
                   </div>

                   <!-- Page 2: Roman -->
                   <div v-if="menu.currentStepPage.value === 2" class="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500">
                      <div class="flex flex-col items-center mb-4">
                         <span class="text-[7px] font-mono uppercase opacity-30 tracking-[0.3em] italic">System</span>
                         <span class="text-[9px] font-mono uppercase font-black tracking-widest text-nier-text-light dark:text-nier-text-dark">03 // ROMAN_PROTOCOL</span>
                      </div>
                      <div class="flex gap-3">
                         <ExNTtooltip v-for="rom in stepPresets.roman" :key="rom" :title="`Step ${rom}`">
                           <template #trigger>
                             <button @click="state.setPendingNode({ type: 'step', label: rom })"
                                     class="group relative min-w-[48px] px-3 h-12 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:scale-110 hover:border-nier-text-light dark:hover:border-nier-text-dark bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black backdrop-blur-md">
                               <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20 dark:border-black/20 group-hover:border-white dark:group-hover:border-black opacity-20 group-hover:opacity-100 transition-opacity"></div>
                               <span class="text-[12px] font-mono font-black tracking-widest">{{ rom }}</span>
                             </button>
                           </template>
                           <span class="text-xs">Initialize roman sequence step {{ rom }}</span>
                         </ExNTtooltip>
                      </div>
                   </div>
                </div>

                <button @click="menu.currentStepPage.value = (menu.currentStepPage.value + 1) % menu.stepPagesCount"
                        class="opacity-20 hover:opacity-100 transition-opacity p-2 hover:scale-110">
                   <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 18L15 12L9 6" />
                   </svg>
                </button>
             </div>

             <!-- Custom Step Input -->
             <div class="flex items-center w-full max-w-sm space-x-2 border-t border-nier-text-light/5 dark:border-nier-text-dark/5 pt-6 justify-center">
                <ExInput v-model="customStepInput"
                       @keyup.enter="customStepInput ? state.setPendingNode({ type: 'step', label: customStepInput }) : null; customStepInput = ''"
                       placeholder="IDENTIFY_SEQUENCE_ID..."
                       class="flex-1 hide-spinners" />
                <ExButton @click="customStepInput ? state.setPendingNode({ type: 'step', label: customStepInput }) : null; customStepInput = ''"
                          variant="ghost" size="none" class="w-12 h-[34px] border-nier-border-light dark:border-nier-border-dark">
                   <span class="text-nier-text-light dark:text-nier-text-dark group-hover:text-nier-text-dark dark:group-hover:text-nier-text-light transition-colors">+</span>
                </ExButton>
             </div>
          </div>

          <!-- LOGIC TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'LOGIC' && !state.isScenarioContext.value" class="flex space-x-6 pointer-events-auto">
            <ExNTtooltip v-for="type in skillTypes" :key="type.label" :title="type.label">
              <template #trigger>
                <button @click="state.setPendingNode(type)"
                        class="group relative w-12 h-12 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-110 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md">
                   <svg class="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity text-nier-text-light dark:text-nier-text-dark"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path v-if="type.type === 'strategy'" d="M12 4L20 18H4L12 4z" />
                      <rect v-else-if="type.type === 'scenario'" x="3" y="3" width="18" height="18" />
                      <circle v-else-if="type.type === 'condition'" cx="12" cy="12" r="9" />
                      <path v-else-if="type.type === 'emotion'" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      <g v-else-if="type.type === 'risk'">
                         <path d="M12 5v8M12 18v0.01" stroke-width="2.5" stroke-linecap="round" />
                      </g>
                      <rect v-else-if="type.type === 'image'" x="3" y="3" width="18" height="18" rx="2" />
                   </svg>
                   <!-- Corner decorations -->
                   <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                   <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                </button>
              </template>
              <div class="flex flex-col gap-1 min-w-[220px]">
                <span class="text-[8px] font-mono opacity-40 uppercase">REIFY_SEQUENCE</span>
                <p v-if="type.description" class="text-[9px] font-mono leading-relaxed opacity-60 uppercase text-nier-text-light dark:text-nier-text-dark">{{ type.description }}</p>
                <p v-else class="text-[9px] font-mono leading-relaxed opacity-60 uppercase text-nier-text-light dark:text-nier-text-dark">Establish high-level tactical logic node for strategic branch validation.</p>
              </div>
            </ExNTtooltip>
          </div>

          <!-- LABELS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'LABELS'" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
              <span class="text-[8px] font-mono tracking-[0.45em] uppercase opacity-40">{{ t('Label_Sequence_Layer') }}</span>
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
            </div>
            <div class="flex space-x-4 overflow-visible px-2 py-2 max-w-full">
              <ExNTtooltip v-for="type in labelTypes" :key="type.label" :title="t(type.label)">
                <template #trigger>
                  <button @click="state.setPendingNode(type)"
                          class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                    <span class="text-[8px] font-mono tracking-widest uppercase opacity-45 group-hover:opacity-100 transition-opacity">{{ type.params.shortCode }}</span>
                    <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-1 opacity-35 group-hover:opacity-80 transition-opacity whitespace-nowrap">{{ t(type.params.menuLabel) }}</span>
                    <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                    <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                  </button>
                </template>
                <div class="flex flex-col gap-1 min-w-[220px]">
                  <span class="text-[8px] font-mono opacity-40 uppercase">{{ t(type.params.protocol) }}</span>
                  <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase text-nier-text-light dark:text-nier-text-dark">{{ t(type.description) }}</p>
                </div>
              </ExNTtooltip>
            </div>
          </div>

          <!-- SCENARIO DOCUMENTATION TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'SCENARIO_DOCS'" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
              <span class="text-[8px] font-mono tracking-[0.45em] uppercase opacity-40">Scenario_Explanation_Layer</span>
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
            </div>
            <div class="flex space-x-4 overflow-visible px-2 py-2 max-w-full">
              <ExNTtooltip v-for="type in scenarioDocumentationTypes" :key="type.label" :title="type.label">
                <template #trigger>
                  <button @click="state.setPendingNode(type)"
                          class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                    <span class="text-[8px] font-mono tracking-widest uppercase opacity-45 group-hover:opacity-100 transition-opacity">{{ type.params.shortCode }}</span>
                    <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-1 opacity-35 group-hover:opacity-80 transition-opacity whitespace-nowrap">{{ type.params.menuLabel }}</span>
                    <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                    <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                  </button>
                </template>
                <div class="flex flex-col gap-1 min-w-[220px]">
                  <span class="text-[8px] font-mono opacity-40 uppercase">{{ type.params.protocol }}</span>
                  <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase text-nier-text-light dark:text-nier-text-dark">{{ type.description }}</p>
                </div>
              </ExNTtooltip>
            </div>
          </div>

          <!-- SCENARIO VISUALS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'SCENARIO_VISUALS'" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
              <span class="text-[8px] font-mono tracking-[0.45em] uppercase opacity-40">Evidence_And_Markup_Layer</span>
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
            </div>
            <div class="flex space-x-4 overflow-visible px-2 py-2 max-w-full">
              <ExNTtooltip v-for="type in scenarioVisualTypes" :key="type.label" :title="type.label">
                <template #trigger>
                  <button @click="state.setPendingNode(type)"
                          class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                    <span class="text-[8px] font-mono tracking-widest uppercase opacity-45 group-hover:opacity-100 transition-opacity">{{ type.params.shortCode }}</span>
                    <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-1 opacity-35 group-hover:opacity-80 transition-opacity whitespace-nowrap">{{ type.params.menuLabel }}</span>
                    <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                    <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                  </button>
                </template>
                <div class="flex flex-col gap-1 min-w-[220px]">
                  <span class="text-[8px] font-mono opacity-40 uppercase">{{ type.params.protocol }}</span>
                  <p class="text-[9px] font-mono leading-relaxed opacity-60 uppercase text-nier-text-light dark:text-nier-text-dark">{{ type.description }}</p>
                </div>
              </ExNTtooltip>
            </div>
          </div>

          <!-- SCENARIO AUDIO TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'SCENARIO_AUDIO'" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
              <span class="text-[8px] font-mono tracking-[0.45em] uppercase opacity-40">Audio_Note_Layer</span>
              <div class="w-8 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
            </div>
            <div class="flex items-center gap-3 overflow-visible px-2 py-2 max-w-full">
              <div v-if="audio.matrixAudioErrorLabel.value" class="min-w-[180px] h-14 border border-red-500/40 bg-red-500/5 backdrop-blur-md flex flex-col justify-center px-4">
                <span class="text-[7px] font-mono tracking-[0.12em] uppercase text-red-500 truncate">{{ audio.matrixAudioErrorLabel.value }}</span>
              </div>
              <button v-if="audio.matrixAudioRecordingState.value === 'idle'"
                      @click="audio.startMatrixAudioRecording"
                      class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                <span class="w-3 h-3 rounded-full bg-red-500"></span>
                <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-2 opacity-45 group-hover:opacity-80 transition-opacity whitespace-nowrap">START</span>
                <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
              </button>
              <button v-if="audio.matrixAudioRecordingState.value === 'recording'"
                      @click="audio.pauseMatrixAudioRecording"
                      class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                <span class="w-4 h-4 border-x-4 border-nier-text-light dark:border-nier-text-dark"></span>
                <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-2 opacity-45 group-hover:opacity-80 transition-opacity whitespace-nowrap">PAUSE</span>
              </button>
              <button v-if="audio.matrixAudioRecordingState.value === 'paused'"
                      @click="audio.resumeMatrixAudioRecording"
                      class="group relative min-w-[64px] h-14 border border-nier-border-light dark:border-nier-border-dark flex flex-col items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-105 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md px-3">
                <span class="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-nier-text-light dark:border-l-nier-text-dark ml-1"></span>
                <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-2 opacity-45 group-hover:opacity-80 transition-opacity whitespace-nowrap">RESUME</span>
              </button>
              <button v-if="audio.matrixAudioRecordingState.value !== 'idle'"
                      @click="audio.finishMatrixAudioRecording"
                      class="group relative min-w-[64px] h-14 border border-red-500/50 flex flex-col items-center justify-center transition-all hover:border-red-500 hover:scale-105 bg-red-500/5 backdrop-blur-md px-3">
                <span class="w-3 h-3 bg-red-500"></span>
                <span class="text-[7px] font-mono tracking-[0.18em] uppercase mt-2 opacity-55 group-hover:opacity-90 transition-opacity whitespace-nowrap">FINISH</span>
              </button>
            </div>
          </div>

          <!-- DOMAINS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'DOMAINS' && !state.isScenarioContext.value" class="flex space-x-6 pointer-events-auto">
            <ExNTtooltip v-for="zoneType in (['entry', 'in-trade', 'exit'] as const)" :key="zoneType" :title="locale === 'ru' && t(`${zoneType.toUpperCase()}_ZONE`) ? t(`${zoneType.toUpperCase()}_ZONE`) : `${zoneType.toUpperCase()}_ZONE`">
              <template #trigger>
                <button @click="$emit('activate-zone', zoneType)"
                        :class="[
                          isZoneToolActive && selectedZoneType === zoneType ? 'border-nier-text-light dark:border-nier-text-dark bg-nier-text-light/10 dark:bg-nier-text-dark/10 scale-110' : 'border-nier-border-light dark:border-nier-border-dark'
                        ]"
                        class="group relative w-12 h-12 border flex items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md">
                   <div v-if="zoneType === 'entry'" class="w-4 h-4 border border-nier-text-light dark:border-nier-text-dark opacity-40 group-hover:opacity-100"></div>
                   <div v-if="zoneType === 'in-trade'" class="w-4 h-4 border border-nier-text-light dark:border-nier-text-dark border-dashed opacity-40 group-hover:opacity-100"></div>
                   <div v-if="zoneType === 'exit'" class="w-4 h-4 border-2 border-nier-text-light dark:border-nier-text-dark opacity-40 group-hover:opacity-100"></div>
                </button>
              </template>
              <span class="text-xs">{{ locale === 'ru' ? 'Создать поведенческую зону' : 'Construct behavioral domain' }}: {{ locale === 'ru' && t(zoneType) ? t(zoneType).toUpperCase() : zoneType.toUpperCase() }}</span>
            </ExNTtooltip>

            <div class="w-px h-12 bg-nier-text-light/10 dark:bg-nier-text-dark/10 mx-2"></div>

            <!-- New Session Tool -->
            <ExNTtooltip :title="locale === 'ru' && t('SESSION_ZONE') ? t('SESSION_ZONE') : 'SESSION_ZONE'">
              <template #trigger>
                <button @click="$emit('activate-zone', 'session')"
                        :class="[
                          isZoneToolActive && selectedZoneType === 'session' ? 'border-nier-text-light dark:border-nier-text-dark bg-nier-text-light/10 dark:bg-nier-text-dark/10 scale-110' : 'border-nier-border-light dark:border-nier-border-dark'
                        ]"
                        class="group relative w-12 h-12 border flex items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md">
                   <svg class="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                     <circle cx="12" cy="12" r="10" />
                     <path d="M12 6v6l4 2" />
                   </svg>
                </button>
              </template>
              <span class="text-xs">{{ locale === 'ru' ? 'Создать временную зону сессии' : 'Establish temporal session domain' }}</span>
            </ExNTtooltip>
          </div>

          <!-- METHODS TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'METHODS' && !state.isScenarioContext.value" class="flex space-x-6 pointer-events-auto">
            <ExNTtooltip v-for="type in methodTypes" :key="type.label" :title="type.label">
              <template #trigger>
                <button @click="state.setPendingNode(type)"
                        class="group relative w-12 h-12 border border-nier-border-light dark:border-nier-border-dark flex items-center justify-center transition-all hover:border-nier-text-light dark:hover:border-nier-text-dark hover:scale-110 bg-nier-text-light/5 dark:bg-nier-text-dark/5 backdrop-blur-md">
                   <svg class="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity text-nier-text-light dark:text-nier-text-dark"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path v-if="type.type === 'pyramiding'" d="M21 21H3M18 17H6M15 13H9M12 9V3" />
                      <g v-else-if="type.type === 'averaging'">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                      </g>
                   </svg>
                   <!-- Corner decorations -->
                   <div class="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                   <div class="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-nier-text-light dark:border-nier-text-dark opacity-20"></div>
                </button>
              </template>
              <div class="flex flex-col gap-1 min-w-[220px]">
                <span class="text-[8px] font-mono opacity-40 uppercase">EXECUTION_METHOD</span>
                <p class="text-[11px] font-mono font-bold opacity-80">{{ type.description }}</p>
              </div>
            </ExNTtooltip>
          </div>

          <!-- SCALING TOOLS ( Entry Configuration ) -->
          <div v-if="state.activeMenuCategory.value === 'SCALING' && !state.isScenarioContext.value" class="flex flex-col items-center pointer-events-auto px-4 w-full">
            <div class="flex flex-col items-center w-full space-y-3">
               <span class="text-[8px] font-mono tracking-[0.4em] uppercase opacity-40">Configure_Scaling_Entry</span>
               <div class="flex items-end space-x-2">

                  <!-- Size Mode + Value (combined) -->
                  <div class="flex flex-col items-center">
                     <!-- Mode Switcher -->
                     <div class="flex mb-1 border border-nier-border-light dark:border-nier-border-dark overflow-hidden">
                        <button @click="menu.scalingMode.value = 'LOTS'"
                                :class="menu.scalingMode.value === 'LOTS' ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black' : 'bg-transparent text-nier-text-light dark:text-nier-text-dark opacity-40 hover:opacity-100'"
                                class="px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all h-[18px]">
                           LOTS
                        </button>
                        <button @click="menu.scalingMode.value = 'PERCENT'"
                                :class="menu.scalingMode.value === 'PERCENT' ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black' : 'bg-transparent text-nier-text-light dark:text-nier-text-dark opacity-40 hover:opacity-100'"
                                class="px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all h-[18px]">
                           %CAP
                        </button>
                     </div>
                     <ExInput v-model.number="menu.scalingLots.value" type="number" min="0.01" step="0.01"
                            class="w-20 hide-spinners" />
                  </div>

                  <!-- "in" separator -->
                  <span class="text-[9px] font-mono opacity-30 pb-2">in</span>

                  <!-- Step value + Unit toggle -->
                  <div class="flex flex-col items-center">
                     <span class="text-[7px] font-mono uppercase opacity-40 mb-1">Distance</span>
                     <div class="flex">
                        <ExInput v-model.number="menu.scalingStep.value" type="number" step="0.01"
                               class="w-20 hide-spinners" />
                        <button @click="menu.scalingUnit.value = menu.scalingUnit.value === '%' ? '$' : '%'"
                                class="px-3 py-2 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/10 dark:bg-nier-text-dark/10 text-[12px] font-mono font-bold hover:bg-nier-text-light dark:hover:bg-nier-text-dark hover:text-nier-white dark:hover:text-nier-black transition-all h-[34px]">
                           {{ menu.scalingUnit.value }}
                        </button>
                     </div>
                  </div>

                  <!-- Action Button -->
                  <ExButton v-if="state.effectiveSelectedNode.value?.type === 'scaling-entry'"
                            @click="menu.updateScalingEntry" variant="ghost" size="sm" class="h-[34px] border-nier-text-light/60 dark:border-nier-text-dark/60 px-4">
                     CHANGE <span class="ml-2 text-nier-text-light dark:text-nier-text-dark group-hover:text-nier-white dark:group-hover:text-nier-black transition-colors">⟳</span>
                  </ExButton>
                  <ExButton v-else @click="menu.addScalingEntry" variant="ghost" size="sm" class="h-[34px] border-nier-text-light/60 dark:border-nier-text-dark/60 px-4">
                     ADD <span class="ml-2 text-nier-text-light dark:text-nier-text-dark group-hover:text-nier-white dark:group-hover:text-nier-black transition-colors">+</span>
                  </ExButton>
               </div>
            </div>
          </div>

          <!-- RISK TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'RISK' && !state.isScenarioContext.value" class="flex items-center justify-center pointer-events-auto px-4 w-full">
            <div class="flex items-center gap-3 border border-red-500/20 bg-red-500/[0.03] px-5 py-3">
              <div class="w-2 h-2 rotate-45 bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.7)]"></div>
              <span class="text-[9px] font-mono uppercase tracking-[0.32em] font-black text-nier-text-light dark:text-nier-text-dark">Risk_Management_Panel</span>
            </div>
          </div>

          <!-- DATA TOOLS (Instrument Search) -->
          <div v-if="state.activeMenuCategory.value === 'DATA' && !state.isScenarioContext.value" class="flex flex-col items-center pointer-events-auto max-w-lg w-full">
            <!-- Search Results -->
            <div v-if="menu.assetResults.value.length > 0" class="flex space-x-4 mb-4 overflow-x-auto pb-2 w-full max-w-full justify-start px-4 no-scrollbar">
               <ExNTtooltip v-for="asset in menu.assetResults.value" :key="asset.symbol" :title="asset.symbol">
                  <template #trigger>
                    <button @click="menu.addAssetNode(asset)"
                            class="group flex flex-col items-center space-y-1 min-w-[60px] transition-transform hover:scale-110">
                       <div class="w-10 h-10 border border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/5 dark:bg-nier-text-dark/5 flex items-center justify-center relative overflow-hidden">
                          <img v-if="asset.icon && !menu.failedIcons.value.has(asset.symbol)"
                               :src="asset.icon"
                               @error="menu.failedIcons.value.add(asset.symbol)"
                               class="w-full h-full object-contain p-1 opacity-40 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all" />
                          <span v-else class="text-[10px] font-bold opacity-40 uppercase">{{ asset.symbol.slice(0, 2) }}</span>
                          <div class="absolute inset-x-0 bottom-0 h-0.5 bg-nier-text-light dark:bg-nier-text-dark opacity-20 transition-all group-hover:opacity-100"></div>
                       </div>
                       <span class="text-[7px] font-mono tracking-tighter opacity-40 group-hover:opacity-100 uppercase">{{ asset.symbol }}</span>
                    </button>
                  </template>
                  <div class="flex flex-col">
                    <span class="text-xs">Establish data link: {{ asset.name }}</span>
                    <span class="opacity-40 text-[9px] mt-1">ASSET_TICKER: {{ asset.symbol }}</span>
                  </div>
               </ExNTtooltip>
            </div>

            <!-- Tactical Input -->
            <div class="relative w-full max-w-sm">
               <ExInput v-model="menu.assetSearchQuery.value"
                        placeholder="ESTABLISH_DATA_LINK // ENTER_TICKER..."
                        @input="menu.handleAssetSearch" />
               <div class="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                  <div v-for="i in 3" :key="i" class="w-1 h-3 border-r border-nier-text-light dark:border-nier-text-dark opacity-10" :class="{ 'animate-pulse opacity-40': menu.isSearchingAssets.value }"></div>
               </div>
            </div>
          </div>

          <!-- SYSTEM TOOLS -->
          <div v-if="state.activeMenuCategory.value === 'SYSTEM' && !state.isScenarioContext.value" class="flex flex-col items-center justify-center pointer-events-auto px-4 w-full pt-6 pb-6">
             <div class="flex flex-col items-center justify-center space-y-6">
                <div class="flex flex-col items-center">
                   <span class="text-[9px] font-mono tracking-[0.4em] uppercase font-black opacity-60 mb-2">Registry_Maintenance</span>
                   <div class="w-12 h-px bg-nier-text-light dark:bg-nier-text-dark opacity-10"></div>
                </div>

                <ExButton @click="isClearPanelOpen = true" variant="ghost" class="border-red-500/40 hover:border-red-500 min-w-[240px]">
                   <div class="flex items-center space-x-3 text-red-500">
                      <div class="w-1.5 h-1.5 bg-red-500 rotate-45"></div>
                      <span>CLEAR_ARCHIVE_DATA</span>
                   </div>
                </ExButton>

                <div class="flex flex-col items-center opacity-20">
                   <span class="text-[7px] font-mono tracking-widest uppercase">Warning: Permanent_System_Purge</span>
                   <span class="text-[7px] font-mono tracking-widest uppercase">Protocol_v1.07 // 0x44_ERASE</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM SELECTORS -->
      <div class="w-full flex items-center justify-center space-x-8 px-6 py-4 border-t border-nier-border-light dark:border-nier-border-dark bg-nier-text-light/[0.02] dark:bg-nier-dark/[0.02]">
         <button v-for="cat in commandLinkCategories" :key="cat"
                 v-show="shouldShowCommandCategory(cat)"
                 @click="menu.toggleMenuCategory(cat)"
                 class="group relative flex flex-col items-center transition-all duration-300"
                 :class="state.activeMenuCategory.value === cat ? 'opacity-100' : 'opacity-30 hover:opacity-100'">

            <span class="text-[10px] font-mono tracking-[0.4em] uppercase font-black transition-all"
                  :class="{ 'text-nier-text-light dark:text-nier-text-dark': state.activeMenuCategory.value === cat }">
              {{ getCommandCategoryLabel(cat) }}
            </span>

            <div class="h-0.5 mt-1 bg-nier-text-light dark:bg-nier-text-dark transition-all duration-500"
                 :class="state.activeMenuCategory.value === cat ? 'w-full' : 'w-0 group-hover:w-4'"></div>
         </button>
      </div>

      <!-- SYSTEM PURGE DIALOG TELEPORTED -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="isClearPanelOpen" class="fixed inset-0 z-[10000000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div class="w-full max-w-lg">
                <ExPanel variant="light">
                   <template #telemetry>
                      <span class="sr-only">Purge panel controls</span>
                   </template>
                   <div class="flex flex-col space-y-6">
                      <div class="flex items-start space-x-6">
                         <div class="flex-shrink-0 w-12 h-12 border border-red-500/40 flex items-center justify-center text-red-500">
                            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                               <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                         </div>
                         <div class="flex flex-col space-y-2">
                            <span class="text-[14px] font-mono font-black tracking-widest text-nier-text-light dark:text-nier-text-dark uppercase">Critical_System_Alert</span>
                            <p class="text-[11px] font-mono text-nier-text-light/60 dark:text-nier-text-dark/60 leading-relaxed uppercase tracking-widest">
                               Initiating this protocol will result in the permanent erasure of all tactical nodes, connections, and archival domains within the current matrix.
                               <br><br>
                               This action is <span class="text-red-500 font-black">irreversible</span>.
                            </p>
                         </div>
                      </div>

                      <div class="flex justify-end space-x-4 pt-4 border-t border-nier-border-light dark:border-nier-border-dark">
                         <ExButton @click="isClearPanelOpen = false" variant="ghost" size="md">
                            CANCEL
                         </ExButton>
                         <ExButton @click="executePurge" variant="solid" size="md" class="!bg-red-500 !border-red-500 !text-white hover:!bg-red-600 transition-colors">
                            EXECUTE_PURGE
                         </ExButton>
                      </div>
                   </div>
                </ExPanel>
             </div>
          </div>
        </Transition>
      </Teleport>

    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import type { useMatrixState, MenuCategory } from '../model/matrix/useMatrixState'
import type { useMatrixMenu } from '../model/matrix/useMatrixMenu'
import type { useMatrixAudio } from '../model/matrix/useMatrixAudio'
import ExInput from '@/shared/ui/ExInput.vue'
import ExNTtooltip from '@/shared/ui/ExNTtooltip.vue'
import ExPanel from '@/shared/ui/ExPanel.vue'
import ExButton from '@/shared/ui/ExButton.vue'
import ExConditionCreator from '@/widgets/genesis/ui/ExConditionCreator.vue'
import ExConfigSetter from '@/widgets/genesis/ui/ExConfigSetter.vue'
import indicatorData from '@/shared/assets/indicators.json'
import { useI18n } from '~/shared/i18n/useI18n'
import { GENESIS_EMOTION_LIBRARY } from '~/widgets/genesis/model/emotionLibrary'

const props = defineProps<{
  state: ReturnType<typeof useMatrixState>
  menu: ReturnType<typeof useMatrixMenu>
  audio: ReturnType<typeof useMatrixAudio>
  activeTab: string
  isDark?: boolean
  activeWire: any
  isZoneToolActive: boolean
  selectedZoneType: string
}>()

const emit = defineEmits(['personal-contextmenu', 'activate-zone'])

const { locale, t } = useI18n()

const customStepInput = ref('')
const isClearPanelOpen = ref(false)
const isMenuContentVisible = ref(false)
const isMenuExpansionSettled = ref(false)
const menuExpansionElement = ref<HTMLElement | null>(null)
const menuContentElement = ref<HTMLElement | null>(null)
const menuExpansionHeight = ref('0px')
let menuContentTimer: ReturnType<typeof setTimeout> | null = null
let menuAnimationFrame: number | null = null
let menuAnimationSequence = 0

watch(
  () => props.state.activeMenuCategory.value,
  async category => {
    const sequence = ++menuAnimationSequence
    if (menuContentTimer) clearTimeout(menuContentTimer)
    if (menuAnimationFrame !== null) cancelAnimationFrame(menuAnimationFrame)

    const currentHeight = menuExpansionElement.value?.getBoundingClientRect().height || 0
    isMenuContentVisible.value = false
    isMenuExpansionSettled.value = false
    menuExpansionHeight.value = `${currentHeight}px`

    await nextTick()
    if (sequence !== menuAnimationSequence) return

    const contentHeight = category ? (menuContentElement.value?.scrollHeight || 0) : 0
    const targetHeight = category ? contentHeight + 48 : 0
    menuExpansionElement.value?.getBoundingClientRect()

    menuAnimationFrame = requestAnimationFrame(() => {
      if (sequence !== menuAnimationSequence) return
      menuExpansionHeight.value = `${targetHeight}px`
      menuAnimationFrame = null

      menuContentTimer = setTimeout(() => {
        if (sequence !== menuAnimationSequence) return
        if (category && props.state.activeMenuCategory.value === category) {
          menuExpansionHeight.value = 'auto'
          isMenuExpansionSettled.value = true
          isMenuContentVisible.value = true
        }
        menuContentTimer = null
      }, 380)
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (menuContentTimer) clearTimeout(menuContentTimer)
  if (menuAnimationFrame !== null) cancelAnimationFrame(menuAnimationFrame)
})

const indicatorCategories = indicatorData.categories

const executePurge = () => {
  props.state.clearBoard()
  isClearPanelOpen.value = false
}

// Category lists
const defaultCommandCategories: MenuCategory[] = ['LOGIC', 'METHODS', 'DATA', 'DOMAINS', 'INDICATORS', 'EMOTIONS', 'STEPS', 'SCALING', 'RISK', 'LABELS', 'SYSTEM']
const scenarioCommandCategories: MenuCategory[] = ['SCENARIO_DOCS', 'SCENARIO_VISUALS', 'SCENARIO_AUDIO', 'TEXT_FORMAT', 'LABELS']
const commandCategoryLabels: Partial<Record<MenuCategory, string>> = {
  SCENARIO_DOCS: 'DOCS',
  SCENARIO_VISUALS: 'VISUALS',
  SCENARIO_AUDIO: 'AUDIO',
  TEXT_FORMAT: 'TEXT',
  LABELS: 'LABELS'
}

const commandLinkCategories = computed(() => {
  const categories = props.state.isScenarioContext.value ? scenarioCommandCategories : defaultCommandCategories
  if (props.state.activeTextNode.value) return categories
  return categories.filter(category => category !== 'TEXT_FORMAT')
})

function getCommandCategoryLabel(category: MenuCategory) {
  const labelKey = commandCategoryLabels[category] || category
  return t(labelKey)
}

function shouldShowCommandCategory(category: MenuCategory) {
  if (category === 'TEXT_FORMAT') return !!props.state.activeTextNode.value
  if (props.state.isScenarioContext.value) return scenarioCommandCategories.includes(category)

  if (props.state.activeMenuCategory.value === 'INDICATORS' && (category === 'LABELS' || category === 'SYSTEM')) {
    return false
  }

  const selected = props.state.effectiveSelectedNode.value
  return (
    (category !== 'INDICATORS' && category !== 'EMOTIONS' && category !== 'SCALING' && category !== 'RISK') ||
    (!!selected && ['condition', 'indicator', 'pattern', 'smc'].includes(selected.type || '') && category === 'INDICATORS') ||
    (!!selected && (selected.type === 'emotion' || selected.type === 'emotion-state') && category === 'EMOTIONS') ||
    (!!selected && (selected.type === 'pyramiding' || selected.type === 'averaging') && category === 'SCALING') ||
    (!!selected && selected.type === 'risk' && category === 'RISK')
  )
}

// Subcomponent static configurations
const stepPresets = {
  numeric: ['1', '2', '3', '4', '5'],
  alpha: ['a', 'b', 'c', 'd', 'e'],
  roman: ['I', 'II', 'III', 'IV', 'V']
}

const methodTypes = computed(() => [
  { label: 'Pyramiding', type: 'pyramiding', color: 'currentColor', description: 'Incremental position scaling in the direction of trend momentum.' },
  { label: 'Averaging', type: 'averaging', color: 'currentColor', description: 'Strategic entry distribution to optimize the aggregate cost basis.' }
])

const labelTypes = [
  {
    label: 'TEXT_PANEL',
    type: 'text-panel',
    color: 'currentColor',
    description: 'Free-form text label for long labels or sentences.',
    params: {
      shortCode: 'LBL',
      menuLabel: 'LABEL',
      protocol: 'TEXT_INPUT_PANEL',
      description: 'Free-form text label for long labels or sentences.',
      value: ''
    }
  }
]

const scenarioDocumentationTypes = [
  {
    label: 'TEXT_PANEL',
    type: 'text-panel',
    color: 'currentColor',
    description: 'Free-form scenario explanation panel for thesis, trigger logic, and execution notes.',
    params: {
      shortCode: 'TXT',
      menuLabel: 'TEXT',
      protocol: 'TEXT_INPUT_PANEL',
      description: 'Free-form scenario explanation panel for thesis, trigger logic, and execution notes.',
      value: 'Scenario thesis:\nTrigger:\nExecution notes:'
    }
  },
  {
    label: 'CHECKLIST_PANEL',
    type: 'checklist-panel',
    color: 'currentColor',
    description: 'Interactive checklist panel for scenario tasks and validation points.',
    params: {
      shortCode: 'CHK',
      menuLabel: 'CHECK',
      protocol: 'CHECKLIST_PANEL',
      description: 'Interactive checklist panel for scenario tasks and validation points.',
      items: [
        { id: 'c1', text: 'FIRST_CHECK', done: false },
        { id: 'c2', text: 'SECOND_CHECK', done: false }
      ]
    }
  },
  {
    label: 'TABLE_PANEL',
    type: 'table-panel',
    color: 'currentColor',
    description: 'Structured table panel with fixed full-cell inputs and auto sizing.',
    params: {
      shortCode: 'TBL',
      menuLabel: 'TABLE',
      protocol: 'STRUCTURED_TABLE_PANEL',
      description: 'Structured table panel with fixed full-cell inputs and auto sizing.',
      rows: 3,
      cols: 3,
      table: [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
      ]
    }
  },
  {
    label: 'EMBED_PANEL',
    type: 'embed-panel',
    color: 'currentColor',
    description: 'Embed panel for external URLs, references, and media links.',
    params: {
      shortCode: 'EMB',
      menuLabel: 'EMBED',
      protocol: 'EMBED_PANEL',
      description: 'Embed panel for external URLs, references, and media links.',
      embedUrl: ''
    }
  }
]

const scenarioVisualTypes = [
  {
    label: 'SCREENSHOT',
    type: 'image',
    color: 'currentColor',
    description: 'Screenshot evidence node for chart states, execution examples, and annotations.',
    params: {
      shortCode: 'IMG',
      menuLabel: 'SHOT',
      protocol: 'SCREENSHOT_EVIDENCE',
      description: 'Screenshot evidence node for chart states, execution examples, and annotations.',
      value: 'Attach screenshot evidence.'
    }
  },
  {
    label: 'DRAWING_PANEL',
    type: 'drawing-panel',
    color: 'currentColor',
    description: 'Fullscreen drawing panel for mapping scenario structure, paths, and notes.',
    params: {
      shortCode: 'DRW',
      menuLabel: 'DRAW',
      protocol: 'FULLSCREEN_DRAWING_BOARD',
      description: 'Fullscreen drawing panel for mapping scenario structure, paths, and notes.',
      value: 'Double click to open fullscreen drawing mode.',
      strokes: []
    }
  },
  {
    label: 'FILE_ATTACHMENT',
    type: 'file-attachment',
    color: 'currentColor',
    description: 'Attach a file to the scenario archive.',
    params: {
      shortCode: 'FIL',
      menuLabel: 'FILE',
      protocol: 'FILE_ATTACHMENT',
      description: 'Attach a file to the scenario archive.'
    }
  }
]

const skillTypes = computed(() => {
  const selectedNode = props.state.effectiveSelectedNode.value
  const contextNode = props.state.activeContextId.value ? props.state.getNode(props.state.activeContextId.value) : null

  const isScenarioActive = (
    (selectedNode && ['scenario', 'condition', 'instrument', 'indicator', 'pattern', 'smc'].includes(selectedNode.type)) ||
    (contextNode && ['scenario', 'condition', 'instrument', 'indicator', 'pattern', 'smc'].includes(contextNode.type))
  )

  const base: { label: string; type: string; color: string; description?: string }[] = [
    { label: 'Strategy', type: 'strategy', color: 'currentColor' },
    { label: 'Scenario', type: 'scenario', color: 'currentColor' }
  ]

  if (isScenarioActive) {
    base.push({ label: 'Condition', type: 'condition', color: 'currentColor' })
  }

  base.push({ label: 'Emotion', type: 'emotion', color: 'currentColor' })
  base.push({ label: 'Risk', type: 'risk', color: 'currentColor', description: 'Risk management protocol defining loss constraints and exposure limits.' })
  base.push({ label: 'Visual', type: 'image', color: 'currentColor' })

  return base
})
</script>

<style scoped>
.command-menu-expansion {
  height: 0;
  overflow: hidden;
  padding-bottom: 0;
  padding-top: 0;
  transition:
    height 360ms cubic-bezier(0.22, 1, 0.36, 1),
    padding-bottom 360ms cubic-bezier(0.22, 1, 0.36, 1),
    padding-top 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.command-menu-expansion.is-open {
  padding-bottom: 1.5rem;
  padding-top: 1.5rem;
}

.command-menu-expansion.allows-overflow {
  overflow: visible;
}

.command-menu-content {
  min-height: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(5px);
  visibility: hidden;
  transition: opacity 180ms ease-out, transform 180ms ease-out;
}

.command-menu-content.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  visibility: visible;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.hud-pop-enter-active, .hud-pop-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.hud-pop-enter-from { opacity: 0; transform: translateY(20px) translateX(-50%); }
.hud-pop-leave-to { opacity: 0; transform: translateY(20px) translateX(-50%); }

.hide-spinners::-webkit-outer-spin-button,
.hide-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
