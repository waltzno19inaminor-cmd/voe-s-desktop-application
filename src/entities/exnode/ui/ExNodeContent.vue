<template>
  <div class="exnode-content flex flex-col relative">
    
    <!-- Reader Header Toolbar -->
    <div class="flex items-center justify-between border-b border-current/10 py-6 px-12 bg-current/[0.01]">
      <button @click="$emit('back')" class="flex items-center space-x-4 text-current/40 hover:text-current transition-all group">
        <span class="text-xl opacity-30 group-hover:-translate-x-1 transition-transform">←</span>
        <span class="text-[9px] tracking-[0.4em] uppercase">{{ contentLabels.returnToJournal }}</span>
      </button>

      <div class="flex items-center space-x-12">
        <div class="flex items-center space-x-6">
          <button class="text-[9px] tracking-[0.4em] opacity-40 hover:opacity-100 uppercase transition-opacity">{{ contentLabels.exportArchive }}</button>
          <button class="text-[9px] tracking-[0.4em] opacity-40 hover:opacity-100 uppercase transition-opacity">{{ contentLabels.syncNode }}</button>
        </div>
      </div>
    </div>

    <!-- Reader Body -->
    <div class="py-16 px-12 lg:px-24">
      <div class="max-w-4xl mx-auto space-y-16">
        
        <!-- Article Header -->
        <header class="space-y-8 text-center">
          <h1 class="text-5xl lg:text-7xl font-serif italic text-current leading-tight tracking-tight drop-shadow-sm">
            {{ node.title }}
          </h1>

          <div class="flex items-center justify-center space-x-10 text-[8px] font-mono tracking-[0.32em] uppercase pt-4">
             <span class="font-semibold text-current/80">{{ contentLabels.likes }}: {{ node.likesCount }}</span>
             <span class="w-1 h-1 bg-current opacity-20 rounded-full"></span>
             <span class="text-current/40">{{ contentLabels.comments }}: {{ node.repliesCount }}</span>
             <span class="w-1 h-1 bg-current opacity-20 rounded-full"></span>
             <span class="text-current/40">{{ contentLabels.published }}: {{ formatContentDate(node.lastActivityAt) }}</span>
          </div>
        </header>

        <!-- Dynamic Mode-Specific Block -->
        <div class="mode-specific-ledger">
           <!-- Setup Block -->
           <div v-if="node.signal" class="p-10 border border-current/10 bg-current/[0.02] flex flex-col gap-8">
             <div class="flex items-end justify-between gap-8">
               <div class="flex flex-col">
                 <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest mb-2">{{ contentLabels.signalAsset }}</span>
                 <span class="text-4xl font-mono text-current opacity-70">{{ node.signal.asset }}</span>
               </div>
               <div class="flex flex-col items-end text-right">
                 <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest mb-2">{{ contentLabels.signalTarget }}</span>
                 <span :class="['text-4xl font-mono', getSignalDirectionClass()]">
                   {{ getSignalArrow() }} {{ formatSignalPrice(node.signal.targetPrice) }}
                 </span>
               </div>
             </div>
             <div class="flex items-center justify-between border-t border-current/10 pt-6">
               <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">{{ contentLabels.signalSource }}</span>
               <span class="text-xl font-mono text-current/50">{{ formatSignalPrice(node.signal.entryPrice) }}</span>
             </div>
             <p class="text-base font-serif italic leading-relaxed text-current/60">
               "{{ node.signal.description }}"
             </p>
           </div>

           <div v-else-if="node.mode === 'SETUP'" class="p-10 border border-current/10 bg-current/[0.02] flex items-center justify-around">
             <div class="flex flex-col items-center">
               <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest mb-2">{{ contentLabels.buyEntry }}</span>
               <span class="text-4xl font-mono text-current opacity-60">{{ node.setupLevels?.tp }}</span>
             </div>
             <div class="w-px h-16 bg-current/10"></div>
             <div class="flex flex-col items-center">
               <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest mb-2">{{ contentLabels.invalidation }}</span>
               <span class="text-4xl font-mono text-current opacity-60">{{ node.setupLevels?.sl }}</span>
             </div>
           </div>

           <!-- Research Metrics -->
           <div v-if="node.mode === 'RESEARCH'" class="grid grid-cols-3 gap-8">
              <div v-for="metric in node.metrics" :key="metric.label" class="p-8 border border-current/10 bg-current/[0.02] flex flex-col items-center">
                <span class="text-[8px] font-serif italic opacity-30 uppercase tracking-widest mb-1">{{ metric.label }}</span>
                <span class="text-4xl font-serif italic opacity-60">{{ metric.value }}%</span>
              </div>
           </div>

           <!-- Lesson Path -->
           <div v-if="node.mode === 'LESSON'" class="relative flex justify-between py-12 px-8 overflow-x-auto scrollbar-hide">
              <div class="absolute top-1/2 left-0 w-full h-px bg-current/10 -translate-y-1/2"></div>
              <div v-for="(step, sIdx) in node.steps" :key="sIdx" 
                   @click="scrollToStep(sIdx + 1)"
                   class="relative z-10 flex flex-col items-center space-y-4 cursor-pointer group/step">
                <div class="w-12 h-12 rounded-full border border-current/20 nier-bg-panel text-current flex items-center justify-center text-sm font-mono shadow-xl transition-all group-hover/step:scale-110 group-hover/step:border-current/60">
                  {{ sIdx + 1 }}
                </div>
                <span class="text-[8px] font-serif italic opacity-40 uppercase tracking-widest group-hover/step:opacity-100 transition-opacity">{{ step }}</span>
              </div>
           </div>
        </div>

        <!-- Narrative Blocks -->
        <div class="editorial-body space-y-12">
          <div v-for="(block, bIdx) in node.blocks" :key="bIdx" class="block-render relative scroll-mt-32"
               :id="block.type === 'header' && block.text.startsWith('Step') ? `step-anchor-${block.text.match(/\d+/)?.[0]}` : undefined">
            <h2 v-if="block.type === 'header'" 
                :class="[
                  block.level === 1 ? 'text-4xl' : block.level === 2 ? 'text-3xl' : 'text-xl',
                  'font-serif italic text-current opacity-80 mb-6'
                ]">
                {{ block.text }}
            </h2>

            <p v-if="block.type === 'paragraph'" class="text-base lg:text-lg font-serif italic text-current/60 leading-relaxed indent-8 first:indent-0">
               {{ block.text }}
            </p>

            <blockquote v-if="block.type === 'quote'" class="p-12 border-y border-current/10 relative my-12 text-center">
               <div class="text-2xl font-serif italic text-current opacity-70 leading-relaxed">
                 "{{ block.text }}"
               </div>
               <cite v-if="block.author" class="block mt-6 text-[9px] font-mono tracking-[0.4em] opacity-30 uppercase relative z-10">
                 — {{ block.author }}
               </cite>
            </blockquote>

            <div v-if="block.type === 'divider'" class="flex items-center justify-center space-x-4 py-8">
               <div class="w-8 h-px bg-current opacity-10"></div>
               <div class="w-1 h-1 bg-current opacity-20 rounded-full"></div>
               <div class="w-8 h-px bg-current opacity-10"></div>
            </div>
          </div>
        </div>

        <!-- Journal Signature -->
        <footer class="pt-24 pb-12 text-center flex flex-col items-center space-y-6">
           <div class="w-12 h-px bg-current opacity-10"></div>
           <p class="text-[9px] font-serif italic opacity-30 tracking-[0.2em] max-w-sm">
             {{ contentLabels.footerNote }}
           </p>
           <div class="flex items-center space-x-4 text-[7px] font-mono tracking-[0.5em] opacity-20 uppercase">
              <span>0x8A_REIFY</span>
              <span class="text-[10px]">◊</span>
              <span>SYN_0001</span>
           </div>
        </footer>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import type { ExNode } from '../model/exnode.types'

const props = defineProps<{
  node: ExNode
}>()

defineEmits(['back'])

const { locale } = useI18n()

const contentLabels = computed(() => locale.value === 'ru'
  ? {
      returnToJournal: 'Вернуться в журнал',
      exportArchive: 'Экспорт_архива',
      syncNode: 'Синхронизировать_узел',
      likes: 'Лайки',
      comments: 'Комменты',
      published: 'Опубл.',
      buyEntry: 'Вход_покупки // Цель_Z',
      invalidation: 'Отмена // Void_X',
      signalAsset: 'Актив',
      signalTarget: 'Ближайшая цель',
      signalSource: 'Цена прогноза',
      footerNote: 'Интеллект сохранен в Небесном архиве. Целостность документа подтверждена протоколом равновесия.'
    }
  : {
      returnToJournal: 'Return to The Journal',
      exportArchive: 'Export_Arch',
      syncNode: 'Sync_Node',
      likes: 'Likes',
      comments: 'Comments',
      published: 'Pub.',
      buyEntry: 'Buy_Entry // Target_Z',
      invalidation: 'Invalidation // Void_X',
      signalAsset: 'Asset',
      signalTarget: 'Nearest target',
      signalSource: 'Source price',
      footerNote: 'Intelligence reified in the Celestial Archive. Document integrity verified by the Equilibrium Protocol.'
    })

const getSignalDirectionClass = () => props.node.signal?.direction === 'up'
  ? 'text-emerald-500'
  : 'text-red-500'

const getSignalArrow = () => props.node.signal?.direction === 'up' ? '↑' : '↓'

const formatSignalPrice = (price: number) => {
  const signal = props.node.signal
  const precision = signal?.pricePrecision ?? (price < 10 ? 4 : price < 100 ? 2 : 0)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(price)

  return signal?.quoteCurrency ? `${formatted} ${signal.quoteCurrency}` : formatted
}

const formatContentDate = (value: string) => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(value))

const scrollToStep = (stepNum: number) => {
  const el = document.getElementById(`step-anchor-${stepNum}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.exnode-content {
  background: transparent;
  color: var(--text-primary);
}

.scroll-minimal::-webkit-scrollbar { display: none; }
.scroll-minimal { scrollbar-width: none; }

.editorial-body p {
  hyphens: auto;
}

/* Custom quote markers */
blockquote::before {
  content: '«';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 3rem;
  opacity: 0.05;
  font-serif: serif;
}
</style>
