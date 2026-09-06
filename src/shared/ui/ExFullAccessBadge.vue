<template>
  <span
    class="ex-full-access-badge pointer-events-none absolute -right-2 -top-2 z-20 px-1.5 py-0.5 font-mono text-[6px] font-black uppercase tracking-[0.28em]"
    aria-hidden="true"
  >
    <span class="ex-full-access-badge__label">FULL</span>
  </span>
</template>

<style scoped>
.ex-full-access-badge {
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.ex-full-access-badge__label {
  background: linear-gradient(
    110deg,
    #111111 0%,
    #5b21b6 24%,
    #ec4899 42%,
    #111111 58%,
    #2563eb 78%,
    #111111 100%
  );
  background-size: 250% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: ex-full-access-badge-shimmer 3.2s linear infinite;
}

@keyframes ex-full-access-badge-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -150% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ex-full-access-badge__label {
    animation: none;
  }
}
</style>
