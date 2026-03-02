<template>
  <div class="max-w-7xl mx-auto w-full px-6 py-12 md:py-20">
    <div class="flex flex-col gap-16 relative">
      
      <div class="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div class="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-gray-500/5 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-gray-500/5 rounded-full blur-[100px]"></div>
      </div>

   
      <div class="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10 pb-8 border-b dark:border-white/5 border-black/25">
        <div class="max-w-xl">
          <h1 class="text-5xl md:text-7xl font-serif mb-4 bg-gradient-to-r dark:from-white from-gray-900 to-gray-500 dark:to-white/50 bg-clip-text text-transparent">
            Chronicles
          </h1>
          <p class="text-lg dark:text-white/40 text-gray-500 font-light leading-relaxed">
            Trace the lineage of market mastery. A curated timeline of the traders who shaped history.
          </p>
        </div>
        
        <div class="w-full md:w-auto flex flex-col gap-2">
            <div class="relative group">
                <input 
                    v-model="searchQuery" 
                    type="text" 
                    placeholder="Search legends..." 
                    class="w-full md:w-80 dark:bg-white/5 bg-white text-gray-900 dark:text-white border dark:border-white/10 border-gray-200 rounded-full px-5 py-3 pl-11 focus:outline-none focus:border-gray-400 focus:bg-white dark:focus:border-white/30 dark:focus:bg-white/10 transition-all text-sm placeholder:text-gray-400 dark:placeholder:text-white/20 shadow-sm"
                />
                <div class="absolute left-4 top-1/2 -translate-y-1/2 dark:text-white/30 text-black/30 transition-colors group-focus-within:text-white/80">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
            </div>
        </div>
      </div>

      
      <div class="relative z-10">
     
        <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b dark:from-white/20 dark:via-white/5 dark:to-transparent from-black/35 via-black/15 to-black/5 -translate-x-1/2 hidden md:block"></div>
        
     
        <div class="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b dark:from-white/20 dark:via-white/5 dark:to-transparent from-black/50 via-black/35 to-black/25 md:hidden"></div>

        <div class="space-y-24">
          <div v-for="(group, index) in groupedPeople" :key="group.era.id" class="relative">
            
        
            <div class="flex items-center mb-12 relative">
         
                <div class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-4 h-4 rounded-full border-2 dark:border-white/20 border-gray-200 bg-white dark:bg-[#121212] z-20 dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] shadow-sm">
                    <div class="w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-400"></div>
                </div>

               
                 <div class="md:hidden absolute left-6 -translate-x-1/2 items-center justify-center w-4 h-4 rounded-full border-2 dark:border-white/20 border-gray-200 bg-white dark:bg-[#121212] z-20 dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] shadow-sm">
                    <div class="w-1.5 h-1.5 rounded-full dark:bg-white bg-gray-400"></div>
                </div>

            
                <div class="hidden md:block absolute left-1/2 -translate-x-1/2 -top-10">
                    <span class="px-4 py-1 rounded-full dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 text-xs font-serif tracking-widest dark:text-white/80 text-gray-600 uppercase backdrop-blur-md shadow-sm">
                        {{ group.era.label }}
                    </span>
                </div>

            
                <div class="md:hidden ml-12">
                    <span class="px-4 py-1 rounded-full dark:bg-white/5 bg-white border dark:border-white/10 border-gray-200 text-xs font-serif tracking-widest dark:text-white/80 text-gray-600 uppercase backdrop-blur-md shadow-sm">
                        {{ group.era.label }}
                    </span>
                 </div>
            </div>

          
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-32 gap-y-12 w-full">
             
                <template v-for="(person, pIndex) in group.people" :key="person.id">
                    
                    <div
                        class="relative group cursor-pointer"
                        :class="[
                            pIndex % 2 === 0 ? 'md:bg-gradient-to-r' : 'md:bg-gradient-to-l md:text-left',
                            'md:col-span-1'
                        ]"
                    >
                        <div 
                            class="hidden md:block absolute top-20 h-px dark:bg-white/10 bg-gray-200 w-16"
                            :class="pIndex % 2 === 0 ? 'right-[-4rem] left-auto' : 'left-[-4rem] right-auto'"
                        ></div>
                        
                       
                         <div class="md:hidden absolute top-20 left-[-24px] w-6 h-px dark:bg-white/10 bg-gray-200"></div>


                        <div class="ml-12 md:ml-0 dark:bg-[#1a1a1a] bg-white border dark:border-white/5 border-gray-200/60 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-all duration-500 hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] shadow-sm h-full flex flex-col">
                           
                            <div class="h-48 relative overflow-hidden">
                                 <img 
                                    v-if="person.image" 
                                    :src="person.image" 
                                    :alt="person.name"
                                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                />
                                <div v-else class="w-full h-full flex items-center justify-center dark:bg-white/5 bg-gray-50 dark:text-white/10 text-gray-300">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <div class="absolute inset-0 bg-gradient-to-t dark:from-[#1a1a1a] from-white to-transparent"></div>
                                
                                <div class="absolute bottom-4 left-4">
                                     <h3 class="text-2xl font-serif dark:text-white text-gray-900 group-hover:text-black dark:group-hover:text-white transition-colors">{{ person.name }}</h3>
                                     <span class="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider uppercase">{{ person.eraLabel }}</span>
                                </div>
                            </div>
                            
                           
                            <div class="p-6 pt-2 flex flex-col flex-grow">
                                <p class="text-sm dark:text-white/50 text-gray-500 leading-relaxed mb-6 flex-grow">
                                    {{ person.description }}
                                </p>

                                <div class="flex flex-wrap gap-2 mt-auto">
                                    <span 
                                        v-for="tag in person.tags" 
                                        :key="tag"
                                        class="text-[10px] uppercase tracking-wider px-2 py-1 dark:bg-white/5 bg-gray-50 rounded dark:text-white/30 text-gray-500 border dark:border-white/5 border-gray-100"
                                    >
                                        {{ tag }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    
                </template>
            </div>
          </div>
          
           
            <div v-if="isLoading" class="py-20 text-center dark:text-white/40 text-black/40">
                <p class="font-light italic">Consulting the archives...</p>
            </div>
            <div v-else-if="groupedPeople.length === 0" class="py-20 text-center dark:text-white/40 text-black/40">
                <p class="font-light italic">The archives are silent for this query...</p>
            </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { searchQuery } from '@/widgets/chronicles/model/useChronicles';
import { eras } from '@/entities/portrait/model/portrait.mock';
import { useLegends } from '@/entities/portrait/api/useLegends';

const { legends, isLoading, fetchLegends } = useLegends();

onMounted(async () => {
  await fetchLegends();
});

const groupedPeople = computed(() => {

  const filtered = legends.value.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          person.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          person.tags.some(t => t.toLowerCase().includes(searchQuery.value.toLowerCase()));
    return matchesSearch;
  });
  
  return eras.map(era => {
    return {
      era,
      people: filtered.filter(p => p.era === era.id)
    };
  }).filter(group => group.people.length > 0);
});

</script>

