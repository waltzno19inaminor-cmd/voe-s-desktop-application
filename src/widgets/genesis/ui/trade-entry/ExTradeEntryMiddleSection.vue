<script setup>

import { inject } from 'vue';
import { useI18n } from '~/shared/i18n/useI18n';
const emit = defineEmits(['close']);
const { locale } = useI18n();
const tr = (ru, en) => locale.value === 'ru' ? ru : en;
const isArchivalBriefingEnabled = false;

const getForexCurrencyPair = (symbol) => {
  const match = String(symbol || '').toUpperCase().replace(/[^A-Z]/g, '').match(/^([A-Z]{3})([A-Z]{3})$/);
  if (!match) return null;

  return {
    base: `https://wise.com/web-art/assets/flags/${match[1].toLowerCase()}.svg`,
    quote: `https://wise.com/web-art/assets/flags/${match[2].toLowerCase()}.svg`
  };
};

import ExEquityCurve2D from '~/widgets/genesis/ui/analytics/ExEquityCurve2D.vue';
import ExTradeGeneratedChart from '../analytics/ExTradeGeneratedChart.vue';
import ExTradeEntryMethodContent from './ExTradeEntryMethodContent.vue';
import ExButton from '~/shared/ui/ExButton.vue';
import ExNTtooltip from '~/shared/ui/ExNTtooltip.vue';
import ExTradeNoteEditor from './ExTradeNoteEditor.vue';
import ExTradeNoteListItem from './ExTradeNoteListItem.vue';
import ExTradeImageEntry from './ExTradeImageEntry.vue';
import ExAssetPickerMenu from '~/shared/ui/ExAssetPickerMenu.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useGenesisTrades, useGenesisMatrixData } from '~/entities/genesis';
import { getTradeResultPercent, resolveTradeBalanceBefore } from '~/widgets/genesis/model/metrics';

const genesisTrades = useGenesisTrades();
const genesisMatrix = useGenesisMatrixData();

const { themeStore, isDark, viewMode, archiveMode, journalEntries, notesList, getArchiveNodeName, addJournalEntry, removeJournalEntry, addNote, removeNote, addJournalEntryTag, removeJournalEntryTag, handleImageUpload, triggerUpload, showCmeNotice, rememberCmeNotice, closeCmeNotice, showAssetMenu, asset, currentAssetData, selectAsset, matrixNodes, matrixConnections, matrixZones, isMatrixLoading, loadMatrixData, tradeStore, strategies, selectedStrategyId, selectedStrategy, findAllNodes, findAllConnections, findNodeById, activeRiskManagement, activeRiskPerTradeDollars, activeRiskSnapshot, actualRR, actualRiskPercent, violatesRR, violatesRiskPerTrade, riskViolationMessage, getReachableNodes, getNodeZoneType, showStrategyMenu, failedIcons, closeAssetMenu, selectedScenarioNode, getNodesForStrategy, DEFAULT_ENTRY_CONDITIONS, DEFAULT_ENTRY_SCENARIOS, DEFAULT_EXIT_CONDITIONS, DEFAULT_EXIT_SCENARIOS, entryConditions, entryScenarios, exitConditions, exitScenarios, miniExitScenarios, regularExitScenarios, filteredRegistryEntryScenarios, filteredRegistryExitScenarios, currentRegistryScenarioConditions, mismatchedNodeIds, hasVectorMismatch, activeConditions, isConditionActive, toggleCondition, showConditionLibrary, showEmotionSelector, showTradeStudyMetrics, registrySearchQuery, libraryFilter, filteredLibraryScenarios, flatLibraryConditions, selectedRegistryScenarioId, hoverTimeout, hoveredScenarioId, handleMouseEnterScenario, handleMouseLeaveScenario, handleMouseEnterInsight, isScenarioSelected, getScenarioConditions, getFlattenedScenarioConditions, activeSector, sectors, side, entry, exit, size, entryFee, exitFee, feeType, resultMode, showEntryMethod, activeProtocolTab, entryMethodType, pyramidingEntries, averagingDownEntries, activeMultipleEntries, hasEntryMethodPositions, entryMethodEnabled, hasEntryMethodPriceViolation, hasPyramidingPriceViolation, hasAveragingDownPriceViolation, hasActiveMethodNode, addMultipleEntry, exitEntries, exitMethodEnabled, totalExitSize, averageExit, addExitEntry, removeExitEntry, removeMultipleEntry, showAutoPrompt, autoEntryBasePrice, autoEntryBaseLots, toggleAutoPrompt, confirmAutoGenerate, totalSize, averageEntry, isForex, isManualEntryAsset, isFixedFeeAsset, overridePnl, liveRates, FALLBACK_RATES, fetchLiveRates, getRate, EMOTION_LIBRARY, emotionsByCategory, showEmotions, selectedEmotions, hoveredEmotion, mousePos, EMOTION_OPPOSITES, toggleEmotion, isEmotionDisabled, stopLoss, takeProfit, openDate, exitDate, cloneDate, adjustDate, formatPart, handleManualDate, projectedProfit, hasValidProjection, equityCurveTrades, isTemporalOpen, activeTemporalTarget, _now, tempDateParts, syncTempParts, openTemporal, scrollContainer, pnl, commitState, resetForm, submit } = inject('tradeState');
const tradeState = inject('tradeState');
const { handlePnlInput } = tradeState;
const { showTradeSummary, savedTradeSummary } = tradeState;
const { tradeStudyMetrics, persistGeneratedTradeStudyMetrics } = tradeState;
const { sanitizeTradeNumberInput, isClosed, tradeTimeZone, tradeTimeZoneOffset, riskInputViolationMessage, actualRiskDollars, currentCapital, violatesTradingStyleDuration, actualTradeDurationLabel, requiredTradingStyleDurationLabel } = tradeState;

const formatTradeResultInput = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3) : (value ?? '');
};

const normalizeTradeResultInput = () => {
  const number = Number(pnl.value);
  if (resultMode.value === 'manual' && Number.isFinite(number)) {
    pnl.value = number.toFixed(3);
  }
};

const formatRiskValue = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '--';

const isRiskMessageForField = (message, field) => {
  const normalized = String(message || '').toLowerCase();
  if (field === 'stopLoss') return normalized.includes('stop loss') || normalized.includes('стоп');
  return normalized.includes('take profit') || normalized.includes('тейк');
};

const buildRiskInputMessage = (field) => {
  const messages = [];
  const directionMessage = riskInputViolationMessage?.value;
  const isRu = locale.value === 'ru';

  if (isRiskMessageForField(directionMessage, field)) messages.push(directionMessage);

  if (field === 'stopLoss' && violatesRiskPerTrade.value) {
    const risk = activeRiskManagement.value;
    const isPercentLimit = risk.riskPerTradeUnit === '%';
    const actual = isPercentLimit ? `${formatRiskValue(actualRiskPercent.value)}%` : `$${formatRiskValue(actualRiskDollars.value)}`;
    const limit = isPercentLimit ? `${formatRiskValue(risk.riskPerTradeValue)}%` : `$${formatRiskValue(activeRiskPerTradeDollars.value)}`;
    messages.push(isRu
      ? `Риск на сделку превышен: ${actual} / ${limit}`
      : `Per-trade risk exceeded: ${actual} / ${limit}`);
  }

  if (field === 'takeProfit' && violatesRR.value) {
    const required = Number(activeRiskManagement.value.riskRewardRatio);
    messages.push(isRu
      ? `Соотношение R:R ниже установленного: ${formatRiskValue(actualRR.value)} / ${formatRiskValue(required)}`
      : `R:R is below the configured minimum: ${formatRiskValue(actualRR.value)} / ${formatRiskValue(required)}`);
  }

  return messages.join(' ');
};

const stopLossRiskMessage = computed(() => buildRiskInputMessage('stopLoss'));
const takeProfitRiskMessage = computed(() => buildRiskInputMessage('takeProfit'));
const tradeTimeStyleMessage = computed(() => {
  if (!violatesTradingStyleDuration.value) return '';
  const isRu = locale.value === 'ru';
  const actual = actualTradeDurationLabel.value;
  const required = requiredTradingStyleDurationLabel.value;
  return isRu
    ? `Длительность сделки не соответствует стилю торговли: ${actual} / требуется ${required}`
    : `Trade duration does not match the trading style: ${actual} / required ${required}`;
});

const isCreatingNote = ref(false);
const noteText = ref("");
const editingContentNoteId = ref(null);
const expandedNoteIds = ref([]);
const activeProjectionMode = ref('core');
const activeEntryFormTab = ref('main');
const activeJournalImageIndex = ref(null);
const isArchivePersisting = computed(() => tradeState.commitState?.value === 'loading');

const isShortTrade = computed(() => String(side?.value || side || '').toLowerCase() === 'short');
const additionalMoveToggleKey = computed(() => isShortTrade.value ? 'priceRoseAboveEntryShort' : 'priceDroppedBelowEntryLong');
const additionalMovePercentKey = computed(() => isShortTrade.value ? 'priceAboveEntryShortMovePercent' : 'priceBelowEntryLongMovePercent');
const additionalDurationPrefix = computed(() => isShortTrade.value ? 'priceAboveEntryShort' : 'priceBelowEntryLong');
const additionalMoveLabel = computed(() => isShortTrade.value
  ? tr('Цена выросла выше точки входа', 'Price rose above entry')
  : tr('Цена упала ниже точки входа', 'Price fell below entry'));
const additionalMovePercentLabel = computed(() => isShortTrade.value
  ? tr('Как сильно цена выросла от входа, %', 'How much price rose from entry, %')
  : tr('Как сильно цена упала от входа, %', 'How much price fell from entry, %'));
const additionalDurationLabel = computed(() => isShortTrade.value
  ? tr('Как долго цена была выше входа', 'How long price stayed above entry')
  : tr('Как долго цена была ниже входа', 'How long price stayed below entry'));

let additionalMetricsPersistTimer = null;
const scheduleAdditionalMetricsPersist = () => {
  if (typeof persistGeneratedTradeStudyMetrics !== 'function') return;
  if (additionalMetricsPersistTimer) clearTimeout(additionalMetricsPersistTimer);
  additionalMetricsPersistTimer = setTimeout(() => {
    void persistGeneratedTradeStudyMetrics(tradeStudyMetrics.value);
  }, 300);
};

const sanitizeAdditionalMetricInput = (event, key) => {
  const target = event?.target;
  const sanitized = String(target?.value ?? '').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  if (target && target.value !== sanitized) target.value = sanitized;
  tradeStudyMetrics.value[key] = sanitized;
  scheduleAdditionalMetricsPersist();
};

const toggleAdditionalMetric = (key) => {
  tradeStudyMetrics.value[key] = !tradeStudyMetrics.value[key];
  scheduleAdditionalMetricsPersist();
};

onBeforeUnmount(() => {
  if (additionalMetricsPersistTimer) clearTimeout(additionalMetricsPersistTimer);
  if (typeof persistGeneratedTradeStudyMetrics === 'function') {
    void persistGeneratedTradeStudyMetrics(tradeStudyMetrics.value);
  }
});

const journalImages = computed(() => journalEntries.value
  .map((entry, index) => ({
    ...entry,
    url: entry?.image || entry?.url || entry?.src || '',
    index
  }))
  .filter((entry) => entry && (entry.url || entry.name || entry.createdAt)));

const attachableJournalImages = computed(() => journalImages.value.filter((entry) => Boolean(entry.url)));
const activeJournalImage = computed(() => activeJournalImageIndex.value === null
  ? null
  : journalImages.value[activeJournalImageIndex.value] || null);

const getJournalEntryIndex = (displayIndex) => journalImages.value[displayIndex]?.index ?? displayIndex;

const startNoteCreation = () => {
  isCreatingNote.value = true;
  editingContentNoteId.value = null;
  noteText.value = '';
};

const cancelNoteEdit = () => {
  isCreatingNote.value = false;
  editingContentNoteId.value = null;
  noteText.value = '';
};

const getNotePlainText = (html) => String(html || '')
  .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
  .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/blockquote>|<\/li>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\n{3,}/g, '\n\n');

const saveJournalNote = () => {
  const html = String(noteText.value || '').trim();
  const content = getNotePlainText(html).trim();
  if (!content && !html.includes('trade-note-visual')) return;

  if (editingContentNoteId.value) {
    const note = notesList.value.find((item) => item.id === editingContentNoteId.value);
    if (note) {
      note.html = html;
      note.content = content;
    }
  } else {
    notesList.value.push({
      id: `note_${Date.now()}`,
      content,
      html,
      date: new Date().toISOString(),
      title: `SESSION_LOG_${notesList.value.length + 1}`
    });
  }

  cancelNoteEdit();
};

const startEditContent = (note) => {
  editingContentNoteId.value = note.id;
  noteText.value = note.html || note.content || '';
  isCreatingNote.value = true;
};

const toggleNote = (id) => {
  const index = expandedNoteIds.value.indexOf(id);
  if (index === -1) expandedNoteIds.value.push(id);
  else expandedNoteIds.value.splice(index, 1);
};

const updateJournalNoteTitle = ({ id, title }) => {
  const note = notesList.value.find((item) => item.id === id);
  if (note) note.title = title;
};

const removeJournalNote = (id) => {
  removeNote(id);
  expandedNoteIds.value = expandedNoteIds.value.filter((noteId) => noteId !== id);
  if (editingContentNoteId.value === id) cancelNoteEdit();
};

const escapeJournalHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderJournalNote = (note) => {
  const rawContent = String(note?.html || note?.content || '');
  const content = note?.html
    ? rawContent
    : escapeJournalHtml(rawContent)
      .replace(/^###\s(.+)$/gim, '<h3>$1</h3>')
      .replace(/^##\s(.+)$/gim, '<h2>$1</h2>')
      .replace(/^#\s(.+)$/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  return content.replace(/\[VISUAL_REF:(\d+)\]/gim, (match, indexValue) => {
    const index = Number.parseInt(indexValue, 10);
    const image = attachableJournalImages.value[index];
    if (!image?.url) return match;
    return `<div class="trade-note-visual"><img src="${escapeJournalHtml(image.url)}" alt="${escapeJournalHtml(image.name || `Visual_Node_${index}`)}"></div>`;
  });
};

const openJournalImage = (index) => {
  if (!journalImages.value[index]?.url) return;
  activeJournalImageIndex.value = index;
};

const closeJournalImage = () => {
  activeJournalImageIndex.value = null;
};

const handleJournalImageUpload = (index, event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const entry = journalEntries.value[getJournalEntryIndex(index)];
    if (entry) entry.image = String(reader.result || '');
  };
  reader.readAsDataURL(file);
};

const updateJournalImageName = (index, event) => {
  const entry = journalEntries.value[getJournalEntryIndex(index)];
  if (entry) entry.name = event?.target?.value || '';
};

const removeJournalImage = (index) => {
  const sourceIndex = getJournalEntryIndex(index);
  const entry = journalEntries.value[sourceIndex];
  if (!entry) return;
  removeJournalEntry(entry.id);
  if (activeJournalImageIndex.value === index) closeJournalImage();
  else if (activeJournalImageIndex.value !== null && activeJournalImageIndex.value > index) activeJournalImageIndex.value -= 1;
};

const removeJournalImageTag = (index, tag) => {
  const entry = journalEntries.value[getJournalEntryIndex(index)];
  if (entry) removeJournalEntryTag(entry, tag);
};

watch(showTradeSummary, (isVisible) => {
  activeEntryFormTab.value = isVisible ? 'summary' : 'main';
});

const formatDateTactical = (dateStr) => {
  if (!dateStr) return 'DATE_UNASSIGNED';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'DATE_UNASSIGNED';

  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} // ${time}`;
};

const formatSummaryNumber = (value) => {
  if (value === undefined || value === null || value === '') return '--';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 8 }) : String(value);
};

const formatSummaryMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}$${Math.abs(number).toFixed(2)}`;
};

const formatSummaryPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${Math.abs(number).toFixed(2)}%`;
};

const formatTradeResultMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}$${Math.abs(number).toFixed(3)}`;
};

const formatTradeResultPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${Math.abs(number).toFixed(3)}%`;
};

const hasPositiveSummaryRiskLevels = (trade) => {
  const entryValue = Number(trade?.entry ?? entry?.value);
  const stopValue = Number(trade?.stopLoss ?? stopLoss?.value);
  const takeValue = Number(trade?.takeProfit ?? takeProfit?.value);
  return [entryValue, stopValue, takeValue].every(value => Number.isFinite(value) && value > 0);
};

const summaryProfitPercent = (trade) => {
  if (!trade) return null;
  const deposit = Number(tradeStore?.getInitialDeposit?.(selectedStrategyId?.value)) || Number(currentCapital.value) || 1000;
  const balanceBefore = resolveTradeBalanceBefore(trade, Array.isArray(journalEntries?.value) ? journalEntries.value : [], deposit);
  const resultPct = getTradeResultPercent(trade, balanceBefore, deposit);
  return Number.isFinite(resultPct) ? resultPct : null;
};

const summaryDisplayTrade = computed(() => savedTradeSummary.value || {
  asset: asset.value,
  assetType: currentAssetData.value?.type,
  profitInCurrency: isClosed.value ? pnl.value : null,
  profitInPercent: null,
  capitalBeforeTrade: null,
  risk: actualRiskDollars.value,
  riskPercent: actualRiskPercent.value,
  riskReward: actualRR.value,
  entry: entry.value,
  stopLoss: stopLoss.value,
  takeProfit: takeProfit.value,
  tradeDuration: actualTradeDurationLabel.value
});

const summaryTradeResultLabel = computed(() => {
  const trade = summaryDisplayTrade.value;
  return `${formatTradeResultMoney(trade?.profitInCurrency)} / ${formatTradeResultPercent(summaryProfitPercent(trade))}`;
});

const summaryStrategyLabel = computed(() => {
  const strategyId = summaryDisplayTrade.value?.strategyId || selectedStrategyId?.value;
  const strategy = Array.isArray(strategies?.value)
    ? strategies.value.find(item => item?.id === strategyId)
    : null;
  const fallback = selectedStrategy?.value;
  return strategy?.label || strategy?.name || fallback?.label || fallback?.name || strategyId || '--';
});

const formatSummaryRatio = (trade) => {
  if (!hasPositiveSummaryRiskLevels(trade)) return 'N/A';
  const number = Number(trade?.riskReward);
  return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}R` : 'N/A';
};

const summaryProtocolGroups = computed(() => {
  const trade = savedTradeSummary.value;
  if (!trade) return [];

  return [
    { label: 'ВХОД', scenario: trade.boardScenarioEntry },
    { label: 'ВЫХОД', scenario: trade.boardScenarioExit }
  ].filter(group => group.scenario?.info).map(group => ({
    label: group.label,
    name: group.scenario.info.name || '--',
    conditions: Array.isArray(group.scenario.info.conditions) ? group.scenario.info.conditions : []
  }));
});

const getSummaryConditionLabel = (condition) => String(
  condition?.info?.name
  || condition?.name
  || condition?.label
  || condition?.params?.customName
  || condition?.id
  || ''
).trim().toUpperCase();

const defaultExitConditionLabels = {
  'cond-exit-tp': 'TAKE-PROFIT',
  'cond-exit-sl': 'STOP-LOSS',
  'cond-exit-fl': 'FULL-LIQUIDATION'
};

const getSummaryConditionMeta = (condition) => {
  const id = String(condition?.id || '');
  const defaultLabel = defaultExitConditionLabels[id];
  return {
    label: defaultLabel || getSummaryConditionLabel(condition),
    description: condition?.info?.description || condition?.description || condition?.params?.description || condition?.params?.value || '',
    isDefaultExitCondition: Boolean(defaultLabel)
  };
};

const summarySelectedConditions = computed(() => {
  if (savedTradeSummary.value) {
    return [...new Map(
      summaryProtocolGroups.value
        .flatMap(group => group.conditions.map(condition => ({
          id: `${group.label}-${condition.id || condition.info?.name || condition.name}`,
          ...getSummaryConditionMeta(condition)
        })))
        .filter(condition => condition.label)
        .map(condition => [condition.id, condition])
    ).values()];
  }

  const nodes = [
    ...(Array.isArray(matrixNodes?.value) ? findAllNodes(matrixNodes.value) : []),
    ...(DEFAULT_ENTRY_CONDITIONS || []),
    ...(DEFAULT_EXIT_CONDITIONS || [])
  ];
  const conditionLookup = new Map(nodes.map(node => [node?.id, node]));

  return [...(activeConditions?.value || [])]
    .map(id => {
      const condition = conditionLookup.get(id) || { id };
      const meta = getSummaryConditionMeta(condition);
      return {
        id,
        ...meta
      };
    })
    .filter(condition => condition.label);
});

const summarySelectedEmotions = computed(() => {
  const emotions = savedTradeSummary.value?.emotions ?? selectedEmotions?.value ?? [];
  return [...new Set(Array.isArray(emotions) ? emotions : [])].filter(Boolean);
});
</script>

<template>
<!-- MIDDLE SECTION: TACTICAL MENUS OR JOURNAL -->
    <div class="w-full flex justify-center">
      <div class="w-full min-w-0 max-w-none pt-8 pb-12">
        <Transition name="sector-swap" mode="out-in">
          <div key="middle" class="flex flex-col space-y-12">
            <div v-if="viewMode === 'tactical'" class="contents">
            <div v-if="false" class="flex min-h-[calc(100dvh-4rem)] items-center justify-center text-white">
              <div class="w-full max-w-3xl px-6 sm:px-10 md:px-12 xl:px-16">
                <div class="flex flex-col gap-8">
                  <div class="flex items-end justify-between border-b border-white/10 pb-4">
                    <div>
                      <span class="block text-[9px] font-mono uppercase tracking-[0.45em] text-white/45">СОХРАНЕНО</span>
                      <h1 class="mt-2 text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">РЕЗЮМЕ СДЕЛКИ</h1>
                    </div>
                    <span class="text-[9px] font-mono uppercase tracking-[0.2em] text-white/35">{{ savedTradeSummary.status || '--' }}</span>
                  </div>

                  <div class="flex flex-col divide-y divide-white/10 border-y border-white/10">
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">АКТИВ</span>
                      <span class="text-right text-sm font-mono font-black uppercase tracking-[0.18em] text-white">{{ savedTradeSummary.asset || '--' }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">НАПРАВЛЕНИЕ</span>
                      <span class="text-right text-sm font-mono font-black uppercase tracking-[0.18em] text-white">{{ savedTradeSummary.side || '--' }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ТОЧКА ВХОДА</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryNumber(savedTradeSummary.entry) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ТОЧКА ВЫХОДА</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryNumber(savedTradeSummary.exit) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">РАЗМЕР ПОЗИЦИИ</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryNumber(savedTradeSummary.size) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">СТОП ЛОСС</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryNumber(savedTradeSummary.stopLoss) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ТЕЙК ПРОФИТ</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryNumber(savedTradeSummary.takeProfit) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ВРЕМЯ ВХОДА</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ formatDateTactical(savedTradeSummary.date) }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ВРЕМЯ ВЫХОДА</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ savedTradeSummary.dateExit ? formatDateTactical(savedTradeSummary.dateExit) : '--' }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-6 py-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ЧАСОВОЙ ПОЯС</span>
                      <span class="text-right text-sm font-mono font-black tracking-[0.12em] text-white">{{ savedTradeSummary.timeZone || '--' }}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="border border-white/10 p-5">
                      <span class="block text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">РЕЗУЛЬТАТ В $</span>
                      <span class="mt-3 block text-2xl font-mono font-black tracking-[0.12em]" :class="Number(savedTradeSummary.profitInCurrency) >= 0 ? 'text-white' : 'text-rose-400'">{{ formatSummaryMoney(savedTradeSummary.profitInCurrency) }}</span>
                    </div>
                    <div class="border border-white/10 p-5">
                      <span class="block text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">РЕЗУЛЬТАТ В %</span>
                      <span class="mt-3 block text-2xl font-mono font-black tracking-[0.12em]" :class="summaryProfitPercent(savedTradeSummary) >= 0 ? 'text-white' : 'text-rose-400'">{{ formatSummaryPercent(summaryProfitPercent(savedTradeSummary)) }}</span>
                    </div>
                  </div>

                  <div class="flex flex-col gap-4 border-t border-white/10 pt-6">
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">ПРОТОКОЛЫ И УСЛОВИЯ</span>
                      <span class="text-[9px] font-mono uppercase tracking-[0.18em] text-white/35">{{ selectedStrategy?.label || selectedStrategy?.name || savedTradeSummary.strategyId || '--' }}</span>
                    </div>
                    <div v-if="summaryProtocolGroups.length" class="flex flex-col gap-4">
                      <div v-for="group in summaryProtocolGroups" :key="group.label" class="flex flex-col gap-2">
                        <span class="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white">{{ group.label }} // {{ group.name }}</span>
                        <div v-if="group.conditions.length" class="flex flex-col gap-1 pl-4">
                          <span v-for="condition in group.conditions" :key="condition.id" class="text-[9px] font-mono uppercase tracking-[0.12em] text-white/55">
                            {{ condition.info?.name || condition.name || condition.label || condition.id }}
                          </span>
                        </div>
                        <span v-else class="pl-4 text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">УСЛОВИЯ НЕ ВЫБРАНЫ</span>
                      </div>
                    </div>
                    <span v-else class="text-[9px] font-mono uppercase tracking-[0.12em] text-white/35">ПРОТОКОЛЫ НЕ ВЫБРАНЫ</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="contents">
            <!-- CONDITION CONFIGURATION PANEL (LEGACY DESCRIPTION AESTHETIC) -->
            <div v-if="isArchivalBriefingEnabled && selectedRegistryScenarioId && selectedRegistryScenarioId !== 'default-exit-system'" class="flex flex-col space-y-12 animate-in fade-in zoom-in-95 duration-1000 max-w-5xl mx-auto">
               
               <!-- Protocol Briefing Header -->
               <div class="flex flex-col space-y-6 border-b border-black/5 dark:border-white/5 pb-10">
                  <div class="flex items-center gap-4">
                     <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
                     <span class="text-[9px] font-mono tracking-[0.6em] text-black/80 dark:text-white/80 uppercase">{{ tr('Протокол архивного брифинга', 'Archival Briefing Protocol') }}</span>
                  </div>
                  
                  <div class="flex items-start justify-between">
                      <div class="flex flex-col space-y-4 max-w-2xl relative">
                        <!-- CINEMATIC ACCENT -->
                        <div class="absolute -left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black/20 dark:via-white/20 to-transparent"></div>
                        
                        <h1 class="text-3xl font-light font-serif tracking-[0.4em] drop-shadow-sm leading-relaxed">
                          {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.customName || 'UNKNOWN_PROTOCOL' }}
                      </h1>
                        <p class="text-[11px] font-mono leading-relaxed opacity-60 uppercase tracking-[0.2em] max-w-xl">
                           {{ (entryScenarios.find(s => s.id === selectedRegistryScenarioId) || regularExitScenarios.find(s => s.id === selectedRegistryScenarioId))?.params?.description || 'No specialized mission description available for this protocol branch.' }}
                        </p>
                     </div>

                     <div class="flex flex-col items-end gap-6">
                        <div class="flex flex-col items-end">
                           <span class="text-[7px] font-mono opacity-20 uppercase tracking-widest">{{ tr('Хэш протокола', 'Protocol Hash') }}</span>
                           <span class="text-[9px] font-mono text-black/70 dark:text-white/80 uppercase tracking-tighter">0x{{ selectedRegistryScenarioId.slice(0, 8).toUpperCase() }}</span>
                        </div>
                        <button @click="showConditionLibrary = true; selectedRegistryScenarioId = null" 
                                class="group/save relative h-14 px-12 nier-bg-inverted dark:text-black  font-black border hover:border-black dark:hover:border-white dark:hover:bg-black hover:bg-white text-white dark:hover:text-white hover:text-black transition-all duration-500 ease-in-out">
                           <span class="relative z-10 text-[11px] uppercase tracking-[0.8em]">Accept </span>
                        </button>
                     </div>
                  </div>
               </div>

               <!-- Conditions Matrix (Hierarchical Tree) -->
               <div class="flex flex-col space-y-12">
                  <div class="flex items-center justify-between">
                     <span class="text-[10px] font-mono tracking-[0.4em] text-black/80 dark:text-white/75 uppercase">{{ tr('Цепочка тактических требований', 'Tactical Requirements Chain') }}</span>
                     <span class="text-[10px] font-mono text-black/80 dark:text-white/80 uppercase tracking-widest">{{ currentRegistryScenarioConditions.length }} {{ tr('корневых узлов', 'Root Nodes') }}</span>
                  </div>

                  <div v-if="currentRegistryScenarioConditions.length > 0" class="flex flex-col space-y-10">
                    <!-- Root Level: Conditions -->
                    <div v-for="cond in currentRegistryScenarioConditions" :key="cond.id"
                         class="flex flex-col space-y-4 group/cond">
                       
                       <!-- Condition Header (Non-clickable structural guide) -->
                       <div class="relative flex items-center justify-between p-4 border transition-all duration-500 overflow-hidden"
                            :class="[
                              'border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]',
                              mismatchedNodeIds.has(cond.id) ? '!border-red-500/30 !bg-red-500/5' : ''
                            ]">
                          
                          <div class="flex items-center gap-4 relative z-10">
                             <div class="flex flex-col items-center">
                                <div class="w-1.5 h-1.5 rotate-45 transition-colors duration-500"
                                     :class="mismatchedNodeIds.has(cond.id) ? 'bg-red-500' : 'bg-black/20 dark:bg-white/20'"></div>
                                <div class="w-px h-8 bg-black/5 dark:bg-white/5 mt-2"></div>
                             </div>
                             
                             <div class="flex flex-col">
                                <div class="flex items-center gap-3">
                                   <span class="text-xl font-serif italic tracking-[0.1em] uppercase transition-colors"
                                         :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/80 dark:text-white/80'">
                                      {{ cond.name }}
                                   </span>
                                   <div v-if="cond.direction" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="mismatchedNodeIds.has(cond.id) ? 'border-red-500/50 text-red-500' : 'nier-border-primary text-black/80 dark:text-white/80'">
                                      {{ cond.direction }}
                                   </div>
                                   <div v-if="cond.priority && cond.priority !== 'NONE'" 
                                        class="px-1.5 py-0.5 border text-[6px] font-mono tracking-widest uppercase transition-colors"
                                        :class="cond.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                      {{ cond.priority }}
                                   </div>
                                </div>
                                <p class="text-[10px] font-mono uppercase tracking-widest opacity-40 max-w-xl transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? '!text-red-500/40' : ''">
                                   {{ mismatchedNodeIds.has(cond.id) ? '[ PROTOCOL_INCOMPATIBLE: DIRECTIONAL_VECTOR_MISMATCH ]' : (cond.description || 'Tactical requirement group.') }}
                                </p>
                             </div>
                          </div>

                          <div class="flex items-center gap-4 relative z-10 opacity-20">
                             <span class="text-[8px] font-mono font-black uppercase tracking-widest transition-colors"
                                   :class="mismatchedNodeIds.has(cond.id) ? 'text-red-500' : 'text-black/20 dark:text-white/75'">
                                {{ mismatchedNodeIds.has(cond.id) ? 'LOCKED' : 'CLUSTER_ROOT' }}
                             </span>
                          </div>
                       </div>

                          <!-- SELECTION GLOW -->
                          <div v-if="isConditionActive(cond.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>


                       <!-- Second Level: Logic Clusters & Indicators -->
                       <div v-if="cond.indicatorUnits && cond.indicatorUnits.length > 0" class="pl-12 flex flex-col space-y-3 border-l border-black/5 dark:border-white/5 ml-5">
                          <div v-for="(unit, uIdx) in cond.indicatorUnits" :key="uIdx" class="flex flex-col space-y-2">
                             
                             <!-- Logic Bundle Header -->
                             <template v-if="unit.type === 'bundle'">
                                <div class="flex items-center gap-2">
                                   <div class="w-1.5 h-[1px] bg-black/20 dark:bg-white/20"></div>
                                   <span class="text-[7px] font-mono tracking-[0.3em] text-black/80 dark:text-white/75 uppercase">{{ unit.logic }}_CLUSTER</span>
                                </div>
                                
                                <!-- Third Level: Nested Indicators -->
                                <div class="pl-6 grid grid-cols-2 gap-3">
                                   <div v-for="item in unit.items" :key="item.id"
                                        @click="toggleCondition(item.id, selectedRegistryScenarioId)"
                                        class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item overflow-hidden relative"
                                        :class="[
                                          isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                          mismatchedNodeIds.has(item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                        ]">
                                      <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                           :class="[
                                             isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                             mismatchedNodeIds.has(item.id) ? '!bg-red-500 !border-red-500' : ''
                                           ]"></div>
                                      <div class="flex flex-col relative z-10">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-bold tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    isConditionActive(item.id, selectedRegistryScenarioId) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(item.id) ? '!text-red-500' : ''
                                                  ]">{{ item.label }}</span>
                                            <span v-if="item.priority && item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ item.priority }}
                                            </span>
                                         </div>
                                         <span class="text-[9px] font-mono uppercase tracking-tighter truncate transition-colors"
                                               :class="isConditionActive(item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ item.description || 'No telemetry.' }}</span>
                                      </div>
                                      <div v-if="isConditionActive(item.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                   </div>
                                </div>
                             </template>

                             <!-- Isolated Indicator -->
                             <template v-else>
                                <div @click="toggleCondition(unit.item.id, selectedRegistryScenarioId)"
                                     class="flex items-start gap-3 p-3 border transition-all cursor-pointer group/item w-1/2 overflow-hidden relative"
                                     :class="[
                                       isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-bg-inverted border-black dark:border-white' : 'bg-black/[0.01] dark:bg-white/[0.01] border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10',
                                       mismatchedNodeIds.has(unit.item.id) ? '!border-red-500/20 !bg-red-500/5 !pointer-events-none' : ''
                                     ]">
                                   <div class="w-1 h-1 border rotate-45 mt-1.5 transition-colors"
                                        :class="[
                                          isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-bg-panel border-white dark:border-black' : 'border-black/20 dark:border-white/20 group-hover/item:bg-black/40 dark:group-hover/item:bg-white/40',
                                          mismatchedNodeIds.has(unit.item.id) ? '!bg-red-500 !border-red-500' : ''
                                        ]"></div>
                                   <div class="flex flex-col flex-1 min-w-0 relative z-10">
                                      <div class="flex items-center justify-between w-full">
                                         <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-mono font-black tracking-widest uppercase transition-colors"
                                                  :class="[
                                                    isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'nier-text-primary' : 'text-black/80 dark:text-white/90 group-hover/item:text-black dark:group-hover/item:text-white',
                                                    mismatchedNodeIds.has(unit.item.id) ? '!text-red-500' : ''
                                                  ]">{{ unit.item.label }}</span>
                                            <span v-if="unit.item.priority && unit.item.priority !== 'NONE'" 
                                                  class="px-1 py-0.5 text-[6px] font-mono tracking-widest uppercase border"
                                                  :class="unit.item.priority === 'REQUIRED' ? 'border-red-500/50 text-red-500' : 'border-blue-500/50 text-blue-500'">
                                              {{ unit.item.priority }}
                                            </span>
                                         </div>
                                         <span v-if="unit.item.direction" class="text-[6px] font-mono uppercase tracking-widest transition-colors"
                                               :class="isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-amber-500/30'">{{ unit.item.direction }}</span>
                                      </div>
                                      <span class="text-[9px] font-mono uppercase tracking-tighter truncate mt-0.5 transition-colors"
                                            :class="isConditionActive(unit.item.id, selectedRegistryScenarioId) ? 'text-white/40 dark:text-black/40' : 'text-black/60 dark:text-white/75'">{{ unit.item.description || 'Primary indicator.' }}</span>
                                   </div>
                                   <div v-if="isConditionActive(unit.item.id, selectedRegistryScenarioId)" class="absolute inset-0 bg-black/[0.02] animate-pulse"></div>
                                </div>
                             </template>

                          </div>
                       </div>
                    </div>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center py-24 border border-dashed border-white/5 opacity-20">
                     <span class="text-[10px] font-mono tracking-[0.4em] uppercase">{{ tr('Контрольные точки не найдены', 'No Checkpoints Detected') }}</span>
                  </div>
               </div>

               <!-- Footer Metadata -->
               <div class="flex items-center justify-between pt-10 border-t border-white/5 opacity-20">
                  <span class="text-[7px] font-mono tracking-widest uppercase">{{ tr('Состояние системы', 'System State') }}: {{ viewMode.toUpperCase() }}</span>
                  <div class="flex gap-4">
                     <span class="text-[7px] font-mono tracking-widest uppercase">{{ tr('Шифрование', 'Encryption') }}: AES-256</span>
                     <span class="text-[7px] font-mono tracking-widest uppercase">Lattice: v1.0.42</span>
                     <!-- DEBUG UI -->
                     <span class="text-[7px] font-mono tracking-widest uppercase text-red-400">{{ tr('Отладка стратегии', 'Strategy Debug') }}: {{ selectedStrategyId }} | {{ tr('История', 'History') }}: {{ equityCurveTrades.length }}</span>
                  </div>
               </div>
            </div>

             <!-- TACTICAL EQUITY PROJECTION (Replaced Void) -->
             <div v-else class="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
                <div class="relative mx-auto flex h-[clamp(600px,69.6vh,768px)] w-full max-w-[1560px] flex-col items-center justify-center border-transparent bg-transparent group z-10">
                <div v-show="activeProjectionMode === 'core'" class="absolute inset-0 flex items-start justify-start overflow-y-auto overflow-x-hidden custom-scrollbar p-10 text-left text-white">
                  <div class="w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                    <div class="flex w-full max-w-4xl flex-col items-start gap-14">
                    <div class="flex w-full items-center justify-start gap-2 border-b border-white/10 pb-3">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                        :class="activeEntryFormTab === 'main' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                        @click="activeEntryFormTab = 'main'"
                      >
                        {{ tr('ОСНОВНЫЕ', 'MAIN') }}
                        <span v-if="hasEntryMethodPriceViolation" class="shrink-0 font-mono text-[13px] font-black leading-none text-rose-500" :aria-label="tr('Есть ошибка метода входа', 'Entry method error')">!</span>
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                        :class="activeEntryFormTab === 'risk' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                        @click="activeEntryFormTab = 'risk'"
                      >
                        {{ tr('РИСК-МЕНЕДЖМЕНТ', 'RISK MANAGEMENT') }}
                        <span v-if="stopLossRiskMessage || takeProfitRiskMessage" class="shrink-0 font-mono text-[13px] font-black leading-none text-rose-500" :aria-label="tr('Есть ошибка риск-менеджмента', 'Risk management error')">!</span>
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                        :class="activeEntryFormTab === 'time' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                        @click="activeEntryFormTab = 'time'"
                      >
                        {{ tr('ВРЕМЯ', 'TIME') }}
                        <span v-if="tradeTimeStyleMessage" class="shrink-0 font-mono text-[13px] font-black leading-none text-rose-500" :aria-label="tr('Есть ошибка длительности сделки', 'Trade duration error')">!</span>
                      </button>
                      <button
                        type="button"
                        class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                        :class="activeEntryFormTab === 'additional' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                        @click="activeEntryFormTab = 'additional'"
                      >
                        {{ tr('ДОПОЛНИТЕЛЬНЫЕ', 'ADDITIONAL') }}
                      </button>
                      <button
                        type="button"
                        class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                        :class="activeEntryFormTab === 'summary' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                        @click="activeEntryFormTab = 'summary'"
                      >
                        {{ tr('РЕЗЮМЕ', 'SUMMARY') }}
                      </button>
                    </div>

                    <section v-if="activeEntryFormTab === 'main'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">I.</div>
                      <h1 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Актив и направление', 'Asset and direction') }}</h1>
                      <div class="grid w-full max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2">
                        <div class="asset-select-container relative flex w-full flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Актив', 'Asset') }}</span>
                          <button type="button" class="flex h-10 w-full items-center border-b border-white/20 bg-transparent text-left font-mono text-sm uppercase tracking-[0.18em] text-white outline-none transition-colors hover:border-white/80" @click="showAssetMenu = true">
                            <span :class="asset ? 'text-white' : 'text-white/40'">{{ asset || tr('Выберите актив', 'Select asset') }}</span>
                          </button>

                          <ExAssetPickerMenu
                            v-model:open="showAssetMenu"
                            :placeholder="tr('ПОИСК АКТИВОВ...', 'SEARCH ASSETS...')"
                            :no-results-label="tr('Активы не найдены', 'No assets found')"
                            @select="selectAsset"
                          />
                        </div>
                        <div class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Направление', 'Direction') }}</span>
                          <div class="flex">
                            <button
                              type="button"
                              class="border border-white/20 px-5 py-2 font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-colors"
                              :class="side === 'long' ? 'bg-white text-black' : 'text-white/50 hover:text-white'"
                              @click="side = 'long'"
                            >
                              LONG
                            </button>
                            <button
                              type="button"
                              class="-ml-px border border-white/20 px-5 py-2 font-mono text-[11px] font-black uppercase tracking-[0.2em] transition-colors"
                              :class="side === 'short' ? 'bg-white text-black' : 'text-white/50 hover:text-white'"
                              @click="side = 'short'"
                            >
                              SHORT
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'main'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">II.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Точка входа, выхода, размер позиции и результат', 'Entry, exit, position size and result') }}</h2>
                      <div class="grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Точка входа', 'Entry price') }}</span>
                          <input v-model="entry" type="text" inputmode="decimal" placeholder="0.00" :disabled="hasEntryMethodPositions" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 disabled:opacity-35 focus:border-white/80" :title="hasEntryMethodPositions ? tr('Точка входа задаётся в методе входа', 'Entry price is set in the entry method') : ''" @input="sanitizeTradeNumberInput($event, 'entry')" />
                        </label>
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Точка выхода', 'Exit price') }}</span>
                          <input v-model="exit" type="text" inputmode="decimal" placeholder="0.00" :disabled="!isClosed || exitMethodEnabled" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 disabled:opacity-30 focus:border-white/80" :title="exitMethodEnabled ? tr('Точка выхода задаётся в методе выхода', 'Exit price is set in the exit method') : ''" @input="sanitizeTradeNumberInput($event, 'exit')" />
                        </label>
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Размер позиции', 'Position size') }}</span>
                          <input v-model="size" type="text" inputmode="decimal" placeholder="0.00" :disabled="entryMethodEnabled" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80 disabled:opacity-35" :title="entryMethodEnabled ? tr('Размер задаётся в методе входа', 'Position size is set in the entry method') : ''" @input="sanitizeTradeNumberInput($event, 'size')" />
                        </label>
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Результат', 'Trade result') }}</span>
                          <input :value="resultMode === 'manual' ? pnl : formatTradeResultInput(pnl)" type="text" inputmode="decimal" placeholder="0.00" :disabled="!isClosed" :aria-label="tr('Результат по сделке', 'Trade result')" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 disabled:opacity-30 focus:border-white/80" :class="resultMode === 'manual' ? 'text-amber-300' : ''" @input="handlePnlInput" @blur="normalizeTradeResultInput" />
                        </label>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'risk'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">III.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Стоп лосс и тейк профит', 'Stop loss and take profit') }}</h2>
                      <div class="grid w-full max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2">
                        <label class="group/risk relative flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Стоп лосс', 'Stop loss') }}</span>
                          <input v-model="stopLoss" type="text" inputmode="decimal" placeholder="0.00" :aria-invalid="!!stopLossRiskMessage" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80" :class="stopLossRiskMessage ? '!border !border-rose-500/80 !pl-3 !text-rose-300 placeholder:!text-rose-300/30 focus:!border-rose-400' : ''" @input="sanitizeTradeNumberInput($event, 'stopLoss')" />
                          <span v-if="stopLossRiskMessage" class="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden max-w-[320px] border border-rose-500/40 bg-[#0a0a0a] py-2 pl-4 pr-3 font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.12em] text-rose-300 shadow-lg group-hover/risk:block group-focus-within/risk:block">{{ stopLossRiskMessage }}</span>
                        </label>
                        <label class="group/risk relative flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Тейк профит', 'Take profit') }}</span>
                          <input v-model="takeProfit" type="text" inputmode="decimal" placeholder="0.00" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80" :class="takeProfitRiskMessage ? '!border !border-rose-500/80 !pl-3 !text-rose-300 placeholder:!text-rose-300/30 focus:!border-rose-400' : ''" @input="sanitizeTradeNumberInput($event, 'takeProfit')" />
                          <span v-if="takeProfitRiskMessage" class="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden max-w-[320px] border border-rose-500/40 bg-[#0a0a0a] py-2 pl-4 pr-3 font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.12em] text-rose-300 shadow-lg group-hover/risk:block group-focus-within/risk:block">{{ takeProfitRiskMessage }}</span>
                        </label>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'risk'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">IV.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Комиссии для входа и выхода', 'Entry and exit commissions') }}</h2>
                      <div class="grid w-full max-w-4xl grid-cols-1 items-end gap-4 sm:grid-cols-3">
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Комиссия за вход', 'Entry commission') }} · {{ feeType }}</span>
                          <input v-model="entryFee" type="text" inputmode="decimal" placeholder="0.00" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80" @input="sanitizeTradeNumberInput($event, 'entryFee')" />
                        </label>
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Комиссия за выход', 'Exit commission') }} · {{ feeType }}</span>
                          <input v-model="exitFee" type="text" inputmode="decimal" placeholder="0.00" class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80" @input="sanitizeTradeNumberInput($event, 'exitFee')" />
                        </label>
                        <div class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Единица комиссии', 'Commission unit') }}</span>
                          <div class="flex">
                            <button
                              type="button"
                              class="h-10 w-14 border border-white/20 px-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
                              :class="feeType === '%' ? 'bg-white text-black' : 'text-white/50 hover:text-white'"
                              :aria-label="tr('Комиссия в процентах', 'Commission in percent')"
                              @click="feeType = '%'"
                            >
                              %
                            </button>
                            <button
                              type="button"
                              class="-ml-px h-10 w-14 border border-white/20 px-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
                              :class="feeType === '$' ? 'bg-white text-black' : 'text-white/50 hover:text-white'"
                              :aria-label="tr('Комиссия в долларах', 'Commission in dollars')"
                              @click="feeType = '$'"
                            >
                              $
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'time'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">V.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Время входа и выхода, часовой пояс', 'Entry and exit time, time zone') }}</h2>
                      <div class="grid w-full max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
                        <label class="group/risk relative flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Время входа', 'Entry time') }}</span>
                          <input readonly type="text" :value="`${formatPart(openDate, 'year')}.${formatPart(openDate, 'month')}.${formatPart(openDate, 'day')} ${formatPart(openDate, 'hour')}:${formatPart(openDate, 'minute')}`" class="w-full cursor-pointer border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors focus:border-white/80" :class="tradeTimeStyleMessage ? '!border !border-rose-500/80 !pl-3 !text-rose-300 focus:!border-rose-400' : ''" @click="openTemporal('open')" />
                          <span v-if="tradeTimeStyleMessage" class="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden max-w-[320px] border border-rose-500/40 bg-[#0a0a0a] py-2 pl-4 pr-3 font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.12em] text-rose-300 shadow-lg group-hover/risk:block group-focus-within/risk:block">{{ tradeTimeStyleMessage }}</span>
                        </label>
                        <label class="group/risk relative flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Время выхода', 'Exit time') }}</span>
                          <input readonly type="text" :value="isClosed ? `${formatPart(exitDate, 'year')}.${formatPart(exitDate, 'month')}.${formatPart(exitDate, 'day')} ${formatPart(exitDate, 'hour')}:${formatPart(exitDate, 'minute')}` : '--'" :disabled="!isClosed" class="w-full cursor-pointer border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors disabled:cursor-auto disabled:opacity-30 focus:border-white/80" :class="tradeTimeStyleMessage ? '!border !border-rose-500/80 !pl-3 !text-rose-300 focus:!border-rose-400' : ''" @click="isClosed && openTemporal('exit')" />
                          <span v-if="tradeTimeStyleMessage" class="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden max-w-[320px] border border-rose-500/40 bg-[#0a0a0a] py-2 pl-4 pr-3 font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.12em] text-rose-300 shadow-lg group-hover/risk:block group-focus-within/risk:block">{{ tradeTimeStyleMessage }}</span>
                        </label>
                        <label class="flex flex-col items-start gap-2">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Часовой пояс', 'Time zone') }}</span>
                          <input readonly type="text" :value="`${tradeTimeZone} ${tradeTimeZoneOffset || ''}`.trim()" class="w-full cursor-pointer border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors focus:border-white/80" @click="openTemporal('open')" />
                        </label>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'additional'" class="flex flex-col items-start gap-5">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">VI.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Дополнительные данные сделки', 'Additional trade data') }}</h2>

                      <div class="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
                        <div class="flex flex-col gap-5">
                          <button
                            type="button"
                            class="flex w-full items-center justify-between border border-white/20 px-5 py-4 text-left font-mono uppercase tracking-[0.18em] transition-colors hover:border-white/50"
                            :class="tradeStudyMetrics[additionalMoveToggleKey] ? 'bg-white text-black' : 'text-white/70'"
                            @click="toggleAdditionalMetric(additionalMoveToggleKey)"
                          >
                            <span class="text-[10px] font-black">{{ additionalMoveLabel }}</span>
                            <span class="text-[10px] font-black">{{ tradeStudyMetrics[additionalMoveToggleKey] ? tr('ДА', 'YES') : tr('НЕТ', 'NO') }}</span>
                          </button>

                          <label class="flex flex-col items-start gap-2" :class="!tradeStudyMetrics[additionalMoveToggleKey] ? 'pointer-events-none opacity-35' : ''">
                            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ additionalMovePercentLabel }}</span>
                            <input
                              :value="tradeStudyMetrics[additionalMovePercentKey]"
                              type="text"
                              inputmode="decimal"
                              placeholder="0.00"
                              class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80"
                              @input="sanitizeAdditionalMetricInput($event, additionalMovePercentKey)"
                            />
                          </label>

                          <div class="flex flex-col gap-3" :class="!tradeStudyMetrics[additionalMoveToggleKey] ? 'pointer-events-none opacity-35' : ''">
                            <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ additionalDurationLabel }}</span>
                            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                              <label v-for="item in [
                                { key: `${additionalDurationPrefix}DurationDays`, label: tr('Дни', 'Days') },
                                { key: `${additionalDurationPrefix}DurationHours`, label: tr('Часы', 'Hours') },
                                { key: `${additionalDurationPrefix}DurationMinutes`, label: tr('Минуты', 'Minutes') },
                                { key: `${additionalDurationPrefix}DurationSeconds`, label: tr('Секунды', 'Seconds') }
                              ]" :key="item.key" class="flex flex-col gap-2">
                                <span class="text-[8px] font-mono uppercase tracking-[0.24em] text-white/35">{{ item.label }}</span>
                                <input
                                  :value="tradeStudyMetrics[item.key]"
                                  type="text"
                                  inputmode="numeric"
                                  placeholder="0"
                                  class="w-full border-b border-white/20 bg-transparent px-0 py-2 font-mono text-sm tracking-[0.18em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/80"
                                  @input="sanitizeAdditionalMetricInput($event, item.key)"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div class="flex flex-col gap-5">
                          <button
                            type="button"
                            class="flex w-full items-center justify-between border border-white/20 px-5 py-4 text-left font-mono uppercase tracking-[0.18em] transition-colors hover:border-white/50"
                            :class="tradeStudyMetrics.hadNews ? 'bg-white text-black' : 'text-white/70'"
                            @click="toggleAdditionalMetric('hadNews')"
                          >
                            <span class="text-[10px] font-black">{{ tr('Были новости во время сделки', 'News during trade') }}</span>
                            <span class="text-[10px] font-black">{{ tradeStudyMetrics.hadNews ? tr('ДА', 'YES') : tr('НЕТ', 'NO') }}</span>
                          </button>
                        </div>
                      </div>
                    </section>

                    <section v-if="activeEntryFormTab === 'summary'" class="flex flex-col items-start gap-8">
                      <div class="text-[10px] font-mono font-black uppercase tracking-[0.6em] text-white/45">VII.</div>
                      <h2 class="text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('Резюме', 'Summary') }}</h2>
                      <div class="grid w-full max-w-none grid-cols-2 gap-y-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_max-content_minmax(0,1fr)]">
                        <div class="min-w-0 pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Актив', 'Asset') }}</span>
                          <span class="mt-2 flex items-center gap-3 text-xl font-mono font-black uppercase tracking-[0.16em] text-white">
                            <span v-if="summaryDisplayTrade.assetType === 'Forex' && getForexCurrencyPair(summaryDisplayTrade.asset)" class="relative flex h-7 w-7 shrink-0 items-center">
                              <img :src="getForexCurrencyPair(summaryDisplayTrade.asset).base" alt="" class="absolute left-0 top-0 z-10 h-[68%] w-[68%] rounded-full object-cover" />
                              <img :src="getForexCurrencyPair(summaryDisplayTrade.asset).quote" alt="" class="absolute bottom-0 right-0 h-[68%] w-[68%] rounded-full object-cover" />
                            </span>
                            <span v-else-if="currentAssetData?.icon && !failedIcons.has(summaryDisplayTrade.asset)" class="flex h-6 w-6 shrink-0 items-center justify-center">
                              <img :src="currentAssetData.icon" :alt="summaryDisplayTrade.asset" class="h-full w-full object-contain" />
                            </span>
                            <span v-else class="flex h-6 w-6 shrink-0 items-center justify-center text-sm">
                              {{ summaryDisplayTrade.asset?.[0] || '' }}
                            </span>
                            {{ summaryDisplayTrade.asset || '--' }}
                          </span>
                        </div>
                        <div class="min-w-0 pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">СТРАТЕГИЯ</span>
                          <span class="mt-2 block truncate text-xl font-mono font-black uppercase tracking-[0.12em] text-white">{{ summaryStrategyLabel }}</span>
                        </div>
                        <div class="min-w-0 overflow-visible pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('Результат по сделке', 'Trade result') }}</span>
                          <span class="mt-2 block whitespace-nowrap text-lg font-mono font-black leading-tight tracking-[0.1em]" :class="Number(summaryDisplayTrade.profitInCurrency) >= 0 ? 'text-white' : 'text-rose-400'">
                            {{ summaryTradeResultLabel }}
                          </span>
                        </div>
                        <div class="min-w-0 overflow-hidden pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('ДЛИТЕЛЬНОСТЬ СДЕЛКИ', 'TRADE DURATION') }}</span>
                          <span class="mt-2 block truncate text-xl font-mono font-black tracking-[0.12em] text-white">{{ summaryDisplayTrade.tradeDuration || '--' }}</span>
                        </div>
                        <div class="min-w-0 pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('РИСК / КАПИТАЛ', 'RISK / CAPITAL') }}</span>
                          <span class="mt-2 block text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryPercent(summaryDisplayTrade.riskPercent) }}</span>
                        </div>
                        <div class="min-w-0 pr-6">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">RISK / REWARD</span>
                          <span class="mt-2 block text-xl font-mono font-black tracking-[0.12em] text-white">{{ formatSummaryRatio(summaryDisplayTrade) }}</span>
                        </div>
                      </div>

                      <div class="mt-2 grid w-full grid-cols-1 gap-8 border-t border-white/10 pt-6 sm:grid-cols-2">
                        <div class="min-w-0">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('ВЫБРАННЫЕ УСЛОВИЯ', 'SELECTED CONDITIONS') }}</span>
                          <div v-if="summarySelectedConditions.length" class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                            <ExNTtooltip v-for="condition in summarySelectedConditions" :key="condition.id" :title="condition.label" :disabled="condition.isDefaultExitCondition">
                              <template #trigger>
                                <span class="cursor-pointer text-[10px] font-mono uppercase tracking-[0.14em] text-white/75">{{ condition.label }}</span>
                              </template>
                              <div class="flex flex-col gap-1">
                                <span class="text-[8px] font-mono opacity-40">{{ tr('Описание телеметрии', 'Telemetry Description') }}</span>
                                <p class="text-[9px] font-mono uppercase leading-relaxed opacity-60">{{ condition.description || tr('Метаданные отсутствуют', 'No metadata available') }}</p>
                              </div>
                            </ExNTtooltip>
                          </div>
                          <span v-else class="mt-3 block text-[10px] font-mono uppercase tracking-[0.14em] text-white/35">{{ tr('УСЛОВИЯ НЕ ВЫБРАНЫ', 'NO CONDITIONS SELECTED') }}</span>
                        </div>
                        <div class="min-w-0">
                          <span class="text-[9px] font-mono uppercase tracking-[0.35em] text-white/45">{{ tr('ЭМОЦИИ', 'EMOTIONS') }}</span>
                          <div v-if="summarySelectedEmotions.length" class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                            <span v-for="emotion in summarySelectedEmotions" :key="emotion" class="text-[10px] font-mono uppercase tracking-[0.14em] text-white/75">{{ emotion }}</span>
                          </div>
                          <span v-else class="mt-3 block text-[10px] font-mono uppercase tracking-[0.14em] text-white/35">{{ tr('ЭМОЦИИ НЕ ВЫБРАНЫ', 'NO EMOTIONS SELECTED') }}</span>
                        </div>
                      </div>
                    </section>
                    </div>
                  </div>
                </div>

                <div
                  v-show="activeProjectionMode === 'chart'"
                  class="absolute inset-0 h-full w-full"
                  :class="activeProjectionMode === 'chart' ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
                >
                  <div class="h-full w-full p-10">
                    <div class="flex h-full w-full flex-col px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                      <h2 class="shrink-0 text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('РЫНОЧНЫЙ ГРАФИК', 'MARKET CHART') }}</h2>
                      <div class="relative mt-16 min-h-0 flex-1">
                        <ExTradeGeneratedChart :visible="activeProjectionMode === 'chart'" />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-show="activeProjectionMode === 'projection'"
                  class="absolute inset-0 h-full w-full transition-opacity duration-300"
                  :class="activeProjectionMode === 'projection' ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
                >
                  <div class="h-full w-full p-10">
                    <div class="flex h-full w-full flex-col px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                      <h2 class="shrink-0 text-2xl font-mono font-black uppercase tracking-[0.22em] text-white md:text-3xl">{{ tr('КРИВАЯ КАПИТАЛА', 'EQUITY CURVE') }}</h2>
                      <div class="relative mt-12 min-h-0 flex-1">
                        <div v-if="hasValidProjection" class="absolute inset-0 h-full w-full">
                          <ExEquityCurve2D :trades="equityCurveTrades" :initial-balance="1000" />
                        </div>
                        <div v-else class="flex h-full flex-col items-center justify-center py-20">
                          <div class="mb-8 h-px w-16 nier-bg-inverted opacity-20 transition-all duration-700 group-hover:w-24"></div>
                          <span class="projection-empty-label text-[9px] font-mono uppercase tracking-[0.6em] text-black/35 dark:text-white/35">NOT ENOUGH DATA FOR PROJECTION</span>
                          <div class="mt-8 flex gap-2">
                            <div v-for="i in 3" :key="i" class="h-1 w-1 rotate-45 bg-black/5 dark:bg-white/5"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center border border-black/10 bg-theme-bg shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-white/10">
                  <button
                    type="button"
                    :aria-label="locale === 'ru' ? 'Основные данные сделки' : 'Trade details'"
                    class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10"
                    :class="activeProjectionMode === 'core' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
                    @click="activeProjectionMode = 'core'"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.7" />
                      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :aria-label="locale === 'ru' ? 'Проекция' : 'Projection'"
                    class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10"
                    :class="activeProjectionMode === 'projection' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
                    @click="activeProjectionMode = 'projection'"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 17l4-5 4 3 5-8 3 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
                      <path d="M4 20h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :aria-label="locale === 'ru' ? 'График' : 'Chart'"
                    class="grid h-11 w-12 place-items-center transition-colors"
                    :class="activeProjectionMode === 'chart' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45 hover:opacity-100'"
                    @click="activeProjectionMode = 'chart'"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 4v16M17 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                      <path d="M5 8h4v7H5zM15 6h4v10h-4z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
               </div>
             </div>
            </div>
          </div>

          <div v-else-if="viewMode === 'journal'" key="journal" class="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
            <div class="relative mx-auto flex h-[clamp(600px,69.6vh,768px)] w-full max-w-[1560px] flex-col border-transparent bg-transparent">
              <div class="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center border border-black/10 bg-theme-bg shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-white/10">
                <button type="button" disabled aria-disabled="true" aria-label="Основные данные сделки" class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10" :class="activeProjectionMode === 'core' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.7" />
                    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
                  </svg>
                </button>
                <button type="button" disabled aria-disabled="true" aria-label="Проекция" class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10" :class="activeProjectionMode === 'projection' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 17l4-5 4 3 5-8 3 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
                    <path d="M4 20h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                  </svg>
                </button>
                <button type="button" disabled aria-disabled="true" aria-label="График" class="grid h-11 w-12 place-items-center transition-colors" :class="activeProjectionMode === 'chart' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 4v16M17 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                    <path d="M5 8h4v7H5zM15 6h4v10h-4z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div class="flex h-full w-full flex-col space-y-8 overflow-y-auto custom-scrollbar p-10 nier-text-primary">
                <div class="w-full px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
              <div class="flex w-full items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div class="flex items-center space-x-4">
                <div class="flex items-center gap-2">
                   <button @click="archiveMode = 'notes'" 
                           class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                           :class="archiveMode === 'notes' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'">
                      {{ locale === 'ru' ? 'ЗАМЕТКИ' : 'NOTES' }}
                   </button>
                   <button @click="archiveMode = 'images'" 
                           class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                           :class="archiveMode === 'images' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'">
                      {{ locale === 'ru' ? 'ИЗОБРАЖЕНИЯ' : 'IMAGES' }}
                   </button>
                </div>
              </div>
              <div class="flex items-center space-x-6">
                 <button
                   v-if="archiveMode === 'images' || !isCreatingNote"
                   type="button"
                   :disabled="archiveMode === 'images' && activeJournalImageIndex !== null ? false : isArchivePersisting"
                   :class="archiveMode === 'images' && activeJournalImageIndex !== null ? 'nier-bg-inverted nier-text-primary' : ''"
                   :aria-label="archiveMode === 'notes'
                     ? (locale === 'ru' ? 'Добавить заметку' : 'Add note')
                     : activeJournalImageIndex !== null
                       ? (locale === 'ru' ? 'Скрыть просмотр изображения' : 'Hide image preview')
                       : (locale === 'ru' ? 'Добавить изображение' : 'Add image')"
                   class="group grid h-8 w-8 place-items-center border nier-border-primary transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:cursor-default disabled:opacity-30"
                   @click="archiveMode === 'notes'
                     ? startNoteCreation()
                     : activeJournalImageIndex !== null
                       ? closeJournalImage()
                       : addJournalEntry()"
                 >
                    <svg v-if="archiveMode === 'images' && activeJournalImageIndex !== null" class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" />
                      <path d="m4 4 16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                    </svg>
                    <svg v-else class="h-4 w-4 text-black/40 dark:text-white/80 group-hover:text-white dark:group-hover:text-black" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                    </svg>
                 </button>
              </div>
            </div>

            <!-- NOTES TAB CONTENT -->
            <section v-if="archiveMode === 'notes'" class="flex w-full flex-col items-start gap-8 pt-10 nier-text-primary">
              <ExTradeNoteEditor
                v-if="isCreatingNote"
                v-model="noteText"
                :is-persisting="isArchivePersisting"
                :images="attachableJournalImages"
                @save="saveJournalNote"
                @cancel="cancelNoteEdit"
              />

              <div v-if="notesList.length" class="flex w-full flex-col gap-6">
                <template v-for="note in notesList.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())" :key="note.id">
                  <ExTradeNoteListItem
                    v-if="editingContentNoteId !== note.id"
                    :note="note"
                    :expanded="expandedNoteIds.includes(note.id)"
                    :can-edit="true"
                    :is-persisting="isArchivePersisting"
                    :render-content="renderJournalNote"
                    @toggle="toggleNote"
                    @edit-content="startEditContent"
                    @update-title="updateJournalNoteTitle"
                    @remove="removeJournalNote"
                  />
                </template>
              </div>
              <div v-else-if="!isCreatingNote" class="flex w-full flex-col items-center justify-center py-32 opacity-30">
                <div class="mb-6 h-px w-12 bg-white"></div>
                <span class="text-[9px] font-mono uppercase tracking-[0.6em] text-white">
                  {{ locale === 'ru' ? 'НЕТ ЗАМЕТОК' : 'NO NOTES' }}
                </span>
              </div>
            </section>

            <!-- IMAGES TAB CONTENT -->
            <section v-else-if="archiveMode === 'images'" class="flex w-full flex-col items-start gap-8 pt-10 nier-text-primary">
              <div v-if="activeJournalImage?.url" class="flex min-h-[620px] w-full items-center justify-center overflow-hidden bg-black/5 p-6 dark:bg-white/5">
                <img :src="activeJournalImage.url" :alt="activeJournalImage.name || 'Journal image'" class="max-h-[calc(100vh-16rem)] w-full object-contain" />
              </div>
              <div v-else-if="journalImages.length" class="grid w-full grid-cols-2 items-start gap-6 md:grid-cols-3">
                <ExTradeImageEntry
                  v-for="(image, index) in journalImages"
                  :key="image.id || image.url || `journal-image-${index}`"
                  :image="image"
                  :index="index"
                  :can-edit="true"
                  :is-persisting="isArchivePersisting"
                  @upload="handleJournalImageUpload"
                  @remove="removeJournalImage"
                  @name-change="updateJournalImageName"
                  @remove-tag="removeJournalImageTag"
                  @view="openJournalImage"
                />
              </div>
              <div v-else class="flex w-full flex-col items-center justify-center py-32 opacity-30">
                <div class="mb-6 h-px w-12 bg-white"></div>
                <span class="text-[9px] font-mono uppercase tracking-[0.6em] text-white">
                  {{ locale === 'ru' ? 'НЕТ ИЗОБРАЖЕНИЙ' : 'NO IMAGES' }}
                </span>
              </div>
            </section>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="viewMode === 'method'" key="method" class="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
            <div class="relative mx-auto flex h-[clamp(600px,69.6vh,768px)] w-full max-w-[1560px] flex-col border-transparent bg-transparent">
              <div class="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center border border-black/10 bg-theme-bg shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:border-white/10">
                <button type="button" disabled aria-disabled="true" :aria-label="locale === 'ru' ? 'Основные данные сделки' : 'Trade details'" class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10" :class="activeProjectionMode === 'core' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" stroke-width="1.7" />
                    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
                  </svg>
                </button>
                <button type="button" disabled aria-disabled="true" :aria-label="locale === 'ru' ? 'Проекция' : 'Projection'" class="grid h-11 w-12 place-items-center border-r border-black/10 transition-colors dark:border-white/10" :class="activeProjectionMode === 'projection' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 17l4-5 4 3 5-8 3 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
                    <path d="M4 20h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
                  </svg>
                </button>
                <button type="button" disabled aria-disabled="true" :aria-label="locale === 'ru' ? 'График' : 'Chart'" class="grid h-11 w-12 place-items-center transition-colors" :class="activeProjectionMode === 'chart' ? 'nier-bg-inverted nier-text-primary' : 'nier-text-primary opacity-45'">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 4v16M17 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
                    <path d="M5 8h4v7H5zM15 6h4v10h-4z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div class="flex h-full w-full flex-col overflow-hidden p-10 nier-text-primary">
                <div class="w-full max-w-4xl px-6 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                  <div class="flex w-full items-center justify-start gap-2 border-b border-black/10 pb-3 dark:border-white/10">
                    <button
                      type="button"
                      class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                      :class="activeProtocolTab === 'PYRAMIDING' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                      @click="activeProtocolTab = 'PYRAMIDING'; entryMethodType = 'PYRAMIDING'"
                    >
                      {{ locale === 'ru' ? 'ПИРАМИДИНГ' : 'PYRAMIDING' }}
                      <span v-if="hasPyramidingPriceViolation" class="shrink-0 font-mono text-[13px] font-black leading-none text-rose-500" :aria-label="locale === 'ru' ? 'Ошибка цен пирамидинга' : 'Pyramiding price error'">!</span>
                    </button>
                    <button
                      type="button"
                      class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                      :class="activeProtocolTab === 'AVERAGING_DOWN' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                      @click="activeProtocolTab = 'AVERAGING_DOWN'; entryMethodType = 'AVERAGING_DOWN'"
                    >
                      {{ locale === 'ru' ? 'УСРЕДНЕНИЕ' : 'AVERAGING' }}
                      <span v-if="hasAveragingDownPriceViolation" class="shrink-0 font-mono text-[13px] font-black leading-none text-rose-500" :aria-label="locale === 'ru' ? 'Ошибка цен усреднения' : 'Averaging price error'">!</span>
                    </button>
                    <button
                      type="button"
                      class="border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.24em] transition-colors"
                      :class="activeProtocolTab === 'EXIT' ? 'border-white bg-white text-black' : 'border-white/15 text-white/45 hover:border-white/40 hover:text-white'"
                      @click="activeProtocolTab = 'EXIT'"
                    >
                      {{ locale === 'ru' ? 'ВЫХОД' : 'EXIT' }}
                    </button>
                  </div>
                </div>
                <div class="min-h-0 flex-1 px-6 pt-8 sm:px-10 md:px-12 xl:px-16 2xl:px-20">
                  <ExTradeEntryMethodContent />
                </div>
              </div>
            </div>
          </div>
          </div>
        </Transition>
      </div>
    </div>

</template>
