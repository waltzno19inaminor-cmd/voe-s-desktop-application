<template>
    <div class="min-h-screen dark:bg-[#121212] bg-[#f7f5fa]  flex flex-col font-sans text-white selection:bg-white/20">
      <Header />
      
      <main class="flex-grow">
        <ChroniclesMain />
      </main>
  
      <Footer />
    </div>
  </template>
  
  <script setup lang="ts">
  import Header from '~/widgets/header/ui/Header.vue';
  import Footer from '~/widgets/footer/Footer.vue';
  import ChroniclesMain from '~/widgets/chronicles/ui/ChroniclesMain.vue';
  
  useHead({
    title: 'Chronicles | Trading Legends',
    meta: [
      { name: 'description', content: 'Explore the history of famous traders and their strategies.' }
    ]
  });
  </script>