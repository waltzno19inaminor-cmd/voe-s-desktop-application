<template>
    <div class="min-h-screen flex flex-col">
    <Header />
    <main class="grow">
        <DiaryMain />
    </main>
    <Footer />
    </div>
</template>
    
<script setup lang="ts">
import Header from '@/widgets/header/ui/Header.vue'
import Footer from '@/widgets/footer/Footer.vue'
import DiaryMain from '@/widgets/diary/ui/DiaryMain.vue'


</script>
