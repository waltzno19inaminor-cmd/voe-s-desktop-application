<template>
    <div class="overflow-x-auto pb-4 relative">
        
        <div 
            v-if="tooltip.visible"
            class="fixed z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2"
            :style="{ top: `${tooltip.y}px`, left: `${tooltip.x}px` }"
        >
            <div class="bg-black text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                <span class="font-medium block mb-0.5">{{ tooltip.content.formattedDate }} &bull; {{ tooltip.content.asset }}</span>
                <span :class="tooltip.content.resultVal > 0 ? 'text-emerald-400' : (tooltip.content.resultVal < 0 ? 'text-rose-400' : 'text-gray-400')">
                    {{ tooltip.content.resultLabel }}
                </span>
            </div>
        </div>

        <div v-if="heatmapItems.length > 0" class="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto content-start">
            <div 
                v-for="(item, index) in heatmapItems" 
                :key="index"
                class="w-3 h-3 rounded-[2px] transition-all relative cursor-pointer hover:opacity-80"
                :class="item.colorClass"
                @mouseenter="showTooltip($event, item)"
                @mousemove="moveTooltip($event)"
                @mouseleave="hideTooltip"
                @click="emit('select', item.entry)"
            >
            </div>
        </div>
        <div v-else class="text-center py-12 text-[#666] dark:text-[#aaa]">
            No entries yet
        </div>
       
        <div class="mt-4 flex items-center justify-end gap-2 text-xs text-[#666] dark:text-[#aaa]">
            <span>Loss</span>
            <div class="w-3 h-3 rounded-[2px] bg-rose-500"></div>
             <div class="w-3 h-3 rounded-[2px] bg-rose-900/40"></div>
            <div class="w-3 h-3 rounded-[2px] bg-gray-300 dark:bg-gray-700"></div>
            <div class="w-3 h-3 rounded-[2px] bg-emerald-900/40"></div>
             <div class="w-3 h-3 rounded-[2px] bg-emerald-500"></div>
            <span>Win</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';
import { normalizeDate } from '@/composables/normalizeDate';

const emit = defineEmits(['select'])

const props = defineProps({
    entriesList: Array<DiaryEntry>
})

const tooltip = ref({
    visible: false,
    x: 0,
    y: 0,
    content: null as any
});

const showTooltip = (event: MouseEvent, item: any) => {
    tooltip.value.content = item;
    tooltip.value.visible = true;
    updateTooltipPosition(event);
};

const moveTooltip = (event: MouseEvent) => {
    updateTooltipPosition(event);
};

const updateTooltipPosition = (event: MouseEvent) => {
    tooltip.value.x = event.clientX;
    tooltip.value.y = event.clientY;
};

const hideTooltip = () => {
    tooltip.value.visible = false;
};

const heatmapItems = computed(() => {
    if (!props.entriesList) return [];

    return props.entriesList.map((entry: DiaryEntry) => {
        const entryDate = normalizeDate(entry.date)
        const formattedDate = entryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      
        let resultVal = entry.result || 0;
       
        let colorClass = 'bg-gray-300 dark:bg-gray-700'; 
        
        if (resultVal > 0) {
            if (resultVal < 0.5) colorClass = 'bg-emerald-200 dark:bg-emerald-900/60';
            else if (resultVal < 1.5) colorClass = 'bg-emerald-300 dark:bg-emerald-800';
            else if (resultVal < 3) colorClass = 'bg-emerald-400 dark:bg-emerald-600';
            else colorClass = 'bg-emerald-500 dark:bg-emerald-500';
        } else if (resultVal < 0) {
             if (resultVal > -0.5) colorClass = 'bg-rose-200 dark:bg-rose-900/60';
             else if (resultVal > -1.5) colorClass = 'bg-rose-300 dark:bg-rose-800';
             else if (resultVal > -3) colorClass = 'bg-rose-400 dark:bg-rose-600';
             else colorClass = 'bg-rose-500 dark:bg-rose-500';
        }

        const resultLabel = resultVal > 0 ? `+${resultVal.toFixed(2)}%` : `${resultVal.toFixed(2)}%`;

        return {
            formattedDate,
            asset: entry.asset,
            resultVal,
            resultLabel,
            colorClass,
            entry // Include original entry for selection
        };
    });
});

</script>