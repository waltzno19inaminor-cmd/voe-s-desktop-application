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

const chartData = computed(() => {
    let totalWin = 0;
    let winCount = 0;
    let totalLoss = 0;
    let lossCount = 0;

    const dataPoints: { date: any; rr: number }[] = [];
    dataPoints.push({ date: 'Start', rr: 0 });

    for (const entry of props.entries) {
        const result = entry.result ?? 0;

        if (result > 0) {
            totalWin += result;
            winCount++;
        } else if (result < 0) {
            totalLoss += Math.abs(result);
            lossCount++;
        }

        const avgWin  = winCount  > 0 ? totalWin  / winCount  : 0;
        const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;

       
        const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

        dataPoints.push({
            date: entry.dateExit || entry.date,
            rr: Number(rr.toFixed(2))
        });
    }

    return dataPoints;
});

const xFormatter = (tick: number | Date) => {
    const index = Math.round(Number(tick));
    const item = chartData.value[index];
    if (item && item.date) {
        if (item.date === 'Start') return 'Start';
        let d;
        const dateAny = item.date as any;
        if (typeof dateAny.toDate === 'function') {
            d = dateAny.toDate();
        } else {
             d = new Date(item.date);
        }
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
    return '';
};

const tooltipTitleFormatter = (dataItem: any) => {
    if (dataItem && dataItem.date) {
        if (dataItem.date === 'Start') return 'Start';
        let d;
        const dateAny = dataItem.date as any;
        if (typeof dateAny.toDate === 'function') {
            d = dateAny.toDate();
        } else {
             d = new Date(dataItem.date);
        }
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
};
</script>
