<template>
  <div v-if="isAddModalOpen" class="fixed inset-0 pt-24 px-10 pb-10 flex justify-center z-50">
 
    <div 
      class="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
      @click="isAddModalOpen = false"
    ></div>

  
    <form 
      @submit.prevent="saveEntry"
      class="relative overflow-y-auto bg-white dark:bg-[#181818] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-black/5 dark:border-white/10"
    >
    
      <div class="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-[#fafafa] dark:bg-[#1f1f1f]">
        <h2 class="text-xl font-serif text-[#121212] dark:text-white">New Trade Entry</h2>
        <button 
          @click="isAddModalOpen = false"
          class="text-[#666] dark:text-[#aaa] hover:text-[#121212] dark:hover:text-white transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

     
      <div class="p-6 space-y-6">
        
     
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">
              Date & Time
            </label>

            <input 
              type="datetime-local"
              v-model="dateInput"
              required="true"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white"
            />
          </div>

          <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Asset</label>
            <input 
              type="text" 
              v-model="newEntry.asset"
              required="true"
              placeholder="e.g. EUR/USD"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20"
            />
          </div>
        </div>

      
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Side</label>
            <select 
              v-model="newEntry.side"
              required="true"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white appearance-none"
            >
              <option value="Long" class="dark:bg-[#181818]">Long</option>
              <option value="Short" class="dark:bg-[#181818]">Short</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Size</label>
            <input 
              type="number" 
              required="true"
              v-model="newEntry.size"
              step="0.01"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white"
            />
          </div>
        </div>

       
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Entry Price</label>
            <input 
              type="number" 
              required="true"
              v-model="newEntry.entry"
              step="0.0001"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Exit Price</label>
            <input 
              type="number" 
              required="true"
              v-model="newEntry.exit"
               step="0.0001"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white"
            />
          </div>
        </div>

       
         <div class="space-y-1">
            <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Result</label>
            <input 
              required="true"
              type="number" 
              v-model="newEntry.result"
              step="0.01"
              class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20"
            />
          </div>

      
        <div class="space-y-1">
          <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Notes</label>
          <textarea 
            required="true"
            v-model="newEntry.notes"
            rows="3"
            class="w-full px-3 py-2 bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white resize-none"
          ></textarea>
        </div>

       
        <div class="space-y-4 border-t border-black/5 dark:border-white/5 pt-6">
            <h3 class="text-sm uppercase tracking-widest text-[#666] dark:text-[#aaa]">Images</h3>

         
            <div v-if="newEntry.images && newEntry.images.length > 0" class="space-y-3">
                <div v-for="(img, index) in newEntry.images" :key="index" class="flex items-start gap-4 p-3 border border-black/5 dark:border-white/5 rounded-lg bg-[#fafafa] dark:bg-[#1f1f1f]">
                    <div class="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                        <img :src="img.url" class="w-full h-full object-cover" alt="Entry image" @error="($event.target as HTMLImageElement).style.display='none'" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs text-[#666] dark:text-[#aaa] truncate mb-1">{{ img.url }}</p>
                        <p class="text-sm text-[#121212] dark:text-white line-clamp-2">{{ img.context }}</p>
                    </div>
                    <button @click="removeImage(index)" class="text-rose-500 hover:text-rose-700 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 bg-[#fafafa] dark:bg-[#1f1f1f] p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div class="space-y-1">
                     <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Image URL</label>
                    <input 
                        type="text" 
                        v-model="tempImageUrl"
                        placeholder="https://..."
                        class="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20"
                    />
                </div>
                 <div class="space-y-1">
                     <label class="block text-xs uppercase tracking-widest text-[#666] dark:text-[#aaa]">Context / Description</label>
                    <input 
                        type="text" 
                        v-model="tempImageContext"
                        placeholder="Describe what this image shows..."
                        class="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition text-sm text-[#121212] dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20"
                        @keyup.enter="addImage"
                    />
                </div>
                <button 
                    @click="addImage"
                    :disabled="!tempImageUrl"
                    class="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add Image to Entry
                </button>
            </div>
        </div>

      </div>

     
      <div class="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-[#fafafa] dark:bg-[#1f1f1f] flex justify-end gap-3">
        <button 
          @click="isAddModalOpen = false"
          class="px-4 py-2 text-sm text-[#666] dark:text-[#aaa] hover:text-[#121212] dark:hover:text-white transition"
        >
          Cancel
        </button>
        <button 
          :disabled="forum.loading"
          type="submit"
          class="px-6 py-2 text-sm text-white bg-black dark:bg-white dark:text-black rounded-lg hover:opacity-80 transition shadow-lg"
        >
          Save Entry
        </button>
      </div>

    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { entries, isAddModalOpen, newEntry, resetEntry, addDiaryEntry } from '../model/useDiary';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';
import { useForumStore } from "~/features/store/useForum";
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/entities/user/auth.store';

const forum = useForumStore();

const tempImageUrl = ref('');
const tempImageContext = ref('');

const route = useRoute();

const auth = useAuthStore();

const addImage = () => {
  if(newEntry.value.images === undefined) {
    newEntry.value.images = []
  }
    if (tempImageUrl.value) {
        newEntry.value.images.push({
            url: tempImageUrl.value,
            context: tempImageContext.value
        });
        tempImageUrl.value = '';
        tempImageContext.value = '';
    }
};

const removeImage = (index: number) => {
  if(newEntry.value.images === undefined) {
    newEntry.value.images = []
  }
    newEntry.value.images.splice(index, 1);
};


const dateInput = computed({
  get: () => {
    const date = newEntry.value.date instanceof Date
      ? newEntry.value.date
      : new Date()

   
    const pad = (n: number) => n.toString().padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  },

  set: (val: string) => {
    newEntry.value.date = val ? new Date(val) : new Date()
  }
})


function addEntry() {
    isAddModalOpen.value = false;
    resetEntry();
}

const saveEntry = async () => {
    if(auth.user?.uid !== route.query.uid as string) {
        return;
    }
    await addDiaryEntry(newEntry.value, auth.user.uid, route.query.uid as string);
    forum.addDiaryEntry(route.query.uid as string, newEntry.value);
    addEntry();

}


</script>
