<template>
    <AreaChart :data="data" :categories="categories" :xFormatter="xFormatter" v-bind="$attrs" />
</template>

<script setup>
import { AreaChart } from 'vue-chrts';

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