<template>
    <div class="min-h-screen flex flex-col">
         <Header/>
        <main class="grow max-w-7xl mx-auto px-6 py-12 w-full mt-20">
            <div v-if="isLoading" class="text-center py-20 dark:text-white/40 text-black/40 font-light italic">
                Loading legend details...
            </div>
            <div v-else-if="!legend" class="text-center py-20 dark:text-white/40 text-black/40 font-light italic">
                Legend not found in the archives.
            </div>
            <div v-else>
                 <h1 class="text-4xl md:text-5xl font-serif dark:text-white text-gray-900 mb-2">{{ legend.name }}</h1>
                 <span class="text-sm text-gray-500 dark:text-gray-400 font-mono tracking-wider uppercase inline-block mb-8">{{ legend.eraLabel }}</span>
                 
                 <div v-if="legend.image" class="w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
                     <img :src="legend.image" :alt="legend.name" class="w-full h-full object-cover">
                 </div>
                 
                 <p class="text-lg dark:text-white/70 text-gray-700 leading-relaxed max-w-3xl">
                     {{ legend.description }}
                 </p>
                 
                 <div class="flex flex-wrap gap-2 mt-8">
                    <span 
                        v-for="tag in legend.tags" 
                        :key="tag"
                        class="text-xs uppercase tracking-wider px-3 py-1.5 dark:bg-white/5 bg-gray-50 rounded dark:text-white/40 text-gray-500 border dark:border-white/5 border-gray-100"
                    >
                        {{ tag }}
                    </span>
                 </div>
            </div>
        </main>
        <Footer/>
    </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Header from "~/widgets/header/ui/Header.vue";
import Footer from "~/widgets/footer/Footer.vue";
import { useRoute } from 'vue-router';
import { useLegends } from '~/entities/portrait/api/useLegends';
import type { Person } from '~/entities/portrait/model/portrait.types';

const route = useRoute();
const portraitId = route.params.id as string;
const { getLegendById, isLoading } = useLegends();

const legend = ref<Person | null>(null);

onMounted(async () => {
    if (portraitId) {
        legend.value = await getLegendById(portraitId);
    }
});
</script>