<template>
   
    <main class="flex justify-center px-4">
        <section class="w-full max-w-3xl py-24">

        
            <header v-if="status === 'idle' ||  status === 'loading'" class="mb-16">
            <h1 v-if="!route.query.thread" class="text-3xl font-serif mb-4 text-[#121212] dark:text-white">
                Create new thread
            </h1>
            <h1 v-else class="text-3xl font-serif mb-4 text-[#121212] dark:text-white">
                Edit thread
            </h1>
            <p class="text-sm text-[#777] leading-relaxed">
                A thread represents a coherent idea, hypothesis, or documented practice.
                Write clearly. Avoid repetition. Focus on substance.
            </p>
            </header>


            <form v-if="status === 'idle' ||  status === 'loading'" @submit.prevent="publish" class="space-y-16">


                <div
                    v-if="showConfirmCreation || showConfirmDeletion"
                    class="fixed inset-0 z-50 flex items-center justify-center"
                    >
                    <div

                        class="absolute inset-0 bg-black/40"
 
                    ></div>

                    <div
                        class="relative w-full max-w-md bg-white dark:bg-[#121212] rounded-xl shadow-xl px-8 py-6"
                    >
                        <h2 v-if="showConfirmCreation" class="text-lg font-serif text-[#121212] dark:text-white mb-4">
                        Publish thread?
                        </h2>

                        <h2 v-if="showConfirmDeletion" class="text-lg font-serif text-[#121212] dark:text-white mb-4">
                        Delete thread?
                        </h2>

                        <p v-if="showConfirmCreation" class="text-sm text-[#555] dark:text-[#aaa] mb-6 leading-relaxed">
                        After publishing, this thread will become visible to other users.
                        Make sure the structure and thesis blocks are complete.
                        </p>

                        <p v-if="showConfirmDeletion" class="text-sm text-[#555] dark:text-[#aaa] mb-6 leading-relaxed">
                        After deleting, this thread will become invisible to other users.
                        Make sure the structure and thesis blocks are complete.
                        </p>

                        <div class="flex justify-end gap-4">
                        <button
                            class="text-sm uppercase tracking-widest px-4 py-2 text-[#777]"
                            @click.prevent="showConfirmCreation = false, showConfirmDeletion = false"
                        >
                            Cancel
                        </button>

                        <button
                            v-if="showConfirmCreation"
                            :disabled="isSubmitting"
                            type="submit"
                            class="text-sm uppercase tracking-widest px-6 py-2 rounded-full border dark:text-white border-black dark:border-white"
                            @click="isConfirmedCreation = true"
                        >
                            Confirm
                        </button>

                        <button
                            v-if="showConfirmDeletion"
                            :disabled="isSubmitting"
                            type="submit"
                            class="text-sm uppercase tracking-widest px-6 py-2 rounded-full border dark:text-white border-black dark:border-white"
                            @click="isConfirmedDeletion = true"
                        >
                            Confirm
                        </button>
                        </div>
                    </div>
                </div>



            <div>
            <label class="block text-xs uppercase tracking-widest text-[#777] mb-6">
                Choose category
            </label>

            <ul class="space-y-3">

            
                <li
                @click="chooseCategory('project')"
                class="px-4 py-3 border border-black/10 dark:border-white/10
                        text-[#777] 
                        font-serif cursor-pointer hover:border-black/30 dark:hover:border-white/30
                        hover:text-black dark:hover:text-white
                        transition"
                :class="{ 'border-black/100 text-black dark:text-white dark:border-white/100' : category === 'project' }"
                >
               
                <p class="text-sm">
                    Project · Key to Market
                </p>
                <p class="text-[11px] text-[#777] mt-1">
                    Structured research threads contributing to a unified trading framework
                </p>
                </li>

           
                <li
                @click="chooseCategory('general')"
                class="px-4 py-3 border border-black/10 dark:border-white/10
                        text-[#777] cursor-pointer
                        hover:border-black/30 dark:hover:border-white/30
                        hover:text-black dark:hover:text-white
                        transition"
                         :class="{ 'border-black/100 text-black dark:text-white dark:border-white/100' : category === 'general' }"
                >
                <p class="text-sm font-serif">
                    General Discussion
                </p>
                <p class="text-[11px] mt-1">
                    Open-ended discussions, opinions, and market observations
                </p>
                </li>

            
                <li
                @click="chooseCategory('qa')"
                class="px-4 py-3 border border-black/10 dark:border-white/10
                        text-[#777] cursor-pointer
                        hover:border-black/30 dark:hover:border-white/30
                        hover:text-black dark:hover:text-white
                        transition"
                         :class="{ 'border-black/100 text-black dark:text-white dark:border-white/100' : category === 'qa' }"
                >
                <p class="text-sm font-serif">
                    Questions & Answers
                </p>
                <p class="text-[11px] mt-1">
                    Focused questions with concise, experience-based answers
                </p>
                </li>

            </ul>
            </div>


            
           <div>
                <label class="block text-xs uppercase tracking-widest text-[#777] mb-6">
                    Choose section
                </label>

                <ul class="space-y-3">

                    <li
                    @click="chooseSubcategory('theory')"
                    class="px-4 py-3 border border-black/10 dark:border-white/10
                            text-[#777] hover:border-black/30 dark:hover:border-white/30
                            hover:text-black dark:hover:text-white
                            font-serif cursor-pointer"
                    :class="{ 'border-black/100 text-black dark:text-white dark:border-white/100' : subcategory === 'theory' }"
                    >
                    <p class="text-sm">
                        Theory
                    </p>
                    <p class="text-[11px] text-[#777] mt-1">
                        Conceptual frameworks, hypotheses, and strategic reasoning
                    </p>
                    </li>

                
                    <li
                    @click="chooseSubcategory('practice')"
                    class="px-4 py-3 border border-black/10 dark:border-white/10
                            text-[#777] cursor-pointer
                            hover:border-black/30 dark:hover:border-white/30
                            hover:text-black dark:hover:text-white
                            transition"
                    :class="{ 'border-black/100 text-black dark:text-white dark:border-white/100' : subcategory === 'practice' }"
                    >
                    <p class="text-sm font-serif">
                        Practice
                    </p>
                    <p class="text-[11px] mt-1">
                        Experiments, backtests, case studies, and live observations
                    </p>
                    </li>

                </ul>
                </div>


        
            <div>
                <label class="block text-xs uppercase tracking-widest text-[#777] mb-4">
                Thread title
                </label>
                <input
                type="text"
                required
                v-model="threadTitle"
                placeholder="Formulate a precise and falsifiable statement"
                class="w-full bg-transparent border-b border-black/20 dark:border-white/20
                        pb-3 text-lg font-serif focus:outline-none
                        placeholder:text-[#bbb] dark:text-white"
                />
            </div>

            
            <div>
                <label class="block text-xs uppercase tracking-widest text-[#777] mb-4">
                Short summary (Description)
                </label>
                <textarea
                rows="3"
                v-model="threadDescription"
                required
                placeholder="One or two sentences describing the core idea"
                class="w-full bg-transparent border border-black/10 dark:border-white/10
                        p-4 text-sm leading-relaxed focus:outline-none
                        placeholder:text-[#bbb] dark:text-white"
                ></textarea>
            </div>

        
            <div>
                <label class="block text-xs uppercase tracking-widest text-[#777] mb-6">
                Thesis
                </label>

                <div
                    class="border border-black/10 dark:border-white/10
                            p-6 space-y-4"
                    >
                    <p class="text-xs text-[#777] italic">
                        Structure your thesis clearly. Use paragraphs, assumptions, and
                        explicit claims.
                    </p>
                </div>

                <div class="w-full flex space-x-2 text-black dark:text-white mt-4 text-sm font-serif italic">
                    <button @click.prevent="addBlock({type: 'heading', level: 2, text: ''})"  class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">h1</button>
                    <button @click.prevent="addBlock({type: 'heading', level: 3, text: ''})" class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">h2</button> 
                    <button @click.prevent="addBlock({type: 'paragraph', text: ''})" class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">p</button>  
                    <button @click.prevent="addBlock({type: 'list', items: []})" class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">li</button>       
                    <button @click.prevent="addBlock({type: 'quote', text: ''})" class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">""</button>       
                    <button @click.prevent="addBlock({type: 'image', src: ''})"  class="px-4 py-2 border hover:bg-black/10 dark:hover:bg-white/20 border-black/20 dark:border-white/20 italic transition">
                        <!-- <img class="w-4 dark:hidden block" src="/image-svg.svg" alt="img" loading="lazy" decoding="async">
                        <img class="w-4 hidden dark:block" src="/image-svg-white.svg" alt="img" loading="lazy" decoding="async"> -->
                        img 
                    </button>  
                      
                </div>
                 <p class="text-xs text-black/70 dark:text-white/50 mt-4 font-serif ">Click to add text or image blocks</p>  

                 <div  class="w-full mt-10 flex flex-col space-y-4">
                    <div v-for="(block, index) in blocks" :key="index" class="flex flex-col space-y-2">
                        <div class="flex justify-between w-full">
                            <span class="dark:text-white tracking-wide font-serif"> {{  block.type }} {{ block.level ? block.level - 1 : '' }} </span>
                            <div class="flex space-x-2">
                                <button class="w-4" @click.prevent="moveBlock(index, -1)">
                                    <img src="/up-white.svg" alt="up" class="dark:hidden block">
                                    <img src="/up-black.svg" alt="up" class="dark:block hidden">
                                </button>
                                <button class="w-4 rotate-180" @click.prevent="moveBlock(index, 1)">
                                    <img src="/up-white.svg" alt="up" class="dark:hidden block">
                                    <img src="/up-black.svg" alt="up" class="dark:block hidden">
                                </button>
                                <button @click.prevent="removeBlock(index)" class="w-4">
                                    <img src="/trash-black.svg" alt="remove block" class="dark:hidden block"/>
                                    <img src="/trash-white.svg" alt="remove block" class="dark:block hidden"/>
                                </button>
                            </div>
                        </div>
                    
                        <textarea v-if="block.type !== 'list' && block.type !== 'image'" class="border text-sm px-4 py-4 dark:border-white/10 border-black/20 bg-transparent w-full text-black dark:text-white focus:outline-none" 
                                v-model="block.text"
                                :placeholder="block.type === 'quote' ? 'Add a quote' : block.type === 'heading' ? 'Add a heading' : block.type === 'list' ? 'Add a list' : block.type === 'image' ? 'Add an image' : block.type === 'paragraph' ? 'Add a paragraph' : 'Add text'"
                                > 
                        </textarea>
                        <div v-else-if="block.type === 'image'" class="flex flex-col space-y-4">
                               <input
                                    type="text"
                                    v-model="block.src"
                                    placeholder="Paste image URL (https://...)"
                                    class="border text-sm px-4 py-3
                                        dark:border-white/10 border-black/20
                                        bg-transparent w-full
                                        text-black dark:text-white
                                        focus:outline-none"
                                />
                              <img
                                v-if="block.src"
                                :src="block.src"
                                class="max-w-full border border-black/10 dark:border-white/10"
                              />
                              <textarea v-model="block.caption" 
                                        placeholder="Add a caption" 
                                        class="border text-sm px-4 py-4 dark:border-white/10 border-black/20 bg-transparent w-full text-black dark:text-white focus:outline-none">
                            </textarea>
                        </div>
                        <div v-else class="flex flex-col space-y-4">
                            <ul class="flex flex-col space-y-4">
                                <li v-for="(item, index) in block.items" :key="index" class="flex flex-col space-y-2">
                                    <textarea v-model="block.items[index]" :placeholder="'Add list item'" class="border text-sm px-4 py-4 dark:border-white/10 border-black/20 bg-transparent w-full text-black dark:text-white focus:outline-none"></textarea>
                                    <div class="flex w-full justify-end ">
                                        <button class="w-4" @click.prevent="removeListItem(block, index)">
                                            <img src="/remove-white.svg" alt="remove list item" class="dark:block hidden"/>
                                            <img src="/remove-black.svg" alt="remove list item" class="dark:hidden block"/>
                                        </button>
                                    </div>
                                </li>
                            </ul>
                            <button @click.prevent="addListItem(block)" class="text-black dark:text-white font-serif text-xs tracking-wide ml-1 flex space-x-2 items-center">
                                <img src="/add-white.svg" alt="add list item" class="dark:block hidden w-5"/>
                                <img src="/add-black.svg" alt="add list item" class="dark:hidden block w-5"/>
                                <span>Add item</span>
                            </button>
                        </div>
                    </div>
                 </div>
            </div>

            <TradesMenu/>


            <div class="border-l border-black/10 dark:border-white/10 pl-6">
                <p class="text-xs text-[#777] leading-relaxed">
                By publishing this thread, you agree to follow the forum’s code of conduct.
                Low-effort posts, unstructured opinions, and promotional content may be
                collapsed or removed.
                </p>
            </div>


            <div class="flex justify-end gap-6 pt-12">
             
                <NuxtLink class="text-center flex items-center" to="/forum/main">
                    <button
                
                    type="button"
                    class="text-sm text-[#777] hover:text-black dark:hover:text-white transition"
                    >
                    Cancel
                    </button>
                </NuxtLink>

                <button 
                    :disabled="isSubmitting"
                    v-if="isEditing"
                    @click="showConfirmDeletion = true"
                    type="button" 
                    class="text-sm text-red-500 hover:text-black dark:hover:text-white transition">
                    Delete thread
                </button>
              
                <button
                :disabled="isSubmitting"
                type="button"
                @click="showConfirmCreation = true"
                class="text-sm font-serif tracking-wide
                        border border-black/20 dark:border-white/20
                        px-6 py-3 hover:border-black dark:hover:border-white
                        transition dark:text-white"
                >
                <span v-if="!isEditing">Publish thread</span>
                <span v-else>Edit thread</span>
                </button>
            </div>

            </form>
            <div v-if=" status === 'success'">
                <CreationSuccess :url="threadId" :threadTitle="threadTitle" :threadSubTitle="threadDescription" />
            </div>
           <div
                v-if="status === 'deleted'"
                class="mt-20 max-w-md mx-auto text-center"
                >
                <p
                    class="text-sm font-serif tracking-wide text-[#121212] dark:text-[#e5e5e5] mb-6"
                >
                    The thread has been deleted successfully.
                </p>

                <NuxtLink
                    to="/forum/main"
                    class="
                    inline-flex
                    items-center
                    justify-center
                    text-[11px]
                    uppercase
                    tracking-widest
                    font-serif

                    px-6
                    py-3
                    rounded-full

                    border
                    border-black/30
                    dark:border-white/30

                    text-[#121212]
                    dark:text-[#e5e5e5]

                    transition
                    duration-200

                    hover:text-[#777]
                    hover:border-black/50
                    dark:hover:text-[#aaa]
                    dark:hover:border-white/50
                    "
                >
                    Return to forum
                </NuxtLink>
                </div>

        </section>
    </main>
  
 
</template>

<script setup>
import { useAuthStore } from "~/entities/user/auth.store";
import CreationSuccess from "./CreationSuccess.vue";
import { 
    chooseCategory, 
    category, 
    subcategory, 
    chooseSubcategory, 
    threadTitle, 
    threadDescription,
    blocks,
    addBlock,
    removeBlock,
    moveBlock,
    addListItem,
    removeListItem,
    onImageSelect,
    imagePreview,
    selectedFile,
    createThread,
    status,
    threadId,
    isSubmitting,
    updateThread,
    deleteThread,
    selectedTrades
} 
from "~/widgets/creation/model/useCreation";
import { useRoute } from "vue-router";
import { watch , ref, onBeforeUnmount } from  'vue';
import { useForumStore } from "~/features/store/useForum";
import TradesMenu from "./TradesMenu.vue";

const forum = useForumStore()

const route = useRoute();

const auth = useAuthStore();

const isEditing = ref(false);


const thread = ref(null);

const showConfirmCreation = ref(false);
const showConfirmDeletion = ref(false);
const isConfirmedCreation = ref(false);
const isConfirmedDeletion = ref(false);



const publish = async () => {
    if(isConfirmedCreation.value){
        if(!isEditing.value){
            await createThread(auth.user?.uid || '00000011111')
        }
        else{
            if(!threadId.value && route.query.thread) return;
            await updateThread(auth.user?.uid || '00000011111', threadId.value)
        }
        isConfirmedCreation.value = false;
    }

    if(isConfirmedDeletion.value){
        await deleteThread(auth.user?.uid || '00000011111', threadId.value)
        isConfirmedDeletion.value = false;
        forum.removeThread(threadId.value);
    }

   
}

watch(
    () => auth.user?.uid,
  async (uid) => {
    if (!uid) return;

    if(route.query.thread){
        await forum.fetchThreadList();

        blocks.value = [];

        const threadsMap = forum.threads;


        thread.value = threadsMap.get(route.query.thread);

        if(thread.value.authorId !== uid) return;

        for(let block of thread.value.thesis.blocks){
            blocks.value.push(block);
        }

        category.value = thread.value.category;
        subcategory.value = thread.value.subcategory;
        threadTitle.value = thread.value.title;
        threadDescription.value = thread.value.description;
        threadId.value = thread.value.id
        selectedTrades.value = thread.value.includedTrades;

        isEditing.value = true;
       
    }
    else{
        category.value = null;
        subcategory.value = null;
        threadTitle.value = null;
        threadDescription.value = null;
        threadId.value = null
        selectedTrades.value = [];
        blocks.value = [];

        isEditing.value = false;
       
    }

    


  },
  { immediate: true }
)


onBeforeUnmount(() => {
    category.value = null;
    subcategory.value = null;
    threadTitle.value = null;
    threadDescription.value = null;
    threadId.value = null
    selectedTrades.value = [];
    blocks.value = [];
    isEditing.value = false;
    status.value = 'idle';
    thread.value = null;
    showConfirmCreation.value = false;
    showConfirmDeletion.value = false;
    isConfirmedCreation.value = false;
    isConfirmedDeletion.value = false;
    imagePreview.value = null;
    selectedFile.value = null;
    
})

</script>
