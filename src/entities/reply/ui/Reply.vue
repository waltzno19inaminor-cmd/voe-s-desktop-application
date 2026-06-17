

<template>
  <article v-if="reply.status !== 'hidden'" class=" pt-10">

   
    <div class="flex justify-between items-center mb-4">
      <span class="text-xs uppercase tracking-widest text-[#777]">
        {{ reply.type }}
      </span>
      <div class="flex items-center gap-2 text-xs text-[#999]">
         <div class="relative w-5 h-5 shrink-0">
             <!-- Placeholder / Fallback -->
            <div class="absolute inset-0 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[9px] font-sans border dark:border-white/5 border-black/5 select-none text-[#777]">
                {{ (userName?.displayName || 'A').charAt(0) }}
            </div>
            <!-- Actual Avatar -->
            <img 
                v-show="(userName?.photoURL || userName?.avatar) && !imgError" 
                :src="userName?.photoURL || userName?.avatar" 
                @error="imgError = true"
                referrerpolicy="no-referrer" 
                class="absolute inset-0 w-5 h-5 rounded-full object-cover shadow-sm" 
                alt="author avatar" 
            />
        </div>
        <span>
            by <NuxtLink class="hover:dark:text-white hover:text-black transition" :to="{ path: '/profile', query: { uid: reply.authorId } }">{{ userName?.displayName || 'anonymous' }}</NuxtLink> · {{ timeAgo(reply.createdAt) }}
        </span>
      </div>
    </div>

    <div class="space-y-6">

      <div v-for="(block, index) in reply.content.blocks" :key="index">


        <p
          v-if="block.type === 'paragraph'"
          class="text-sm leading-relaxed text-[#050505] dark:text-white"
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

    <div class="mt-6 flex items-center gap-4 text-xs text-[#777]">
      <button @click.prevent="replyTo(reply.id)" class="hover:text-black dark:hover:text-white transition">
        Reply
      </button>
      <button @click.prevent="replyTo(reply.id); isQuoting = true" class="hover:text-black dark:hover:text-white transition">
        Quote reply
      </button>
      <button @click.prevent="addLike(reply)" :class="reply?.likedByMe ? 'nier-text-primary' : 'text-[#777] dark:text-[#aaa]'"
        class="hover:text-black dark:hover:text-white transition space-x-1">
          <span>Like</span> <span v-if="reply.likes > 0">{{ reply.likes }}</span>
      </button>
      <button v-if="reply.authorId === auth.user?.uid" @click.prevent="remove" class="hover:text-black dark:hover:text-white transition">
        Remove
      </button>
    </div>
    <form @submit.prevent="submitForm" v-show="isReplyingTo === reply.id" class="w-full pt-6">

      <!-- Quote preview (prominent) -->
      <div v-if="selectQuotation && isQuoting" class="mb-8 p-5 rounded-sm border nier-border-primary bg-black/[0.02] dark:bg-white/[0.02]">
        <p class="text-[10px] uppercase tracking-widest text-[#777] mb-3">Quoting this reply</p>
        <p class="text-sm font-serif italic text-[#444] dark:text-[#bbb] leading-relaxed">"{{ selectQuotation.text }}"</p>
        <button
          type="button"
          @click="isQuoting = false; selectQuotation = null"
          class="mt-4 text-[10px] uppercase tracking-widest text-[#999] hover:text-[#050505] dark:hover:text-white transition"
        >Remove quote</button>
      </div>

      <!-- Textarea -->
      <textarea ref="textarea" @input="autoGrow($event)"
        v-model="replyText"
        rows="1"
        placeholder="Write your reply…"
        class="resize-none border-b text-sm py-4 dark:border-white/30 border-black/20 bg-transparent w-full nier-text-primary focus:outline-none mb-6"></textarea>

      <!-- Type selector -->
      <p class="text-[10px] uppercase tracking-widest text-[#777] mb-3">Select reply type</p>
      <ReplyTypeSelector v-model="replyType" />

      <!-- Actions -->
      <div class="flex justify-end items-center gap-3 mt-6">
        <button
          type="button"
          @click.prevent="isReplyingTo = null; isQuoting = false; isReplying = false; replyType = null"
          class="text-[11px] uppercase tracking-widest font-serif text-[#777] hover:text-[#050505] dark:hover:text-white transition duration-200"
        >Cancel</button>
        <button
          :disabled="forum.loading"
          type="submit"
          class="text-[11px] uppercase tracking-widest font-serif px-6 py-2.5 rounded-full border transition duration-200"
          :class="replyText && replyText.trim() !== '' && replyType
            ? 'border-black/40 dark:border-white/40 text-[#050505] dark:text-white hover:border-black/70 dark:hover:border-white/70'
            : 'nier-border-primary text-[#aaa] cursor-not-allowed'"
        >Submit</button>
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
import ReplyTypeSelector from './ReplyTypeSelector.vue';
import { sendNotification } from '~/features/notifications/api/sendNotification';
import { likeReply, removeLike } from '../model/likesManagement';




const auth = useAuthStore();
const forum = useForumStore();

const showHidden = ref(false);
const imgError = ref(false);

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

const userName = computed(() => forum.users.get(reply.value.authorId));

onMounted(async ()=>{
  await forum.fetchUser(reply.value.authorId);
})





</script>