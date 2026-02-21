<template>
    <Header/>
    <main v-if="thread" class="flex grow justify-center px-4">
      
        <section class="w-full max-w-4xl min-h-screen py-20">
            
           
            <div class="mb-14 p-6 border dark:border-white/10 border-black/10 text-sm text-[#666]">
            <p class="font-serif mb-2">
               {{ definedCategory(thread.category).title }} · {{ capitalize(thread.subcategory) }}
            </p>
            <p class="leading-relaxed">
                This thread focuses on structural explanations.
                Off-topic comments, signals, or unsubstantiated claims may be collapsed by moderators.
            </p>
            </div>

           
            <article class="mb-20 dark:text-white space-y-6">

           
          <NuxtLink
            v-if="auth.user.uid === thread.authorId"
            :to="{
                path: '/forum/creation',
            query: { thread: thread.id }
            }"
           
            >
            <button
          
            class="
                text-[11px]
                uppercase
                tracking-widest
                font-serif
                text-[#121212]
                dark:text-[#e5e5e5]

                border
                border-black/20
                dark:border-white/20

                px-5
                py-2.5
                rounded-full

                transition
                duration-200

                hover:text-[#777]
                hover:border-black/40
                dark:hover:text-[#aaa]
                dark:hover:border-white/40
            ">
                Change thread

            </button>
           
            </NuxtLink>


            <h1 class="text-3xl font-serif mb-6">
                {{ thread.title }}
            </h1>

            <div class="text-xs tracking-widest uppercase text-[#777] mb-6">
                {{ thread.subcategory }} · by {{ displayName }} · Updated {{ timeAgo(thread.lastActivityAt) }}
            </div>

          

            <ThreadContentRenderer @textSelected="handleTextSelected" v-if="thread?.thesis?.blocks" :blocks="thread.thesis.blocks" :isQuote="isQuoting"  />
            <ThreadIncludedTrades  v-if="thread?.includedTrades?.length > 0" :trades="thread.includedTrades" />

            <div class="flex gap-6 text-xs text-[#777] mt-10">
                <button @click="isReplying = true" class="hover:text-black dark:hover:text-white transition">Reply</button>
                <button @click="isReplying = true, isQuoting = true" class="hover:text-black dark:hover:text-white transition">Quote</button>
                <button class="hover:text-black dark:hover:text-white transition">Save</button>
            </div>

            </article>



            <form @submit.prevent="submitForm" v-show="isReplying && !isReplyingTo" class="w-full py-6">
                <p class="space-x-2">
                    <span v-if="replyType" class="text-xs text-[#cfcfcf] uppercase font-semibold">{{ replyType }}</span>
                    <span v-if="selectQuotation && isQuoting" class="text-xs text-[#777]">{{selectQuotation.text}}</span>
                </p>
                <textarea ref="textarea" @input="autoGrow($event)" 
                        v-model="replyText"
                        rows="1" 
                        placeholder="Write your reply..."
                       
                        class="overflow-hidden box-content  resize-none border-b text-sm py-4 dark:border-white/30 border-black/20 bg-transparent w-full text-black dark:text-white focus:outline-none"></textarea>
                <div class="flex justify-between space-x-4 py-2 px-1">
                    <div class="flex space-x-2">
                        <button @click.prevent="replyType = 'critique'" :class="replyType === 'critique' ? 'dark:bg-[#777] bg-[#cdcdcd]' : ''" class="px-3 rounded-lg">
                            <img class="block dark:hidden w-4" src="/assets/dislike-black.svg" alt="critique" />
                            <img class="hidden dark:block w-4" src="/assets/dislike-white.svg" alt="critique" />
                        </button>
                        <button @click.prevent="replyType = 'extension'" :class="replyType === 'extension' ? 'dark:bg-[#777] bg-[#cdcdcd]' : ''" class="px-3 rounded-lg">
                            <img class="block dark:hidden w-4" src="/assets/extension-black.svg" alt="extension" />
                            <img class="hidden dark:block w-4" src="/assets/extension-white.svg" alt="extension" />
                        </button>
                        <button @click.prevent="replyType = 'counterexample'" :class="replyType === 'counterexample' ? 'dark:bg-[#777] bg-[#cdcdcd]' : ''" class="px-3 rounded-lg">
                            <img class="block dark:hidden w-4" src="/assets/counter-black.svg" alt="counterexample" />
                            <img class="hidden dark:block w-4" src="/assets/counter-white.svg" alt="counterexample" />
                        </button>
                        <button @click.prevent="replyType = 'question'" :class="replyType === 'question' ? 'dark:bg-[#777] bg-[#cdcdcd]' : ''" class="px-3 rounded-lg">
                            <img class="block dark:hidden w-4" src="/assets/question-dark.svg" alt="extension" />
                            <img class="hidden dark:block w-4" src="/assets/question-white.svg" alt="extension" />
                        </button>

                    </div>
                    <div class="flex space-x-4">
                        <button @click.prevent="isReplying = false, isQuoting = false" class="hover:bg-black/50 dark:hover:bg-[#3b3b3b] transition py-2 px-6 rounded-full text-black dark:text-white text-sm">Cancel</button>
                        <button
                        :disabled="forum.loading"
                        type="submit"
                        class=" text-white dark:text-black text-sm rounded-full py-2 px-6"
                        :class="replyText && replyText.trim() !== '' && replyType ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/50 dark:bg-[#3b3b3b] cursor-not-allowed dark:text-white/50'">
                        Reply
                        </button>
                    </div>

                </div>
            </form>
        
            <div class="space-y-16 mt-10 ">
              
                <div v-if="replies.length > 0" class="border-t dark:border-white/10 border-black/10 pt-10 dark:text-white space-y-4">
                 
                    <Reply :class="index !== 0 ? 'border-t dark:border-white/10 border-black/10 pt-10' : ''" 
                            v-for="(reply, index) in replies
                            .filter(reply => !reply.parentId)" 
                            :data-reply-index="reply.id"
                            :key="reply.id" 
                            :reply="reply"
                            :allReplies="replies"
                            :depth="0"
                            :maxDepth="3"
                            :threadId="threadId"
                            :thread="thread"
                          
                             />

                </div>  
                

                <div v-else>
                    <span class="text-xs text-[#777] text-start italic">No replies yet</span>
                </div>
             

                
           

            </div>

            <div
            v-if="linkedThreads.length > 0"
            class="mt-24 border-t dark:border-white/10 border-black/10 pt-10"
            >
            <h3
                class="text-[10px] tracking-[0.25em] uppercase text-[#777] mb-6"
            >
                Contributions
            </h3>

            <ul class="space-y-4">
                <li
                v-for="thread in linkedThreads"
                :key="thread.id"
                class="group"
                >
                <ThreadLink
                    :thread="thread"
                    @click="navigateTo(`/forum/thread/${thread.id}`)"
                />
                </li>
            </ul>
            </div>


          
            <div class="mt-16 border-t dark:border-white/10 border-black/10 pt-10">
            <button class="text-sm font-serif hover:opacity-70 transition dark:text-white">
                Add contribution
            </button>
            </div>

        </section>
    </main>
     <div class="w-36 mx-auto grow min-h-96 my-auto flex items-center justify-center" v-else>
          <img src="/logo.svg" class="dark:hidden animate-spin" alt="" />
          <img src="/logo-dark.svg" class="dark:flex hidden animate-spin" alt="" />
      </div>
    <Footer/>

</template>


<script setup>
import Header from "~/widgets/header/ui/Header.vue";
import ThreadContentRenderer from "~/entities/thread/ui/ThreadContentRenderer.vue";
import Footer from "~/widgets/footer/Footer.vue";
import { useRoute } from "vue-router";
import { timeAgo } from "~/composables/timeAgo";
import ThreadLink from "~/entities/threadLink/ui/ThreadLink.vue";
import { useAuthStore } from "~/entities/user/auth.store";
import ThreadIncludedTrades from "~/entities/thread/ui/ThreadIncludedTrades.vue";

import Reply from "~/entities/reply/ui/Reply.vue";
import { definedCategory } from "../model/useCategory";
import { capitalize } from "~/shared/capitalise";
import { textarea, autoGrow } from "~/composables/autoGrow";

import { replyText, isReplying, replyType, submitReply, isQuoting, selectQuotation, isReplyingTo  } from "../model/useReply";
import { useForumStore } from "~/features/store/useForum";
import { ref } from "vue";
import { sendNotification } from "~/features/notifications/api/sendNotification";
import { scrollToReply } from '~/entities/notification/model/scrollToReply';
import { isReplyLikedByUser } from '~/entities/reply/model/likesManagement';

definePageMeta({
  public: true
})


const auth = useAuthStore()


const route = useRoute();
const threadId = route.params.id;

const forum = useForumStore()

const thread = ref(null)
const links = ref([])
const linkedThreads = ref([])

async function submitForm(){
    let reply = null;
    if(selectQuotation.value){
        reply = await submitReply(threadId, auth.user?.uid, null, selectQuotation.value) 
    }else{
        reply = await submitReply(threadId, auth.user?.uid)
    }

    await sendNotification({
        toUserId: thread.value.authorId,
        type: 'reply_to_thread',
        actorId: auth.user?.uid,
        actorLabel: auth.user?.displayName,
        target: {
            entity: 'thread',
            id: threadId
        },
        context: {
            threadId: threadId,
            threadTitle: thread.value.title,
            threadAuthor: displayName.value,
            threadAuthorId: thread.value.authorId
        }
    })
   
    forum.addReply(reply);
   
}

function reloadPage(){
    window.location.reload()
}

const displayName = ref('Anonymous'); 

onMounted(async () => {
  
  await forum.fetchThreadList()
  await forum.fetchReplies(threadId)




  const threadsMap = forum.threads


  thread.value = threadsMap.get(threadId)


  const user = forum.users.get(thread.value.authorId);
    if(user){
        displayName.value = user.displayName
    }



  links.value = await forum.fetchThreadLinks(threadId)


  linkedThreads.value = links.value
    .map(link => threadsMap.get(link.toThreadId))
    .filter(Boolean)

    if(route.query.replyId){
        scrollToReply(route.query.replyId)
    }

    for (const reply of replies.value) {
    reply.likedByMe = await isReplyLikedByUser(reply.id, auth.user?.uid)
    }
 


})

const replies = computed(() =>
    forum.replies.get(threadId) ?? []
)

function handleTextSelected(payload){
    if(!isReplying.value) return
    payload.threadId = threadId
    selectQuotation.value = payload;
}



</script>
<style scoped>
textarea {
  resize: none; 
  overflow-y: hidden;
  box-sizing: border-box; 
}

</style>