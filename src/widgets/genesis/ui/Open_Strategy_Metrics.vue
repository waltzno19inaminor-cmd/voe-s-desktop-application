<template>
  <div class="osp-metrics-panel font-mono" :class="[isDark ? 'osp-dark' : 'osp-light', { 'osp-minimal': minimal, 'osp-transparent': transparent }]">

    <!-- PANEL HEADER -->
    <div class="osp-header" v-if="!minimal">
      <div class="osp-header-left">
        <div class="osp-diamond" :class="{ 'osp-diamond--pulse': isLive }"></div>
        <div class="osp-header-titles">
          <span class="osp-label-micro">Strategy_Diagnostics // {{ version }}</span>
          <span class="osp-header-name">{{ strategyName }}</span>
        </div>
      </div>
      <div class="osp-header-right">
        <button v-if="editable" @click="$emit('edit')" class="osp-edit-btn">
          [ CONFIG_METRICS ]
        </button>
        <span class="osp-status-badge osp-status--stable" v-if="isLive">
          <span class="osp-status-dot"></span>
          ACTIVE
        </span>
      </div>
    </div>

    <!-- SCAN LINE ACCENT -->
    <div class="osp-scanline" v-if="!minimal"></div>

    <!-- DYNAMIC CATEGORY GROUPS -->
    <div class="osp-content">
      <template v-for="(group, idx) in groupedMetrics" :key="group.name">
        <div class="osp-category-section">
          <!-- Category Header -->
          <div class="osp-category-header" v-if="!minimal">
            <div class="osp-category-line"></div>
            <span class="osp-label-micro">{{ ['I', 'II', 'III', 'IV', 'V'][idx] || '*' }}. {{ group.name }}_Metrics</span>
          </div>

          <!-- Category Grid -->
          <div class="osp-kpi-grid" :style="minimal ? { gridTemplateColumns: `repeat(${group.items?.length || 0}, 1fr)` } : {}">
            <div
              v-for="kpi in group.items"
              :key="kpi.key"
              class="osp-kpi-card"
              :class="{ 'osp-kpi-card--active': selectedMetricKey === kpi.key }"
              role="button"
              tabindex="0"
              @click="$emit('metric-select', kpi.key)"
              @keydown.enter.prevent="$emit('metric-select', kpi.key)"
              @keydown.space.prevent="$emit('metric-select', kpi.key)"
            >
              <div class="osp-kpi-inner">
                <!-- Top micro label -->
                <span class="osp-label-micro osp-muted">{{ kpi.label.replace(/_/g, ' ') }}</span>
                <!-- Value -->
                <span class="osp-kpi-value" :style="{ color: selectedMetricKey === kpi.key ? 'var(--osp-bg)' : kpi.colorVal(values, isDark) }">
                  {{ kpi.valStr(values) }}
                </span>
                <!-- Sublabel / eval -->
                <div class="osp-kpi-eval">
                  <div class="osp-kpi-bar">
                    <div class="osp-kpi-bar-fill" :style="{ width: '50%', backgroundColor: selectedMetricKey === kpi.key ? 'var(--osp-bg)' : kpi.colorVal(values, isDark) }"></div>
                  </div>
                  <span class="osp-label-nano osp-muted">{{ kpi.evalStr(values).toUpperCase() }}</span>
                </div>
              </div>
              <!-- Corner bracket accents -->
              <div class="osp-corner osp-corner-tl"></div>
              <div class="osp-corner osp-corner-br"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state if no metrics selected -->
      <div v-if="metrics.length === 0" class="osp-empty-state">
        <span class="osp-label-micro osp-muted">NO_METRICS_CONFIGURED</span>
        <button v-if="editable" @click="$emit('edit')" class="osp-edit-btn mt-4">
          [ SELECT_METRICS ]
        </button>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="osp-footer" v-if="!minimal">
      <div class="osp-footer-stat">
        <span class="osp-label-nano osp-muted">Active_Metrics</span>
        <span class="osp-footer-val">{{ metrics.length }}</span>
      </div>
      <div class="osp-footer-corner"></div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MetricConfig {
  key: string;
  label: string;
  sub: string;
  desc: string;
  formula: string;
  valStr: (m: any) => string;
  tooltipValStr?: (m: any) => string;
  colorClass: (m: any) => string;
  colorVal: (m: any, isDark: boolean) => string;
  evalStr: (m: any) => string;
  evalClass: (m: any) => string;
  benchmarks: { label: string; eval: string; class: string }[];
  category?: string;
}

interface Props {
  isDark?: boolean;
  strategyName?: string;
  isLive?: boolean;
  version?: string;
  metrics?: MetricConfig[];
  values?: any;
  editable?: boolean;
  minimal?: boolean;
  transparent?: boolean;
  selectedMetricKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isDark: true,
  strategyName: 'Unknown_Strategy',
  isLive: false,
  version: 'v2.0',
  metrics: () => [],
  values: () => ({}),
  editable: true,
  minimal: false,
  transparent: false,
  selectedMetricKey: ''
})

const emit = defineEmits(['edit', 'metric-select'])

const groupedMetrics = computed(() => {
  const groups: Record<string, MetricConfig[]> = {}
  
  props.metrics.forEach(m => {
    const cat = m.category || 'General'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  })

  // Sort groups: Primary first, Advanced second, Expert third, then others
  const order = ['Primary', 'Advanced', 'Expert', 'General']
  return Object.keys(groups)
    .sort((a, b) => {
      let ia = order.indexOf(a)
      let ib = order.indexOf(b)
      if (ia === -1) ia = 99
      if (ib === -1) ib = 99
      return ia - ib
    })
    .map(name => ({
      name,
      items: groups[name]
    }))
})

</script>

<style scoped>
/* ──────────────────────────────────────────────────
   OSP: Open_Strategy_Metrics  – Design System
   ────────────────────────────────────────────────── */

/* Theme tokens */
.osp-dark {
  --osp-bg:        #0a0a0a;
  --osp-bg-card:   rgba(18, 18, 18, 0.92);
  --osp-bg-hover:  rgba(255,255,255,0.06);
  --osp-text:      #ffffff;
  --osp-muted:     rgba(255,255,255,0.35);
  --osp-border:    rgba(255,255,255,0.10);
  --osp-border-strong: rgba(255,255,255,0.22);
  --osp-win:       #34d399;
  --osp-loss:      #f87171;
  --osp-accent:    #38bdf8;
}
.osp-light {
  --osp-bg:        #FFFFFF;
  --osp-bg-card:   rgba(255,255,255,0.92);
  --osp-bg-hover:  rgba(0,0,0,0.04);
  --osp-text:      #1a1a18;
  --osp-muted:     rgba(0,0,0,0.35);
  --osp-border:    rgba(0,0,0,0.10);
  --osp-border-strong: rgba(0,0,0,0.22);
  --osp-win:       #059669;
  --osp-loss:      #dc2626;
  --osp-accent:    #0284c7;
}

/* Base wrapper */
.osp-metrics-panel {
  background: var(--osp-bg);
  color: var(--osp-text);
  border: 1px solid var(--osp-border-strong);
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  overflow: visible;
  width: 100%;
}

/* ── Type helpers ── */
.osp-label-micro {
  font-size: 9px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  font-weight: 700;
}
.osp-label-nano {
  font-size: 7px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  font-weight: 600;
}
.osp-muted { color: var(--osp-muted); }

/* ── Scan line ── */
.osp-scanline {
  height: 1px;
  background: linear-gradient(to right, transparent, var(--osp-border-strong), transparent);
}

/* ── Header ── */
.osp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--osp-border);
  background: rgba(255,255,255,0.02);
}
.osp-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.osp-diamond {
  width: 8px;
  height: 8px;
  background: var(--osp-text);
  transform: rotate(45deg);
  flex-shrink: 0;
}
.osp-diamond--pulse {
  animation: osp-pulse 2s ease-in-out infinite;
}
@keyframes osp-pulse {
  0%, 100% { opacity: 1; transform: rotate(45deg) scale(1); }
  50%       { opacity: 0.4; transform: rotate(45deg) scale(0.8); }
}
.osp-header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.osp-header-name {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.osp-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.osp-edit-btn {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--osp-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}
.osp-edit-btn:hover {
  color: var(--osp-text);
}

/* Status badge */
.osp-status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid currentColor;
}
.osp-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: osp-pulse 1.5s ease-in-out infinite;
}
.osp-status--optimal  { color: var(--osp-win);    border-color: var(--osp-win); }
.osp-status--stable   { color: var(--osp-accent);  border-color: var(--osp-accent); }
.osp-status--neutral  { color: var(--osp-muted);   border-color: var(--osp-muted); }
.osp-status--critical { color: var(--osp-loss);   border-color: var(--osp-loss); }

/* ── Content ── */
.osp-content {
  display: flex;
  flex-direction: column;
}

.osp-category-section {
  border-bottom: 1px solid var(--osp-border);
}
.osp-category-section:last-child {
  border-bottom: none;
}

.osp-category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 10px;
  background: rgba(255, 255, 255, 0.01);
}
.osp-category-line {
  width: 16px;
  height: 1px;
  background: var(--osp-text);
  opacity: 0.4;
}

.osp-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--osp-border);
}

.osp-kpi-card {
  position: relative;
  padding: 18px 20px 14px;
  border-right: 1px solid var(--osp-border);
  border-bottom: 1px solid var(--osp-border);
  background: var(--osp-bg-card);
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  overflow: visible;
  cursor: pointer;
}
/* Handle borders for 4 columns */
.osp-kpi-card:nth-child(4n) { border-right: none; }
/* Remove bottom border for the last row items */
/* A bit complex with dynamic items, but good enough for now. */

.osp-kpi-card:hover { background: var(--osp-bg-hover); }
.osp-kpi-card--active,
.osp-kpi-card--active:hover {
  background: var(--osp-text);
  color: var(--osp-bg);
  border-color: var(--osp-text);
}
.osp-kpi-card--active .osp-muted,
.osp-kpi-card--active .osp-label-micro,
.osp-kpi-card--active .osp-label-nano {
  color: var(--osp-bg);
  opacity: 0.68;
}
.osp-kpi-card--active .osp-kpi-value {
  color: var(--osp-bg);
}
.osp-kpi-card--active .osp-kpi-bar {
  background: color-mix(in srgb, var(--osp-bg) 24%, transparent);
}
.osp-kpi-card--active .osp-corner-tl,
.osp-kpi-card--active .osp-corner-br {
  border-color: var(--osp-bg);
}

.osp-kpi-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}
.osp-kpi-value {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.2;
  transition: color 0.5s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.osp-kpi-eval {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.osp-kpi-bar {
  height: 2px;
  background: var(--osp-border);
  border-radius: 0;
  overflow: hidden;
}
.osp-kpi-bar-fill {
  height: 100%;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s ease;
}

/* KPI corner brackets */
.osp-corner {
  position: absolute;
  width: 8px;
  height: 8px;
}
.osp-corner-tl { top: 4px; left: 4px; border-top: 1px solid var(--osp-border-strong); border-left: 1px solid var(--osp-border-strong); }
.osp-corner-br { bottom: 4px; right: 4px; border-bottom: 1px solid var(--osp-border-strong); border-right: 1px solid var(--osp-border-strong); }

.osp-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

/* ── Footer ── */
.osp-footer {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  gap: 0;
  background: rgba(255,255,255,0.015);
  position: relative;
  border-top: 1px solid var(--osp-border);
}
.osp-footer-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 20px 0 0;
}
.osp-footer-val {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.05em;
}
.osp-footer-corner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-right: 1px solid var(--osp-border-strong);
  border-bottom: 1px solid var(--osp-border-strong);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .osp-kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .osp-kpi-card:nth-child(4n) { border-right: 1px solid var(--osp-border); }
  .osp-kpi-card:nth-child(3n) { border-right: none; }
}
@media (max-width: 768px) {
  .osp-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .osp-kpi-card:nth-child(3n) { border-right: 1px solid var(--osp-border); }
  .osp-kpi-card:nth-child(2n) { border-right: none; }
}
@media (max-width: 480px) {
  .osp-kpi-grid { grid-template-columns: 1fr; }
  .osp-kpi-card { border-right: none !important; }
}

/* Minimal mode overrides */
.osp-minimal.osp-metrics-panel {
  padding: 0;
}
.osp-minimal .osp-kpi-card {
  padding: 8px 12px 6px;
}
.osp-minimal .osp-kpi-inner {
  gap: 2px;
}

/* Transparent variant overrides */
.osp-transparent.osp-metrics-panel {
  background: transparent !important;
  border: none !important;
}
.osp-transparent .osp-kpi-grid {
  border-top: none !important;
}
.osp-transparent .osp-kpi-card {
  background: transparent !important;
  border-right-color: var(--osp-border) !important;
  border-bottom-color: var(--osp-border) !important;
}
.osp-transparent .osp-kpi-card:hover {
  background: var(--osp-bg-hover) !important;
}
.osp-transparent .osp-kpi-card--active,
.osp-transparent .osp-kpi-card--active:hover {
  background: var(--osp-text) !important;
  border-color: var(--osp-text) !important;
  color: var(--osp-bg) !important;
}
.osp-transparent .osp-kpi-card--active .osp-muted,
.osp-transparent .osp-kpi-card--active .osp-label-micro,
.osp-transparent .osp-kpi-card--active .osp-label-nano,
.osp-transparent .osp-kpi-card--active .osp-kpi-value {
  color: var(--osp-bg) !important;
}
.osp-transparent .osp-kpi-card--active .osp-corner-tl,
.osp-transparent .osp-kpi-card--active .osp-corner-br {
  border-color: var(--osp-bg) !important;
}
</style>
