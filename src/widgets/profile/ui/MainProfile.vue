<template>
      
        <main v-if="!forum.loading" class="mt-6  rounded-xl max-w-6xl w-full mx-auto px-8 py-12 dark:bg-[#121212]">
        
            <section class="flex flex-col md:flex-row gap-10 mb-14">

                <div class="flex-shrink-0">
                <div class="w-28 h-28 rounded-full flex justify-center items-center bg-black/10 dark:bg-white/10">
                    <img v-if="avatar !== '/base-ava.svg'" :src="avatar" :key="avatar" alt="user's photo"  :class="[
                    'rounded-full',
                    avatar === '/base-ava.svg' ? 'w-16 h-16' : 'w-full h-full'
                  ]"
                    loading="lazy"
                    decoding="async"
                    @error="onImgError" />
                    <div v-else class="w-full h-full rounded-full bg-[#444] flex justify-center items-center">
                      <span class="text-white text-[4rem]">
                        {{ user?.email?.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                </div>
                </div>

                <div class="flex-1">
                <div class="flex items-center gap-4 mb-2 w-full">
                  <h1 class="text-3xl font-serif tracking-wide text-[#121212] dark:text-white flex-1 min-w-0 flex items-center gap-3">
                    <span v-if="!editName" class="truncate">{{ user?.displayName }}</span>
                    <input
                      v-else
                      class="
                        text-3xl
                        font-serif
                        tracking-wide
                        text-[#121212]
                        dark:text-white
                        bg-transparent
                        w-full
                        focus:outline-none
                        border-b border-black/20 dark:border-white/20
                        focus:border-black/50 dark:focus:border-white/50
                        pb-1
                        -mb-1
                      "
                      v-model="currentName"
                      @keyup.enter="submitName"
                      @keyup.esc="cancelEditName"
                      autofocus
                    />
                    
                    <button 
                      @click="editName = true" 
                      v-if="auth.user?.uid === route.query.uid && !editName" 
                      class="flex items-center transition-opacity flex-shrink-0"
                    >
                      <img src="/assets/edit.svg" alt="edit" class="w-4 h-4 inline-block" />
                    </button>
                  </h1>
                  
                  <div v-if="auth.user?.uid === route.query.uid && editName" class="flex space-x-2 flex-shrink-0 mt-1">
                    <button
                      @click="cancelEditName"
                      class="
                        text-[10px] uppercase tracking-widest font-serif
                        text-[#777] dark:text-[#aaa]
                        border border-black/20 dark:border-white/20
                        px-4 py-2 rounded-full min-w-16
                        transition duration-200
                        hover:text-[#121212] dark:hover:text-white
                        hover:border-black/40 dark:hover:border-white/40
                      "
                    >
                      Cancel
                    </button>
                    <button
                      @click="submitName"
                      :disabled="isSubmitting"
                      class="
                        text-[10px] uppercase tracking-widest font-serif
                        text-[#777] dark:text-[#aaa]
                        border border-black/20 dark:border-white/20
                        px-4 py-2 rounded-full min-w-16
                        transition duration-200
                        hover:text-[#121212] dark:hover:text-white
                        hover:border-black/40 dark:hover:border-white/40
                      "
                    >
                      Save
                    </button>
                  </div>
                </div>

                <p class="text-sm uppercase tracking-widest text-[#777] dark:text-[#aaa] mb-4">
                    {{ user?.type }} participant · Joined {{ user?.joinedAt.toDate().toLocaleDateString() }}
                </p>    


               
                <div class="max-w-full flex justify-between items-center pr-2 py-1 space-x-4">
                  <p 
                  v-if="!editBio"
                    class="
                      text-sm
                      font-serif
                      italic
                      leading-relaxed
                      text-[#555]
                      dark:text-[#bdbdbd]
                      
                      pr-24
                      
                    "
                  >
                    "{{ user?.bio || 'No bio yet.' }}"
                  </p>

                  <textarea
                  v-else
                  
                  
              
                  class="
                    text-sm
                    font-serif
                    italic
                    leading-relaxed
                    text-[#555]
                    dark:text-[#bdbdbd]
                    bg-transparent
                    w-full
                    resize-none
                    focus:outline-none
                  
                    
                    
                  "
                  v-model="currentBio"
                  ></textarea>


                  <button
                  v-if="editBio"
                    @click="cancelEditBio"
                    class="
                        text-[10px]
                        uppercase
                        tracking-widest
                        font-serif

                        text-[#777]
                        dark:text-[#aaa]

                        border
                        border-black/20
                        dark:border-white/20

                        px-4
                        py-2
                        rounded-full
                        min-w-24

                        transition
                        duration-200

                        hover:text-[#121212]
                        dark:hover:text-white
                        hover:border-black/40
                        dark:hover:border-white/40
                      "
                    >Cancel
                  </button>

                  <button
                  v-if="auth.user?.uid === route.query.uid "
                  @click="submitBio"
                  :disabled="isSubmitting"
                  class="
                      text-[10px]
                      uppercase
                      tracking-widest
                      font-serif

                      text-[#777]
                      dark:text-[#aaa]

                      border
                      border-black/20
                      dark:border-white/20

                      px-4
                      py-2
                      rounded-full
                      min-w-24

                      transition
                      duration-200

                      hover:text-[#121212]
                      dark:hover:text-white
                      hover:border-black/40
                      dark:hover:border-white/40
                    "
                   
                  >
                   {{ editBio ? 'Save' : 'Edit bio' }}
                  </button>
                
                  </div>

                </div>

            </section>
        
            <section class="mb-14">
                <h2 class="text-sm uppercase tracking-widest font-serif text-[#121212] dark:text-white mb-4">
                Thread network
                </h2>
                
                <div  ref="container" class="w-full min-h-[30rem] rounded-lg border border-black/10 dark:border-white/10 bg-[#fafafa] dark:bg-[#181818] relative overflow-hidden">
                  
                </div>
            </section>
            

            <section class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-14">

                <div>
                <h3 class="text-sm uppercase tracking-widest font-serif mb-3 text-[#121212] dark:text-white">
                    Threads
                </h3>
                <p class="text-sm text-[#666] dark:text-[#aaa]">
                    {{ user?.threads ? user.threads : 0 }} published discussions
                </p>
                </div>

                <div>
                <h3 class="text-sm uppercase tracking-widest font-serif mb-3 text-[#121212] dark:text-white">
                    Focus
                </h3>
                <p class="text-sm text-[#666] dark:text-[#aaa]">
                    Equities · Macro · Risk
                </p>
                </div>

                <div>
                <h3 class="text-sm uppercase tracking-widest font-serif mb-3 text-[#121212] dark:text-white">
                    Activity
                </h3>
                <p class="text-sm text-[#666] dark:text-[#aaa]">
                    Long-form · Infrequent · Analytical
                </p>
                </div>

            </section>

            <section class=" border-black/10 dark:border-white/10 pt-8 pb-2 flex flex-col space-y-4">
                <NuxtLink :to="`forum/diary?uid=${route.query.uid}`" class="text-sm  space-x-2 flex items-center uppercase tracking-widest font-serif mb-3 text-[#121212] dark:text-white/80">
                    <span>activity</span>
                    <span class="text-[8px]">(click to view)</span>
                </NuxtLink>
              
               <Heatmap :entriesList="entriesList"/>
            </section>
           
      

            <section class="border-t border-black/10 dark:border-white/10 pt-8">
                <p class="text-sm text-[#666] dark:text-[#aaa] max-w-xl">
                Profiles reflect a trader’s thinking over time.
                Popularity metrics are intentionally omitted.
                </p>
            </section>

        </main>
        <div class="w-36 mx-auto grow min-h-96 my-auto flex items-center justify-center" v-else>
          <img src="/logo.svg" class="dark:hidden animate-spin" alt="" />
          <img src="/logo-dark.svg" class="dark:flex hidden animate-spin" alt="" />
      </div>
</template>


<script lang="ts" setup>

definePageMeta({
    public: true
})

import { useForumStore } from "~/features/store/useForum";
import { computed, onMounted, onBeforeUnmount, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Timestamp } from 'firebase/firestore'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'
import { randomOffset } from '~/utils/random'
import { isDark } from "~/composables/changeTheme";
import { useAuthStore } from "~/entities/user/auth.store";
import { isSubmitting, changeBio, changeName } from "../model/useProfile";
import Heatmap from '@/widgets/diary/ui/Heatmap.vue';
import { methods } from '~/widgets/header/model/useHeader';
import Graph from 'graphology';
import Sigma from 'sigma';

const auth = useAuthStore();

const editBio = ref(false);
const editName = ref(false);

const currentBio = ref<string | null>(null);
const currentName = ref<string | null>(null);


const forum = useForumStore();

const route = useRoute();
const router = useRouter();

const user = computed(() => forum.users.get(route.query.uid as string));

const avatar = computed(() => user.value?.photoURL || '/base-ava.svg');


const submitBio = async () => {

  if (!editBio.value ){
    editBio.value = !editBio.value
    return;
  } else{
    if(!auth.user?.uid) return;
    await changeBio(auth.user?.uid, route.query.uid as string, currentBio.value as string);
    user.value.bio = currentBio.value;
    editBio.value = !editBio.value;
  }
 
 
}

const onImgError = (e: any) => {
  e.target.src = '/base-ava.svg';
};

const submitName = async () => {
  if (!editName.value ){
    editName.value = !editName.value
    return;
  } else {
    if (!auth.user?.uid) return;
    await changeName(auth.user?.uid, route.query.uid as string, currentName.value as string);
    if(user.value) {
      user.value.displayName = currentName.value;
    }
    editName.value = false;
  }
}

const cancelEditName = () => {
  currentName.value = user.value?.displayName || ''
  editName.value = false
}

const cancelEditBio = () => {
  currentBio.value = user.value?.bio || ''
  editBio.value = false
}



const threads = computed(() => {
  return Array.from(forum.threads.values())
})

const container = ref<HTMLDivElement | null>(null);
let sigmaInstance: Sigma | null = null;
const sigmaReady = ref(false);

const links = ref<ThreadLink[]>([]);



const entriesList = computed(() => {
    const uid = route.query.uid;
    if (typeof uid !== 'string') return [];


    return forum.users.get(uid)?.diary || [];
});

const initProfile = async () => {
  if (!container.value) return;


  if (sigmaInstance) {
    sigmaInstance.kill();
    sigmaInstance = null;
    sigmaReady.value = false;
  }
    
  await forum.fetchUser(route.query.uid as string);
  await forum.fetchThreadList();
  links.value = await forum.fetchAllThreadLinks() 

  const graph = new Graph()

  threads.value.filter(thread => thread.authorId === route.query.uid).forEach((thread, index) => {
    graph.addNode(thread.id, {
      label: thread.title,
      x: randomOffset(5),
      y: randomOffset(5),
      size: 10,
      color: '#555',
      url: `/forum/thread/${thread.id}`
    })
  })

  links.value.forEach(link => {
    if(threads.value.filter(t => t.authorId === route.query.uid).find(thread => thread.id === link.fromThreadId) && threads.value.filter(t => t.authorId === route.query.uid).find(thread => thread.id === link.toThreadId)){
      graph.addEdge(link.fromThreadId, link.toThreadId)
    }
    
  })


  sigmaInstance = new Sigma(graph, container.value, {
    renderLabels: true,
  
    defaultDrawNodeHover: (context, data, settings) => {

    const size = data.size;
    const x = data.x;
    const y = data.y;
    const color = '#666'

  
    context.fillStyle = color;
    context.beginPath();
   
    context.closePath();
    context.fill();
  
  },
  })

  sigmaInstance.on('clickNode', ({ node }) => {
    const nodeData = graph.getNodeAttributes(node)

    if (nodeData.url) {
      router.push(nodeData.url)
    }
  })

  sigmaInstance.on('enterNode', () => {
    if(!container.value) return
    container.value.style.cursor = 'pointer'
  })

  sigmaInstance.on('leaveNode', () => {
    if(!container.value) return
    container.value.style.cursor = 'default'
  })

  sigmaReady.value = true
}

onMounted(async () => {
  methods.value = false;
  isDark.value = document.documentElement.classList.contains('dark');
  await initProfile();
})


onBeforeUnmount(() => {
  sigmaInstance?.kill();
})

watch(() => route.query.uid, async (newUid) => {
    if (newUid) {
        await initProfile();
    }
});

watch([isDark, sigmaReady], () => {
  if (!sigmaInstance || !sigmaReady.value) return;

  sigmaInstance.setSettings({
    labelColor: {
      color: isDark.value ? '#ffffff' : '#121212'
    }
  })

  sigmaInstance.refresh()
}, { immediate: true })


watch(
  user,
  (newUser) => {
    if (!newUser) return


    if (!editBio.value) {
      currentBio.value = newUser.bio || ''
    }
    if (!editName.value) {
      currentName.value = newUser.displayName || ''
    }
  },
  { immediate: true }
)

</script>