<template>
  <footer class="mt-12 border-t border-black/10 dark:border-white/10 ">
    <div class="max-w-6xl w-full mx-auto px-8 py-10 flex flex-col md:flex-row justify-between gap-10">

      <div class="max-w-sm ">
        <div class="w-20 mb-4">
          <img src="/logo.svg" class="dark:hidden" alt="">
          <img src="/logo-dark.svg" class="dark:flex hidden" alt="">
        </div>

        <p class="text-xs leading-relaxed text-black dark:text-[#aaa]">
          A private forum for traders who value discipline, clarity and independent thinking.
          Built for long-term participants, not short-term noise.
        </p>
      </div>

      <div class="flex flex-col md:flex-row gap-8 md:gap-16">

        <div class="flex flex-col">
          <h3 class="text-md md:text-xs  font-serif uppercase tracking-widest mb-4 text-[#121212] dark:text-white">
            Forum
          </h3>
          <nav >
              <ul class="flex-row flex md:flex-col md:space-y-2 space-y-0 md:justify-start justify-between text-md md:text-xs text-[#666] dark:text-[#aaa]">
              <li><a href="/markets" class="hover:text-black dark:hover:text-white transition">Markets</a></li>
              <li><a href="/newbies" class="hover:text-black dark:hover:text-white transition">Newbies</a></li>
              <li><a href="/pro" class="hover:text-black dark:hover:text-white transition">Pro</a></li>
              <li><a href="/education" class="hover:text-black dark:hover:text-white transition">Education</a></li>
              </ul>
          </nav>
        </div>

        <div class="flex flex-col">
          <h3 class="text-md md:text-xs font-serif uppercase tracking-widest mb-4 text-[#121212] dark:text-white">
            About
          </h3>
          <ul class="flex-row flex md:flex-col md:space-y-2 space-y-0 md:justify-start justify-between text-md md:text-xs text-[#666] dark:text-[#aaa]">
            <li><a href="/about" class="hover:text-black dark:hover:text-white transition">Philosophy</a></li>
            <li><a href="/rules" class="hover:text-black dark:hover:text-white transition">Code of conduct</a></li>
            <li><a href="/privacy" class="hover:text-black dark:hover:text-white transition">Privacy</a></li>
          </ul>
        </div>

      </div>

    </div>

    <div class="border-t border-black/10 dark:border-white/10">
      <div class="max-w-6xl mx-auto px-8 py-4 flex justify-end text-[11px] text-[#666] dark:text-[#999]">
      
        <span>© 2026. All rights reserved.</span>
      </div>
    </div>
  </footer>

</template>