<template>
  <div class="phantom-notebook-container relative z-[5000]">
    <!-- MAIN NOTEBOOK PANEL (SPLIT ARCHITECTURE) -->
    <div 
      class="w-[1100px] h-[60vh] my-12 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] flex overflow-hidden transition-all duration-700 hover:border-white/10"
    >
      <!-- LEFT COLUMN: CHRONICLE EDITOR (65%) -->
      <div class="flex-1 flex flex-col border-r border-white/5">
        <!-- HEADER / TOOLBAR -->
        <div class="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg class="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
              </div>
              <div class="flex flex-col">
                  <span class="text-[10px] uppercase tracking-[0.4em] font-black text-white/80">Chronicle Hub</span>
                  <span class="text-[6px] uppercase tracking-widest text-white/20 font-mono">Deployment Log</span>
              </div>
          </div>

          <!-- Toolbar Buttons (Image Upload moved to Registry) -->
          <div class="flex items-center gap-1.5 self-center">
              <button @click="format('bold')" class="w-7 h-7 rounded border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/10 transition">
                  <b class="text-[10px] text-white/50">B</b>
              </button>
              <button @click="format('italic')" class="w-7 h-7 rounded border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/10 transition">
                  <i class="text-[10px] text-white/50">I</i>
              </button>
              <div class="w-px h-4 bg-white/5 mx-1"></div>
              <button @click="format('formatBlock', 'h1')" class="w-7 h-7 rounded border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/10 transition">
                  <span class="text-[9px] font-black text-white/50">H1</span>
              </button>
              <button @click="format('formatBlock', 'blockquote')" class="w-7 h-7 rounded border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/10 transition">
                  <span class="text-[12px] font-black text-white/50">"</span>
              </button>
              <div class="w-px h-4 bg-white/5 mx-1"></div>
              <button @click="format('insertUnorderedList')" class="w-7 h-7 rounded border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/10 transition">
                  <svg class="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div class="w-px h-4 bg-white/5 mx-1"></div>
              <div class="flex items-center bg-white/[0.03] border border-white/5 rounded px-1.5 h-7 gap-1">
                  <button @click="currentFontSize = Math.max(10, currentFontSize - 2); applyCustomFontSize()" class="w-4 h-4 text-white/20 hover:text-white transition">－</button>
                  <span class="text-[8px] font-black text-white/40 min-w-[14px] text-center">{{ currentFontSize }}</span>
                  <button @click="currentFontSize = Math.min(48, currentFontSize + 2); applyCustomFontSize()" class="w-4 h-4 text-white/20 hover:text-white transition">＋</button>
              </div>
          </div>
        </div>

        <!-- EDITOR AREA -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
            <div 
              ref="editorRef"
              contenteditable="true"
              @input="onContentUpdate"
              class="outline-none min-h-full prose prose-invert max-w-none 
                  [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-white/60 [&_p]:mb-4
                  [&_h1]:text-2xl [&_h1]:font-serif [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-6
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                  [&_blockquote]:border-l-4 [&_blockquote]:border-white/10 [&_blockquote]:pl-6 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-white/40 [&_blockquote]:my-6 [&_blockquote]:bg-white/[0.02] [&_blockquote]:rounded-r-lg
                  empty:before:content-[attr(placeholder)] empty:before:text-white/10 empty:before:pointer-events-none
              "
              placeholder="Begin your session chronicle..."
            ></div>
        </div>

        <!-- FOOTER STATUS -->
        <div class="px-6 py-2 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse"></div>
                <span class="text-[7px] uppercase tracking-widest text-white/20 font-bold">Sync Active</span>
            </div>
            <span class="text-[7px] font-mono text-white/10 uppercase">{{ characters }} chars recorded</span>
        </div>
      </div>

      <!-- RIGHT COLUMN: SNAPSHOT REGISTRY (35%) -->
      <div class="w-[350px] flex flex-col bg-white/[0.01]">
        <div class="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div class="flex flex-col">
            <span class="text-[9px] uppercase tracking-[0.3em] font-black text-white/60">Snapshot Registry</span>
            <span class="text-[6px] uppercase tracking-widest text-white/20 font-mono">Operational Evidence</span>
          </div>

          <label class="h-7 px-3 rounded bg-white/5 border border-white/10 hover:border-white/20 transition cursor-pointer flex items-center gap-2 group">
            <svg class="w-3 h-3 text-white/40 group-hover:text-white transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-[7px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition">Upload Image</span>
            <input type="file" accept="image/*" class="hidden" @change="onImageUpload" />
          </label>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          <div v-if="!newEntry.images || newEntry.images.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-20 p-8 text-center">
            <svg class="w-10 h-10 text-white mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor opacity-20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p class="text-[9px] uppercase tracking-[0.3em] leading-loose">No active snapshots.</p>
          </div>

          <!-- Reforged Tactical Feed -->
          <div 
            v-for="(img, idx) in newEntry.images" 
            :key="idx"
            class="group relative bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-4 p-2.5 hover:bg-white/[0.03] hover:border-white/20 transition-all duration-500 overflow-hidden"
          >
            <!-- Vertical Status Bar -->
            <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all group-hover:bg-emerald-400"></div>

            <!-- Thumbnail Module -->
            <div class="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0 relative group/thumb">
              <img :src="img.url" class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" />
              <div class="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            <!-- Meta Information -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[7px] font-mono text-emerald-500/60 uppercase tracking-widest">Snapshot</span>
                <span class="text-[7px] font-mono text-white/10">0{{ idx + 1 }}</span>
              </div>
              <h4 class="text-[10px] uppercase tracking-[0.2em] font-black text-white/70 truncate group-hover:text-white transition-colors">Tactical Evidence</h4>
              <p class="text-[6px] uppercase tracking-widest text-white/20 font-mono mt-0.5">Verification Phase Active</p>
            </div>

            <!-- Control Stack -->
            <div class="flex items-center gap-1.5 pr-2">
              <div class="flex flex-col border border-white/5 rounded-lg overflow-hidden bg-black/40">
                <button @click="moveImage(idx, -1)" :disabled="idx === 0" class="w-6 h-6 flex items-center justify-center text-white/10 hover:text-white hover:bg-white/10 disabled:opacity-0 transition-all">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" /></svg>
                </button>
                <div class="w-full h-px bg-white/5"></div>
                <button @click="moveImage(idx, 1)" :disabled="idx === (newEntry.images || []).length - 1" class="w-6 h-6 flex items-center justify-center text-white/10 hover:text-white hover:bg-white/10 disabled:opacity-0 transition-all">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              <div class="w-px h-8 bg-white/5 mx-1"></div>

              <div class="flex flex-col gap-1.5">
                <button @click="editImage(idx)" class="w-7 h-7 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button @click="removeImage(idx)" class="w-7 h-7 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TACTICAL PROGRESSION TRIGGER (Forward Button) -->
    <div v-if="!isAdvancedMode" class="absolute -right-8 top-1/2 -translate-y-1/2 z-[6000]">
      <button 
        @click="isEmotionPickerOpen = true"
        class="group flex items-center gap-3 transition-all duration-700"
      >
        <div class="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <span class="text-[8px] uppercase tracking-[0.4em] font-black text-white/40">Choose_Emotional_State</span>
          <span class="text-[6px] uppercase tracking-widest text-white/10 font-mono">Psychological Sync</span>
        </div>
        <div class="w-12 h-12 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/20 group-hover:text-white group-hover:border-white group-hover:scale-110 shadow-2xl transition-all duration-500 relative overflow-hidden">
          <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <svg class="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </button>
    </div>

    <!-- EMOTIONAL STATE CHOICE CARD (OVERLAY) -->
    <Teleport to="body">
      <Transition name="emotion-manifest">
        <div v-if="isEmotionPickerOpen" class="fixed inset-0 z-[10000] flex items-center justify-center p-8 pointer-events-none">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto" @click="isEmotionPickerOpen = false"></div>
          
          <div class="relative w-[600px] bg-black/90 border border-white/10 rounded-3xl p-10 pointer-events-auto shadow-[0_64px_128px_-32px_rgba(0,0,0,1)] overflow-hidden">
             <!-- Cybernetic Accents -->
             <div class="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
             <div class="absolute bottom-0 right-0 w-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
             
             <div class="flex flex-col items-center mb-10">
                <div class="w-1 h-8 bg-white/20 rounded-full mb-4"></div>
                <h2 class="text-2xl font-serif text-white uppercase tracking-[0.3em] font-medium text-center">Operational Psychology</h2>
                <p class="text-[8px] uppercase tracking-[0.4em] text-white/20 mt-3">Select your dominant state for this entry</p>
             </div>

             <div class="grid grid-cols-4 gap-4 mb-10">
                <button 
                  v-for="emo in emotions" 
                  :key="emo.id"
                  @click="toggleEmotion(emo.id)"
                  class="group relative aspect-square rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center p-4"
                  :class="(newEntry.emotions || []).includes(emo.id) 
                    ? 'bg-white border-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                    : 'bg-white/[0.03] border-white/5 hover:border-white/20'"
                >
                  <div class="w-8 h-8 mb-3 transition-transform duration-500 group-hover:scale-110" :class="(newEntry.emotions || []).includes(emo.id) ? 'text-black' : 'text-white/40 group-hover:text-white'">
                    <TacticalIcon :name="emo.id" />
                  </div>
                  <span class="text-[7px] uppercase font-black tracking-widest text-center" :class="(newEntry.emotions || []).includes(emo.id) ? 'text-black' : 'text-white/20 group-hover:text-white/60'">
                    {{ emo.id }}
                  </span>
                  
                  <!-- Selection Indicator -->
                  <div v-if="(newEntry.emotions || []).includes(emo.id)" class="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-white flex items-center justify-center">
                    <div class="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </button>
             </div>

             <div class="flex flex-col items-center gap-6">
                <div class="text-center px-10">
                   <p class="text-[9px] uppercase tracking-widest text-white/40 leading-relaxed italic h-8">
                     "{{ emotions.find(e => e.id === lastSelectedEmotion)?.desc || 'Synchronize Psychological Profile' }}"
                   </p>
                </div>

                <div class="w-full flex items-center gap-4">
                   <button @click="isEmotionPickerOpen = false" class="flex-1 py-4 rounded-xl border border-white/5 text-[8px] uppercase tracking-[0.4em] font-black text-white/20 hover:text-white hover:bg-white/5 transition-all">
                     Dismiss
                   </button>
                   <button 
                     @click="handleEmotionSync"
                     class="flex-[2] py-4 rounded-xl bg-white text-black text-[8px] uppercase tracking-[0.4em] font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                   >
                     Confirm Sync & Save
                   </button>
                </div>
             </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- REUSED DRAWING MODAL -->
    <Teleport to="body">
      <DrawingModal
        :isOpen="isDrawingModalOpen"
        :imageSrc="drawingImageSrc"
        :initialAnnotations="currentAnnotations"
        @close="isDrawingModalOpen = false"
        @save="onDrawingSave"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { newEntry, isAdvancedMode, isEmotionSyncComplete } from '@/widgets/diary/model/useDiary';
import DrawingModal from '../thoughts/DrawingModal.vue';
import TacticalIcon from '../controls/TacticalIcon.vue';

const editorRef = ref<HTMLDivElement | null>(null);
const currentFontSize = ref(14);
const characters = ref(0);

// REGISTRY & ANNOTATION STATE
let currentImageIdx: number | null = null;
const isDrawingModalOpen = ref(false);
const drawingImageSrc = ref('');
const currentAnnotations = ref<any>(null);

const isEmotionPickerOpen = ref(false);
const lastSelectedEmotion = ref<string | null>(null);
const emotions = [
  { id: 'fear', label: 'Fear Response', desc: 'Risk aversion initiated. Potential for premature exit or missed entry protocols due to perceived volatility spikes.' },
  { id: 'greed', label: 'Greed/Euphoria', desc: 'Dopamine loop active. Tendency to ignore SL logic or over-leverage position size beyond risk parameters.' },
  { id: 'fomo', label: 'FOMO Distortion', desc: 'Chase protocol active. Risk of entering at price exhaustion points. Strategic patience is compromised.' },
  { id: 'frustration', label: 'Frustration', desc: 'Emotional friction detected. High risk of revenge trading or abandonment of strategic discipline.' },
  { id: 'neutral', label: 'Neutral Logic', desc: 'System equilibrium maintained. Execution following pure strategic parameters without emotional bias.' },
  { id: 'confidence', label: 'Confidence', desc: 'Strategic alignment confirmed. High conviction execution within established risk-reward thresholds.' },
  { id: 'calm', label: 'Calm/Zen', desc: 'Peak flow state achieved. Market noise filtered. Execution is fluid and precise.' },
  { id: 'boredom', label: 'Boredom', desc: 'Apathy detected. Risk of taking low-quality trades just to be in the market.' }
];

const toggleEmotion = (id: string) => {
    if (!newEntry.value.emotions) newEntry.value.emotions = [];
    const idx = newEntry.value.emotions.indexOf(id);
    if (idx > -1) {
        newEntry.value.emotions.splice(idx, 1);
        if (lastSelectedEmotion.value === id) {
            lastSelectedEmotion.value = newEntry.value.emotions[newEntry.value.emotions.length - 1] || null;
        }
    } else {
        newEntry.value.emotions.push(id);
        lastSelectedEmotion.value = id;
    }
};

const handleEmotionSync = () => {
    isEmotionSyncComplete.value = true;
    isEmotionPickerOpen.value = false;
};

const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.value?.focus();
    onContentUpdate();
};

const applyCustomFontSize = () => {
    document.execCommand('fontSize', false, '7');
    if (!editorRef.value) return;
    const fonts = editorRef.value.querySelectorAll('font[size="7"]');
    fonts.forEach(f => {
        f.removeAttribute('size');
        (f as HTMLElement).style.fontSize = `${currentFontSize.value}px`;
    });
    onContentUpdate();
};

const onContentUpdate = () => {
    if (!editorRef.value) return;
    newEntry.value.notes = editorRef.value.innerHTML;
    characters.value = editorRef.value.innerText.length;
};

const compressImageLocally = (file: File, maxWidth = 1200, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
};

const onImageUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file) return; // FIX: Ensure file is not undefined

    try {
        const base64Str = await compressImageLocally(file);
        if (!newEntry.value.images) newEntry.value.images = [];
        newEntry.value.images.push({ url: base64Str, context: '' });
        onContentUpdate();
    } catch (err) {
        console.error("Snapshot Registry: Upload failed:", err);
    } finally {
        input.value = ''; 
    }
};

const removeImage = (index: number) => {
    if (!newEntry.value.images) return;
    newEntry.value.images.splice(index, 1);
    onContentUpdate();
};

const moveImage = (index: number, direction: number) => {
    if (!newEntry.value.images) return;
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= newEntry.value.images.length) return;
    
    const items = [...newEntry.value.images];
    const itemA = items[index];
    const itemB = items[newIdx];
    
    if (itemA && itemB) {
        items[index] = itemB;
        items[newIdx] = itemA;
        newEntry.value.images = items;
        onContentUpdate();
    }
   return true;
};

const editImage = (index: number) => {
    if (!newEntry.value.images) return;
    const img = newEntry.value.images[index];
    if (!img) return; // FIX: Ensure image exists
    
    currentImageIdx = index;
    drawingImageSrc.value = img.url || '';
    
    try {
        currentAnnotations.value = img.context ? JSON.parse(img.context) : null;
    } catch {
        currentAnnotations.value = null;
    }
    isDrawingModalOpen.value = true;
};

const onDrawingSave = (data: { imageUrl: string; annotations: any }) => {
    if (currentImageIdx !== null && newEntry.value.images) {
        const img = newEntry.value.images[currentImageIdx];
        if (img) {
            img.url = data.imageUrl;
            img.context = JSON.stringify(data.annotations);
            onContentUpdate();
        }
    }
    isDrawingModalOpen.value = false;
};

const onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
};

onMounted(() => {
    if (editorRef.value && newEntry.value.notes) {
        editorRef.value.innerHTML = newEntry.value.notes;
    }
});

watch(() => newEntry.value.id, () => {
    if (editorRef.value) {
        editorRef.value.innerHTML = newEntry.value.notes || '';
    }
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }

[contenteditable]:empty:before {
    content: attr(placeholder);
    color: rgba(255,255,255,0.1);
    pointer-events: none;
    display: block;
}

/* EMOTION CARD TRANSITIONS */
.emotion-manifest-enter-active,
.emotion-manifest-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.emotion-manifest-enter-from,
.emotion-manifest-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
