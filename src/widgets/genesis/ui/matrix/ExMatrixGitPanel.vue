<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="tree-scroll-shell fixed right-10 z-[99999] pointer-events-auto"
      >
        <div
          v-if="savedVersions.length"
          class="version-selector"
          :class="isDark ? 'version-theme-dark' : 'version-theme-light'"
        >
          <button
            type="button"
            class="version-selector-trigger"
            :aria-expanded="isVersionMenuOpen"
            :aria-label="gitText('selectVersion')"
            @click.stop="isVersionMenuOpen = !isVersionMenuOpen"
          >
            <span class="version-selector-mark">[v]</span>
            <span>{{ selectedVersionLabel }}</span>
            <span v-if="state.hasStrategyVersionChanges.value" class="version-selector-dirty">*</span>
            <span class="tree-muted">{{ isVersionMenuOpen ? '[-]' : '[+]' }}</span>
          </button>

          <div v-if="isVersionMenuOpen" class="version-selector-menu">
            <button
              v-for="version in savedVersions"
              :key="version.id"
              type="button"
              class="version-selector-option group relative !flex items-center justify-between !pr-8"
              :class="{ 'is-selected': version.id === state.selectedStrategyVersionId.value }"
              @click.stop="selectVersion(version.id)"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="shrink-0">{{ version.id === state.selectedStrategyVersionId.value ? '>' : '\xa0' }}</span>
                <span class="truncate">{{ getVersionTitle(version) }}</span>
              </div>
              <div
                class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500/80 hover:text-red-500 hover:font-bold font-mono tracking-widest text-[10px] bg-inherit"
                :aria-label="gitText('deleteVersion')"
                @click.stop="state.removeStrategyVersion(version.id)"
              >
                [X]
              </div>
            </button>
          </div>
        </div>

        <div class="terminal-tree" :class="isDark ? 'tree-theme-dark' : 'tree-theme-light'">
          <button
            v-for="(row, index) in treeRows"
            :key="index"
            class="tree-row"
            :class="{
              'tree-row-clickable': (row.toggleId || row.onClick) && !row.isTerminated,
              'tree-row-off': isTreeRowOff(row) || row.isTerminated,
              'opacity-50 pointer-events-none': row.isTerminated
            }"
            type="button"
            @click.stop="handleRowClick(row)"
          >
            <span
              v-for="(part, partIndex) in row.parts"
              :key="partIndex"
              :class="part.class"
            >{{ part.text }}</span>
            <span v-if="row.toggleId && isTreeRowOff(row)" class="tree-off-label"> [{{ gitText('off') }}]</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useI18n } from '~/shared/i18n/useI18n'
import { useMatrixChangeTree, type MatrixChangeType } from '../../model/matrix/useMatrixChangeTree'
import { useMatrixState } from '../../model/matrix/useMatrixState'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  close: []
}>()

type TreePart = {
  text: string
  class?: string
}

type TreeRow = {
  parts: TreePart[]
  toggleId?: string
  parentIds?: string[]
  isTerminated?: boolean
  onClick?: () => void
}

const themeStore = useThemeStore()
const { locale } = useI18n()
const isDark = computed(() => themeStore.settings.isDark)
const state = useMatrixState()
const changeTree = state.changeTree
const disabledChanges = changeTree.disabledChanges
const workspace = 'genesis-matrix'
const line = 'strategy'
const expandedParents = ref<Set<string>>(new Set())
const isVersionMenuOpen = ref(false)
const savedVersions = computed(() => [...state.strategyVersions.value].reverse())

function getVersionTitle(version: any) {
  if (!version) return gitText('selectVersion')
  const strategyNode = (version.snapshot?.nodes || []).find((n: any) => n.type === 'strategy')
  const identity = strategyNode?.params?.identity || strategyNode?.params?.customName || strategyNode?.params?.identityName
  if (identity) {
    const versionMatch = version.label.match(/(V\d+)$/i)
    const suffix = versionMatch ? ` ${versionMatch[1]}` : ''
    return `${identity}${suffix}`
  }
  return version.label
}

const selectedVersionLabel = computed(() => getVersionTitle(state.selectedStrategyVersion.value))

async function selectVersion(versionId: string) {
  await state.selectStrategyVersion(versionId)
  isVersionMenuOpen.value = false
}

const eventTypeClasses: Record<MatrixChangeType, string> = {
  add: 'tree-add',
  delete: 'tree-delete',
  connect: 'tree-connect',
  version: 'tree-version',
  clear: 'tree-delete',
  update: 'tree-current'
}

const eventTypeMarkers: Record<MatrixChangeType, string> = {
  add: '+',
  delete: '-',
  connect: '~',
  version: 'v',
  clear: '!',
  update: '*'
}

const visibleNodeEventTypes = new Set([
  'strategy',
  'condition',
  'scenario',
  'indicator',
  'pattern',
  'smc',
  'data',
  'methods',
  'risk',
  'risk-management',
  'emotion',
  'instrument',
  'pyramiding',
  'averaging',
  'domain',
  'scaling-entry'
])

function formatChangeTime(createdAt: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000))
  if (seconds < 5) return gitText('justNow')
  if (seconds < 60) return locale.value === 'ru' ? `${seconds} сек назад` : `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return locale.value === 'ru' ? `${minutes} мин назад` : `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  return locale.value === 'ru' ? `${hours} ч назад` : `${hours} hour${hours === 1 ? '' : 's'} ago`
}

const gitTextMap: Record<string, { en: string; ru: string }> = {
  selectVersion: { en: 'Select Version', ru: 'Выбрать версию' },
  deleteVersion: { en: 'Delete version', ru: 'Удалить версию' },
  justNow: { en: 'just now', ru: 'только что' },
  checkpoint: { en: 'checkpoint ', ru: 'контрольная точка ' },
  changeTimeline: { en: 'change timeline', ru: 'лента изменений' },
  timeline: { en: 'timeline', ru: 'лента' },
  terminated: { en: 'terminated', ru: 'завершено' },
  expandChanges: { en: '... (expand {count} more changes)', ru: '... (развернуть еще {count} изменений)' },
  expandOlderChanges: { en: '... (expand {count} older changes)', ru: '... (развернуть еще {count} старых изменений)' },
  collapseChanges: { en: '... (collapse changes)', ru: '... (свернуть изменения)' },
  tableChange: { en: 'table change', ru: 'изменение таблицы' },
  tableChangeIndexed: { en: 'table change {index}', ru: 'изменение таблицы {index}' },
  screenshotChange: { en: 'screenshot change', ru: 'изменение скриншота' },
  drawingPanelChange: { en: 'drawing panel change', ru: 'изменение панели рисования' },
  fileAttachmentChange: { en: 'file attachment change', ru: 'изменение вложенного файла' },
  off: { en: 'off', ru: 'выкл' },
  strategy: { en: 'strategy', ru: 'стратегия' }
}

const eventTitleMap: Record<string, { en: string; ru: string }> = {
  ADD_NODE: { en: 'ADD NODE', ru: 'УЗЕЛ СОЗДАН' },
  'ADD_NODE*': { en: 'ADD NODE*', ru: 'УЗЕЛ СОЗДАН*' },
  UPDATE_NODE: { en: 'UPDATE NODE', ru: 'УЗЕЛ ОБНОВЛЕН' },
  DELETE_NODE: { en: 'DELETE NODE', ru: 'УЗЕЛ УДАЛЕН' },
  SET_STRATEGY_VERSION: { en: 'SET STRATEGY VERSION', ru: 'ВЕРСИЯ СТРАТЕГИИ СОЗДАНА' },
  UPDATE_STRATEGY_VERSION: { en: 'UPDATE STRATEGY VERSION', ru: 'ВЕРСИЯ СТРАТЕГИИ ОБНОВЛЕНА' }
}

const labelMap: Record<string, { en: string; ru: string }> = {
  identity: { en: 'identity', ru: 'идентичность' },
  type: { en: 'type', ru: 'тип' },
  direction: { en: 'direction', ru: 'направление' },
  timeframe: { en: 'timeframe', ru: 'таймфрейм' },
  period: { en: 'period', ru: 'период' },
  source: { en: 'source', ru: 'источник' },
  lots: { en: 'lots', ru: 'лоты' },
  distance: { en: 'distance', ru: 'дистанция' },
  risk: { en: 'risk', ru: 'риск' },
  customName: { en: 'custom name', ru: 'имя' },
  custom_name: { en: 'custom name', ru: 'имя' },
  phase: { en: 'phase', ru: 'фаза' },
  'risk per trade': { en: 'risk per trade', ru: 'риск на сделку' },
  'risk per session': { en: 'risk per session', ru: 'риск на сессию' },
  'risk reward ratio': { en: 'risk reward ratio', ru: 'соотношение риск/прибыль' },
  'trading style': { en: 'trading style', ru: 'стиль торговли' },
  SCALING_ENTRY: { en: 'SCALING ENTRY', ru: 'МАСШТАБИРУЮЩИЙ ВХОД' },
  NODES_HOLDER: { en: 'NODES HOLDER', ru: 'КОНТЕЙНЕР УЗЛОВ' },
  add: { en: 'add', ru: 'создан' },
  remove: { en: 'remove', ru: 'удален' },
  node_added: { en: 'node added', ru: 'узел создан' },
  node_removed: { en: 'node removed', ru: 'узел удален' },
  default: { en: 'default', ru: 'по умолчанию' },
  collapsed: { en: 'collapsed', ru: 'свернуто' },
  expanded: { en: 'expanded', ru: 'развернуто' },
  table: { en: 'table', ru: 'таблица' },
  screenshot: { en: 'screenshot', ru: 'скриншот' },
  drawing_panel: { en: 'drawing panel', ru: 'панель рисования' },
  file_attachment: { en: 'file attachment', ru: 'файл вложение' },
  ITEM_TEXT: { en: 'ITEM TEXT', ru: 'ТЕКСТ ЭЛЕМЕНТА' },
  text: { en: 'text', ru: 'текст' }
}

const valueMap: Record<string, { en: string; ru: string }> = {
  collapsed: { en: 'collapsed', ru: 'свернуто' },
  expanded: { en: 'expanded', ru: 'развернуто' },
  true: { en: 'true', ru: 'да' },
  false: { en: 'false', ru: 'нет' },
  REQUIRED: { en: 'REQUIRED', ru: 'ОБЯЗАТЕЛЬНО' },
  ADDITIONAL: { en: 'ADDITIONAL', ru: 'ДОПОЛНИТЕЛЬНО' },
  ENTRY: { en: 'ENTRY', ru: 'ВХОД' },
  EXIT: { en: 'EXIT', ru: 'ВЫХОД' },
  DAY_TRADING: { en: 'DAY TRADING', ru: 'ДЕЙТРЕЙДИНГ' }
}

const nodeTypeMap: Record<string, { en: string; ru: string }> = {
  strategy: { en: 'strategy', ru: 'стратегия' },
  condition: { en: 'condition', ru: 'условие' },
  scenario: { en: 'scenario', ru: 'сценарий' },
  indicator: { en: 'indicator', ru: 'индикатор' },
  pattern: { en: 'pattern', ru: 'паттерн' },
  smc: { en: 'smc', ru: 'smc' },
  data: { en: 'data', ru: 'данные' },
  methods: { en: 'methods', ru: 'методы' },
  risk: { en: 'risk', ru: 'риск' },
  'risk-management': { en: 'risk-management', ru: 'риск-менеджмент' },
  emotion: { en: 'emotion', ru: 'эмоция' },
  instrument: { en: 'instrument', ru: 'инструмент' },
  pyramiding: { en: 'pyramiding', ru: 'пирамидинг' },
  averaging: { en: 'averaging', ru: 'усреднение' },
  domain: { en: 'domain', ru: 'домен' },
  'scaling-entry': { en: 'scaling-entry', ru: 'масштабирование' },
  node: { en: 'node', ru: 'узел' }
}

function localized(map: Record<string, { en: string; ru: string }>, key: string) {
  return map[key]?.[locale.value === 'ru' ? 'ru' : 'en'] || key
}

function gitText(key: string, params: Record<string, string | number> = {}) {
  const copy = localized(gitTextMap, key)
  return Object.entries(params).reduce((result, [name, value]) => {
    return result.replace(`{${name}}`, String(value))
  }, copy)
}

function eventTitle(title: string) {
  return localized(eventTitleMap, title)
}

function detailLabel(label: string) {
  return localized(labelMap, label)
}

function detailValue(value: unknown) {
  const raw = String(value ?? '')
  return localized(valueMap, raw)
}

function eventNodeLabel(node: string) {
  const separator = node.indexOf(':')
  if (separator === -1) return node
  const nodeType = node.slice(0, separator).trim()
  const nodeName = node.slice(separator + 1)
  return `${localized(nodeTypeMap, nodeType)}:${nodeName}`
}

function displaySpecialValue(label: string, value: unknown, index?: number) {
  if (label === 'table') {
    return index !== undefined
      ? gitText('tableChangeIndexed', { index: index + 1 })
      : gitText('tableChange')
  }
  if (label === 'screenshot') return gitText('screenshotChange')
  if (label === 'drawing_panel') return gitText('drawingPanelChange')
  if (label === 'file_attachment') return gitText('fileAttachmentChange')
  return detailValue(value)
}

function isVisibleGitEvent(event: any) {
  if (event.targetKind !== 'node' || !event.targetId) return true
  const node = state.getNode(event.targetId)
  return !!node && visibleNodeEventTypes.has(node.type)
}

function formatTreeText(text: unknown, maxLength: number = 35) {
  if (!text) return ''
  const flat = String(text).replace(/[\r\n]+/g, ' ')
  return flat.length > maxLength ? flat.substring(0, maxLength) + '...' : flat
}

function appendNestedSubchangeRows(rows: TreeRow[], subchanges: any[], parentIds: string[], prefix: string) {
  const parentId = parentIds[parentIds.length - 1] || ''
  const hasTooMany = subchanges.length > 3
  const isExpanded = expandedParents.value.has(parentId)

  const visibleSubs = hasTooMany && !isExpanded ? subchanges.slice(0, 3) : subchanges

  visibleSubs.forEach((subchange, index) => {
    const isLast = index === visibleSubs.length - 1 && !(hasTooMany && !isExpanded)
    const connector = isLast ? '`-' : '+-'

    const isDomainNodeChange = subchange.label === 'default' || subchange.label === 'add' || subchange.label === 'remove' || subchange.label === 'node_added' || subchange.label === 'node_removed'
    const isTerminated = !!(isDomainNodeChange && subchange.targetId && !state.nodes.value.some(n => n.id === subchange.targetId))

    const hideLabel = ['table', 'screenshot', 'drawing_panel', 'file_attachment'].includes(subchange.label);
    let displayValue = subchange.value;
    displayValue = displaySpecialValue(subchange.label, subchange.value)

    const parts = [
      { text: '|   ' },
      { text: prefix, class: 'tree-muted' },
      { text: connector, class: 'tree-muted' },
      { text: ' ' },
    ];
    if (!hideLabel) {
      parts.push({ text: detailLabel(subchange.label), class: 'tree-subkey' });
      parts.push({ text: ': ' });
    }
    parts.push({ text: formatTreeText(displayValue, subchange.label === 'ITEM_TEXT' ? 10 : (subchange.label === 'text' ? 15 : 35)) + (isTerminated ? ` (${gitText('terminated')})` : ''), class: isTerminated ? 'tree-muted' : 'tree-subvalue' });

    rows.push({
      toggleId: subchange.id,
      parentIds,
      isTerminated,
      parts
    })

    if (subchange.subchanges?.length) {
      appendNestedSubchangeRows(
        rows,
        subchange.subchanges,
        [...parentIds, subchange.id],
        `${prefix}${isLast ? '    ' : '|   '}`
      )
    }
  })

  if (hasTooMany) {
    if (!isExpanded) {
      rows.push({
        parentIds,
        onClick: () => {
          expandedParents.value.add(parentId)
        },
        parts: [
          { text: '|   ' },
          { text: prefix, class: 'tree-muted' },
          { text: '`--- ', class: 'tree-muted' },
          { text: gitText('expandChanges', { count: subchanges.length - 3 }), class: 'tree-subkey' }
        ]
      })
    } else {
      rows.push({
        parentIds,
        onClick: () => {
          expandedParents.value.delete(parentId)
        },
        parts: [
          { text: '|   ' },
          { text: prefix, class: 'tree-muted' },
          { text: '`--- ', class: 'tree-muted' },
          { text: gitText('collapseChanges'), class: 'tree-subkey' }
        ]
      })
    }
  }
}

const treeRows = computed<TreeRow[]>(() => {
  const rows: TreeRow[] = [
    {
      parts: [
        { text: `${workspace} // `, class: 'tree-muted' },
        { text: gitText('strategy'), class: 'tree-current' }
      ]
    },
    {
      parts: [
        { text: '*', class: 'tree-head' },
        { text: ` ${gitText('strategy')} ${gitText('changeTimeline')}` }
      ]
    }
  ]

  const visibleEvents = [...changeTree.events.value].filter(isVisibleGitEvent).reverse()
  const hasTooManyEvents = visibleEvents.length > 3
  const isMainExpanded = expandedParents.value.has('main-timeline')
  const eventsToShow = hasTooManyEvents && !isMainExpanded ? visibleEvents.slice(0, 3) : visibleEvents

  eventsToShow.forEach((event, eventIndex) => {
    const eventClass = eventTypeClasses[event.type]
    const isVersionEvent = event.type === 'version'
    rows.push({
      toggleId: event.id,
      parts: isVersionEvent ? [
        { text: '|==[', class: 'tree-version-frame' },
        { text: eventTypeMarkers[event.type], class: eventClass },
        { text: '] ', class: 'tree-version-frame' },
        { text: eventTitle(event.title), class: eventClass },
        { text: '  ' },
        { text: eventNodeLabel(event.node), class: 'tree-node tree-version-node' }
      ] : [
        { text: 'o ' },
        { text: eventTypeMarkers[event.type], class: eventClass },
        { text: ' ' },
        { text: eventTitle(event.title), class: eventClass },
        { text: '  ' },
        { text: eventNodeLabel(event.node), class: 'tree-node' }
      ]
    })
    rows.push({
      parts: isVersionEvent ? [
        { text: '|   ', class: 'tree-muted' },
        { text: gitText('checkpoint'), class: 'tree-version-frame' },
        { text: formatChangeTime(event.createdAt), class: 'tree-muted' }
      ] : [
        { text: `|   ${formatChangeTime(event.createdAt)}`, class: 'tree-muted' }
      ]
    })

    if (!isVersionEvent) {
      const subchanges = event.subchanges
      const hasTooMany = subchanges.length > 3
      const isExpanded = expandedParents.value.has(event.id)
      const visibleSubs = hasTooMany && !isExpanded ? subchanges.slice(0, 3) : subchanges

      visibleSubs.forEach((subchange, subIndex) => {
        const isLastSub = subIndex === visibleSubs.length - 1 && !(subchange.subchanges?.length) && !(hasTooMany && !isExpanded)
        const connector = isLastSub ? '`-' : '+-'
        
        const isDomainNodeChange = subchange.label === 'default' || subchange.label === 'add' || subchange.label === 'remove' || subchange.label === 'node_added' || subchange.label === 'node_removed'
        const isTerminated = !!(isDomainNodeChange && subchange.targetId && !state.nodes.value.some(n => n.id === subchange.targetId))
        
        const hideLabel = ['table', 'screenshot', 'drawing_panel', 'file_attachment'].includes(subchange.label);
        let displayValue = subchange.value;
        if (subchange.label === 'table') {
          const index = event.subchanges.filter(s => s.label === 'table').findIndex(s => s.id === subchange.id);
          displayValue = displaySpecialValue(subchange.label, subchange.value, index);
        } else {
          displayValue = displaySpecialValue(subchange.label, subchange.value);
        }

        const parts = [
          { text: '|   ' },
          { text: connector, class: 'tree-muted' },
          { text: ' ' },
        ];
        if (!hideLabel) {
          parts.push({ text: detailLabel(subchange.label), class: 'tree-subkey' });
          parts.push({ text: ': ' });
        }
        parts.push({ text: formatTreeText(displayValue, subchange.label === 'ITEM_TEXT' ? 10 : (subchange.label === 'text' ? 15 : 35)) + (isTerminated ? ` (${gitText('terminated')})` : ''), class: isTerminated ? 'tree-muted' : 'tree-subvalue' });

        rows.push({
          toggleId: subchange.id,
          parentIds: [event.id],
          isTerminated,
          parts
        })

        if (subchange.subchanges) {
          appendNestedSubchangeRows(
            rows,
            subchange.subchanges,
            [event.id, subchange.id],
            subIndex === visibleSubs.length - 1 && !(hasTooMany && !isExpanded) ? '    ' : '|   '
          )
        }
      })

      if (hasTooMany) {
        if (!isExpanded) {
          rows.push({
            parentIds: [event.id],
            onClick: () => {
              expandedParents.value.add(event.id)
            },
            parts: [
              { text: '|   ' },
              { text: '`--- ', class: 'tree-muted' },
              { text: gitText('expandChanges', { count: subchanges.length - 3 }), class: 'tree-subkey' }
            ]
          })
        } else {
          rows.push({
            parentIds: [event.id],
            onClick: () => {
              expandedParents.value.delete(event.id)
            },
            parts: [
              { text: '|   ' },
              { text: '`--- ', class: 'tree-muted' },
              { text: gitText('collapseChanges'), class: 'tree-subkey' }
            ]
          })
        }
      }
    }

    if (eventIndex < eventsToShow.length - 1 || (hasTooManyEvents && !isMainExpanded)) {
      rows.push({ parts: [{ text: '|' }] })
    }
  })

  if (hasTooManyEvents) {
    if (!isMainExpanded) {
      rows.push({
        onClick: () => {
          expandedParents.value.add('main-timeline')
        },
        parts: [
          { text: 'o ' },
          { text: gitText('expandOlderChanges', { count: visibleEvents.length - 3 }), class: 'tree-subkey' }
        ]
      })
    } else {
      rows.push({
        onClick: () => {
          expandedParents.value.delete('main-timeline')
        },
        parts: [
          { text: 'o ' },
          { text: gitText('collapseChanges'), class: 'tree-subkey' }
        ]
      })
    }
    rows.push({ parts: [{ text: '|' }] })
  }

  rows.push({ parts: [{ text: 'o ' }, { text: `${gitText('strategy')} ${gitText('timeline')}`, class: 'tree-current' }] })

  return rows
})

function isTreeRowOff(row: TreeRow) {
  return false
}

function handleRowClick(row: TreeRow) {
  if (row.isTerminated) return
  if (row.onClick) {
    row.onClick()
  }
}

</script>

<style scoped>
.version-selector {
  align-self: flex-end;
  font-family: "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace;
  margin-bottom: 10px;
  position: relative;
  width: max-content;
  z-index: 4;
}

.version-theme-light {
  color: rgb(34 34 32 / 0.94);
}

.version-theme-dark {
  color: rgb(249 246 240 / 0.94);
}

.version-selector-trigger,
.version-selector-option {
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
}

.version-selector-trigger {
  align-items: center;
  display: flex;
  font-size: 11px;
  font-weight: 800;
  gap: 7px;
  height: 24px;
  padding: 0;
}

.version-selector-mark,
.version-selector-dirty {
  color: rgb(170 42 55);
}

.version-selector-menu {
  background: rgb(246 250 247 / 0.96);
  border: 1px solid rgb(34 34 32 / 0.22);
  box-shadow: 6px 6px 0 rgb(34 34 32 / 0.1);
  min-width: 180px;
  padding: 4px 0;
  position: absolute;
  right: 8px;
  top: 27px;
  z-index: 50;
}

.version-theme-dark .version-selector-menu {
  background: rgb(9 13 15 / 0.96);
  border-color: rgb(249 246 240 / 0.22);
  box-shadow: 6px 6px 0 rgb(249 246 240 / 0.06);
}

.version-selector-option {
  display: flex;
  font-size: 10px;
  font-weight: 700;
  gap: 8px;
  padding: 7px 10px;
  width: 100%;
}

.version-selector-option:hover,
.version-selector-option.is-selected {
  background: rgb(126 24 36 / 0.12);
  color: rgb(170 42 55);
}

.tree-scroll-shell {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  top: 64px;
  bottom: 64px;
  max-height: calc(100vh - 128px);
  overflow-y: auto;
  overflow-x: visible;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior: contain;
}

.tree-scroll-shell::before,
.tree-scroll-shell::after {
  content: "";
  flex: 1 0 16px;
}

.tree-scroll-shell::-webkit-scrollbar {
  display: none;
}

.terminal-tree {
  width: max-content;
  font-family: "SFMono-Regular", "Menlo", "Monaco", "Consolas", monospace;
  font-size: clamp(10px, 1.18vw, 14px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.35;
  text-shadow: 0 0 8px rgb(0 0 0 / 0.08);
  white-space: pre;
}

.tree-theme-light {
  color: rgb(34 34 32 / 0.94) !important;
}

.tree-theme-dark {
  color: rgb(249 246 240 / 0.94) !important;
  text-shadow: 0 0 8px rgb(255 255 255 / 0.12);
}

.tree-row {
  display: block;
  width: max-content;
  max-width: 100%;
  height: 21px;
  border: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: pre;
}

.tree-row-clickable {
  cursor: pointer;
  transition: opacity 0.16s ease, filter 0.16s ease, text-shadow 0.16s ease;
}

.tree-row-clickable:hover {
  filter: brightness(1.2);
  text-shadow: 0 0 14px rgb(0 0 0 / 0.14);
}

.tree-theme-dark .tree-row-clickable:hover {
  text-shadow: 0 0 14px rgb(255 255 255 / 0.22);
}

.tree-row-off {
  opacity: 0.34;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: rgb(246 76 98 / 0.72);
}

.tree-off-label {
  color: rgb(246 76 98 / 0.92) !important;
  text-decoration: none;
}

.tree-theme-light .tree-muted {
  color: rgb(34 34 32 / 0.52) !important;
}

.tree-theme-dark .tree-muted {
  color: rgb(249 246 240 / 0.56) !important;
}

.tree-theme-light .tree-head,
.tree-theme-dark .tree-head {
  color: rgb(246 76 98) !important;
}

.tree-theme-light .tree-node {
  color: rgb(34 34 32 / 0.94) !important;
}

.tree-theme-dark .tree-node {
  color: rgb(249 246 240 / 0.94) !important;
}

.tree-theme-light .tree-current,
.tree-theme-dark .tree-current {
  color: rgb(215 175 95) !important;
}

.tree-theme-light .tree-add,
.tree-theme-dark .tree-add {
  color: rgb(156 119 255) !important;
}

.tree-theme-light .tree-delete,
.tree-theme-dark .tree-delete {
  color: rgb(246 76 98) !important;
}

.tree-theme-light .tree-connect,
.tree-theme-dark .tree-connect {
  color: rgb(246 76 98) !important;
}

.tree-theme-light .tree-version {
  color: rgb(126 24 36) !important;
  text-shadow:
    -1px 0 rgb(246 250 247 / 0.82),
    0 1px rgb(246 250 247 / 0.82),
    1px 0 rgb(246 250 247 / 0.82),
    0 -1px rgb(246 250 247 / 0.82);
}

.tree-theme-dark .tree-version {
  color: rgb(170 42 55) !important;
  text-shadow:
    -1px 0 rgb(9 13 15 / 0.92),
    0 1px rgb(9 13 15 / 0.92),
    1px 0 rgb(9 13 15 / 0.92),
    0 -1px rgb(9 13 15 / 0.92),
    0 0 12px rgb(170 42 55 / 0.34);
}

.tree-theme-light .tree-version-frame {
  color: rgb(126 24 36 / 0.88) !important;
  text-shadow:
    -1px 0 rgb(246 250 247 / 0.82),
    0 1px rgb(246 250 247 / 0.82),
    1px 0 rgb(246 250 247 / 0.82),
    0 -1px rgb(246 250 247 / 0.82);
}

.tree-theme-dark .tree-version-frame {
  color: rgb(170 42 55 / 0.9) !important;
  text-shadow:
    -1px 0 rgb(9 13 15 / 0.92),
    0 1px rgb(9 13 15 / 0.92),
    1px 0 rgb(9 13 15 / 0.92),
    0 -1px rgb(9 13 15 / 0.92),
    0 0 12px rgb(170 42 55 / 0.28);
}

.tree-version-node {
  font-weight: 800;
}

.tree-theme-light .tree-subkey,
.tree-theme-dark .tree-subkey {
  color: rgb(215 175 95) !important;
}

.tree-theme-light .tree-subvalue {
  color: rgb(34 34 32 / 0.84) !important;
}

.tree-theme-dark .tree-subvalue {
  color: rgb(249 246 240 / 0.86) !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.24s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
