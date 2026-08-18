<template>
  <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#050505] to-[#1e1e1e] dark:from-[#0a0a0a] dark:to-[#0f0f0f] p-3 shadow-sm border border-white/5 dark:border-white/10 group h-full flex items-center">
    
    <!-- Background Gradient Accent -->
    <div class="absolute -top-12 -left-12 w-32 h-32 bg-[#FF424D]/10 dark:bg-[#FF424D]/5 rounded-full blur-2xl group-hover:bg-[#FF424D]/20 transition duration-700 pointer-events-none"></div>

    <div class="relative z-10 flex items-center justify-between w-full gap-6">
      
      <div class="flex items-center gap-4">
        <!-- Feature Icon/Graphic -->
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF424D]/10 border border-[#FF424D]/20 text-[#FF424D] shrink-0">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 .48c0 0 0 23.04 0 23.04h5.504V.48H0zm16.512 0C12.38 .48 9.032 3.824 9.032 7.952c0 4.124 3.348 7.468 7.48 7.468 4.124 0 7.468-3.344 7.468-7.468C23.98 3.824 20.636.48 16.512.48z"/>
          </svg>
        </div>

        <div class="flex flex-col">
          <h2 class="text-xs font-serif tracking-wide text-white flex items-center gap-2 m-0 shrink-0 mb-0.5">
            Support on Patreon
            <span class="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-[0.15em] bg-[#FF424D]/20 text-[#FF424D] border border-[#FF424D]/30">
              Premium
            </span>
          </h2>
          <p class="text-[9px] text-[#888] tracking-wide leading-tight hidden xl:block">
            Buy the subscription and get the latest version of the app.
          </p>
        </div>
      </div>

      <a
        href="https://www.patreon.com/cw/jlgandr"
        target="_blank"
        rel="noopener noreferrer"
        class="relative overflow-hidden shrink-0 px-4 py-1.5 rounded-full bg-white dark:bg-[#e0e0e0] text-[#050505] text-[9px] uppercase tracking-[0.15em] font-bold transition-all hover:scale-105 shadow-lg active:scale-95"
      >
        Subscribe
        <!-- Subtle Shine -->
        <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shine_1.5s_ease-in-out]"></div>
      </a>

    </div>
  </div>
</template>

<script setup lang="ts">
// Static banner promoting Patreon subscription
</script>

<style scoped>
@keyframes shine {
  100% {
    transform: translateX(100%);
  }
}
</style>