<template>
    <BaseAreaChart :data="depositChartData" :categories="chartCategories" :xFormatter="xFormatterDeposit" :tooltipTitleFormatter="tooltipTitleFormatterDeposit" v-bind="$attrs" />
</template>

<script setup lang="ts">
import BaseAreaChart from '~/shared/charts/ui/BaseAreaChart.vue';
import { computed, onMounted } from 'vue';
import { isDark } from '~/composables/changeTheme';
import { useRoute } from 'vue-router';
import { useForumStore } from '~/features/store/useForum';

const route = useRoute();
const forum = useForumStore();

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
    deposit: {
        name: 'Equity',
        color: '#00db98'
    }
}));

const depositChartData = computed(() => {
    const user = forum.users.get(route.query.uid as string);
    const initialDeposit = user?.initialDeposit ?? 0;
    
    const data: any[] = [{
        date: props.entries.length > 0 && props.entries[0].date 
            ? new Date(new Date(props.entries[0].date).getTime() - 24 * 60 * 60 * 1000) 
            : new Date(), 
        deposit: initialDeposit
    }];

    let currentDeposit = initialDeposit;
    
    props.entries.forEach(entry => {
        const multiplier = 1 + ((entry.result || 0) / 100);
        currentDeposit = currentDeposit * multiplier;
        
        data.push({
            date: entry.dateExit || entry.date,
            deposit: Number(currentDeposit.toFixed(2))
        });
    });
    
    return data;
});

const xFormatterDeposit = (tick: number | Date) => {
    const index = Math.round(Number(tick));
    const item = depositChartData.value[index];
    if (item && item.date) {
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

const tooltipTitleFormatterDeposit = (dataItem: any) => {
    if (dataItem && dataItem.date) {
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
