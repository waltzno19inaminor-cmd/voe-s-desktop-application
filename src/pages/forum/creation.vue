<template>
    <div class="min-h-screen flex flex-col">
        <Header/>
        <CreationPage class="grow" />
        <Footer/>
     </div>
</template>

<script setup>
import CreationPage from "~/widgets/creation/ui/CreationPage.vue";
import Header from "~/widgets/header/ui/Header.vue";
import Footer from "~/widgets/footer/Footer.vue";
</script>
