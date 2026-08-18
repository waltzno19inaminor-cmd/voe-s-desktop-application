<template>
  <div v-if="thought" class="h-full flex flex-col bg-white dark:bg-[#050505] lg:rounded-l-3xl border-l border-black/5 dark:border-white/5 relative z-20">
    <div class="px-8 lg:px-24 pb-8 flex-1 overflow-y-auto scrollbar-hidden">
        
       <div class="flex items-start justify-between gap-6 mb-8 mt-16 lg:mt-24">
           <input 
             v-model="titleInput"
             @input="onTitleUpdate"
             type="text" 
             class="w-full text-4xl lg:text-5xl font-serif text-[#050505] dark:text-white bg-transparent outline-none placeholder:text-[#ccc] dark:placeholder:text-[#333]"
             placeholder="Session Title..."
           />
           <button @click="onDeleteSession" class="shrink-0 p-3 rounded-2xl bg-red-500/5 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-transparent hover:shadow-[0_10px_30px_rgba(239,68,68,0.3)] duration-300">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
           </button>
       </div>

       <!-- Formatting Toolbar -->
       <div class="sticky top-[-1px] z-30 mb-8 bg-white dark:bg-[#050505] py-4 border-b border-black/5 dark:border-white/5 flex items-center flex-wrap gap-2 text-[#444] dark:text-[#aaa]">
          <button 
            @click="format('formatBlock', 'H1')" 
            class="min-w-[32px] h-8 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center"
            :class="toolbarState.isH1 ? 'bg-black/10 dark:bg-white/10 shadow-inner ring-1 ring-black/5 dark:ring-white/5' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'"
          >H1</button>
          <button 
            @click="format('formatBlock', 'H2')" 
            class="min-w-[32px] h-8 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center"
            :class="toolbarState.isH2 ? 'bg-black/10 dark:bg-white/10 shadow-inner ring-1 ring-black/5 dark:ring-white/5' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'"
          >H2</button>
          
          <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

          <button 
            @click="format('bold')" 
            class="w-8 h-8 rounded-lg transition flex items-center justify-center"
            :class="toolbarState.isBold ? 'bg-black/10 dark:bg-white/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'"
          >
            <b class="font-serif">B</b>
          </button>
          <button 
            @click="format('italic')" 
            class="w-8 h-8 rounded-lg transition flex items-center justify-center"
            :class="toolbarState.isItalic ? 'bg-black/10 dark:bg-white/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'"
          >
            <i class="font-serif">I</i>
          </button>

          <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

          <!-- Color Output & Input -->
          <div class="relative w-6 h-6 rounded-lg overflow-hidden border border-black/15 dark:border-white/15 shadow-sm cursor-pointer transition hover:scale-105">
              <input type="color" v-model="activeTextColor" @input="format('foreColor', activeTextColor)" class="absolute inset-[-10px] w-[50px] h-[50px] cursor-pointer" />
          </div>

          <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

          <!-- Font Size Number Input -->
          <div class="flex items-center bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 hover:border-black/20 transition-colors">
             <button @click="currentFontSize = Math.max(10, currentFontSize - 2); applyCustomFontSize()" class="w-7 h-7 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition text-[#333] dark:text-[#ddd] rounded-l-lg">
                 <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"/></svg>
             </button>
             <input type="number" v-model="currentFontSize" @change="applyCustomFontSize" min="10" max="72" class="w-8 text-center bg-transparent outline-none text-xs font-bold py-1 text-[#333] dark:text-[#ddd] hide-spinners z-10" />
             <button @click="currentFontSize = Math.min(72, currentFontSize + 2); applyCustomFontSize()" class="w-7 h-7 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition text-[#333] dark:text-[#ddd] rounded-r-lg">
                 <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/></svg>
             </button>
          </div>

          <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

          <button 
            @click="format('insertUnorderedList')" 
            class="w-8 h-8 rounded-lg transition flex items-center justify-center" 
            :class="toolbarState.isList ? 'bg-black/10 dark:bg-white/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'"
          >
             <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          
          <button 
            @click="format('formatBlock', 'BLOCKQUOTE')" 
            class="w-8 h-8 rounded-lg transition flex items-center justify-center" 
            :class="toolbarState.isBlockquote ? 'bg-black/10 dark:bg-white/10 shadow-inner' : 'hover:bg-black/5 dark:hover:bg-white/5'"
          >
             <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          </button>

          <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

          <label class="px-3 py-1.5 rounded-lg flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer text-xs font-bold uppercase tracking-widest text-[#050505] dark:text-white">
             <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             Photo
             <input type="file" accept="image/*" class="hidden" @change="onImageUpload" />
          </label>

          <button @click="isAttachTradeModalOpen = true" class="px-3 py-1.5 rounded-lg flex items-center gap-2 bg-transparent border nier-border-primary hover:border-black/30 dark:hover:border-white/30 transition text-xs font-bold uppercase tracking-widest text-[#050505] dark:text-white">
             <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
             Trade
          </button>
       </div>

       <!-- The Editor -->
       <div 
         id="thoughts-editor"
         ref="editorRef"
         :contenteditable="!isThoughtsSubmitting"
         @input="onContentUpdate"
         @click="onEditorClick"
         @keydown="onEditorKeyDown"
         class="outline-none min-h-[500px] prose dark:prose-invert max-w-none pb-32
            [&_h1]:text-4xl [&_h1]:font-serif [&_h1]:mb-6 [&_h1]:text-[#050505] dark:[&_h1]:text-white
            [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:mb-4 [&_h2]:text-[#050505] dark:[&_h2]:text-white
            [&_p]:text-lg [&_p]:leading-loose [&_p]:mb-6 [&_p]:text-[#333] dark:[&_p]:text-[#ddd]
            [&_font[size='7']]:text-5xl [&_font[size='7']]:leading-tight
            [&_font[size='5']]:text-3xl [&_font[size='5']]:leading-tight
            [&_font[size='3']]:text-xl [&_font[size='3']]:leading-tight
            [&_img]:rounded-xl [&_img]:shadow-2xl [&_img]:border [&_img]:border-black/5 [&_img]:cursor-pointer [&_img]:transition-all
            [&_blockquote]:border-l-4 [&_blockquote]:border-black/20 dark:[&_blockquote]:border-white/20 [&_blockquote]:pl-6 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-[#666] dark:[&_blockquote]:text-[#aaa] [&_blockquote]:font-serif [&_blockquote]:text-xl
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6
            [&_li]:text-lg [&_li]:leading-loose [&_li]:mb-2
         "
         placeholder="Begin your reflection..."
       ></div>
       <p class="text-[10px] uppercase font-mono tracking-widest text-[#aaa] mt-10 opacity-50">Local Autosave Active</p>
    </div>

    <!-- Modals -->
    <AttachTradeModal 
      :isOpen="isAttachTradeModalOpen"
      @close="isAttachTradeModalOpen = false"
      @attach="insertTradeBlock"
    />

    <DrawingModal
      :isOpen="isDrawingModalOpen"
      :imageSrc="drawingImageSrc"
      :initialAnnotations="currentAnnotations"
      @close="isDrawingModalOpen = false"
      @save="onDrawingSave"
    />

    <!-- Custom Delete Confirmation Modal -->
    <transition name="fade-scale">
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[3000] flex items-center justify-center p-4">
         <div @click="isDeleteModalOpen = false" class="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"></div>
         
         <div class="relative nier-bg-panel w-full max-w-sm rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-black/5 dark:border-white/10 text-center">
            <div class="w-16 h-16 bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </div>
            
            <h3 class="text-2xl font-serif text-[#050505] dark:text-white mb-2">Delete Session?</h3>
            <p class="text-sm text-[#666] dark:text-[#aaa] mb-8 leading-relaxed">
              This reflection session will be permanently wiped from your drive. You cannot undo this action.
            </p>
            
            <div class="flex items-center gap-3">
               <button @click="isDeleteModalOpen = false" class="flex-1 py-3.5 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-black/5 dark:bg-white/5 text-[#050505] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  Cancel
               </button>
               <button @click="executeDeletion" class="flex-1 py-3.5 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all">
                  Eradicate
               </button>
            </div>
         </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '~/entities/user/auth.store';
import { thoughts, activeThoughtId, updateThought, deleteThought, isThoughtsSubmitting, isDrawingModalActive } from '@/widgets/diary/model/useThoughts';
import type { DiaryEntry } from '~/entities/diary/model/diary.types';
import AttachTradeModal from './AttachTradeModal.vue';
import DrawingModal from './DrawingModal.vue';

const auth = useAuthStore();

const editorRef = ref<HTMLDivElement | null>(null);
const titleInput = ref('');

const isAttachTradeModalOpen = ref(false);
const isDrawingModalOpen = ref(false);
watch(isDrawingModalOpen, (v) => { isDrawingModalActive.value = v; });
const isDeleteModalOpen = ref(false);
const drawingImageSrc = ref('');
const currentAnnotations = ref<{paths: any[], texts: any[]} | null>(null);
const activeTextColor = ref('#050505');
const currentFontSize = ref(18);
let currentImageTarget: HTMLImageElement | null = null; 

const toolbarState = ref({
    isBold: false,
    isItalic: false,
    isH1: false,
    isH2: false,
    isUnderline: false,
    isList: false,
    isBlockquote: false
});

const updateToolbarState = () => {
    if (!editorRef.value) return;
    toolbarState.value.isBold = document.queryCommandState('bold');
    toolbarState.value.isItalic = document.queryCommandState('italic');
    toolbarState.value.isUnderline = document.queryCommandState('underline');
    toolbarState.value.isList = document.queryCommandState('insertUnorderedList');
    
    const blockType = document.queryCommandValue('formatBlock');
    toolbarState.value.isH1 = blockType === 'h1' || blockType === 'header1';
    toolbarState.value.isH2 = blockType === 'h2' || blockType === 'header2';
    toolbarState.value.isBlockquote = blockType === 'blockquote';
};

let saveTimeout: any = null;

const thought = computed(() => {
    return thoughts.value.find(t => t.id === activeThoughtId.value) || null;
});

// Sync data when activating a new thought
watch(activeThoughtId, (newId) => {
    if (newId) {
        const t = thoughts.value.find(t => t.id === newId);
        if (t) {
            titleInput.value = t.title;
            const applyHtml = () => {
                if (!editorRef.value) return;
                editorRef.value.innerHTML = t.contentHtml;
                
                const blocks = editorRef.value.querySelectorAll('.image-attachment-block');
                blocks.forEach(block => {
                    // Cleanup legacy buttons if they exist
                    const oldBtn = block.querySelector('.add-label-btn');
                    if (oldBtn) oldBtn.remove();
                    
                    // Cleanup legacy HTML labels if they exist (migrating to SVG only)
                    const oldLabels = block.querySelectorAll('.image-label');
                    oldLabels.forEach(l => l.remove());
                    
                    if (!block.classList.contains('group/imgblock')) {
                       block.classList.add('group/imgblock');
                    }
                });
                onContentUpdate();
            };
            
            if (editorRef.value) {
                applyHtml();
            } else {
                nextTick(applyHtml);
            }
        }
    }
}, { immediate: true });

const onTitleUpdate = () => {
    if (!auth.user?.uid || !thought.value) return;
    updateThought(auth.user.uid, thought.value.id, { title: titleInput.value });
};

const onContentUpdate = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (!auth.user?.uid || !thought.value || !editorRef.value) return;
        updateThought(auth.user.uid, thought.value.id, { contentHtml: editorRef.value.innerHTML });
    }, 1000);
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

const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if(editorRef.value) editorRef.value.focus();
    updateToolbarState();
    onContentUpdate();
};

const onDeleteSession = () => {
    isDeleteModalOpen.value = true;
};

const executeDeletion = async () => {
    if (!auth.user?.uid || !thought.value) return;
    await deleteThought(auth.user.uid, thought.value.id);
    isDeleteModalOpen.value = false;
};

const compressImageLocally = (file: File, maxWidth = 1200, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            if (!e.target?.result) return reject("No result");
            const img = new Image();
            img.src = e.target.result as string;
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
                if (!ctx) return reject("No ctx");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject("Image load error");
        };
        reader.onerror = (error) => reject(error);
    });
};

const onImageUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    let file = input.files[0];
    if (!file) return;
    
    try {
        isThoughtsSubmitting.value = true;
        // Native local compression
        const base64Str = await compressImageLocally(file);
        
        if (editorRef.value) {
            const imgStr = `
            <div class="image-attachment-block relative group/imgblock" contenteditable="false" style="margin: 2rem auto; display: table; width: max-content; max-width: 100%; user-select: none;">
                <button type="button" class="remove-image-btn absolute -top-3 -right-3 w-8 h-8 rounded-full border border-black/10 shadow-lg flex items-center justify-center text-[#999] bg-[#fff] hover:text-red-500 hover:border-red-500/30 transition-colors z-[60] cursor-pointer">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <img src="${base64Str}" class="transition-[filter,transform] duration-200" style="max-width: 100%; display: block; border-radius: 12px; cursor: crosshair;" />
            </div>`;
            editorRef.value.insertAdjacentHTML('beforeend', imgStr);
            editorRef.value.insertAdjacentHTML('beforeend', '<p><br></p>');
            
            // Auto-scroll to bottom
            editorRef.value.parentElement?.scrollTo({ top: editorRef.value.parentElement.scrollHeight, behavior: 'smooth' });
            onContentUpdate();
        }
        input.value = '';
    } catch (err) {
        console.error("Local upload parsing failed:", err);
    } finally {
        isThoughtsSubmitting.value = false;
        input.value = '';
    }
};

const onEditorClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking remove button on a trade block
    const removeBtn = target.closest('.remove-trade-btn');
    if (removeBtn) {
        const block = removeBtn.closest('.trade-attachment-block');
        if (block) {
            block.remove();
            onContentUpdate();
        }
        return;
    }
    
    // Check if clicking remove button on an image block
    const removeImgBtn = target.closest('.remove-image-btn');
    if (removeImgBtn) {
        const block = removeImgBtn.closest('.image-attachment-block');
        if (block) {
            block.remove();
            onContentUpdate();
        }
        return;
    }
    
    if (target.tagName.toLowerCase() === 'img') {
        const wrapper = target.closest('.image-attachment-block');
        if (wrapper) {
            currentImageTarget = target as HTMLImageElement;
            drawingImageSrc.value = currentImageTarget.src;
            
            if (wrapper.hasAttribute('data-annotations')) {
                 try {
                    currentAnnotations.value = JSON.parse(decodeURIComponent(wrapper.getAttribute('data-annotations') || ''));
                 } catch(e) {
                    currentAnnotations.value = null;
                 }
            } else {
                 currentAnnotations.value = null;
            }
            
            isDrawingModalOpen.value = true;
        }
    }
};

const onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (!sel) return;
        
        if (!sel.isCollapsed && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const fragment = range.cloneContents();
            if (fragment.querySelector('.image-attachment-block') || fragment.querySelector('.trade-attachment-block')) {
                e.preventDefault();
                // Alert hints to remove blocks properly via X
                return;
            }
        }
        
        if (sel.anchorNode && sel.anchorNode.nodeType === Node.ELEMENT_NODE) {
             const anchor = sel.anchorNode as HTMLElement;
             if (anchor.classList && (anchor.classList.contains('image-attachment-block') || anchor.classList.contains('trade-attachment-block'))) {
                 e.preventDefault();
                 return;
             }
        }
    }
    
    if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.ELEMENT_NODE) {
            const anchor = sel.anchorNode as HTMLElement;
            if (anchor.classList && (anchor.classList.contains('image-attachment-block') || anchor.classList.contains('trade-attachment-block'))) {
                e.preventDefault();
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                anchor.insertAdjacentElement('afterend', p);
                const range = document.createRange();
                range.setStart(p, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    
    updateToolbarState();
};

const onDrawingSave = (payload: { paths: any[], texts: any[], lines?: any[], trendLines?: any[], rays?: any[], rects?: any[] }) => {
    if (currentImageTarget) {
        const wrapper = currentImageTarget.closest('.image-attachment-block');
        if (wrapper) {
            const oldSvg = wrapper.querySelector('svg.annotations-layer');
            if (oldSvg) oldSvg.remove();
            
            const hasAnnotations = (payload.paths && payload.paths.length > 0) || 
                                   (payload.texts && payload.texts.length > 0) || 
                                   (payload.lines && payload.lines.length > 0) ||
                                   (payload.trendLines && payload.trendLines.length > 0) ||
                                   (payload.rays && payload.rays.length > 0) ||
                                   (payload.rects && payload.rects.length > 0);

            if (hasAnnotations) {
                const img = currentImageTarget as HTMLImageElement;
                let svgHtml = `<svg class="annotations-layer absolute inset-0 w-full h-full pointer-events-none z-[15]" style="border-radius: 12px; overflow: hidden;" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}" preserveAspectRatio="none">`;
                
                // Render Rectangles
                if (payload.rects) {
                    payload.rects.forEach((r: any) => {
                        svgHtml += `<rect x="${Math.min(r.x1, r.x2)}" y="${Math.min(r.y1, r.y2)}" width="${Math.abs(r.x1 - r.x2)}" height="${Math.abs(r.y1 - r.y2)}" stroke="${r.color}" stroke-width="${r.width || 2}" fill="none" />`;
                    });
                }

                // Render Trend Lines
                if (payload.trendLines) {
                    payload.trendLines.forEach((tl: any) => {
                        svgHtml += `<line x1="${tl.x1}" y1="${tl.y1}" x2="${tl.x2}" y2="${tl.y2}" stroke="${tl.color}" stroke-width="${tl.width || 2}" />`;
                    });
                }

                // Render Rays
                if (payload.rays) {
                    payload.rays.forEach((ry: any) => {
                        svgHtml += `<line x1="${ry.x1}" y1="${ry.y1}" x2="${ry.x1 + (ry.x2 - ry.x1) * 100}" y2="${ry.y1 + (ry.y2 - ry.y1) * 100}" stroke="${ry.color}" stroke-width="${ry.width || 2}" />`;
                    });
                }

                // Render Infinite Lines (H/V)
                if (payload.lines) {
                    payload.lines.forEach((l: any) => {
                        const x1 = l.type === 'h' ? 0 : l.pos;
                        const y1 = l.type === 'h' ? l.pos : 0;
                        const x2 = l.type === 'h' ? img.naturalWidth : l.pos;
                        const y2 = l.type === 'h' ? l.pos : img.naturalHeight;
                        svgHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${l.color}" stroke-width="${l.width || 2}" />`;
                    });
                }

                // Render Paths
                if (payload.paths) {
                    payload.paths.forEach((p: any) => {
                        const pts = p.points.map((pt: any) => `${pt.x},${pt.y}`).join(' ');
                        svgHtml += `<polyline points="${pts}" stroke="${p.color}" stroke-width="${p.width || 4}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
                    });
                }
                
                const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                
                // Render Texts
                if (payload.texts) {
                    payload.texts.forEach((t: any) => {
                        const linesArray = t.text.split('\n');
                        const fontSize = t.size || 24;
                        const lineHeight = fontSize * 1.2;
                        const padX = 16; // Match px-4 from modal
                        const padY = 8;  // Match py-2 from modal
                        
                        if (t.bgEnabled || t.borderEnabled) {
                           let maxLineW = 0;
                           linesArray.forEach((line: string) => {
                               const approxW = line.length * (fontSize * 0.55); // More accurate width ratio
                               if (approxW > maxLineW) maxLineW = approxW;
                           });
                           
                           const boxW = maxLineW + (padX * 2);
                           const boxH = (linesArray.length * lineHeight) + (padY * 2);
                           const fill = t.bgEnabled ? (t.bgColor || '#111111') : 'none';
                           const stroke = t.borderEnabled ? (t.borderColor || '#ffffff') : 'none';
                           const strokeWidth = t.borderEnabled ? '2' : '0';
                           
                           svgHtml += `<rect x="${t.x}" y="${t.y}" width="${boxW}" height="${boxH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="8" />`;
                        }

                        const fontWeight = t.bold ? 'bold' : 'normal';
                        const fontStyle = t.italic ? 'italic' : 'normal';
                        const fillCol = t.color || '#ffffff';

                        linesArray.forEach((line: string, i: number) => {
                            // Add the padding offset to the text position
                            svgHtml += `<text x="${t.x + padX}" y="${t.y + padY + (i * lineHeight)}" font-family="sans-serif" font-size="${fontSize}px" fill="${fillCol}" font-weight="${fontWeight}" font-style="${fontStyle}" dominant-baseline="text-before-edge">${escapeHtml(line)}</text>`;
                        });
                    });
                }
                
                svgHtml += `</svg>`;
                const imgContainer = currentImageTarget.parentElement;
                if (imgContainer) {
                   imgContainer.insertAdjacentHTML('beforeend', svgHtml);
                }
                
                wrapper.setAttribute('data-annotations', encodeURIComponent(JSON.stringify(payload)));
            } else {
                wrapper.removeAttribute('data-annotations');
            }
            onContentUpdate();
        }
    }
    isDrawingModalOpen.value = false;
    currentImageTarget = null;
    drawingImageSrc.value = '';
    currentAnnotations.value = null;
};

// Insert trade styling block
const insertTradeBlock = (entry: DiaryEntry) => {
    if (!editorRef.value) return;
    editorRef.value.focus();

    const resultVal = entry.result || 0;
    const isProfit = resultVal > 0;
    const isLoss = resultVal < 0;
    
    // We create a static HTML block representing the trade. Non-editable.
    const colorClass = isProfit ? 'color: #10b981;' : (isLoss ? 'color: #f43f5e;' : 'color: #888;');
    const bgClass = 'background-color: rgba(136,136,136,0.05); border: 1px solid rgba(136,136,136,0.2);';
    const sideBadgeBg = 'background-color: rgba(136,136,136,0.1); color: #888; border: 1px solid rgba(136,136,136,0.2);';

    const dateStr = new Date(entry.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

    const html = `
    <div contenteditable="false" class="trade-attachment-block relative" style="cursor: default; user-select: none; -webkit-user-select: none; -moz-user-select: none;" unselectable="on">
        <!-- Remove Button -->
        <button type="button" class="remove-trade-btn absolute -top-3 -right-3 w-8 h-8 rounded-full border border-black/10 shadow-lg flex items-center justify-center text-[#999] bg-[#fff] hover:text-red-500 hover:border-red-500/30 transition-colors z-50 cursor-pointer">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div style="margin: 2rem 0; padding: 1.5rem; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; font-family: sans-serif; ${bgClass};">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; background: rgba(0,0,0,0.05); color: #333;">
                    ${entry.asset?.substring(0,2).toUpperCase()}
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: inherit;">${entry.asset}</div>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-family: monospace;">${dateStr}</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 20px; font-family: serif; ${colorClass}">
                    ${isProfit ? '+' : ''}${resultVal}%
                </div>
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; ${sideBadgeBg}">
                    ${entry.side}
                </div>
            </div>
        </div>
    </div>
    <p><br></p>
    `;

    if (editorRef.value) {
        editorRef.value.insertAdjacentHTML('beforeend', html);
        editorRef.value.parentElement?.scrollTo({ top: editorRef.value.parentElement.scrollHeight, behavior: 'smooth' });
        onContentUpdate();
    }
};

onMounted(() => {
    // If we're opening an existing thought, sync it.
    if (thought.value && editorRef.value) {
        editorRef.value.innerHTML = thought.value.contentHtml;
    }
    
    // Add selection change listener for toolbar sync
    document.addEventListener('selectionchange', updateToolbarState);
});

onBeforeUnmount(() => {
    document.removeEventListener('selectionchange', updateToolbarState);
});
</script>

<style scoped>
/* Hide Native Number Spinners */
.hide-spinners::-webkit-outer-spin-button,
.hide-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
.hide-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}

.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
.scrollbar-hidden {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* Make sure the editable div doesn't break styling heavily */
#thoughts-editor[contenteditable="false"] {
    opacity: 0.5;
}

#thoughts-editor:empty:before {
    content: attr(placeholder);
    color: #aaa;
    pointer-events: none;
    display: block; /* For Firefox */
}
</style>
