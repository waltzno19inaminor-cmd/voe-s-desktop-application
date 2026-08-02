<template>
  <div @click="handleNodeClick"
       :class="[
         'journal-node group relative cursor-pointer transition-colors duration-500 ease-out',
         node.signal ? 'signal-node-card -mx-3 px-3 py-3' : 'py-8 hover:bg-current/[0.02]'
      ]">
    <div :class="['flex flex-col', node.signal ? 'space-y-2' : 'space-y-4']">
      <!-- Metadata Rail -->
      <div
        v-if="node.signal"
        class="flex items-center justify-between font-mono tracking-[0.18em] uppercase"
      >
        <span v-if="node.author" class="inline-flex min-w-0 items-center gap-2 text-[10px] font-semibold text-current/90">
          <span class="truncate">{{ node.author }}</span>
          <ExUserStatusBadge v-if="node.authorStatus" :status="node.authorStatus" />
        </span>
        <span class="text-[9px] font-semibold text-current/80">{{ nodeLabels.published }} {{ formatNodeDate(node.lastActivityAt) }}</span>
      </div>
      <div v-else class="flex items-center justify-between font-mono uppercase">
        <span v-if="node.author" class="inline-flex min-w-0 items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-current/90">
          <span class="truncate">{{ node.author }}</span>
          <ExUserStatusBadge v-if="node.authorStatus" :status="node.authorStatus" />
        </span>
        <span class="text-[7px] tracking-[0.4em] opacity-40">{{ nodeLabels.published }} {{ formatNodeDate(node.lastActivityAt) }}</span>
      </div>

      <!-- Main Headline -->
      <h3
        v-if="node.signal"
        class="signal-node-asset text-2xl font-mono text-current opacity-90 leading-tight tracking-tight group-hover:opacity-100"
      >
        {{ node.signal.asset }}
      </h3>
      <h3 v-else class="text-2xl font-serif italic text-current opacity-90 leading-tight tracking-tight group-hover:opacity-100 transition-all duration-300 transform origin-left group-hover:scale-[1.03]">
        {{ node.title }}
      </h3>

      <!-- Content Snippet -->
      <div class="flex-grow">
        <!-- Signal: Price Ticket -->
        <div v-if="node.signal" class="my-2">
          <div class="flex min-w-0 items-baseline gap-3">
            <span :class="['text-2xl font-mono leading-none', getSignalDirectionClass(node)]">
              {{ getSignalArrow(node) }} {{ formatSignalPrice(node, node.signal.targetPrice) }}
            </span>
            <span class="min-w-0 truncate text-sm font-mono text-current/50">
              {{ formatSignalPrice(node, node.signal.entryPrice) }}
            </span>
          </div>
          <p class="mt-2 line-clamp-2 text-[11px] font-serif italic leading-relaxed text-current/50">
            "{{ node.signal.description }}"
          </p>
        </div>

        <!-- Setup: Technical Ledger -->
        <div v-else-if="node.mode === 'SETUP'" class="my-4 py-4 flex items-center space-x-12">
          <div class="flex flex-col">
            <span class="text-[6px] font-mono opacity-20 uppercase tracking-widest">{{ nodeLabels.pricingPillar }}</span>
            <span class="text-lg font-mono opacity-60">{{ node.setupLevels?.tp }}</span>
          </div>
          <div class="flex flex-col pl-12">
            <span class="text-[6px] font-mono opacity-20 uppercase tracking-widest">{{ nodeLabels.riskBarrier }}</span>
            <span class="text-lg font-mono opacity-60">{{ node.setupLevels?.sl }}</span>
          </div>
        </div>

        <!-- Research: Metric Index -->
        <div v-if="node.mode === 'RESEARCH'" class="my-4 flex flex-wrap gap-x-8 gap-y-2">
          <div v-for="metric in node.metrics" :key="metric.label" class="flex items-center space-x-3">
            <span class="text-[8px] font-serif italic opacity-40">{{ metric.label }}</span>
            <span class="text-[10px] font-mono opacity-60">{{ metric.value }}%</span>
          </div>
        </div>

        <!-- Lesson: Protocol Steps -->
        <div v-if="node.mode === 'LESSON'" class="my-4 flex items-center space-x-6 overflow-hidden">
          <div v-for="(step, sIdx) in node.steps?.slice(0, 3)" :key="sIdx" class="flex items-center space-x-4 shrink-0">
            <span class="text-[9px] font-mono opacity-20 leading-none">0{{ sIdx + 1 }}</span>
            <span class="text-[10px] font-serif italic opacity-50 uppercase tracking-widest">{{ step }}</span>
            <span v-if="sIdx < 2" class="w-4 h-px bg-current/10"></span>
          </div>
        </div>

        <p v-if="!node.signal" class="text-[11px] font-serif italic text-current/50 leading-relaxed tracking-wide mt-2 line-clamp-2">
          "{{ node.thesis_brief }}"
        </p>
      </div>

      <!-- Footer Telemetry -->
      <div v-if="!node.signal" class="flex items-center justify-end gap-6 pt-4">
        <div class="flex items-center space-x-8 text-[9px] font-serif italic tracking-widest">
          <span class="text-current/60">{{ node.repliesCount }} {{ nodeLabels.comments }}</span>
          <span class="font-mono text-[11px] font-semibold not-italic text-current/90">{{ node.likesCount }} {{ nodeLabels.likes }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '~/shared/i18n/useI18n'
import type { ExNode } from '../model/exnode.types'
import ExUserStatusBadge from '~/entities/user/ui/ExUserStatusBadge.vue'

const props = defineProps<{
  node: ExNode
}>()

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const nodeLabels = computed(() => locale.value === 'ru'
  ? {
      pricingPillar: 'Ценовой ориентир',
      riskBarrier: 'Уровень риска',
      comments: 'комментов',
      likes: 'лайков',
      published: 'Опубл.'
    }
  : {
      pricingPillar: 'Pricing Pillar',
      riskBarrier: 'Risk Barrier',
      comments: 'comments',
      likes: 'likes',
      published: 'Pub.'
    })

const getSignalDirectionClass = (node: ExNode) => node.signal?.direction === 'up'
  ? 'text-emerald-500'
  : 'text-red-500'

const getSignalArrow = (node: ExNode) => node.signal?.direction === 'up' ? '↑' : '↓'

const formatNodeDateTime = (value: string) => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const formatNodeDate = (value: string) => new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(value))

const formatSignalPrice = (node: ExNode, price: number) => {
  const precision = node.signal?.pricePrecision ?? (price < 10 ? 4 : price < 100 ? 2 : 0)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(price)

  return node.signal?.quoteCurrency ? `${formatted} ${node.signal.quoteCurrency}` : formatted
}

const handleNodeClick = () => {
  router.replace({
    query: {
      ...route.query,
      nodeId: props.node.id
    }
  })
}
</script>

<style scoped>
.journal-node {
  /* Newspaper style vertical spacing */
  margin-bottom: 0;
}

/* Custom underline that grows on hover */
h3 {
  position: relative;
  display: inline-block;
}

h3::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: currentColor;
  opacity: 0.2;
  transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.journal-node:hover h3::after {
  width: 100%;
}

.signal-node-asset {
  transform-origin: left center;
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.signal-node-card:hover .signal-node-asset {
  transform: scale(1.045);
}
</style>
