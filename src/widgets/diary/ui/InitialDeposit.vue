<template>
  <div v-if="auth.user?.uid === uid" class="flex items-center gap-2">
    <div class="flex items-center bg-white dark:bg-[#1a1a1a] rounded-lg border border-black/10 dark:border-white/10 py-1.5 px-3 shadow-sm h-10">
        <span class="text-xs text-[#666] dark:text-[#aaa] mr-2 whitespace-nowrap">Initial Deposit:</span>
        <span class="text-sm font-medium text-[#121212] dark:text-white">$</span>
        <input 
            v-model="deposit" 
            type="number" 
            class="bg-transparent border-none outline-none text-sm w-20 text-[#121212] dark:text-white font-medium px-1 no-spinners"
            placeholder="0.00"
        >
        <button 
           v-if="isChanged"
           @click="saveDeposit"
           :disabled="isSaving"
           class="ml-1 text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 hover:opacity-80 transition"
        >
           {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '~/shared/firebase.client';
import { useAuthStore } from '~/entities/user/auth.store';
import { useForumStore } from '~/features/store/useForum';
import { useRoute } from 'vue-router';

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
        const userRef = doc(db, 'users', uid.value);
        await updateDoc(userRef, {
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
