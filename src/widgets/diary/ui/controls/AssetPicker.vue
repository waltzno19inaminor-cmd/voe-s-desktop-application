<template>
  <div class="relative w-full" ref="containerRef">
    <!-- Input Trigger: Financial Identity Style -->
    <div 
        class="flex items-center h-[54px] gap-4 px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl focus-within:border-white/20 transition-all duration-700 group shadow-sm overflow-hidden"
    >
        <!-- Dynamic Icon / Fallback -->
        <div class="w-7 h-7 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-full border border-white/5 bg-white/5 shadow-inner transition-transform duration-700 group-focus-within:scale-110">
            <img 
                v-if="selectedAsset?.icon && !iconError" 
                :src="selectedAsset.icon" 
                @error="iconError = true"
                class="w-full h-full object-contain p-0.5"
            />
            <div 
                v-else 
                class="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/20 tracking-tighter"
            >
                {{ (selectedAsset?.symbol || searchQuery || 'A').charAt(0).toUpperCase() }}
            </div>
        </div>

        <input 
          type="text" 
          v-model="searchQuery"
          @focus="onFocus"
          @blur="onBlur"
          @input="onInput"
          placeholder="Instrument Identification..."
          class="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-bold text-white placeholder:text-white/10 tracking-wide transition-all duration-700"
          ref="inputRef"
        />

        <!-- Scanner Animation -->
        <div v-if="loading" class="relative w-4 h-4 flex items-center justify-center">
            <div class="absolute inset-0 border-2 border-white/5 rounded-full"></div>
            <div class="absolute inset-0 border-2 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/10 transition-all duration-700 group-hover:text-white/30" :class="isOpen ? 'rotate-180 text-white/50' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
    </div>

    <!-- The Archive Panel: Results Overlay -->
    <transition 
        enter-active-class="transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        enter-from-class="opacity-0 translate-y-4 scale-[0.98]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
    >
        <div v-if="isOpen" class="fixed sm:absolute top-full left-0 right-0 mt-4 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_64px_128px_-12px_rgba(0,0,0,0.9)] z-[1200] overflow-hidden max-h-[400px] flex flex-col p-2">
            
            <div v-if="results.length === 0 && !loading" class="p-12 text-center">
                <span class="text-[9px] text-white/10 uppercase tracking-[0.5em] font-bold block mb-2">No Market Records</span>
                <p class="text-xs text-white/5 italic font-serif">Instrument not found in current portfolio vault.</p>
            </div>

            <div v-else class="overflow-y-auto flex-1 custom-scrollbar px-2 pb-2">
                <div v-for="type in resultTypes" :key="type" class="mt-4 first:mt-2 mb-6 last:mb-2">
                    <div class="px-4 py-1.5 mb-2 border-l border-emerald-500/20">
                        <span class="text-[8px] uppercase tracking-[0.4em] font-bold text-white/20">{{ type }}</span>
                    </div>
                    <div class="space-y-1">
                        <div 
                            v-for="asset in typedResults[type]" 
                            :key="asset.symbol + asset.type"
                            @mousedown="selectAsset(asset)"
                            class="group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] rounded-2xl cursor-pointer transition-all duration-300 active:scale-[0.99] border border-transparent hover:border-white/5"
                        >
                            <div class="w-9 h-9 rounded-full bg-white/5 p-1.5 flex items-center justify-center flex-shrink-0 border border-white/5 overflow-hidden transition-transform duration-500 group-hover:scale-110">
                                <img v-if="asset.icon && !failedIcons.has(asset.symbol + asset.type)" :src="asset.icon" class="w-full h-full object-contain" @error="failedIcons.add(asset.symbol + asset.type)" />
                                <span v-else class="text-[10px] font-bold text-white/20">{{ asset.symbol.charAt(0).toUpperCase() }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-0.5">
                                    <p class="text-[15px] font-bold text-white tracking-tight truncate">{{ asset.symbol }}</p>
                                    <span v-if="asset.exchange || asset.country" class="px-1.5 py-0.5 rounded-md bg-white/[0.03] text-white/20 text-[7px] font-bold uppercase tracking-widest border border-white/5">
                                        {{ asset.exchange }}{{ asset.country ? ', ' + asset.country : '' }}
                                    </span>
                                </div>
                                <p class="text-[9px] text-white/30 truncate uppercase tracking-[0.2em] font-medium leading-none">{{ asset.name }}</p>
                            </div>
                            <div class="opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
                                <div class="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Manual Entry Option -->
                <div 
                    v-if="searchQuery && !results.some(r => r.symbol.toUpperCase() === searchQuery.trim().toUpperCase())"
                    @mousedown="selectCustomAsset"
                    class="mt-4 p-4 border-t border-white/5"
                >
                    <div class="flex items-center gap-4 px-4 py-3 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.05] border border-emerald-500/5 rounded-2xl cursor-pointer transition-all duration-700 text-emerald-400 group">
                        <div class="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-[8px] uppercase tracking-widest font-bold opacity-40 mb-0.5">Archive as unidentified asset</p>
                            <p class="text-sm font-bold tracking-tight">Vault Entry: "{{ searchQuery }}"</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { initAssetService, searchAssets, type AssetInfo, type AssetType } from '@/shared/api/asset.service';

const props = defineProps<{
    modelValue?: string;
    initialType?: AssetType;
}>();

const emit = defineEmits(['update:modelValue', 'update:assetType', 'select']);

const containerRef = ref<HTMLElement | null>(null);
const searchQuery = ref(props.modelValue || '');
const isOpen = ref(false);
const loading = ref(false);
const results = ref<AssetInfo[]>([]);
const selectedAsset = ref<AssetInfo | null>(null);
const iconError = ref(false);
const failedIcons = ref<Set<string>>(new Set());

// Initialize search on mount
onMounted(async () => {
    await initAssetService();
    // Pre-load popular
    results.value = await searchAssets('');
    
    // Attempt to match initial modelValue to an asset
    if (props.modelValue) {
        const matches = await searchAssets(props.modelValue);
        const match = matches.find(a => String(a.symbol).toUpperCase() === String(props.modelValue).toUpperCase());
        if (match) selectedAsset.value = match;
    }
});

const onFocus = () => {
    isOpen.value = true;
};

const onBlur = () => {
    setTimeout(() => {
        isOpen.value = false;
    }, 200);
};

let debounceTimer: any = null;
const onInput = () => {
    loading.value = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        results.value = await searchAssets(searchQuery.value);
        loading.value = false;
    }, 300);
};

const selectAsset = (asset: AssetInfo) => {
    selectedAsset.value = asset;
    searchQuery.value = asset.symbol;
    iconError.value = false;
    emit('update:modelValue', asset.symbol);
    emit('update:assetType', asset.type);
    emit('select', asset);
    isOpen.value = false;
};

const selectCustomAsset = () => {
    const customAsset: AssetInfo = {
        symbol: searchQuery.value.trim().toUpperCase(),
        name: 'Manual Archive Entry',
        type: props.initialType || 'Stocks'
    };
    selectAsset(customAsset);
};

const resultTypes = computed(() => {
    const types = new Set(results.value.map(r => r.type));
    return Array.from(types).sort();
});

const typedResults = computed(() => {
    const groups: Record<string, AssetInfo[]> = {};
    results.value.forEach(r => {
        const typeStr = String(r.type);
        if (!groups[typeStr]) groups[typeStr] = [];
        groups[typeStr].push(r);
    });
    return groups;
});

watch(() => props.modelValue, (val) => {
    if (val !== searchQuery.value) {
        searchQuery.value = val || '';
    }
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
