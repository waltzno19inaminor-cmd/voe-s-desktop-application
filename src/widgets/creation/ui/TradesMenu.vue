<template>
  
    <div v-if="entriesList" class="flex flex-col space-y-4">
        <h3 class="block text-xs uppercase tracking-widest text-[#777] mb-4">Include trades</h3>
        <input type="text" v-model="search" placeholder="Search..." class="w-full text-black focus:outline-none dark:text-white border bg-transparent font-serif px-6 border-black/5 dark:border-white/5 rounded-lg py-2 mb-4">
        <div v-if="filteredItems.length > 0" class="max-h-60 overflow-y-auto">
            <div v-for="item in filteredItems" class="justify-between px-4 border-t flex items-center text-xs border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition text-[#121212] dark:text-white ">
                <div class=" py-4 text-[#666] dark:text-[#aaa]">
                        {{ item.date?.toDate
                            ? item.date.toDate().toLocaleString("ru-RU")
                            : item.date?.toLocaleString("ru-RU")
                        }}
                </div>

                <div class="px-6 py-4 font-serif whitespace-nowrap">
                    {{item.asset}}
                </div>

                <div class="px-6 py-4 uppercase tracking-widest text-xs">
                    <span :class="item.side === 'Long' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{item.side}}
                    </span>
                </div>

                <div class="px-6 py-4 text-[#666] dark:text-[#aaa] whitespace-nowrap">
                    {{item.entry}} → {{item.exit}}
                </div>

                <input  class="w-4 h-4 accent-emerald-600 dark:accent-emerald-400"  type="checkbox" v-model="selectedTrades" :value="item"/>
                        
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '~/entities/user/auth.store';
import { useForumStore } from '~/features/store/useForum';
import { selectedTrades } from '../model/useCreation';

const auth = useAuthStore();
const forum = useForumStore();
watch(
  () => auth.user?.uid,
  async (uid) => {
    if (uid) {
      await forum.fetchUser(uid);
    }
  },
  { immediate: true }
);



const entriesList = computed(() => {
    const uid = auth.user?.uid;

    if (typeof uid !== 'string') return [];


    return forum.users.get(uid)?.diary || [];
});

const isOpen = ref(false);
const search = ref("");



const filteredItems = computed(() => {
    return entriesList.value.filter(item => item.date?.toDate().toLocaleString("ru-RU").toLowerCase().includes(search.value.toLowerCase()));
});


function selectItem(item){
    selectedTrades.value.push(item);
    isOpen.value = false;
    search.value = "";
}

</script>