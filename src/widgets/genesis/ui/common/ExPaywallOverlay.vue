<template>
  <Teleport to="body">
    <Transition name="fade-blur">
      <div v-if="isOpen" 
           class="fixed inset-0 z-[10050] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8 overflow-hidden"
           @click.self="closeOverlay">
        
        <!-- Decorative Background Elements -->
        <div class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div class="w-[800px] h-[800px] rounded-full border border-white/5 animate-spin-slow"></div>
          <div class="absolute w-[600px] h-[600px] rounded-full border border-[#FF424D]/10 animate-reverse-spin"></div>
          <div class="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF424D]/20 to-transparent top-1/2"></div>
        </div>

        <!-- Main Panel -->
        <ExPanel
          variant="light"
          class="relative w-full max-w-2xl shadow-[0_0_100px_rgba(255,66,77,0.1)] group z-10 border-white/10"
        >
          <div class="flex w-full flex-col items-center relative z-10">
            <div class="w-full border-b border-white/10 pb-8 text-center">
              <h2 class="subscription-access-title font-mono text-[clamp(1.25rem,3vw,2rem)] font-black uppercase leading-tight tracking-[0.1em]">
                {{ locale === 'ru' ? 'ДОСТУПНО ПО ПОДПИСКЕ' : 'AVAILABLE WITH SUBSCRIPTION' }}
              </h2>
              <p class="mx-auto mt-6 max-w-xl text-[15px] font-medium leading-7 text-white">
                {{ featureDescription }}
              </p>
            </div>
            
            <!-- Action Area -->
            <div class="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row">
              <button
                @click="openPatreon"
                class="relative flex-1 group/btn w-full overflow-hidden border subscription-access-btn transition-all duration-500 py-5 px-6 flex items-center justify-center gap-4"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                <svg class="w-6 h-6 fill-[#121212] group-hover/btn:fill-white transition-colors" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><g transform="matrix(.47407 0 0 .47407 .383 .422)"><clipPath id="prefix__a"><path d="M0 0h1080v1080H0z"/></clipPath><g clip-path="url(#prefix__a)"><path d="M1033.05 324.45c-.19-137.9-107.59-250.92-233.6-291.7-156.48-50.64-362.86-43.3-512.28 27.2-181.1 85.46-237.99 272.66-240.11 459.36-1.74 153.5 13.58 557.79 241.62 560.67 169.44 2.15 194.67-216.18 273.07-321.33 55.78-74.81 127.6-95.94 216.01-117.82 151.95-37.61 255.51-157.53 255.29-316.38z" fill-rule="nonzero"/></g></g></svg>
                <span class="text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-[#121212] group-hover/btn:text-white transition-colors relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  {{ locale === 'ru' ? 'ОФОРМИТЬ ПОДПИСКУ НА PATREON' : 'GET THE FULL APP ON PATREON' }}
                </span>
              </button>
              
            
            </div>
            
            <button 
             @click="closeOverlay"
             class="mt-7 max-w-md text-center font-black text-xs leading-relaxed tracking-widest text-white/55 hover:text-white/65 transition-colors">
               {{ locale === 'ru' ? 'Позже' : 'Later' }}
            </button>

          </div>
        </ExPanel>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { open } from '@tauri-apps/plugin-shell'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '~/shared/ui/ExPanel.vue'
import type { AccessCapability } from '~/features/access/model/accessEntitlements'
import { useAccessActivation } from '~/features/access/model/useAccessActivation'

const { locale } = useI18n()

const props = defineProps<{
  isOpen: boolean
  capability?: AccessCapability
}>()

type LocalizedDescription = { ru: string; en: string }

const featureDescriptions: Partial<Record<AccessCapability, LocalizedDescription>> = {
  'broker.binance': {
    ru: 'Подключение Binance само добавляет ваши сделки в журнал. Вам не придётся вносить их вручную.',
    en: 'The Binance connection adds your trades to the journal automatically. You do not have to enter them by hand.'
  },
  'broker.bybit': {
    ru: 'Подключение Bybit само добавляет закрытые сделки в журнал. Вы сразу получаете готовую историю без ручного заполнения.',
    en: 'The Bybit connection adds closed trades to your journal automatically. You get a ready-to-use history without filling it in by hand.'
  },
  'broker.kraken': {
    ru: 'Подключение Kraken загружает ваши сделки в журнал. Все нужные данные будут собраны в одном месте.',
    en: 'The Kraken connection loads your trades into the journal. All the data you need stays in one place.'
  },
  'broker.interactiveBrokers': {
    ru: 'Подключение Interactive Brokers загружает сделки через Flex Query. Вам не придётся переписывать их в журнал вручную.',
    en: 'The Interactive Brokers connection loads trades through Flex Query. You do not have to copy them into the journal by hand.'
  },
  'reports.scenariosConditions': {
    ru: 'Этот раздел показывает результаты сделок для каждого сценария и условия. Вы увидите, что приносит прибыль, а что чаще приводит к убыткам.',
    en: 'This section shows trade results for every scenario and condition. You can see what makes money and what leads to losses more often.'
  },
  'analytics.scenariosConditions': {
    ru: 'Эта кнопка оставляет на графике только сделки с выбранным сценарием или условием. Так проще понять, хорошо ли они работают.',
    en: 'This button leaves only trades with the selected scenario or condition on the chart. It makes it easier to see how well they work.'
  },
  'diary.genesisTree': {
    ru: 'Дерево Генезиса показывает ваши сделки в виде дерева. Так легче увидеть похожие сделки и понять, как менялась ваша торговля со временем.',
    en: 'Genesis Tree shows your trades as a tree. It makes similar trades easier to spot and shows how your trading changed over time.'
  },
  'diary.capitalForecast': {
    ru: 'Прогноз капитала показывает, как может измениться ваш баланс на основе прошлых сделок. Так можно заранее увидеть возможный рост и возможные просадки.',
    en: 'Capital Forecast shows how your balance may change based on past trades. It helps you see possible growth and drawdowns in advance.'
  },
  'trade.nodeMapping': {
    ru: 'Node Mapping показывает, из каких частей состоит сделка и как они связаны. Так проще понять, где всё прошло хорошо, а где была допущена ошибка.',
    en: 'Node Mapping shows what a trade is made of and how its parts are connected. It makes it easier to see what went well and where a mistake happened.'
  },
  'trade.advancedPatterns': {
    ru: 'Паттерны находят то, что часто повторяется в ваших прибыльных и убыточных сделках. Это помогает понять, какие действия стоит повторять, а каких лучше избегать.',
    en: 'Patterns find things that often repeat in your winning and losing trades. This helps you understand what to repeat and what to avoid.'
  },
  'trade.ohlcAnalysis': {
    ru: 'OHLC-график показывает, как двигалась цена во время сделки. Вы увидите, насколько удачными были вход и выход и как сильно цена шла против вас.',
    en: 'The OHLC chart shows how price moved during a trade. You can see how good the entry and exit were and how far price moved against you.'
  },
  'matrix.strategyVersions': {
    ru: 'Версии сохраняют разные варианты вашей стратегии. Вы сможете сравнивать изменения и вернуться к старому варианту, если новый не подошёл.',
    en: 'Versions save different copies of your strategy. You can compare changes and return to an older copy if the new one does not work for you.'
  },
  'matrix.multipleBoards': {
    ru: 'Дополнительные доски позволяют хранить каждую стратегию отдельно. Так стратегии не смешиваются и между ними легко переключаться.',
    en: 'Additional boards let you keep each strategy separate. Your strategies do not get mixed together, and switching between them is easy.'
  }
}

const fallbackDescription: LocalizedDescription = {
  ru: 'Этот инструмент даёт больше возможностей для работы с торговым журналом. Он помогает лучше понимать свои сделки и улучшать стратегию.',
  en: 'This tool adds more ways to work with your trading journal. It helps you understand your trades and improve your strategy.'
}

const featureDescription = computed(() => {
  const source = (props.capability && featureDescriptions[props.capability]) || fallbackDescription
  return source[locale.value === 'ru' ? 'ru' : 'en']
})

const emit = defineEmits(['close', 'request-access'])

const { requestAccessGate } = useAccessActivation()

const openPatreon = async () => {
  emit('close') 

  requestAccessGate()

}

const closeOverlay = () => {
  emit('close')
}
</script>

<style scoped>
.subscription-access-title {
  background: linear-gradient(
    110deg,
    #dcdbff 0%,
    #c3adff 24%,
    #dcdbff 42%,
    #c3adff 58%,
    #dcdbff 78%,
    #c3adff 100%
  );
  background-clip: text;
  background-size: 250% 100%;
  color: transparent;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: subscription-access-shimmer 3.2s linear infinite;
}

.subscription-access-btn {
    background: linear-gradient(
    110deg,
    #dcdbff 0%,
    #c3adff 24%,
    #dcdbff 42%,
    #c3adff 58%,
    #dcdbff 78%,
    #c3adff 100%
  );

  background-size: 250% 100%;

}

@keyframes subscription-access-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -150% 0; }
}

.fade-blur-enter-active, .fade-blur-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-blur-enter-from, .fade-blur-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.fade-blur-enter-to, .fade-blur-leave-from {
  opacity: 1;
  backdrop-filter: blur(24px);
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reverse-spin {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

.animate-reverse-spin {
  animation: reverse-spin 15s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .subscription-access-title {
    animation: none;
  }
}
</style>
