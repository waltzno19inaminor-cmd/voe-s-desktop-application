

<template>
  <article v-if="reply.status !== 'hidden'" class=" pt-10">

   
    <div class="flex justify-between items-center mb-4">
      <span class="text-xs uppercase tracking-widest text-[#777]">
        {{ reply.type }}
      </span>
      <span class="text-xs text-[#999]">
        by {{ userName?.displayName || 'anonymous' }} · {{ timeAgo(reply.createdAt) }}
      </span>
    </div>

    <div class="space-y-6">

      <div v-for="(block, index) in reply.content.blocks" :key="index">


        <p
          v-if="block.type === 'paragraph'"
          class="text-sm leading-relaxed text-[#121212] dark:text-white"
        >
          {{ block.text }}
        </p>


        <div
          v-if="block.type === 'quote'"
          class="pl-6 border-l border-black/20 dark:border-white/20 text-sm text-[#555] dark:text-[#aaa]"
        >
          <p class="italic mb-2">
            “{{ block.text }}”
          </p>

          <button
            v-if="block.source"
            class="text-xs text-[#888] hover:text-black dark:hover:text-white transition"
            @click="scrollToSource(block.source)"
          >
            View original context
          </button>
        </div>

    </div>

    </div>

    <div class="mt-6 flex gap-6 text-xs text-[#777]">
      <button @click.prevent="replyTo(reply.id)" class="hover:text-black dark:hover:text-white transition">
        Reply
      </button>
      <button @click.prevent="replyTo(reply.id), isQuoting = true" class="hover:text-black dark:hover:text-white transition">
        Quote
      </button>
      <button @click.prevent="addLike(reply)" :class="reply?.likedByMe ? 'text-black dark:text-white' : 'text-[#777] dark:text-[#aaa]'
      " class="hover:text-black dark:hover:text-white transition space-x-2 ">
            <span>Like</span> <span v-if="reply.likes > 0">{{ reply.likes }}</span>
      </button>
      <button v-if="reply.authorId === auth.user?.uid" @click.prevent="remove" class="hover:text-black dark:hover:text-white transition">
        Remove
      </button>
    </div>
    <form @submit.prevent="submitForm" v-show="isReplyingTo === reply.id" class="w-full py-6">
     
              <p class="space-x-2">
                    <span v-if="replyType" class="text-xs text-[#cfcfcf] uppercase font-semibold">{{ replyType }}</span>
                    <span v-if="selectQuotation && isQuoting" class="text-xs text-[#777]">{{selectQuotation.text}}</span>
                </p>
                <textarea ref="textarea"  @input="autoGrow($event)" 
                        v-model="replyText"
                        rows="1" 
                        placeholder="Write your reply..."
                        class="resize-none border-b text-sm py-4 dark:border-white/30 border-black/20 bg-transparent w-full text-black dark:text-white focus:outline-none"></textarea>
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
                        <button @click.prevent="isReplyingTo = false, isQuoting = false, isReplying = false" class="hover:bg-black/50 dark:hover:bg-[#3b3b3b] transition py-2 px-6 rounded-full text-black dark:text-white text-sm">Cancel</button>
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

    <div v-if="children.length && (depth < maxDepth - 1 || showHidden)" class="mt-2 reply-children" :class="depth < maxDepth - 1 ? 'ml-10' : 'ml-0'">
      <Reply
        v-for="child in children"
        :key="child.id"
        :reply="child"
        :allReplies="allReplies"
        :depth="depth + 1"
        :maxDepth="maxDepth"
        :threadId="threadId"
        :thread="thread"
        :data-reply-index="reply.id"
      

      />
      
    </div>
    <div
    v-if="children.length && depth >= maxDepth - 1 && !showHidden"
      class="mt-10"
    >
      <button
        class="text-xs text-[#777] hover:text-black transition"
        @click="showHidden = true"
      >
        Show {{ children.length }} replies
      </button>
    </div>


 



  </article>
  <article v-else class="  pt-10 opacity-60">

        <div class="flex justify-between items-center mb-4">
          <span class="text-xs uppercase tracking-widest text-[#777]">
            Off-topic
          </span>
          <span class="text-xs text-[#999]">
            Moderated
          </span>
        </div>

        <p class="text-sm italic text-[#777]">
          This comment was collapsed due to lack of relevance.
        </p>

    </article >

</template>





<script setup>
import { computed,ref, onMounted } from 'vue'
import { textarea, autoGrow } from "~/composables/autoGrow";
import { replyText, isReplyingTo, replyType, replyTo, submitReply, removeReply, isQuoting, selectQuotation, isReplying  } from "~/pages/forum/model/useReply";
import { timeAgo } from '~/composables/timeAgo'
import { scrollToSource } from '~/entities/reply/model/useScroll'
import { useAuthStore } from "~/entities/user/auth.store";
import { useForumStore } from '~/features/store/useForum';

import { sendNotification } from '~/features/notifications/api/sendNotification';
import { likeReply, removeLike } from '../model/likesManagement';




const auth = useAuthStore();
const forum = useForumStore();

const showHidden = ref(false);

const props = defineProps({
  threadId: {
    type: String,
    required: true
  },
  reply: {
    type: Object,
    required: true
  },
  allReplies: {
    type: Array
  },
  depth: {
    type: Number,
    default: 0
  },
  maxDepth: {
    type: Number,
    default: 3
  },
  thread: {
    type: Object,
    required: true
  }
})

const addLike = async (r) => {
    if(r?.likedByMe){
        await removeLike(r.id, auth.user.uid);
        r.likes--;
        r.likedByMe = false;
    }
   else{
     await likeReply(r.id, auth.user.uid);
      r.likes++;
      r.likedByMe = true;
   }
   
  
 
}



const threadId = computed(() => props.threadId)

const children = computed(() =>
  props.allReplies.filter(r => r.parentId === props.reply.id)
)


const reply = computed(() => props.reply)

async function submitForm(){
    let replyRef = null;
   
    if(selectQuotation.value){
        replyRef = await submitReply(threadId.value, auth.user?.uid, reply.value.id, selectQuotation.value);
    }else{
        replyRef = await submitReply(threadId.value, auth.user?.uid, reply.value.id);
    }
     await sendNotification({
        toUserId: reply.value.authorId,
        type: 'reply_to_you',
        actorId: auth.user?.uid,
        actorLabel: auth.user?.displayName,
        target: {
            entity: 'reply',
            id: reply.value.id
        },
        context: {
            threadId: threadId.value,
            threadTitle: props.thread.title,
            threadAuthor: props.thread.author,
            threadAuthorId: props.thread.authorId
        }
    })

    forum.addReply(replyRef);
}

async function remove(){
 
    await removeReply(reply.value.id, threadId.value);
    forum.removeReply(threadId.value, reply.value.id)
    

}

const userName = ref('anonymous')

onMounted(async ()=>{
  userName.value = await forum.fetchUser(reply.value.authorId);
})





</script>