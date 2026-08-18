<template>
  <div v-if="auth.user?.uid === uid" class="flex items-center gap-2">
    <div class="flex items-center nier-bg-panel rounded-xl border nier-border-primary shadow-sm h-10 overflow-hidden pr-2">
        <div class="ml-4 mr-2 flex items-center justify-center p-1.5 rounded-lg bg-black/5 dark:bg-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-[#777] dark:text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div v-if="!isLocked" class="flex items-center">
            <button 
                @click="deposit = Math.max(0, (deposit || 0) - 100)" 
                class="w-8 h-8 flex items-center justify-center text-[#666] dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95 select-none font-bold"
            >−</button>
            <div class="flex items-center">
                <span class="text-xs font-bold text-[#050505] dark:text-white ml-1">$</span>
                <input 
                    v-model="deposit" 
                    type="number" 
                    class="bg-transparent border-none outline-none text-sm w-20 text-[#050505] dark:text-white font-bold px-1 hide-spinners text-center"
                    placeholder="0.00"
                >
            </div>
            <button 
                @click="deposit = (deposit || 0) + 100" 
                class="w-8 h-8 flex items-center justify-center text-[#666] dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/5 transition active:scale-95 select-none font-bold"
            >+</button>
        </div>
        <span v-else class="text-sm min-w-20 text-[#050505] dark:text-white font-bold px-1 flex items-center gap-1">
          {{ typeof lockedDeposit === 'number' ? lockedDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : lockedDeposit }}
          <svg class="w-3 h-3 text-[#777] dark:text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </span>
        <button 
           v-if="isChanged && !isLocked"
           @click="saveDeposit"
           :disabled="isSaving"
           class="ml-2 p-2 rounded-lg nier-bg-inverted nier-text-primary hover:opacity-80 transition shadow-sm flex items-center justify-center"
        >
           <svg v-if="!isSaving" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
           </svg>
           <span v-else class="text-[8px] animate-pulse">...</span>
        </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { doc, updateDoc } from 'firebase/firestore';

const props = defineProps<{
    isLocked?: boolean;
    lockedDeposit?: number | null;
}>();
import { db } from '~/shared/firebase.client';
import { useAuthStore } from '~/entities/user/auth.store';
import { useForumStore } from '~/features/store/useForum';
import { useRoute } from 'vue-router';
import { saveToDisk } from '@/shared/diskStorage';

const auth = useAuthStore();
const forum = useForumStore();
const route = useRoute();

const uid = computed(() => route.query.uid as string);
const user = computed(() => forum.users.get(uid.value));

const deposit = ref<number | null>(null);
const initialValue = ref<number | null>(null);
const isSaving = ref(false);

watch(() => user.value, (u) => {
    if (u && u.initialDeposit !== undefined) {
        deposit.value = u.initialDeposit;
        initialValue.value = u.initialDeposit;
    }
}, { immediate: true });

const isChanged = computed(() => deposit.value !== initialValue.value && deposit.value !== null);

const saveDeposit = async () => {
    if (!auth.user || auth.user.uid !== uid.value) return;
    if (deposit.value === null) return;
    
    isSaving.value = true;
    try {
        // Save to disk locally
        await saveToDisk(`user_meta_${uid.value}`, { 
            initialDeposit: deposit.value 
        });
        
        if (user.value) {
            forum.users.set(uid.value, {
                ...user.value,
                initialDeposit: deposit.value
            });
            initialValue.value = deposit.value;
        }
    } catch (e) {
        console.error('Error saving deposit:', e);
    } finally {
        isSaving.value = false;
    }
};
</script>

<style scoped>
.no-spinners::-webkit-outer-spin-button,
.no-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
