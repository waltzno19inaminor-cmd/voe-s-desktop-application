<template>
  <div class="fixed inset-0 z-[5000] bg-white dark:bg-[#050505] nier-text-primary font-mono selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden"
       :class="hasRun ? 'nier-bg-panel' : ''">
    
    <!-- ETHEREAL VIGNETTE (From main app) -->
    <DesignVignette v-if="!showParams" :is-dark="themeStore.settings.isDark" class="z-20 pointer-events-none" />

    <!-- 3D CANVAS LAYER -->
    <canvas ref="canvasRef"
            class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseLeave"
            @wheel="handleWheel">
    </canvas>

    <!-- ETHEREAL VIGNETTE (From main app) -->
    <DesignVignette v-if="!showParams" :is-dark="themeStore.settings.isDark" class="z-20 pointer-events-none" />

    <!-- NAVIGATION CONTROLS -->
    <div class="absolute top-12 left-12 z-50 pointer-events-auto flex items-center space-x-8">
      <button v-if="hasRun" @click="$emit('close')" class="group flex items-center space-x-4 opacity-40 hover:opacity-100 transition-all duration-500">
        <div class="w-2 h-2 border border-black dark:border-white rotate-45 group-hover:bg-black dark:group-hover:bg-white transition-colors"></div>
        <div class="text-[10px] font-mono tracking-[0.4em] uppercase nier-text-primary">EXIT</div>
      </button>

      <button v-if="hasRun && !showParams" @click="showParams = true" class="group flex items-center space-x-4 opacity-40 hover:opacity-100 transition-all duration-500">
        <div class="w-2 h-2 nier-bg-inverted opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div class="text-[10px] font-mono tracking-[0.4em] uppercase nier-text-primary">PARAMETERS</div>
      </button>
    </div>

    <!-- PARAMETERS MODAL (INITIAL STATE) -->
    <Transition name="protocol-slide">
      <div v-if="showParams" 
           class="fixed inset-0 z-[6000] flex items-center justify-center bg-black/40 px-6 transition-all"
           @click.self="hasRun ? showParams = false : $emit('close')">
        <ExPanel variant="light" no-shadow class="!w-[500px] relative overflow-visible">
          <template #header>&nbsp;</template>
          
          <div class="flex flex-col space-y-8 relative z-10 p-4">
            <div class="flex flex-col">
              <span class="text-[8px] font-mono tracking-[0.5em] opacity-40 uppercase">Probabilistic_Projection_Module</span>
              <h2 class="text-xl font-mono tracking-widest uppercase font-black mt-2 nier-text-primary">EQUITY_SIMULATOR</h2>
            </div>

            <div class="flex flex-col space-y-5">
              
              <!-- LOCKED METRICS -->
              <div class="grid grid-cols-2 gap-4 border-b nier-border-primary pb-5">
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Initial Equity [LOCKED]</label>
                  <input type="number" readonly v-model.number="params.initialEquity" class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm focus:outline-none font-bold opacity-60 cursor-not-allowed no-spin-arrows nier-text-primary" />
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Win Prob. (%) [LOCKED]</label>
                  <input type="number" readonly v-model.number="params.winRate" class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm focus:outline-none font-bold opacity-60 cursor-not-allowed no-spin-arrows nier-text-primary" />
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Reward/Risk [LOCKED]</label>
                  <input type="number" step="0.1" readonly v-model.number="params.rewardRisk" class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm focus:outline-none font-bold opacity-60 cursor-not-allowed no-spin-arrows nier-text-primary" />
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Risk/Trade (%) [LOCKED]</label>
                  <input type="number" step="0.1" readonly v-model.number="params.riskPerTrade" class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm focus:outline-none font-bold opacity-60 cursor-not-allowed no-spin-arrows nier-text-primary" />
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Simulation Model [LOCKED]</label>
                  <div class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm font-bold opacity-60 cursor-not-allowed nier-text-primary">
                    {{ simulationModelLabel }}
                  </div>
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-40">Regime Periods [LOCKED]</label>
                  <div class="bg-black/5 dark:bg-white/5 border nier-border-primary px-3 py-2 text-sm font-bold opacity-60 cursor-not-allowed nier-text-primary">
                    {{ simulationRegimeLabel }}
                  </div>
                </div>
              </div>

              <!-- EDITABLE METRICS -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Steps (Trades)</label>
                  <input type="number" v-model.number="params.numTrades" class="bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white font-bold transition-all no-spin-arrows nier-text-primary" />
                </div>
                <div class="flex flex-col space-y-1 group">
                  <label class="text-[8px] uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Paths (Simulations)</label>
                  <input type="number" v-model.number="params.numLines" class="bg-black/5 dark:bg-white/5 border border-black/20 dark:border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white font-bold transition-all no-spin-arrows nier-text-primary" />
                </div>
              </div>

            </div>

            <div class="flex flex-col space-y-3 pt-2">
              <button @click="runSimulation" 
                      class="w-full py-4 nier-bg-inverted nier-text-primary font-mono text-[10px] tracking-[0.5em] uppercase font-black hover:opacity-90 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                INITIATE_PROJECTION
              </button>
              <button @click="hasRun ? showParams = false : $emit('close')" 
                      class="w-full py-3 border border-black/20 dark:border-white/20 nier-text-primary font-mono text-[10px] tracking-[0.5em] uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                CANCEL
              </button>
            </div>
          </div>

          <!-- Background Scan Line -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
            <div class="w-full h-px nier-bg-inverted animate-scan"></div>
          </div>
        </ExPanel>
      </div>
    </Transition>

    <!-- METRICS DASHBOARD (POST-SIMULATION) -->
    <Transition name="protocol-slide">
      <div v-if="!showParams && hasRun" class="absolute bottom-12 left-12 z-40 pointer-events-none">
        <div class="flex flex-col space-y-4 max-w-sm pointer-events-auto">
          
          <div class="border-b border-black/20 dark:border-white/20 pb-3 mb-4">
            <span class="text-[10px] uppercase tracking-[0.4em] opacity-50 font-bold">SIMULATION_RESULTS</span>
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">KELLY CRITERION</span>
              <span class="text-sm font-bold">{{ metrics.kelly.toFixed(2) }}%</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">EXPECTATION (EV)</span>
              <span class="text-sm font-bold">{{ metrics.expectation.toFixed(3) }}R</span>
            </div>
            
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">MEDIAN_PERFORMANCE</span>
              <span class="text-sm font-bold" :class="metrics.medianPerformance > 0 ? 'text-green-500' : 'text-red-500'">{{ metrics.medianPerformance > 0 ? '+' : '' }}{{ metrics.medianPerformance.toFixed(1) }}%</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">AVG_MAX_DRAWDOWN</span>
              <span class="text-sm font-bold text-red-500">-{{ metrics.avgMaxDrawdown.toFixed(1) }}%</span>
            </div>
            
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">WORST_MAX_DRAWDOWN</span>
              <span class="text-sm font-bold text-red-600">-{{ metrics.biggestMaxDrawdown.toFixed(1) }}%</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">RoMaD</span>
              <span class="text-sm font-bold">{{ metrics.romad.toFixed(2) }}</span>
            </div>

            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">MAX_CONS_WINNERS</span>
              <span class="text-sm font-bold text-green-500">{{ metrics.maxConsecutiveWinner }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[8px] uppercase tracking-widest opacity-40 mb-0.5">MAX_CONS_LOSERS</span>
              <span class="text-sm font-bold text-red-500">{{ metrics.maxConsecutiveLoser }}</span>
            </div>
          </div>
          
        </div>
      </div>
    </Transition>

    <Transition name="protocol-slide">
       <div v-if="!showParams && hasRun" class="absolute top-12 right-12 z-40 flex flex-col space-y-2 pointer-events-none text-[9px] uppercase tracking-widest text-right bg-white/80 dark:bg-black/80 backdrop-blur-sm p-3 border nier-border-primary shadow-sm">
          <div class="flex items-center justify-end space-x-2"><span>Best Scenario</span><div class="w-3 h-0.5 bg-green-500"></div></div>
          <div class="flex items-center justify-end space-x-2"><span>Worst Scenario</span><div class="w-3 h-0.5 bg-red-500"></div></div>
          <div class="flex items-center justify-end space-x-2 opacity-30"><span>Simulated Paths</span><div class="w-3 h-0.5 bg-current"></div></div>
       </div>
    </Transition>

    <!-- TOAST NOTIFICATION -->
    <Transition name="protocol-slide">
      <div v-if="showToast" class="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div class="bg-black/90 dark:bg-white/90 nier-text-primary px-6 py-3 font-mono text-[9px] tracking-widest uppercase shadow-lg border border-white/20 dark:border-black/20 backdrop-blur-sm">
          VISUALIZATION OPTIMIZED: RENDERED LAST 50 PATHS FOR CLARITY
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue';
import { useThemeStore } from '~/features/store/useTheme';
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue';
import ExPanel from '~/shared/ui/ExPanel.vue';

const themeStore = useThemeStore();

const props = defineProps<{
  initialEquity: number;
  defaultWinRate: number; // 0 - 100
  defaultRR: number;
  defaultRiskPerTrade: number; // 0 - 100
  historicalTrades?: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const finiteOr = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
}

const calculateDownsideWeightedMedian = (values: number[]): number => {
  const sortedValues = values
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sortedValues.length === 0) return 0;

  const weightedValues = sortedValues.map(value => ({
    value,
    weight: value < 0 ? 2 : 1
  }));
  const totalWeight = weightedValues.reduce((sum, item) => sum + item.weight, 0);
  let cumulativeWeight = 0;

  for (const item of weightedValues) {
    cumulativeWeight += item.weight;
    if (cumulativeWeight >= totalWeight / 2) return item.value;
  }

  return weightedValues[weightedValues.length - 1]?.value ?? 0;
}

const getNormalizedParams = () => ({
  initialEquity: Math.max(0, finiteOr(params.initialEquity, 10000)),
  winRate: clamp(finiteOr(params.winRate, 50), 0, 100),
  rewardRisk: Math.max(0, finiteOr(params.rewardRisk, 0)),
  riskPerTrade: clamp(finiteOr(params.riskPerTrade, 0), 0, 100),
  numTrades: Math.max(0, Math.floor(finiteOr(params.numTrades, 0))),
  numLines: Math.max(1, Math.floor(finiteOr(params.numLines, 1))),
})

const showParams = ref(true);
const hasRun = ref(false);
const showToast = ref(false);
let toastTimeout: number | null = null;

const params = reactive({
  initialEquity: finiteOr(props.initialEquity, 10000),
  winRate: finiteOr(props.defaultWinRate, 50),
  rewardRisk: finiteOr(props.defaultRR, 1.5),
  riskPerTrade: finiteOr(props.defaultRiskPerTrade, 0),
  numTrades: 100,
  numLines: 500,
});

interface SimulationRegime {
  name: string;
  winRate: number;
  rewardRisk: number;
  sampleSize: number;
}

const getTradeTimestamp = (trade: any): number => {
  const rawDate = trade?.dateExit || trade?.date || trade?.createdAt || trade?.timestamp;
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const getTradePnl = (trade: any): number => {
  const candidates = [
    trade?.profitInCurrency,
    trade?.pnl,
    trade?.pnlNum,
    trade?.result,
    trade?.profit,
    trade?.netProfit
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }

  return 0;
}

const buildRegimeModel = (normalized = getNormalizedParams()): SimulationRegime[] => {
  const trades = [...(props.historicalTrades || [])]
    .map(trade => ({ trade, pnl: getTradePnl(trade), timestamp: getTradeTimestamp(trade) }))
    .filter(item => item.pnl !== 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (trades.length < 12) return [];

  const periodCount = clamp(Math.floor(trades.length / 10), 2, 6);
  const periodSize = Math.ceil(trades.length / periodCount);
  const regimes: SimulationRegime[] = [];

  for (let i = 0; i < periodCount; i++) {
    const period = trades.slice(i * periodSize, (i + 1) * periodSize);
    if (period.length < 4) continue;

    const wins = period.filter(item => item.pnl > 0).map(item => item.pnl);
    const losses = period.filter(item => item.pnl < 0).map(item => Math.abs(item.pnl));
    const avgWin = wins.length ? wins.reduce((sum, value) => sum + value, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0;

    regimes.push({
      name: `P${i + 1}`,
      winRate: wins.length / period.length,
      rewardRisk: avgWin > 0 && avgLoss > 0 ? avgWin / avgLoss : normalized.rewardRisk,
      sampleSize: period.length
    });
  }

  return regimes.length >= 2 ? regimes : [];
}

const regimeModel = computed(() => buildRegimeModel());
const simulationModelLabel = computed(() => regimeModel.value.length >= 2 ? 'REGIME_BASED' : 'STATIC_WINRATE');
const simulationRegimeLabel = computed(() => {
  const regimes = regimeModel.value;
  if (regimes.length < 2) return 'NOT_ENOUGH_HISTORY';
  const totalSamples = regimes.reduce((sum, regime) => sum + regime.sampleSize, 0);
  return `${regimes.length} PERIODS / ${totalSamples} TRADES`;
});

const metrics = reactive({
  kelly: 0,
  expectation: 0,
  biggestMaxDrawdown: 0,
  avgMaxDrawdown: 0,
  minEquity: 0,
  maxEquity: 0,
  medianPerformance: 0,
  romad: 0,
  maxConsecutiveWinner: 0,
  maxConsecutiveLoser: 0,
});

let simulations: Float64Array[] = [];
let renderPaths3D: Float32Array[] = [];
let bestPath3D: Float32Array | null = null;
let worstPath3D: Float32Array | null = null;
let bestIndex = -1;
let worstIndex = -1;
let gMin = Infinity;
let gMax = -Infinity;

// --- 3D ENGINE STATE --- //
let rafId: number | null = null;
const isDragging = ref(false);
const currentRotation = ref({ x: 0, y: 0 });
const targetRotation = ref({ x: 0, y: 0 });
const viewScale = ref(2.2);
const viewOffset = ref({ x: 0, y: 0 });

let dragStart = { x: 0, y: 0 };
let rotStart = { x: 0, y: 0 };

interface Point3D { x: number, y: number, z: number }
interface Point2D { x: number, y: number, opacity: number, depth: number }

const rotateX = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos }
}

const rotateY = (p: Point3D, angle: number): Point3D => {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos }
}

const project = (p: Point3D, width: number, height: number): Point2D => {
  const focalLength = 1000
  const z = Math.max(-999, p.z)
  const scale = focalLength / (focalLength + z)
  return {
    x: p.x * scale + width / 2 + viewOffset.value.x,
    y: p.y * scale + height / 2 + viewOffset.value.y,
    opacity: Math.max(0.1, (1000 - z) / 1500),
    depth: p.z
  }
}

// --- MOUSE EVENTS --- //
const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  dragStart = { x: e.clientX, y: e.clientY }
  rotStart = { ...targetRotation.value }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    targetRotation.value.y = rotStart.y - dx * 0.005
    targetRotation.value.x = rotStart.x - dy * 0.005
  }
}

const handleMouseUp = () => { isDragging.value = false }
const handleMouseLeave = () => { isDragging.value = false }

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  viewScale.value = Math.max(0.5, Math.min(10, viewScale.value - e.deltaY * 0.001))
}

function runSimulation() {
  const normalized = getNormalizedParams();
  Object.assign(params, normalized);

  const wr = normalized.winRate / 100;
  const rr = normalized.rewardRisk;
  const rpt = normalized.riskPerTrade / 100;
  const initEq = normalized.initialEquity;
  const nTrades = normalized.numTrades;
  const nLines = normalized.numLines;
  const regimes = buildRegimeModel(normalized);
  const usesRegimes = regimes.length >= 2;

  const pickNextRegimeIndex = (currentIndex: number) => {
    if (!usesRegimes) return 0;
    const roll = Math.random();
    if (roll < 0.82) return currentIndex;
    if (roll < 0.91) return Math.max(0, currentIndex - 1);
    if (roll < 0.97) return Math.min(regimes.length - 1, currentIndex + 1);
    return Math.floor(Math.random() * regimes.length);
  }

  const avgRegimeWinRate = usesRegimes
    ? regimes.reduce((sum, regime) => sum + regime.winRate, 0) / regimes.length
    : wr;
  const avgRegimeRR = usesRegimes
    ? regimes.reduce((sum, regime) => sum + regime.rewardRisk, 0) / regimes.length
    : rr;

  const kellyFraction = avgRegimeRR > 0 ? avgRegimeWinRate - ((1 - avgRegimeWinRate) / avgRegimeRR) : 0;
  metrics.kelly = Number.isFinite(kellyFraction) ? kellyFraction * 100 : 0;
  
  metrics.expectation = (avgRegimeWinRate * avgRegimeRR) - (1 - avgRegimeWinRate);

  simulations = [];
  gMin = initEq;
  gMax = initEq;
  let sumMaxDD = 0;
  let biggestMaxDD = 0;
  const finalPerformances: number[] = [];

  let globalMaxConsWin = 0;
  let globalMaxConsLoss = 0;

  for (let i = 0; i < nLines; i++) {
    const path = new Float64Array(nTrades + 1);
    path[0] = initEq;
    let eq = initEq;
    let peak = initEq;
    let maxDD = 0;
    
    let consWin = 0;
    let consLoss = 0;
    let maxConsWin = 0;
    let maxConsLoss = 0;
    let regimeIndex = usesRegimes ? Math.floor(Math.random() * regimes.length) : 0;

    for (let j = 1; j <= nTrades; j++) {
      const regime = usesRegimes ? regimes[regimeIndex] : null;
      const activeWinRate = regime?.winRate ?? wr;
      const activeRewardRisk = regime?.rewardRisk ?? rr;
      const isWin = Math.random() < activeWinRate;
      if (isWin) {
        eq += eq * rpt * activeRewardRisk;
        if (eq > peak) peak = eq;
        consWin++;
        consLoss = 0;
        if (consWin > maxConsWin) maxConsWin = consWin;
      } else {
        eq -= eq * rpt;
        consLoss++;
        consWin = 0;
        if (consLoss > maxConsLoss) maxConsLoss = consLoss;
      }

      const dd = peak > 0 ? (peak - eq) / peak : 0;
      if (dd > maxDD) maxDD = dd;
      
      path[j] = eq;

      if (eq < gMin) gMin = eq;
      if (eq > gMax) gMax = eq;

      regimeIndex = pickNextRegimeIndex(regimeIndex);
    }

    simulations.push(path);
    sumMaxDD += maxDD;
    if (maxDD > biggestMaxDD) biggestMaxDD = maxDD;
    finalPerformances.push(initEq > 0 ? ((eq - initEq) / initEq) : 0);

    if (maxConsWin > globalMaxConsWin) globalMaxConsWin = maxConsWin;
    if (maxConsLoss > globalMaxConsLoss) globalMaxConsLoss = maxConsLoss;
  }

  // Find best and worst indices
  bestIndex = -1;
  worstIndex = -1;
  let highestFinal = -Infinity;
  let lowestFinal = Infinity;

  for (let i = 0; i < nLines; i++) {
    const path = simulations[i];
    if (!path) continue;
    const finalVal = path[path.length - 1] as number;
    if (finalVal > highestFinal) { highestFinal = finalVal; bestIndex = i; }
    if (finalVal < lowestFinal) { lowestFinal = finalVal; worstIndex = i; }
  }

  // PRE-CALCULATE 3D GEOMETRY FOR MAX 50 LINES
  renderPaths3D = [];
  bestPath3D = null;
  worstPath3D = null;
  
  const indicesToRender = new Set<number>();
  if (bestIndex !== -1) indicesToRender.add(bestIndex);
  if (worstIndex !== -1) indicesToRender.add(worstIndex);

  const randomIndices = Array.from({ length: nLines }, (_, index) => index);
  for (let i = randomIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomIndices[i], randomIndices[j]] = [randomIndices[j] as number, randomIndices[i] as number];
  }

  for (const index of randomIndices) {
    if (indicesToRender.size >= 50) break;
    indicesToRender.add(index);
  }

  const range = gMax - gMin;
  
  // To keep Z depth spreading even, we just use their original index
  for (let i = 0; i < nLines; i++) {
    if (!indicesToRender.has(i)) continue;
    
    const path = simulations[i];
    if (!path) continue;
    
    const pts = new Float32Array(path.length * 3);
    for (let j = 0; j < path.length; j++) {
      // X: -200 to +200
      pts[j * 3] = -200 + (nTrades > 0 ? (j / nTrades) : 0) * 400;
      // Y: 100 (bottom) to -100 (top)
      const eqVal = path[j] as number;
      const normalizedEq = range === 0 ? 0.5 : (eqVal - gMin) / range;
      pts[j * 3 + 1] = 100 - (normalizedEq * 200);
      // Z: -100 to +100 depth spreading based on position in rendering list
      pts[j * 3 + 2] = -100 + (renderPaths3D.length / 50) * 200;
    }
    
    if (i === bestIndex) bestPath3D = pts;
    else if (i === worstIndex) worstPath3D = pts;
    else renderPaths3D.push(pts);
  }

  metrics.avgMaxDrawdown = (sumMaxDD / nLines) * 100;
  metrics.biggestMaxDrawdown = biggestMaxDD * 100;
  metrics.minEquity = gMin === Infinity ? 0 : gMin;
  metrics.maxEquity = gMax === -Infinity ? 0 : gMax;
  
  const distributionSample = finalPerformances.filter((_, index) => index !== bestIndex);
  const medianPerf = calculateDownsideWeightedMedian(distributionSample) * 100;
  metrics.medianPerformance = medianPerf;
  metrics.romad = metrics.avgMaxDrawdown > 0 ? (medianPerf / metrics.avgMaxDrawdown) : (medianPerf > 0 ? 99.99 : 0);
  metrics.maxConsecutiveWinner = globalMaxConsWin;
  metrics.maxConsecutiveLoser = globalMaxConsLoss;

  hasRun.value = true;
  showParams.value = false;
  
  // Show toast for 5 seconds
  showToast.value = true;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    showToast.value = false;
  }, 5000);

  // Reset view for the new run
  targetRotation.value = { x: -0.2, y: -0.3 };
  viewScale.value = 2.2;
}

// --- RENDER LOOP --- //
function update() {
  if (!canvasRef.value) {
    rafId = requestAnimationFrame(update);
    return;
  }
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    rafId = requestAnimationFrame(update);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== canvas.clientWidth * dpr || canvas.height !== canvas.clientHeight * dpr) {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  const w = canvas.width, h = canvas.height;
  if (w === 0 || h === 0) {
    rafId = requestAnimationFrame(update);
    return;
  }

  ctx.clearRect(0, 0, w, h);

  // Smooth rotation interpolation
  currentRotation.value.x += (targetRotation.value.x - currentRotation.value.x) * 0.08;
  currentRotation.value.y += (targetRotation.value.y - currentRotation.value.y) * 0.08;

  const scale = viewScale.value * dpr;
  const isDark = document.documentElement.classList.contains('dark');
  const themeBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const themeText = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

  if (!showParams.value && hasRun.value) {
    const cosX = Math.cos(currentRotation.value.x);
    const sinX = Math.sin(currentRotation.value.x);
    const cosY = Math.cos(currentRotation.value.y);
    const sinY = Math.sin(currentRotation.value.y);
    const hw = w / 2 + viewOffset.value.x;
    const hh = h / 2 + viewOffset.value.y;

    const fastProject = (px: number, py: number, pz: number) => {
      // Apply view scale
      px *= scale; py *= scale; pz *= scale;
      // Rotate Y
      const rxY = px * cosY + pz * sinY;
      const rzY = -px * sinY + pz * cosY;
      // Rotate X
      const ryX = py * cosX - rzY * sinX;
      const rzX = py * sinX + rzY * cosX;
      // Project
      const finalZ = Math.max(-999, rzX);
      const projScale = 1000 / (1000 + finalZ);
      return { x: rxY * projScale + hw, y: ryX * projScale + hh };
    };

    // 1. Draw Grid Floor
    ctx.strokeStyle = themeBorder;
    ctx.lineWidth = 0.5 * dpr;
    const gridY = 100; // Unscaled
    
    // Z lines
    for(let i = -5; i <= 5; i++) {
      const zPos = i * 40;
      const t1 = fastProject(-200, gridY, zPos);
      const t2 = fastProject(200, gridY, zPos);
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
    }
    // X lines
    for(let i = -5; i <= 5; i++) {
      const xPos = i * 40;
      const t1 = fastProject(xPos, gridY, -200);
      const t2 = fastProject(xPos, gridY, 200);
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
    }

    // 2. Draw Simulation Paths
    const baseColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = baseColor;

    for (let i = 0; i < renderPaths3D.length; i++) {
      const pts = renderPaths3D[i];
      if (!pts) continue;
      
      ctx.beginPath();
      for (let j = 0; j < pts.length; j += 3) {
        const t = fastProject(pts[j] as number, pts[j+1] as number, pts[j+2] as number);
        if (j === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
    }

    // Draw Best Line
    if (bestPath3D) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // green-500
      ctx.beginPath();
      let lastT = { x: 0, y: 0 };
      for (let j = 0; j < bestPath3D.length; j += 3) {
        const t = fastProject(bestPath3D[j] as number, bestPath3D[j+1] as number, bestPath3D[j+2] as number);
        if (j === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
        lastT = t;
      }
      ctx.stroke();

      const bestSim = simulations[bestIndex];
      if (bestIndex !== -1 && bestSim) {
        const finalVal = bestSim[bestSim.length - 1] as number;
        ctx.fillStyle = 'rgba(34, 197, 94, 1)';
        ctx.font = `bold ${10 * dpr}px monospace`;
        ctx.fillText(`BEST: $${finalVal.toFixed(2)}`, lastT.x + 10, lastT.y + 3);
      }
    }

    // Draw Worst Line
    if (worstPath3D) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // red-500
      ctx.beginPath();
      let lastT = { x: 0, y: 0 };
      for (let j = 0; j < worstPath3D.length; j += 3) {
        const t = fastProject(worstPath3D[j] as number, worstPath3D[j+1] as number, worstPath3D[j+2] as number);
        if (j === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
        lastT = t;
      }
      ctx.stroke();

      const worstSim = simulations[worstIndex];
      if (worstIndex !== -1 && worstSim) {
        const finalVal = worstSim[worstSim.length - 1] as number;
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.font = `bold ${10 * dpr}px monospace`;
        ctx.fillText(`WORST: $${finalVal.toFixed(2)}`, lastT.x + 10, lastT.y + 3);
      }
    }
  }

  rafId = requestAnimationFrame(update);
}

onMounted(() => {
  rafId = requestAnimationFrame(update);
});

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.no-spin-arrows::-webkit-inner-spin-button, 
.no-spin-arrows::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
.no-spin-arrows {
  -moz-appearance: textfield;
  appearance: textfield;
}

.protocol-slide-enter-active,
.protocol-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.protocol-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.protocol-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
