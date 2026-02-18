<template>
    <div class="min-h-screen flex flex-col">
         <Header/>
        <main class="grow">
            
        </main>
        <Footer/>
    </div>
  
</template>

<script setup lang="ts">
import Header from "~/widgets/header/ui/Header.vue";
import Footer from "~/widgets/footer/Footer.vue";
import { useRoute } from 'vue-router';

const route = useRoute();
const portraitId = route.params.id;

</script>