<template>
  <transition name="fade-scale">
    <div v-if="isOpen" class="fixed inset-0 z-[8000] flex items-center justify-center pointer-events-auto" :class="{ 'select-none': isDockDragging || dragTarget }">
      
      <!-- Luxurious Backdrop -->
      <div 
        @click="$emit('close')" 
        class="absolute inset-0 bg-black/50 backdrop-blur-xl transition-all duration-500 ease-out"
      ></div>

      <!-- Main Canvas Container -->
      <div 
        ref="containerRef" 
        class="relative flex items-center justify-center w-full h-full p-12 overflow-hidden"
        @mousemove="handleGlobalMouseMove"
        @mousedown.left="handleCanvasMouseDown"
        @mouseup.left="handleCanvasMouseUp"
        @contextmenu.prevent="deselectAll"
      >
          <!-- Image and SVG Wrapper -->
          <div 
            v-if="imageSrc" 
            class="relative rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] transition-transform duration-500 will-change-transform bg-black overflow-hidden group" 
            :style="{ width: dWidth+'px', height: dHeight+'px' }"
          >
             <!-- Target Image -->
             <img 
               ref="imgRef" 
               :src="imageSrc" 
               @load="initView" 
               class="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" 
               crossorigin="anonymous"
               draggable="false"
             />

             <!-- SVG Interactive Layer -->
             <svg 
               ref="svgRef"
               class="absolute inset-0 z-20 pointer-events-none"
               :viewBox="naturalWidth ? `0 0 ${naturalWidth} ${naturalHeight}` : '0 0 100 100'"
             >
                <!-- Rays -->
                <line 
                  v-for="ry in rays" 
                  :key="ry.id"
                  :x1="ry.x1" :y1="ry.y1"
                  :x2="ry.x1 + (ry.x2 - ry.x1) * 100" 
                  :y2="ry.y1 + (ry.y2 - ry.y1) * 100"
                  :stroke="ry.color"
                  :stroke-width="ry.width"
                  stroke-linecap="round"
                  class="transition-colors pointer-events-auto cursor-pointer hover:opacity-80"
                  :class="{ 'brightness-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]': selectedElement?.id === ry.id }"
                  @mousedown.left.stop="startDrag('ray', ry.id, $event)"
                  @contextmenu.prevent.stop="selectElement('ray', ry, $event)"
                />

                <!-- Horizontal/Vertical Lines -->
                <line 
                  v-for="l in lines" 
                  :key="l.id"
                  :x1="l.type === 'h' ? 0 : l.pos"
                  :y1="l.type === 'h' ? l.pos : 0"
                  :x2="l.type === 'h' ? naturalWidth : l.pos"
                  :y2="l.type === 'h' ? l.pos : naturalHeight"
                  :stroke="l.color"
                  :stroke-width="l.width"
                  stroke-linecap="round"
                  class="transition-colors pointer-events-auto cursor-pointer hover:opacity-80"
                  :class="{ 'brightness-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]': selectedElement?.id === l.id }"
                  @mousedown.left.stop="startDrag('line', l.id, $event)"
                  @contextmenu.prevent.stop="selectElement('line', l, $event)"
                />

                <!-- Rectangles -->
                <rect 
                   v-for="r in rects"
                   :key="r.id"
                   :x="Math.min(r.x1, r.x2)"
                   :y="Math.min(r.y1, r.y2)"
                   :width="Math.abs(r.x1 - r.x2)"
                   :height="Math.abs(r.y1 - r.y2)"
                   :stroke="r.color"
                   :stroke-width="r.width"
                   rx="6"
                   fill="transparent"
                   class="transition-colors pointer-events-auto cursor-pointer hover:opacity-80"
                   :class="{ 'brightness-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]': selectedElement?.id === r.id }"
                   @mousedown.left.stop="startDrag('rect', r.id, $event)"
                   @contextmenu.prevent.stop="selectElement('rect', r, $event)"
                />

                <!-- Trend Lines -->
                <line 
                  v-for="tl in trendLines" 
                  :key="tl.id"
                  :x1="tl.x1" :y1="tl.y1"
                  :x2="tl.x2" :y2="tl.y2"
                  :stroke="tl.color"
                  :stroke-width="tl.width"
                  stroke-linecap="round"
                  class="transition-colors pointer-events-auto cursor-pointer hover:opacity-80"
                  :class="{ 'brightness-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]': selectedElement?.id === tl.id }"
                  @mousedown.left.stop="startDrag('trendline', tl.id, $event)"
                  @contextmenu.prevent.stop="selectElement('trendline', tl, $event)"
                />

                <!-- Freehand Paths -->
                <polyline 
                  v-for="p in paths" 
                  :key="p.id" 
                  :points="p.points.map((pt: any) => `${pt.x},${pt.y}`).join(' ')"
                  :stroke="p.color" 
                  :stroke-width="p.width || 4" 
                  fill="none" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"
                  class="transition-colors pointer-events-auto cursor-pointer hover:opacity-80"
                  :class="{ 'brightness-125 drop-shadow-[0_0_2px_rgba(255,255,255,0.7)]': selectedElement?.id === p.id }"
                  @mousedown.left.stop="startDrag('path', p.id, $event)"
                  @contextmenu.prevent.stop="selectElement('path', p, $event)"
                />

                <!-- Drawing Previews -->
                <template v-if="draftObject">
                    <line v-if="draftObject.type === 'trendline'" :x1="draftObject.x1" :y1="draftObject.y1" :x2="draftObject.x2" :y2="draftObject.y2" :stroke="selectedColor" :stroke-width="selectedWidth" stroke-linecap="round" />
                    <line v-if="draftObject.type === 'ray'" :x1="draftObject.x1" :y1="draftObject.y1" :x2="draftObject.x1 + (draftObject.x2 - draftObject.x1) * 100" :y2="draftObject.y1 + (draftObject.y2 - draftObject.y1) * 100" :stroke="selectedColor" :stroke-width="selectedWidth" stroke-linecap="round" />
                    <rect v-if="draftObject.type === 'rect'" :x="Math.min(draftObject.x1, draftObject.x2)" :y="Math.min(draftObject.y1, draftObject.y2)" :width="Math.abs(draftObject.x1 - draftObject.x2)" :height="Math.abs(draftObject.y1 - draftObject.y2)" :stroke="selectedColor" :stroke-width="selectedWidth" rx="6" fill="rgba(255,255,255,0.05)" />
                </template>
                <polyline v-if="isDrawingBrush" :points="currentPathStr" :stroke="selectedColor" :stroke-width="selectedWidth" fill="none" stroke-linecap="round" stroke-linejoin="round" />
             </svg>

             <!-- Text Layers -->
             <div class="absolute inset-0 z-30 pointer-events-none">
                <div 
                  v-for="t in textLayers" 
                  :key="t.id"
                  :id="'text-layer-' + t.id"
                  class="absolute pointer-events-auto outline-none z-50 whitespace-nowrap px-4 py-2 transition font-sans text-xs tracking-tight cursor-pointer hover:scale-[1.01]"
                  :class="[
                    editingTextId === t.id ? 'select-text cursor-text' : 'select-none',
                    selectedElement?.id === t.id ? 'ring-2 ring-white/60 z-[60] bg-black/20' : 'ring-1 ring-white/5 hover:ring-white/20'
                  ]"
                  :style="{
                      left: t.x + 'px',
                      top: t.y + 'px',
                      color: t.color || '#ffffff',
                      fontSize: (t.size || 24) + 'px',
                      fontWeight: t.bold ? 'bold' : 'normal',
                      fontStyle: t.italic ? 'italic' : 'normal',
                      backgroundColor: t.bgEnabled ? (t.bgColor || 'rgba(20,20,20,0.75)') : 'transparent',
                      backdropFilter: t.bgEnabled ? 'blur(8px)' : 'none',
                      border: t.borderEnabled ? `2px solid ${t.borderColor || '#ffffff'}` : 'none',
                      borderRadius: '8px'
                  }"
                  @mousedown.left.stop="startDrag('text', t.id, $event)"
                  @dblclick.stop="($event.target as HTMLElement).focus()"
                  @contextmenu.prevent.stop="selectElement('text', t, $event)"
                  @blur="t.text = ($event.target as HTMLElement).innerText; editingTextId = null"
                  @focus="editingTextId = t.id"
                  :contenteditable="true"
                >{{ t.text }}</div>
             </div>
          </div>
          
          <!-- Crosshair Guide (Only visible when hovering canvas to draw) -->
          <div 
            ref="crosshairContainer"
            class="absolute inset-0 pointer-events-none z-[1000] opacity-0 group-hover:opacity-100 transition-opacity" 
            v-if="['h-line', 'v-line', 'trendline', 'ray', 'rect', 'text'].includes(activeTool)"
          >
              <div id="cross-y" class="absolute bg-white/20 h-px w-full backdrop-blur-sm shadow-[0_0_2px_rgba(0,0,0,0.5)] will-change-transform"></div>
              <div id="cross-x" class="absolute bg-white/20 w-px h-full backdrop-blur-sm shadow-[0_0_2px_rgba(0,0,0,0.5)] will-change-transform"></div>
          </div>

          <!-- Floating Context Menu (Right-Click triggered) -->
          <transition name="fade">
              <div 
                v-if="selectedElement" 
                ref="contextMenuRef"
                class="fixed z-[3000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col p-3 min-w-[180px] gap-2 overflow-hidden transition-all duration-300"
                :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }"
                @click.stop
                @mousedown.stop
                @contextmenu.prevent
              >
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-white/30 px-1 pb-1 border-b border-zinc-100 dark:border-white/5 mb-1">Properties</div>
                  
                  <!-- Text Specific Settings -->
                  <div v-if="selectedElement.type === 'text'" class="flex flex-col gap-3 px-1 pb-1">
                     <div class="flex items-center gap-2">
                         <div class="flex items-center bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden text-xs font-bold shadow-inner transition-colors">
                             <button @click="selectedElement.item.size = Math.max(8, (selectedElement.item.size || 24) - 2)" class="w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-white/60 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-90 select-none">−</button>
                             <div class="w-8 flex items-center justify-center text-zinc-900 dark:text-white font-black">{{ selectedElement.item.size || 24 }}</div>
                             <button @click="selectedElement.item.size = (selectedElement.item.size || 24) + 2" class="w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-white/60 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-90 select-none">+</button>
                         </div>
                         <div class="h-8 w-px bg-zinc-100 dark:bg-white/5 mx-1"></div>
                         <input type="color" v-model="selectedElement.item.color" class="w-8 h-8 p-1 border-0 rounded-full cursor-pointer outline-none bg-zinc-100 dark:bg-white/10 transition-transform active:scale-95" title="Font Color" />
                     </div>
                     <div class="flex items-center gap-2">
                         <button @click="selectedElement.item.bold = !selectedElement.item.bold" :class="selectedElement.item.bold ? 'bg-zinc-900 dark:bg-white nier-text-primary shadow-lg' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/60'" class="flex-1 h-8 rounded-xl font-black text-[10px] transition active:scale-95">BOLD</button>
                         <button @click="selectedElement.item.italic = !selectedElement.item.italic" :class="selectedElement.item.italic ? 'bg-zinc-900 dark:bg-white nier-text-primary shadow-lg' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/60'" class="flex-1 h-8 rounded-xl italic text-[10px] transition font-serif active:scale-95">ITALIC</button>
                     </div>
                     <div class="h-px w-full bg-zinc-100 dark:bg-white/5 my-0.5"></div>
                     <div class="flex items-center justify-between gap-4">
                         <label class="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-white/70 font-bold cursor-pointer select-none">
                             <div class="relative w-8 h-4 bg-zinc-200 dark:bg-white/10 rounded-full transition-colors" :class="{ 'bg-zinc-900 dark:bg-white': selectedElement.item.bgEnabled }">
                                 <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform" :class="[selectedElement.item.bgEnabled ? 'translate-x-4 nier-bg-panel shadow-sm' : 'bg-white dark:bg-white/40']"></div>
                                 <input type="checkbox" v-model="selectedElement.item.bgEnabled" class="sr-only" /> 
                             </div>
                             Background
                         </label>
                         <input v-if="selectedElement.item.bgEnabled" type="color" v-model="selectedElement.item.bgColor" class="w-6 h-6 p-1 border-0 rounded-full cursor-pointer outline-none bg-zinc-100 dark:bg-white/10" title="Background Color" />
                     </div>
                     <div class="flex items-center justify-between gap-4">
                         <label class="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-white/70 font-bold cursor-pointer select-none">
                             <div class="relative w-8 h-4 bg-zinc-200 dark:bg-white/10 rounded-full transition-colors" :class="{ 'bg-zinc-900 dark:bg-white': selectedElement.item.borderEnabled }">
                                 <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform" :class="[selectedElement.item.borderEnabled ? 'translate-x-4 nier-bg-panel shadow-sm' : 'bg-white dark:bg-white/40']"></div>
                                 <input type="checkbox" v-model="selectedElement.item.borderEnabled" class="sr-only" /> 
                             </div>
                             Border
                         </label>
                         <input v-if="selectedElement.item.borderEnabled" type="color" v-model="selectedElement.item.borderColor" class="w-6 h-6 p-1 border-0 rounded-full cursor-pointer outline-none bg-zinc-100 dark:bg-white/10" title="Border Color" />
                     </div>
                  </div>                   <!-- Standard Shape/Line Settings -->
                  <div v-else class="flex flex-col gap-3 px-1 pb-1">
                      <div class="flex items-center gap-2">
                         <input type="color" v-model="selectedElement.item.color" class="w-8 h-8 p-1 border-0 rounded-full cursor-pointer bg-zinc-100 dark:bg-white/10 outline-none transition-transform active:scale-95" title="Custom Color" />
                         <div class="flex-1 flex gap-1.5 bg-zinc-100 dark:bg-white/5 p-1 rounded-full border border-zinc-200 dark:border-white/5 transition-colors">
                             <div 
                               v-for="c in ['#ffffff', '#60a5fa', '#34d399', '#f87171', '#fbbf24']" 
                               :key="c"
                               @click="updateElementColor(c)"
                               class="flex-1 h-4 rounded-full cursor-pointer hover:scale-105 transition border border-black/5"
                               :style="{ backgroundColor: c, border: selectedElement.item.color === c ? '2px solid rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.1)' }"
                             ></div>
                         </div>
                      </div>
                      <div class="flex items-center gap-2">
                          <span class="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest">Width</span>
                          <div class="flex-1 flex items-center justify-between bg-zinc-100 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5 overflow-hidden text-xs font-bold shadow-inner transition-colors">
                              <button @click="selectedElement.item.width = Math.max(1, (selectedElement.item.width || 2) - 1)" class="w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-white/50 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-90 select-none">−</button>
                              <div class="flex-1 flex items-center justify-center text-zinc-900 dark:text-white transition-colors">{{ selectedElement.item.width || 2 }}</div>
                              <button @click="selectedElement.item.width = (selectedElement.item.width || 2) + 1" class="w-8 h-8 flex items-center justify-center text-zinc-500 dark:text-white/50 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-90 select-none">+</button>
                          </div>
                      </div>
                  </div>

                  <div class="h-px w-full bg-zinc-100 dark:bg-white/10 my-1"></div>
                  
                  <div class="flex items-center gap-2 px-1">
                      <button @click.stop="cancelEdit" class="flex-1 py-2 text-zinc-500 dark:text-white/50 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition text-[10px] font-black uppercase tracking-widest active:scale-95">Cancel</button>
                      <button @click.stop="saveEdit" class="flex-1 py-2 bg-zinc-900 dark:bg-white nier-text-primary rounded-xl transition text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Save</button>
                  </div>

                  <div class="h-px w-full bg-zinc-100 dark:bg-white/10 my-1"></div>
                  
                  <button @click="removeSelected" class="flex items-center justify-center py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition text-[10px] font-black uppercase tracking-widest active:scale-95">
                      Delete Layer
                  </button>
              </div>
          </transition>
      </div>

      <!-- Movable & Shrinkable Floating Tool Dock -->
      <div 
        ref="dockRef"
        class="fixed z-[2000] flex items-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl border border-zinc-200 dark:border-white/10 rounded-full shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] transition-all duration-500 ease-in-out"
        :class="[
            isDockShrunk ? 'px-3 py-2 gap-2' : 'px-8 py-4 gap-6',
            isDockDragging ? '!transition-none' : ''
        ]"
        :style="{
             left: dockPos.x + 'px',
             top: dockPos.y + 'px',
             transform: 'translateX(-50%)'
        }"
        @mousedown.stop
      >
          <!-- Drag Handle -->
          <div 
            class="w-6 h-10 -ml-2 flex items-center justify-center cursor-move text-[#050505]/20 dark:text-white/20 hover:text-[#050505]/40 dark:hover:text-white/40 transition-colors"
            @mousedown.stop.left="startDockDrag"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9h.01M8 12h.01M8 15h.01M16 9h.01M16 12h.01M16 15h.01" />
            </svg>
          </div>

          <!-- Tool Icons (Always Visible) -->
          <div class="flex items-center gap-1">
              <button @click="activeTool = 'pencil'" class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300" :class="activeTool === 'pencil' ? 'bg-[#050505] dark:bg-white nier-text-primary shadow-lg scale-105' : 'text-[#050505]/40 dark:text-white/40 hover:text-[#050505] dark:hover:text-white' " title="Brush (B)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button @click="activeTool = 'h-line'" class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300" :class="activeTool === 'h-line' ? 'bg-[#050505] dark:bg-white nier-text-primary shadow-lg scale-105' : 'text-[#050505]/40 dark:text-white/40 hover:text-[#050505] dark:hover:text-white'" title="Horizontal Line (H)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" /></svg>
              </button>
              <button @click="activeTool = 'trendline'" class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300" :class="activeTool === 'trendline' ? 'bg-[#050505] dark:bg-white nier-text-primary shadow-lg scale-105' : 'text-[#050505]/40 dark:text-white/40 hover:text-[#050505] dark:hover:text-white'" title="Trend Line (L)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 19L20 5" /></svg>
              </button>
              <button @click="activeTool = 'rect'" class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300" :class="activeTool === 'rect' ? 'bg-[#050505] dark:bg-white nier-text-primary shadow-lg scale-105' : 'text-[#050505]/40 dark:text-white/40 hover:text-[#050505] dark:hover:text-white'" title="Rectangle (S)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v16H4z" /></svg>
              </button>
              <button @click="activeTool = 'text'" class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300" :class="activeTool === 'text' ? 'bg-[#050505] dark:bg-white nier-text-primary shadow-lg scale-105' : 'text-[#050505]/40 dark:text-white/40 hover:text-[#050505] dark:hover:text-white'" title="Text (T)">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>
              </button>
          </div>

          <template v-if="!isDockShrunk">
              <div class="w-px h-8 bg-black/5 dark:bg-white/5 mx-1"></div>
              
              <!-- Active Settings -->
              <div class="flex items-center gap-3">
                 <div class="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-black/30 rounded-full border border-black/5 dark:border-white/5 transition-colors">
                     <input type="color" v-model="selectedColor" class="w-6 h-6 p-0 border-0 rounded-full cursor-pointer outline-none bg-transparent" title="Stroke / Text Color" />
                 </div>
                 
                 <div class="flex items-center gap-2 pl-3 pr-1 py-1 bg-black/5 dark:bg-black/30 rounded-full border border-black/5 dark:border-white/5 transition-colors">
                     <span class="text-[9px] font-bold text-[#050505]/40 dark:text-white/40 uppercase tracking-widest leading-none">Size</span>
                     <div class="flex items-center gap-1">
                         <button @click="selectedWidth = Math.max(1, selectedWidth - 1)" class="w-5 h-5 flex items-center justify-center text-[#050505]/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition text-xs active:scale-90" title="Decrease Size">−</button>
                         <div class="w-4 text-center text-[#050505] dark:text-white text-xs font-bold transition-colors">{{ selectedWidth }}</div>
                         <button @click="selectedWidth += 1" class="w-5 h-5 flex items-center justify-center text-[#050505]/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition text-xs active:scale-90" title="Increase Size">+</button>
                     </div>
                 </div>
              </div>

              <div class="w-px h-8 bg-black/5 dark:bg-white/5 mx-1"></div>

              <!-- Main Actions -->
              <div class="flex items-center gap-2">
                  <button @click="clearAll" class="px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10 text-[#050505]/60 dark:text-white/60 hover:text-[#050505] dark:hover:text-white rounded-full transition text-[10px] uppercase font-bold tracking-widest" title="Clear All Layer">Clear</button>
                  <button @click="save" class="px-6 py-2 bg-[#050505] dark:bg-white nier-text-primary rounded-full hover:shadow-lg transition-all duration-300 text-[10px] uppercase font-bold tracking-widest" title="Save & Close">Done</button>
              </div>
          </template>

          <div class="w-px h-8 bg-black/5 dark:bg-white/5 mx-1"></div>

          <!-- Shrink Toggle -->
          <button @click="isDockShrunk = !isDockShrunk" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#050505]/30 dark:text-white/30 hover:text-[#050505] dark:hover:text-white transition-all shadow-sm" :title="isDockShrunk ? 'Expand Toolbar' : 'Minimize Toolbar'">
              <svg v-if="!isDockShrunk" class="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 15l-3-3-3 3M15 9l-3 3-3-3"/></svg>
              <svg v-else class="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l3-3 3 3M9 9l3 3 3-3"/></svg>
          </button>
      </div>
      
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount, reactive } from 'vue';

const props = defineProps<{
    isOpen: boolean;
    imageSrc: string;
    initialAnnotations?: { paths: any[], texts: any[], lines?: any[], trendLines?: any[], rays?: any[], rects?: any[] } | null;
}>();

const emit = defineEmits(['close', 'save']);

// Layout Refs
const svgRef = ref<SVGElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const contextMenuRef = ref<HTMLElement | null>(null);

// Tools
const activeTool = ref<'pencil' | 'text' | 'h-line' | 'v-line' | 'trendline' | 'ray' | 'rect'>('pencil');
const selectedColor = ref('#ffffff');
const selectedWidth = ref(4);
const isDockShrunk = ref(false);
const dockRef = ref<HTMLElement | null>(null);
const dockPos = reactive({ x: 0, y: 0 });
const isDockDragging = ref(false);
let dockDragOffset = { x: 0, y: 0 };

// Layers
const paths = ref<any[]>([]);
const textLayers = ref<any[]>([]);
const lines = ref<any[]>([]);
const trendLines = ref<any[]>([]);
const rays = ref<any[]>([]);
const rects = ref<any[]>([]);

// Context Menu State
const selectedElement = ref<{ type: string, item: any, id: number } | null>(null);
const originalItemState = ref<any>(null); // For "Cancel" reversion
const menuPos = reactive({ x: 0, y: 0 });

// Interaction State
const crosshairX = ref(0);
const crosshairY = ref(0);
const normX = ref(0);
const normY = ref(0);

// Drag/Draw States
const isDrawingBrush = ref(false);
const draftObject = ref<any>(null);
const dragTarget = ref<any>(null);
const currentPathPoints = ref<{x: number, y: number}[]>([]);
const currentPathStr = computed(() => currentPathPoints.value.map(pt => `${pt.x},${pt.y}`).join(' '));
let lastDragPos = { x: 0, y: 0 };
let dragStartOffset = { x: 0, y: 0 };
let dragGrabPoint = { x: 0, y: 0 };

// Canvas Metrics
const dWidth = ref(0);
const dHeight = ref(0);
const naturalWidth = ref(0);
const naturalHeight = ref(0);
const scaleX = computed(() => naturalWidth.value ? naturalWidth.value / dWidth.value : 1);
const scaleY = computed(() => naturalHeight.value ? naturalHeight.value / dHeight.value : 1);
const editingTextId = ref<number | null>(null);

// --- View Lifecycle ---
const initView = () => {
    if (!imgRef.value || !containerRef.value) return;
    const img = imgRef.value;
    const container = containerRef.value;
    const pad = 120; // Extra padding for the luxurious floating look
    const containerWidth = container.clientWidth - pad;
    const containerHeight = container.clientHeight - pad;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = containerWidth / containerHeight;

    if (imageRatio > containerRatio) {
        dWidth.value = containerWidth;
        dHeight.value = dWidth.value / imageRatio;
    } else {
        dHeight.value = containerHeight;
        dWidth.value = dHeight.value * imageRatio;
    }

    naturalWidth.value = img.naturalWidth;
    naturalHeight.value = img.naturalHeight;
    hydrateAnnotations();

    // Initialize dock position to bottom-center
    dockPos.x = window.innerWidth / 2;
    dockPos.y = window.innerHeight - 80;
};

const hydrateAnnotations = () => {
    if (props.initialAnnotations) {
        paths.value = props.initialAnnotations.paths || [];
        lines.value = props.initialAnnotations.lines || [];
        trendLines.value = props.initialAnnotations.trendLines || [];
        rays.value = props.initialAnnotations.rays || [];
        rects.value = props.initialAnnotations.rects || [];
        
        const sx = scaleX.value || 1;
        const sy = scaleY.value || 1;
        textLayers.value = (props.initialAnnotations.texts || []).map(t => ({
            ...t,
            x: t.x / sx,
            y: t.y / sy,
            size: t.size / sx
        }));
    } else {
        paths.value = []; textLayers.value = []; lines.value = []; trendLines.value = []; rays.value = []; rects.value = [];
    }
};

watch(() => props.isOpen, (o) => { 
    if(o) { 
        activeTool.value = 'pencil'; 
        deselectAll(); 
        nextTick(() => { if (imgRef.value?.complete) initView(); }); 
    } 
});

// --- Mouse Movements ---
const handleGlobalMouseMove = (e: MouseEvent) => {
    const rect = containerRef.value?.getBoundingClientRect();
    if (!rect) return;

    // Use direct DOM for crosshairs to avoid reactive overhead on every pixel
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    requestAnimationFrame(() => {
        const xLine = document.getElementById('cross-x');
        const yLine = document.getElementById('cross-y');
        if (xLine) xLine.style.transform = `translateX(${cx}px)`;
        if (yLine) yLine.style.transform = `translateY(${cy}px)`;
    });

    if (!svgRef.value) return;
    const sRect = svgRef.value.getBoundingClientRect();
    const x = e.clientX - sRect.left;
    const y = e.clientY - sRect.top;
    normX.value = x * scaleX.value;
    normY.value = y * scaleY.value;

    if (isDrawingBrush.value) {
        currentPathPoints.value.push({ x: normX.value, y: normY.value });
    }
    if (draftObject.value) {
        draftObject.value.x2 = normX.value;
        draftObject.value.y2 = normY.value;
    }
};

const onDockDrag = (e: MouseEvent) => {
    if (!isDockDragging.value) return;
    dockPos.x = e.clientX - dockDragOffset.x;
    dockPos.y = e.clientY - dockDragOffset.y;
};

const startDockDrag = (e: MouseEvent) => {
    e.preventDefault();
    isDockDragging.value = true;
    
    dockDragOffset.x = e.clientX - dockPos.x;
    dockDragOffset.y = e.clientY - dockPos.y;

    window.addEventListener('mousemove', onDockDrag);
    window.addEventListener('mouseup', stopDockDrag, { once: true });
};

const stopDockDrag = () => {
    isDockDragging.value = false;
    window.removeEventListener('mousemove', onDockDrag);
};

// --- Left Click logic (DRAWING / PLACING / DRAGGING) ---
const handleCanvasMouseDown = (e: MouseEvent) => {
    // If we click empty canvas, we close context menu and start drawing
    deselectAll();
    
    if (!svgRef.value) return;
    if (activeTool.value === 'pencil') {
        isDrawingBrush.value = true;
        currentPathPoints.value = [{ x: normX.value, y: normY.value }];
    } else if (['trendline', 'rect', 'ray'].includes(activeTool.value)) {
        draftObject.value = {
            type: activeTool.value,
            x1: normX.value, y1: normY.value,
            x2: normX.value, y2: normY.value
        };
    } else if (activeTool.value === 'h-line') {
        lines.value.push({ id: Date.now(), type: 'h', pos: normY.value, color: selectedColor.value, width: selectedWidth.value });
    } else if (activeTool.value === 'v-line') {
        lines.value.push({ id: Date.now(), type: 'v', pos: normX.value, color: selectedColor.value, width: selectedWidth.value });
    } else if (activeTool.value === 'text') {
        const textRect = svgRef.value.getBoundingClientRect();
        const tx = e.clientX - textRect.left;
        const ty = e.clientY - textRect.top;
        const newText = { 
            id: Date.now(), 
            text: 'Annotation', 
            x: tx, y: ty, 
            color: selectedColor.value, 
            size: selectedWidth.value > 10 ? selectedWidth.value : 24, // Use a baseline starting size
            bold: true,
            italic: false,
            bgEnabled: true,
            bgColor: '#111111',
            borderEnabled: false,
            borderColor: selectedColor.value
        };
        textLayers.value.push(newText);
        activeTool.value = 'pencil';
        nextTick(() => document.getElementById(`text-layer-${newText.id}`)?.focus());
    }
};

const handleCanvasMouseUp = () => {
    if (dragTarget.value) {
        dragTarget.value = null;
        return;
    }

    if (isDrawingBrush.value) {
        paths.value.push({ id: Date.now(), points: [...currentPathPoints.value], color: selectedColor.value, width: selectedWidth.value });
        isDrawingBrush.value = false;
        currentPathPoints.value = [];
    }
    if (draftObject.value) {
        const obj = { ...draftObject.value, id: Date.now(), color: selectedColor.value, width: selectedWidth.value };
        if (obj.type === 'trendline') trendLines.value.push(obj);
        if (obj.type === 'rect') rects.value.push(obj);
        if (obj.type === 'ray') rays.value.push(obj);
        draftObject.value = null;
    }
};

// --- Left Click Dragging (on Objects) ---
const startDrag = (type: string, id: number, e: MouseEvent) => {
    if (selectedElement.value?.id !== id) {
        deselectAll(); 
    }

    if (type === 'text') {
        const target = e.currentTarget as HTMLElement;
        if (target.contentEditable !== 'true' || document.activeElement !== target) {
            e.preventDefault();
        }
        // Store starting offsets for absolute positioning (zero-latency)
        dragStartOffset.x = e.clientX - target.getBoundingClientRect().left + target.offsetLeft;
        dragStartOffset.y = e.clientY - target.getBoundingClientRect().top + target.offsetTop;
        
        // Alternative: simpler screen-relative grab point
        const elRect = target.getBoundingClientRect();
        dragGrabPoint = { 
            x: e.clientX - elRect.left, 
            y: e.clientY - elRect.top 
        };
    } else {
        e.preventDefault();
    }

    let item = null;
    if (type === 'path') item = paths.value.find(x => x.id === id);
    if (type === 'line') item = lines.value.find(x => x.id === id);
    if (type === 'rect') item = rects.value.find(x => x.id === id);
    if (type === 'trendline') item = trendLines.value.find(x => x.id === id);
    if (type === 'ray') item = rays.value.find(x => x.id === id);
    if (type === 'text') item = textLayers.value.find(x => x.id === id);
    
    if (item) {
        dragTarget.value = { type, item };
        lastDragPos = { x: e.clientX, y: e.clientY };
        window.addEventListener('mousemove', onDrag, { passive: true });
        window.addEventListener('mouseup', stopDrag);
    }
};

const stopDrag = (e: MouseEvent) => {
    dragTarget.value = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
    if (!dragTarget.value) return;
    
    const deltaX = e.clientX - lastDragPos.x;
    const deltaY = e.clientY - lastDragPos.y;
    lastDragPos = { x: e.clientX, y: e.clientY };
    
    const sx = scaleX.value || 1;
    const sy = scaleY.value || 1;
    
    const target = dragTarget.value;
    if (target.type === 'text') {
        const el = document.getElementById('text-layer-' + target.item.id);
        if (el && el.offsetParent) {
            const opRect = el.offsetParent.getBoundingClientRect();
            // Update reactive state directly instead of DOM style overrides
            target.item.x = e.clientX - opRect.left - dragGrabPoint.x;
            target.item.y = e.clientY - opRect.top - dragGrabPoint.y;
        }
    } else if (target.type === 'line') {
        if (target.item.type === 'h') target.item.pos += deltaY * sy;
        else target.item.pos += deltaX * sx;
    } else if (['trendline', 'rect', 'ray'].includes(target.type)) {
        target.item.x1 += deltaX * sx;
        target.item.y1 += deltaY * sy;
        target.item.x2 += deltaX * sx;
        target.item.y2 += deltaY * sy;
    } else if (target.type === 'path') {
        target.item.points = target.item.points.map((p: any) => ({ 
            x: p.x + deltaX * sx, 
            y: p.y + deltaY * sy 
        }));
    }
};

// --- Right Click Context Menu (EDITING) ---
const selectElement = (type: string, item: any, e: MouseEvent) => {
    // Create a clone of the original state for reversion
    originalItemState.value = JSON.parse(JSON.stringify(item));
    selectedElement.value = { type, item, id: item.id };
    
    // Initial guess near cursor to avoid initial flicker
    menuPos.x = e.clientX + 15;
    menuPos.y = e.clientY + 15;

    // Smart repositioning to fit screen
    nextTick(() => {
        if (!contextMenuRef.value) return;
        const rect = contextMenuRef.value.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        
        // Overflow horizontally
        if (x + rect.width > winW - 20) {
            x = e.clientX - rect.width - 15;
        }
        
        // Overflow vertically
        if (y + rect.height > winH - 20) {
            y = e.clientY - rect.height - 15;
        }

        // Clamp to screen edges
        menuPos.x = Math.max(10, Math.min(x, winW - rect.width - 10));
        menuPos.y = Math.max(10, Math.min(y, winH - rect.height - 10));
    });
};

const cancelEdit = () => {
    if (selectedElement.value && originalItemState.value) {
        // Direct reversion
        Object.assign(selectedElement.value.item, originalItemState.value);
    }
    deselectAll();
};

const saveEdit = () => {
    deselectAll();
};

const deselectAll = () => { 
    selectedElement.value = null; 
    originalItemState.value = null;
};

const updateElementColor = (c: string) => { if (selectedElement.value) selectedElement.value.item.color = c; };
const updateElementWidth = (w: number) => { if (selectedElement.value) selectedElement.value.item.width = w; };
const removeSelected = () => {
    if (!selectedElement.value) return;
    const { type, id } = selectedElement.value;
    if (type === 'path') paths.value = paths.value.filter(p => p.id !== id);
    if (type === 'line') lines.value = lines.value.filter(l => l.id !== id);
    if (type === 'trendline') trendLines.value = trendLines.value.filter(tl => tl.id !== id);
    if (type === 'rect') rects.value = rects.value.filter(r => r.id !== id);
    if (type === 'ray') rays.value = rays.value.filter(ry => ry.id !== id);
    if (type === 'text') textLayers.value = textLayers.value.filter(t => t.id !== id);
    deselectAll();
};

const clearAll = () => { paths.value = []; textLayers.value = []; lines.value = []; trendLines.value = []; rays.value = []; rects.value = []; deselectAll(); };

const save = () => {
    const sx = scaleX.value;
    const sy = scaleY.value;
    const serializedTexts = textLayers.value.map(t => {
        const el = document.getElementById(`text-layer-${t.id}`);
        return { 
            ...t, 
            text: el ? el.innerText : t.text, 
            x: t.x * sx, y: t.y * sy, 
            size: (t.size || 24) * sx 
        };
    });
    emit('save', { paths: paths.value, texts: serializedTexts, lines: lines.value, trendLines: trendLines.value, rays: rays.value, rects: rects.value });
};

onMounted(() => window.addEventListener('keydown', (e) => {
    if (!props.isOpen || e.target instanceof HTMLInputElement || (e.target instanceof HTMLElement && e.target.contentEditable === 'true')) return;
    const k = e.key.toLowerCase();
    if (k === 'b') activeTool.value = 'pencil';
    if (k === 't') activeTool.value = 'text';
    if (k === 'l') activeTool.value = 'trendline';
    if (k === 'h') activeTool.value = 'h-line';
    if (k === 'v') activeTool.value = 'v-line';
    if (k === 's') activeTool.value = 'rect';
    if (e.key === 'Escape') { if (selectedElement.value) deselectAll(); else emit('close'); }
}));
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.98); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
