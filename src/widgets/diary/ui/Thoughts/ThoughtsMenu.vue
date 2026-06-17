<template>
  <div class="flex flex-col h-full relative z-10 bg-white/40 dark:bg-white/[0.02]">
    
    <div class="px-6 pt-8 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
      <h3 class="text-xl font-serif text-[#050505] dark:text-white tracking-wide mb-6">Chronicles</h3>
      
      <div class="relative mb-4">
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search reflections..." 
          class="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-black/20 dark:focus:border-white/20 rounded-xl py-2 pl-9 pr-4 text-xs text-[#050505] dark:text-white placeholder:text-[#aaa] outline-none transition uppercase tracking-widest font-medium"
        />
      </div>

      <button
        @click="createNew"
        :disabled="isThoughtsSubmitting"
        class="w-full flex items-center justify-center gap-2 py-3 nier-bg-inverted nier-text-primary hover:opacity-80 transition rounded-xl text-xs uppercase tracking-widest font-bold shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Log Entry
      </button>
    </div>

    <!-- Scrollable list of entries -->
    <div class="flex-1 overflow-y-auto w-full scrollbar-hidden pb-4">
      <div v-if="filteredThoughts.length === 0" class="text-center p-8 mt-10">
         <p class="text-[10px] uppercase tracking-widest text-[#777] font-bold">No entries found</p>
         <p class="text-[10px] text-[#aaa] mt-1 italic font-serif">Your mind is a blank slate.</p>
      </div>

      <div 
        v-for="item in filteredThoughts" 
        :key="item.id"
        @click="activeThoughtId = item.id"
        class="group cursor-pointer border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
         <div 
           class="px-6 py-4 flex items-start gap-4"
           :class="{ 'bg-black/5 dark:bg-white/10': activeThoughtId === item.id }"
         >
           <!-- Active Indicator -->
           <div 
             class="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 transition-all duration-300"
             :class="activeThoughtId === item.id ? 'nier-bg-inverted' : 'bg-transparent group-hover:bg-black/20 dark:group-hover:bg-white/20'"
           ></div>
           
           <div class="flex-1 min-w-0">
             <div class="flex items-center justify-between gap-2 mb-1">
               <h4 class="text-sm font-serif font-bold text-[#050505] dark:text-white truncate">
                 {{ item.title || 'Untitled Session' }}
               </h4>
             </div>
             <p class="text-[10px] text-[#777] uppercase tracking-widest font-mono shrink-0 mb-2">
                 {{ formatDate(item.date) }}
             </p>
             <!-- Sneak peak of content, strip raw html -->
             <p class="text-xs text-[#666] dark:text-[#aaa] leading-relaxed line-clamp-2">
                {{ stripHtml(item.contentHtml) || 'No content written yet...' }}
             </p>
           </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '~/entities/user/auth.store';
import { thoughts, activeThoughtId, isThoughtsSubmitting, addThought } from '@/widgets/diary/model/useThoughts';

const auth = useAuthStore();
const searchQuery = ref('');

const filteredThoughts = computed(() => {
    let list = thoughts.value || [];
    if (searchQuery.value.trim() !== '') {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(t => t.title.toLowerCase().includes(q) || t.contentHtml.toLowerCase().includes(q));
    }
    return list;
});

const createNew = async () => {
    if (!auth.user?.uid) return;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    await addThought(auth.user.uid, `Reflection: ${today}`);
};

function formatDate(ms: number) {
    const d = new Date(ms);
    return d.toLocaleString("en-US", { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function stripHtml(html: string) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}
</script>

<style scoped>
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
.scrollbar-hidden {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
