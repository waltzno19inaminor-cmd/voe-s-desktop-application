<template>
   
    <div class="flex flex-col min-h-screen backdrop-blur-lg">
     
        <Header class="sticky top-0 dark:bg-[#121212] rounded-b-3xl bg-[#f7f5fa]  transition z-[1000000]"/>
        <Main class="grow " />
        <Footer />
    </div>
</template> 
    


<script setup>
import Header from "@/widgets/header/ui/Header.vue";
import Main from "@/widgets/main/Main.vue";
import Footer from "@/widgets/footer/Footer.vue";


import { computed, onMounted, watch } from 'vue'
import { useForumStore } from "~/features/store/useForum";
import { useAuthStore } from "~/entities/user/auth.store";



const forum = useForumStore()

onMounted(async () => {
  await forum.fetchThreadList()
})



definePageMeta({
  public: true
})




</script>
