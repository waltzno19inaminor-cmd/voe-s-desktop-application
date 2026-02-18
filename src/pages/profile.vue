<template>
    
        <Header />
        <ClientOnly> 
            <MainProfile class="grow"/>
        </ClientOnly>
        <Footer/>
   

</template>


<script lang="ts" setup>

import Header from "~/widgets/header/ui/Header.vue";
import Footer from "~/widgets/footer/Footer.vue";
import MainProfile from "~/widgets/profile/ui/MainProfile.vue";

</script>