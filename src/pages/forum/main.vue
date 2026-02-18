<template>
  <div class="min-h-screen flex flex-col backdrop-blur-lg px-6">
    <Header class="w-full" />

    <div class="grow">
      <MainForum :threads="threads" v-if="!isSearch && ready"/>
      <List :threads="threads" v-else-if="isSearch && ready"/>
      <div class="w-36 mx-auto grow min-h-96 my-auto flex items-center justify-center" v-else>
          <img src="/logo.svg" class="dark:hidden animate-spin" alt="" />
          <img src="/logo-dark.svg" class="dark:flex hidden animate-spin" alt="" />
      </div>
    </div>
   
    <Footer class="hidden md:block" />
  </div>
   <NuxtPage />
</template>

<script setup>  
import Header from "@/widgets/header/ui/Header.vue";
import Footer from "@/widgets/footer/Footer.vue";
import MainForum from "@/widgets/main-forum/ui/MainForum.vue";
import List from "~/widgets/list/ui/List.vue";
import { watch } from "vue";
import { useRoute } from "vue-router";

import { onMounted , ref, computed} from 'vue'
import { useForumStore } from "~/features/store/useForum";



const forum = useForumStore()

const route = useRoute();

const isSearch = ref(false);
const ready = ref(false)




onMounted(async () => {
  await forum.fetchThreadList()
  ready.value = true
})

const threads = computed(() => {
  return Array.from(forum.threads.values())
})


watch(() => route.query.search, 
() => {
  isSearch.value = !!route.query.search;
},{
  immediate: true
})

</script>
  