<template>
  <div class="pointer-events-none absolute inset-0 z-[150] flex items-center justify-center px-8">
    <div class="pointer-events-auto flex max-w-3xl flex-col items-center text-center text-white">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="square"
        stroke-linejoin="miter"
        class="mb-5 h-9 w-9 text-white opacity-80"
        aria-hidden="true"
      >
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>

      <div class="font-mono text-[10px] font-bold uppercase tracking-[0.34em] opacity-50">
        {{ locale === 'ru' ? 'СДЕЛКИ НЕ НАЙДЕНЫ' : 'NO TRADES FOUND' }}
      </div>

      <ExHeading
        level="h2"
        variant="cinematic"
        class="mt-4 !max-w-3xl text-balance !text-sm !font-light !leading-relaxed !tracking-[0.08em] md:!text-base"
      >
        {{ title }}
      </ExHeading>

      <button
        type="button"
        class="group mt-8 flex h-9 items-center gap-2.5 border border-white/45 bg-black/20 px-4 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-white transition-all hover:border-white hover:bg-white hover:text-black"
        :aria-label="locale === 'ru' ? 'Добавить сделку' : 'Add trade'"
        @click="$emit('add-trade')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>{{ locale === 'ru' ? 'ДОБАВИТЬ СДЕЛКУ' : 'ADD TRADE' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import ExHeading from '~/shared/ui/ExHeading.vue'

defineProps<{
  locale: string
  title: string
}>()
defineEmits<{ 'add-trade': [] }>()
</script>
