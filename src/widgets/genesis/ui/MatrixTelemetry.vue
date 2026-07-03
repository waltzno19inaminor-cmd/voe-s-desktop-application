<template>
  <div
    v-if="!isScenarioContext"
    class="matrix-telemetry absolute top-32 left-2 flex items-start gap-3 z-[40] pointer-events-none"
    :class="{ 'is-dark': isDark }">
     <div class="relative ml-3 flex flex-col items-center gap-2">
         <div class="matrix-tool">
           <button @click.stop="$emit('reset-view')" class="tactical-button w-8 h-8 border border-nier-text-light/20 dark:border-nier-text-dark/20 flex items-center justify-center hover:bg-nier-text-light/10 dark:hover:bg-nier-text-dark/10 transition-colors opacity-30 hover:opacity-100 italic text-[10px] font-mono">
             [R]
           </button>
           <span class="matrix-tool-tooltip">Reset View</span>
         </div>

         <div class="matrix-tool">
           <button @click.stop="isManualOpen = true" 
                   class="tactical-button relative w-8 h-8 border border-current flex items-center justify-center bg-nier-text-light/5 dark:bg-nier-text-dark/5 hover:bg-nier-text-light/10 dark:hover:bg-nier-text-dark/10 transition-all opacity-100 group shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(255,255,255,0.1)]">
             <div class="absolute -top-1 -right-1 w-2 h-2 bg-current animate-pulse"></div>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 group-hover:scale-110 transition-transform">
               <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
               <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
             </svg>
           </button>
           <span class="matrix-tool-tooltip">Manual</span>
         </div>
     </div>

     <div class="flex flex-col gap-6 border-l border-nier-text-light/20 dark:border-nier-text-dark/20 pl-4 py-1">
        <div class="flex flex-col">
           <span class="text-[8px] font-mono tracking-widest opacity-40 uppercase">
             Viewport_Telemetry
           </span>
           <span class="text-[12px] font-mono tracking-widest opacity-80 uppercase">{{ (viewState.scale * 100).toFixed(0) }}% // FOCUS</span>
        </div>

     <!-- FOCUS SELECTOR STRIP -->
     <div class="flex flex-col space-y-2">
        <div class="flex flex-col space-y-1">
           <button v-for="zoom in [25, 50, 75, 100, 150, 200]" :key="zoom"
                   @click.stop="$emit('update-scale', zoom / 100)"
                   :class="[
                      Math.round(viewState.scale * 100) === zoom
                        ? 'bg-nier-text-light dark:bg-nier-text-dark text-nier-white dark:text-nier-black opacity-100'
                        : 'opacity-30 hover:opacity-100 hover:bg-nier-text-light/5 dark:hover:bg-nier-text-dark/5'
                   ]"
                   class="pointer-events-auto w-12 h-5 border border-nier-text-light/20 dark:border-nier-text-dark/20 text-[9px] font-mono tracking-tighter transition-all flex items-center justify-center relative overflow-hidden group/zoom">
              <div v-if="Math.round(viewState.scale * 100) === zoom" class="absolute inset-0 bg-nier-text-light/10 dark:bg-nier-text-dark/10 animate-pulse"></div>
              {{ zoom }}%
              <div class="absolute right-0 top-0 w-1 h-1 bg-current opacity-20"></div>
           </button>
        </div>
     </div>
     </div>
  </div>

  <!-- MANUAL OVERLAY -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isManualOpen" class="fixed inset-0 z-[99999] bg-transparent" @click="isManualOpen = false">
        <div @click.stop class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl">
          <ExPanel :title="locale === 'ru' ? 'МАТРИЦА ГЕНЕЗИСА // РУКОВОДСТВО' : 'GENESIS MATRIX // MANUAL'" variant="light" :showCorners="true" :noPadding="true" class="w-full shadow-2xl relative">
            
            <!-- Close Tab on the right edge -->
            <button @click="isManualOpen = false"
                    class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-nier-white dark:bg-nier-black border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-[100]">
               <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
               <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">{{ locale === 'ru' ? 'Закрыть_Руководство' : 'Close_Manual' }}</span>
            </button>

            <div class="flex h-[75vh]">
              <!-- Clickable Paragraphs Menu -->
              <div class="w-72 border-r border-black/10 dark:border-white/10 flex flex-col overflow-y-auto relative bg-black/[0.02] dark:bg-white/[0.02]">
                 <!-- Grid Background -->
                 <div class="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                 
                 <div class="p-4 border-b border-black/10 dark:border-white/10 flex justify-between items-center relative z-10">
                   <h2 class="text-[10px] font-mono tracking-[0.3em] uppercase opacity-50">{{ locale === 'ru' ? 'Оглавление / Модули' : 'Index / Modules' }}</h2>
                   <div class="text-[8px] opacity-30 font-mono tracking-widest">v1.07</div>
                 </div>
                 <button v-for="(section, idx) in manualSections" :key="idx"
                         @click="activeManualSection = idx"
                         :class="[
                           'p-4 text-left transition-all duration-300 font-mono text-[10px] tracking-widest uppercase border-b border-black/5 dark:border-white/5 relative overflow-hidden group',
                           activeManualSection === idx 
                             ? 'bg-black/5 dark:bg-white/5 opacity-100 font-bold' 
                             : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                         ]">
                   <div v-if="activeManualSection === idx" class="absolute left-0 top-0 bottom-0 w-1 bg-current animate-pulse"></div>
                   <div v-if="activeManualSection === idx" class="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border border-current rotate-45 opacity-50"></div>
                   {{ section.title }}
                 </button>
              </div>

              <!-- Content Area -->
              <div class="flex-1 p-10 overflow-y-auto text-nier-text-light dark:text-nier-text-dark font-mono text-[12px] leading-loose relative">
                 <!-- Background decorations -->
                 <div class="absolute right-10 top-10 text-[120px] font-black opacity-[0.02] select-none pointer-events-none tracking-tighter leading-none">
                   0{{ activeManualSection + 1 }}
                 </div>
                 <div class="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-current opacity-[0.03] pointer-events-none"></div>
                 <div class="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-current opacity-[0.03] pointer-events-none"></div>
                 
                 <!-- Technical Header -->
                 <div class="flex items-end justify-between mb-8 pb-4 border-b border-black/10 dark:border-white/10 relative z-10">
                   <h1 class="text-[18px] tracking-[0.2em] uppercase font-bold flex items-center">
                     <span class="opacity-30 mr-3 text-[14px] font-light">[{{ String(activeManualSection + 1).padStart(2, '0') }}]</span>
                     {{ manualSections[activeManualSection]?.title }}
                   </h1>
                   <div class="text-[8px] tracking-[0.4em] uppercase opacity-30 animate-pulse hidden sm:block">
                     SYS_ACTIVE //
                   </div>
                 </div>
                 
                 <div class="manual-html-content relative z-10" v-html="manualSections[activeManualSection]?.content"></div>
                 
                 <!-- Visual flair Footer -->
                 <div class="mt-12 flex items-center space-x-3 opacity-20 relative z-10">
                   <div class="w-2 h-2 border border-current rotate-45"></div>
                   <div class="w-16 h-px bg-current"></div>
                   <span class="text-[8px] tracking-widest uppercase">{{ locale === 'ru' ? 'Конец_Модуля' : 'End_Of_Module' }}</span>
                   <div class="flex-1 h-px bg-gradient-to-r from-current to-transparent"></div>
                 </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '@/shared/ui/ExPanel.vue'

defineProps<{
  viewState: { scale: number }
  isScenarioContext: boolean
  isDark?: boolean
}>()

defineEmits(['reset-view', 'update-scale'])

const { locale } = useI18n()

const isManualOpen = ref(false)
const activeManualSection = ref(0)

const manualSectionsEn = [
  {
    title: "1. Core Hierarchy",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Platform Overview</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">The Genesis Matrix is a <strong class="opacity-100 font-bold bg-black/10 dark:bg-white/10 px-1">visual logic builder</strong> for designing algorithmic trading architectures. It utilizes a node-based interface to structure logic from high-level strategies down to granular conditions.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Structural Hierarchy</h3>
<ul class="list-none space-y-4 opacity-80 border-l-2 border-black/10 dark:border-white/10 pl-4">
  <li><strong class="opacity-100 font-bold tracking-widest">STRATEGY NODE:</strong><br/>The root level definition of your trading logic.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">SCENARIO NODE:</strong><br/>Sub-branches that define specific market regimes or trading contexts (e.g., Bull Market, High Volatility).</li>
  <li><strong class="opacity-100 font-bold tracking-widest">CONDITION NODE:</strong><br/>Logical evaluations applied to these scenarios.</li>
</ul>
<p class="mt-6 opacity-80 italic">This top-down approach ensures that your trading algorithm is strictly compartmentalized and mathematically robust.</p>`
  },
  {
    title: "2. The Quick Start",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Initiation Sequence</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">To begin building your first algorithmic architecture, follow the core sequence:</p>

<div class="border border-current p-4 mb-6 bg-black/5 dark:bg-white/5">
  <h3 class="text-[12px] tracking-widest font-bold mb-2 uppercase opacity-50">Golden Rule</h3>
  <strong class="opacity-100 font-bold text-[14px]">Construct a top-down foundation by deploying a Strategy Node, extending it with a Scenario Node, and finalizing your logic with attached Condition Nodes.</strong>
</div>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Step-by-Step</h3>
<ol class="list-decimal list-inside space-y-3 opacity-80">
  <li><strong class="opacity-100">Left-click</strong> on the <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">LOGIC tab</strong> in the Command Panel at the bottom.</li>
  <li>Select <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">'Strategy Core'</strong> to place your root node.</li>
  <li>Left-click on the Strategy node and attach a <strong class="opacity-100">Scenario Node</strong>.</li>
  <li>Connect them by dragging a wire from the output port to the input port.</li>
  <li>Place a parent <strong class="opacity-100">Condition Node</strong>, then attach specific conditions (like indicators, math, or time rules) to it.</li>
</ol>`
  },
  {
    title: "3. Config & Routing",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Node Config & Visual Routing</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">The Genesis Matrix allows deep customization of your nodes and connections to map out your architecture visually.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Node Customization</h3>
<ul class="list-none space-y-3 opacity-80 border-l-2 border-black/10 dark:border-white/10 pl-4 mb-6">
  <li><strong class="opacity-100 font-bold tracking-widest">IDENTITY NAMES:</strong><br/>Right-click a node to give it a custom identity name, making complex branches easier to read.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">DESCRIPTIONS:</strong><br/>Add rich text descriptions to nodes to document the precise rules, rationale, or formulas behind them.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">EXECUTION TAGS:</strong><br/>Categorize nodes by selecting a type such as <strong class="opacity-100">ENTRY</strong>, <strong class="opacity-100">EXIT</strong>, <strong class="opacity-100">ADDITIONAL</strong>, or <strong class="opacity-100">REQUIRED</strong>. This helps visually distinguish core triggers from secondary filters.</li>
</ul>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Visual Logic Bundles</h3>
<p class="mb-4 opacity-80">When you connect multiple nodes into a single destination, they form a connection bundle. You can <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">right-click on a connection stem</strong> to toggle the label between 'AND' and 'OR'.</p>

<div class="border border-black/10 dark:border-white/10 p-3 bg-black/5 dark:bg-white/5">
  <strong class="opacity-100 block mb-1 text-[10px] tracking-widest uppercase">Important Note:</strong>
  <span class="opacity-80 italic text-[11px]">The 'AND' / 'OR' toggles are <strong class="opacity-100 font-bold underline underline-offset-2">purely visual markers</strong> intended for architectural planning and documentation. They do not execute or compile real underlying boolean logic in the engine.</span>
</div>`
  },
  {
    title: "4. Zones & Domains",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Spatial Organization</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80"><strong class="opacity-100 font-bold text-[14px]">ZONES</strong> allow you to visually and logically categorize sections of your Matrix.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Implementation</h3>
<p class="mb-4 opacity-80">By activating the <strong class="opacity-100">Zone Tool</strong> in the Command Panel, you can draw regions directly onto the canvas. These regions can represent:</p>
<ul class="flex flex-wrap gap-2 mb-6 opacity-80">
  <li class="border border-current px-2 py-1 text-[10px]">Entry Logic</li>
  <li class="border border-current px-2 py-1 text-[10px]">In-Trade Management</li>
  <li class="border border-current px-2 py-1 text-[10px]">Exit Criteria</li>
  <li class="border border-current px-2 py-1 text-[10px]">Time Sessions</li>
</ul>

<p class="opacity-80 italic border-l-2 border-black/20 dark:border-white/20 pl-3">Nodes placed inside these Zones inherit their contextual boundaries, making it exceptionally easy to organize massive architectures.</p>`
  },
  {
    title: "5. Deep Diving",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Fractal Architecture</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">The Matrix supports <strong class="opacity-100 font-bold bg-black/10 dark:bg-white/10 px-1">infinite logical depth</strong> through Subgraphs.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Node Encapsulation</h3>
<p class="mb-4 opacity-80">Complex nodes like Strategies and Scenarios can contain their own isolated Matrix inside them. To access this hidden depth, simply <strong class="opacity-100">double-click on a supported node</strong>.</p>

<div class="p-4 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
  <strong class="block opacity-100 mb-2 uppercase tracking-widest text-[10px]">Navigation Hub</strong>
  <p class="opacity-70">The Navigation Hub at the top of the screen acts as your breadcrumb trail, enabling you to instantly jump back to the global layer or any intermediate context at will.</p>
</div>`
  }
]

const manualSectionsRu = [
  {
    title: "1. Основная Иерархия",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Обзор Платформы</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">Матрица Генезиса — это <strong class="opacity-100 font-bold bg-black/10 dark:bg-white/10 px-1">визуальный конструктор логики</strong> для создания архитектур алгоритмической торговли. Он использует интерфейс на основе узлов для структурирования логики от стратегий высокого уровня до детализированных условий.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Структурная Иерархия</h3>
<ul class="list-none space-y-4 opacity-80 border-l-2 border-black/10 dark:border-white/10 pl-4">
  <li><strong class="opacity-100 font-bold tracking-widest">УЗЕЛ СТРАТЕГИИ:</strong><br/>Определение вашей торговой логики на корневом уровне.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">УЗЕЛ СЦЕНАРИЯ:</strong><br/>Ветви, которые определяют конкретные рыночные режимы или торговые контексты (например, Бычий Рынок, Высокая Волатильность).</li>
  <li><strong class="opacity-100 font-bold tracking-widest">УЗЕЛ УСЛОВИЯ:</strong><br/>Логические оценки, применяемые к этим сценариям.</li>
</ul>
<p class="mt-6 opacity-80 italic">Такой подход сверху-вниз гарантирует, что ваш торговый алгоритм будет строго изолирован и математически надежен.</p>`
  },
  {
    title: "2. Быстрый Старт",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Последовательность Инициализации</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">Чтобы начать построение вашей первой алгоритмической архитектуры, выполните основную последовательность:</p>

<div class="border border-current p-4 mb-6 bg-black/5 dark:bg-white/5">
  <h3 class="text-[12px] tracking-widest font-bold mb-2 uppercase opacity-50">Золотое Правило</h3>
  <strong class="opacity-100 font-bold text-[14px]">Создайте основу сверху-вниз: разместите Узел Стратегии, расширьте его Узлом Сценария и завершите логику прикрепленными Узлами Условий.</strong>
</div>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Шаг за Шагом</h3>
<ol class="list-decimal list-inside space-y-3 opacity-80">
  <li><strong class="opacity-100">Левый клик</strong> по вкладке <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">LOGIC</strong> на панели команд внизу.</li>
  <li>Выберите <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">'Strategy Core'</strong>, чтобы разместить ваш корневой узел.</li>
  <li>Сделайте левый клик по узлу Стратегии и прикрепите <strong class="opacity-100">Узел Сценария</strong>.</li>
  <li>Соедините их, перетащив провод от порта выхода к порту входа.</li>
  <li>Разместите родительский <strong class="opacity-100">Узел Условия</strong>, затем прикрепите к нему конкретные условия (такие как индикаторы, математические или временные правила).</li>
</ol>`
  },
  {
    title: "3. Настройка и Маршрутизация",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Настройка Узлов и Визуальная Маршрутизация</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">Матрица Генезиса позволяет глубоко настраивать узлы и соединения для визуального отображения вашей архитектуры.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Настройка Узлов</h3>
<ul class="list-none space-y-3 opacity-80 border-l-2 border-black/10 dark:border-white/10 pl-4 mb-6">
  <li><strong class="opacity-100 font-bold tracking-widest">НАЗВАНИЯ:</strong><br/>Кликните правой кнопкой мыши по узлу, чтобы дать ему пользовательское имя для упрощения чтения сложных ветвей.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">ОПИСАНИЯ:</strong><br/>Добавляйте текстовые описания к узлам, чтобы документировать точные правила, обоснования или формулы.</li>
  <li><strong class="opacity-100 font-bold tracking-widest">ТЕГИ ВЫПОЛНЕНИЯ:</strong><br/>Классифицируйте узлы, выбирая тип, такой как <strong class="opacity-100">ENTRY</strong>, <strong class="opacity-100">EXIT</strong>, <strong class="opacity-100">ADDITIONAL</strong> или <strong class="opacity-100">REQUIRED</strong>. Это помогает визуально отличать основные триггеры от второстепенных фильтров.</li>
</ul>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Визуальные Логические Связки</h3>
<p class="mb-4 opacity-80">При подключении нескольких узлов к одной цели они образуют связку соединений. Вы можете <strong class="opacity-100 bg-black/10 dark:bg-white/10 px-1">кликнуть правой кнопкой мыши по стеблю соединения</strong>, чтобы переключить метку между 'AND' и 'OR'.</p>

<div class="border border-black/10 dark:border-white/10 p-3 bg-black/5 dark:bg-white/5">
  <strong class="opacity-100 block mb-1 text-[10px] tracking-widest uppercase">Важное Замечание:</strong>
  <span class="opacity-80 italic text-[11px]">Переключатели 'AND' / 'OR' являются <strong class="opacity-100 font-bold underline underline-offset-2">чисто визуальными маркерами</strong>, предназначенными для архитектурного планирования и документации. Они не выполняют и не компилируют реальную базовую булеву логику в движке.</span>
</div>`
  },
  {
    title: "4. Зоны и Домены",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Пространственная Организация</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80"><strong class="opacity-100 font-bold text-[14px]">ЗОНЫ</strong> позволяют визуально и логически категоризировать участки вашей Матрицы.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Реализация</h3>
<p class="mb-4 opacity-80">Активировав <strong class="opacity-100">Инструмент Зоны (Zone Tool)</strong> на панели команд, вы можете рисовать области прямо на холсте. Эти области могут представлять:</p>
<ul class="flex flex-wrap gap-2 mb-6 opacity-80">
  <li class="border border-current px-2 py-1 text-[10px]">Логику Входа</li>
  <li class="border border-current px-2 py-1 text-[10px]">Управление в Сделке</li>
  <li class="border border-current px-2 py-1 text-[10px]">Критерии Выхода</li>
  <li class="border border-current px-2 py-1 text-[10px]">Временные Сессии</li>
</ul>

<p class="opacity-80 italic border-l-2 border-black/20 dark:border-white/20 pl-3">Узлы, размещенные внутри этих Зон, наследуют их контекстные границы, что делает организацию массивных архитектур исключительно простой.</p>`
  },
  {
    title: "5. Глубокое Погружение",
    content: `<h2 class="text-[14px] tracking-widest font-bold mb-2 uppercase">Фрактальная Архитектура</h2>
<div class="h-px w-full bg-gradient-to-r from-current to-transparent opacity-30 mb-4"></div>
<p class="mb-6 opacity-80">Матрица поддерживает <strong class="opacity-100 font-bold bg-black/10 dark:bg-white/10 px-1">бесконечную логическую глубину</strong> через Подграфы.</p>

<h3 class="text-[12px] tracking-widest font-bold bg-black/5 dark:bg-white/5 inline-block px-2 py-1 mb-3 uppercase">Инкапсуляция Узлов</h3>
<p class="mb-4 opacity-80">Сложные узлы, такие как Стратегии и Сценарии, могут содержать собственную изолированную Матрицу внутри себя. Для доступа к этой скрытой глубине просто <strong class="opacity-100">дважды кликните по поддерживаемому узлу</strong>.</p>

<div class="p-4 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
  <strong class="block opacity-100 mb-2 uppercase tracking-widest text-[10px]">Навигационный Центр</strong>
  <p class="opacity-70">Навигационный Центр в верхней части экрана действует как ваша цепочка следов, позволяя мгновенно перепрыгнуть обратно на глобальный уровень или любой промежуточный контекст по желанию.</p>
</div>`
  }
]

const manualSections = computed(() => {
  return locale.value === 'ru' ? manualSectionsRu : manualSectionsEn
})
</script>

<style scoped>
.matrix-tool {
  position: relative;
  pointer-events: auto;
}

.matrix-tool .tactical-button {
  opacity: 1 !important;
  background-color: #ffffff !important;
  color: rgb(44 44 42 / 0.52);
}

.matrix-tool .tactical-button:hover {
  background-color: #ffffff !important;
  color: #2c2c2a;
}

.matrix-telemetry.is-dark .matrix-tool .tactical-button {
  background-color: #000000 !important;
  color: rgb(249 246 240 / 0.58);
}

.matrix-telemetry.is-dark .matrix-tool .tactical-button:hover {
  background-color: #000000 !important;
  color: #f9f6f0;
}

.matrix-tool-tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  z-index: 100002;
  transform: translateY(-50%) translateX(-4px);
  border: 1px solid rgb(249 246 240 / 0.18);
  background: rgb(10 10 10 / 0.96);
  color: #f9f6f0;
  padding: 4px 7px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  text-transform: uppercase;
  transition: opacity 140ms ease, transform 140ms ease;
  white-space: nowrap;
}

.matrix-tool:hover .matrix-tool-tooltip,
.matrix-tool:focus-within .matrix-tool-tooltip {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
}

</style>
