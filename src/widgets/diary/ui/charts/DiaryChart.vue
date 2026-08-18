<template>
    <BaseAreaChart :data="chartData" :categories="chartCategories" :xFormatter="xFormatter" :tooltipTitleFormatter="tooltipTitleFormatter" v-bind="$attrs" />
</template>


<script setup lang="ts">
import BaseAreaChart from '~/shared/charts/ui/BaseAreaChart.vue';
import { computed, onMounted } from 'vue';
import { isDark } from '~/composables/changeTheme';

const props = defineProps({
    entries: {
        type: Array as () => any[],
        required: true
    }
})

onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark');
});

const chartCategories = computed(() => ({
    profit: {
        name: 'Net Profit',
        color: '#00db98'
    }
}));

import { useRoute } from 'vue-router';
import { useForumStore } from '~/features/store/useForum';
const route = useRoute();
const forum = useForumStore();

const chartData = computed(() => {
    const user = forum.users.get(route.query.uid as string);
    const initialDeposit = user?.initialDeposit ?? 1000;
    let currentProfit = 0;

    return props.entries.map(entry => {
        let profitVal = entry.profitInCurrency;
        // Backward compatibility fallback
        if (profitVal === undefined || profitVal === null || (profitVal === 0 && (entry.result || 0) !== 0)) {
            profitVal = ((entry.result || 0) / 100) * initialDeposit;
        }
        currentProfit = Number((currentProfit + profitVal).toFixed(2));
        
        return {
            date: entry.dateExit || entry.date,
            profit: currentProfit
        };
    });
});

import { normalizeDate } from '~/composables/normalizeDate';

const xFormatter = (tick: number | Date) => {
    const index = Math.round(Number(tick));
    const item = chartData.value[index];
    if (item && item.date) {
        const d = normalizeDate(item.date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
    return '';
};

const tooltipTitleFormatter = (dataItem: any) => {
    if (dataItem && dataItem.date) {
        const d = normalizeDate(dataItem.date);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
};
</script>