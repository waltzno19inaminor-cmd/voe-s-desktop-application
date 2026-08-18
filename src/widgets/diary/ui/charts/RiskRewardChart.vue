<template>
    <BaseAreaChart :data="chartData" :categories="chartCategories" :xFormatter="xFormatter" :tooltipTitleFormatter="tooltipTitleFormatter" v-bind="$attrs" />
</template>

<script setup lang="ts">
import BaseAreaChart from '~/shared/charts/ui/BaseAreaChart.vue';
import { computed, onMounted } from 'vue';
import type { DiaryEntry } from '@/entities/diary/model/diary.types';

const props = defineProps({
    entries: {
        type: Array as () => DiaryEntry[],
        required: true
    }
});

const chartCategories = computed(() => ({
    rr: {
        name: 'RR (Reward/Risk)',
        color: '#6366f1'
    }
}));

function calcRR(entry: DiaryEntry): number | null {
    if (!entry.entry || !entry.stopLoss || !entry.exit) return null

    if (entry.side === 'Short') {
        const risk   = entry.stopLoss - entry.entry  // SL above entry
        const reward = entry.entry    - entry.exit   // exit below entry
        if (risk <= 0) return null
        return reward / risk  // can be negative if trade lost
    }

    // Long
    const risk   = entry.entry - entry.stopLoss  // SL below entry
    const reward = entry.exit  - entry.entry     // exit above entry
    if (risk <= 0) return null
    return reward / risk  // can be negative if trade lost
}

const chartData = computed(() => {
    let totalRR  = 0;
    let rrCount  = 0;

    const dataPoints: { date: any; rr: number }[] = [];
    dataPoints.push({ date: 'Start', rr: 0 });

    for (const entry of props.entries) {
        const rr = calcRR(entry);

        if (rr !== null) {
            totalRR += rr;
            rrCount++;
        }

        const avgRR = rrCount > 0 ? totalRR / rrCount : 0;

        dataPoints.push({
            date: entry.dateExit || entry.date,
            rr: Number(avgRR.toFixed(2))
        });
    }

    return dataPoints;
});


import { normalizeDate } from '~/composables/normalizeDate';

const xFormatter = (tick: number | Date) => {
    const index = Math.round(Number(tick));
    const item = chartData.value[index];
    if (item && item.date) {
        if (item.date === 'Start') return 'Start';
        const d = normalizeDate(item.date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
    return '';
};

const tooltipTitleFormatter = (dataItem: any) => {
    if (dataItem && dataItem.date) {
        if (dataItem.date === 'Start') return 'Start';
        const d = normalizeDate(dataItem.date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
};
</script>
