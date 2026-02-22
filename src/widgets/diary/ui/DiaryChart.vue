<template>
    <BaseAreaChart :data="data" :categories="categories" :xFormatter="xFormatter" v-bind="$attrs" />
</template>


<script setup>
import BaseAreaChart from '~/shared/charts/ui/BaseAreaChart.vue';

const props = defineProps({
    data: {
        type: Array,
        required: true
    },
    categories: {
        type: Object,
        required: true
    },
    xFormatter: {
        type: Function
    }
})
</script>