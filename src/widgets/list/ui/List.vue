<template>
        <main v-if="threads"  class="flex justify-center px-4">
            <section class="w-full max-w-7xl min-h-screen py-20 flex gap-12">

                <div class="flex-1 max-w-3xl flex flex-col">

                <div class="mb-8">
                    <NuxtLink 
                        to="/forum/main" 
                        class="inline-flex items-center gap-2 text-sm text-[#777] hover:text-black dark:hover:text-white transition group"
                    >
                        <span class="font-serif group-hover:-translate-x-1 transition-transform">←</span>
                        <span class="font-serif">Back</span>
                    </NuxtLink>
                </div>

                <div class="mb-10">
                    <input
                    v-model="search"
                    type="text"
                    placeholder="Search theories, experiments, connections…"
                    class="w-full bg-transparent text-lg font-serif
                            border-b border-black/20 dark:border-white/20
                            pb-3 focus:outline-none
                            placeholder:text-[#bbb] dark:text-white"
                    />
                </div>


                <div class="flex-1 overflow-y-auto hide-scrollbar pr-2">

                    <ul class="space-y-12">

            
                    <li>

                    <div class="flex items-center gap-2">
                        <button
                            class="text-xs text-[#777] w-4"
                            @click="toggle('project')"
                        >
                            {{ collapsed.project ? '+' : '–' }}
                        </button>

                        <h2 class="text-2xl font-serif dark:text-white">
                            {{ definedCategory(category).title}}
                        </h2>
                        </div>


                        <p class="mt-3 text-sm text-[#666] max-w-xl">
                            {{ definedCategory(category).description}}
                        </p>

                    
                        <ul  v-if="!collapsed.project" class="ml-6 mt-8 space-y-10 border-l border-black/10 dark:border-white/10 pl-6">

                
                        <li>
                            <div class="flex items-center gap-2 dark:text-white">
                                <button
                                    class="text-xs text-[#777] w-4"
                                    @click="toggle('theory')"
                                >
                                    {{ collapsed.theory ? '+' : '–' }}
                                </button>

                                <h3 class="text-xl font-serif">
                                    Theory
                                </h3>
                            </div>


                            <ul v-if="!collapsed.theory && filteredThreads.filter(x => x.subcategory === 'theory').length > 0" class="dark:text-white ml-6 mt-5 max-h-96 overflow-y-auto space-y-4 border-l border-black/10 dark:border-white/10 pl-6">

                            <ThreadInList class="cursor-pointer" @mouseenter="hoveredThread = thread" @mouseleave="hoveredThread = null" v-for="thread in  filteredThreads.filter(x => x.subcategory === 'theory')" :key="thread.id" :thread="thread" :display-name="getAuthorName(thread.authorId)"/>

                            </ul>
                            <p v-else class="text-center font-light text-sm text-[#666] mt-5 italic">No threads found</p>
                        </li>

                    
                        <li>
                        <div class="flex items-center gap-2 dark:text-white">
                            <button
                                class="text-xs text-[#777] w-4"
                                @click="toggle('practice')"
                            >
                                {{ collapsed.practice ? '+' : '–' }}
                            </button>

                            <h3 class="text-xl font-serif">
                                Practice
                            </h3>
                            </div>

                            <ul v-if="!collapsed.practice && filteredThreads.filter(x => x.subcategory === 'practice').length > 0" class="dark:text-white ml-6 mt-5 max-h-96 overflow-y-auto space-y-4 border-l border-black/10 dark:border-white/10 pl-6">
                                 <ClientOnly>
                                    <ThreadInList class="cursor-pointer" @mouseenter="hoveredThread = thread" @mouseleave="hoveredThread = null" v-for="thread in filteredThreads.filter(x => x.subcategory === 'practice')" :key="thread.id" :thread="thread" :display-name="getAuthorName(thread.authorId)"/>
                                 </ClientOnly>

                            </ul>
                            <p v-else class="text-center font-light text-sm text-[#666] mt-5 italic">No threads found</p>
                        </li>

                        </ul>

                    </li>

                    </ul>
                </div>
                </div>

                <aside class="hidden lg:block w-80 relative dark:text-white">

                <div
                    class="sticky top-24 px-6 py-8
                        border-l border-black/10 dark:border-white/10
                        min-h-[320px]"
                >   

                    <ThreadOverview v-if="hoveredThread" :thread="hoveredThread" />
                    <div v-else>
                        <span
                        class="text-[10px] uppercase tracking-[0.25em] font-mono
                                text-[#888] mb-4 block"
                        >
                        Section overview
                        </span>

                        <h3 class="text-xl font-serif mb-4 pb-3 border-b border-black/10 dark:border-white/10">
                        {{ definedCategory(category).title}}
                        </h3>

                        <p class="text-sm leading-relaxed text-[#555]">
                            {{ definedCategory(category).idea}}
                        </p>

                        <div
                        class="mt-8 pt-4 border-t border-black/10 dark:border-white/10
                                flex gap-6 text-[11px] tracking-wide text-[#666]"
                        >
                        <span>{{ threads.length }} threads</span>
                        <span>{{ threads.reduce((acc, thread) => acc + thread.repliesCount, 0) }} replies</span>
                        </div>
                    </div>



                </div>

                </aside>

            </section>
        </main>
</template>

<script setup>
import { collapsed, toggle, definedCategory } from "@/pages/forum/model/useCategory";
import { useForumRoute } from "~/composables/useForumRoute";
import ThreadInList from "~/entities/thread/ui/ThreadInList.vue";
import { search } from "~/widgets/list/model/useList";

import { computed, ref, onMounted } from "vue";
import ThreadOverview from "~/entities/thread/ui/ThreadOverview.vue";
import { useForumStore } from "~/features/store/useForum";
const forum = useForumStore()


const { category } = useForumRoute();

const props = defineProps({
    threads: {
        type: Array,
        required: true
    }
})


const threads = computed(() => props.threads.filter(t => t.category === category.value))

const hoveredThread = ref(null);


const filteredThreads = computed(() => {
    return threads.value.filter(thread => thread.title.toLowerCase().includes(search.value.toLowerCase()));
});


const fetchingUsers = new Set();
const getAuthorName = (authorId) => {
    if (!authorId) return 'anonymous';

    const user = forum.users.get(authorId);
    if (user) {
        return user.displayName || user.name || 'anonymous';
    }

    if (!fetchingUsers.has(authorId)) {
        fetchingUsers.add(authorId);
        forum.fetchUser(authorId).finally(() => {
            fetchingUsers.delete(authorId);
        });
    }

    return '...';
};

</script>
