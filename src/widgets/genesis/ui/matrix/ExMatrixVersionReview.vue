<template>
  <Teleport to="body">
    <Transition name="version-review-fade">
      <div
        v-if="isOpen"
        class="version-review-theme is-dark dark theme-dark fixed inset-0 z-[100002] flex items-center justify-center bg-transparent p-8"
        @click="$emit('close')"
      >
        <div class="relative h-[82vh] w-full max-w-6xl" @click.stop>
          <button
            type="button"
            class="absolute -right-6 top-1/2 z-[100] flex h-40 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border-y border-r border-black/20 bg-theme-bg transition-colors hover:bg-theme-surface dark:border-white/20 dark:bg-[#070707] dark:hover:bg-[#111] group/close-tab"
            :aria-label="reviewText('closeReview')"
            @click="$emit('close')"
          >
            <div class="h-16 w-px bg-black/10 transition-all duration-300 group-hover/close-tab:bg-black/40 dark:bg-white/10 dark:group-hover/close-tab:bg-white/40"></div>
            <span class="absolute rotate-90 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.4em] text-black/10 transition-colors group-hover/close-tab:text-black/40 dark:text-white/10 dark:group-hover/close-tab:text-white/40">
              {{ reviewText('closeReviewShort') }}
            </span>
          </button>

          <ExPanel variant="light" :show-corners="true" :no-padding="true" class="version-review-panel h-full w-full">
            <div class="flex h-full min-h-0 flex-col text-nier-text-light dark:text-nier-text-dark">
              <header class="h-6 shrink-0 border-b border-black/10 dark:border-white/10"></header>

              <div class="version-review-scroll min-h-0 flex-1 overflow-y-auto px-20 py-12">
                <div v-if="reviewVersions.length" class="flex flex-col gap-12">
                  <article
                    v-for="version in reviewVersions"
                    :key="version.id"
                    class="version-diff overflow-hidden border border-black/15 dark:border-white/15"
                  >
                    <div class="flex items-center justify-between gap-6 px-10 py-5">
                      <div class="min-w-0">
                        <div class="flex items-center gap-3">
                          <Icon name="lucide:git-commit-horizontal" class="h-4 w-4 shrink-0 opacity-55" />
                          <span class="diff-version-title truncate font-mono text-[14px] font-black uppercase tracking-[0.18em]">{{ getVersionTitle(version) }}</span>
                          <span
                            v-if="isSelectedVersion(version.id)"
                            class="version-selected-badge shrink-0 font-mono text-[8px] font-black uppercase tracking-[0.2em]"
                          >
                            {{ reviewText('currentVersion') }}
                          </span>
                        </div>
                        <div class="mt-1 pl-7 flex flex-col gap-0.5 font-mono text-[10px] uppercase tracking-[0.16em] opacity-40">
                          <div>
                            <span class="opacity-50 mr-2">{{ reviewText('created') }}</span>
                            <span>{{ formatTimestamp(version.createdAt || version.updatedAt) }}</span>
                          </div>
                          <div v-if="version.updatedAt && version.updatedAt !== version.createdAt">
                            <span class="opacity-50 mr-2">{{ reviewText('updated') }}</span>
                            <span>{{ formatTimestamp(version.updatedAt) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-5">
                        <div class="flex items-center gap-4 font-mono text-[11px] font-black">
                          <span class="diff-marker-added">+{{ version.added }}</span>
                          <span class="diff-marker-removed">-{{ version.removed }}</span>
                          <span class="diff-marker-modified">~{{ version.modified }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="version-action-button is-select"
                            :class="{ 'is-selected': isSelectButtonActive(version.id) }"
                            :aria-label="reviewText('selectVersion')"
                            @click.stop="selectVersion(version.id)"
                          >
                            <Icon :name="isSelectButtonActive(version.id) ? 'lucide:check' : 'lucide:mouse-pointer-click'" class="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            class="version-action-button is-danger"
                            :aria-label="reviewText('deleteVersion')"
                            @click.stop="deleteVersion(version.id)"
                          >
                            <Icon name="lucide:trash-2" class="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="version.changes.length" class="font-mono text-[13px] leading-6">
                      <div
                        v-for="change in visibleVersionChanges(version)"
                        :key="change.key"
                        class="version-diff-row grid grid-cols-[38px_minmax(0,1fr)]"
                        :class="`diff-row-${change.kind}`"
                      >
                        <div
                          class="flex justify-center border-r border-black/10 py-4 font-black dark:border-white/10"
                          :class="`diff-marker-${change.kind}`"
                        >
                          {{ change.marker }}
                        </div>
                        <div class="min-w-0 px-10 py-4">
                          <div v-if="showsNodePreview(change)" class="mt-3 mb-2">
                             <div class="flex items-center gap-4 p-4 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] relative overflow-hidden group/preview shadow-inner">
                               <div class="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(150,150,150,0.05)_25%,rgba(150,150,150,0.05)_50%,transparent_50%,transparent_75%,rgba(150,150,150,0.05)_75%,rgba(150,150,150,0.05)_100%)] bg-[length:10px_10px] opacity-50 pointer-events-none"></div>
                               <!-- Fake terminal brackets -->
                               <div class="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-black/20 dark:border-white/20"></div>
                               <div class="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-black/20 dark:border-white/20"></div>

                               <div class="w-16 h-20 relative shrink-0 ml-1 flex items-center justify-center">
                                 <div
                                   v-if="change.nodeObject.type === 'risk'"
                                   class="relative flex h-16 w-16 items-center justify-center border border-black/20 bg-black/[0.03] dark:border-white/20 dark:bg-white/[0.03]"
                                 >
                                   <svg
                                     class="h-8 w-8 opacity-55 nier-text-primary"
                                     viewBox="0 0 24 24"
                                     fill="none"
                                     stroke="currentColor"
                                     stroke-width="1.5"
                                   >
                                     <path d="M12 5v8M12 18v0.01" stroke-width="2.5" stroke-linecap="round" />
                                   </svg>
                                   <div class="absolute left-1 top-1 h-2 w-2 border-l border-t border-black/25 dark:border-white/25"></div>
                                   <div class="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-black/25 dark:border-white/25"></div>
                                 </div>
                                 <ExSkillNode
                                   v-else
                                   :node="change.nodeObject"
                                   :scale="0.45"
                                   :is-dark="isDark"
                                   :is-preview="true"
                                   style="position: absolute !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important;"
                                 />
                               </div>
                               <div class="flex flex-col gap-0.5 relative z-10 flex-1 min-w-0">
                                 <span class="font-mono text-[10px] tracking-widest uppercase font-black" :class="`diff-marker-${change.kind}`">
                                   {{ nodePreviewTitle(change) }}
                                 </span>
                                 <div class="flex items-baseline gap-2">
                                    <span class="diff-node-type shrink-0 text-[11px]">{{ reviewNodeType(change.nodeType) }}</span>
                                    <span v-if="change.nodeName" class="diff-node-name min-w-0 truncate text-[11px]">{{ change.nodeName }}</span>
                                 </div>
                                 <span class="font-mono text-[7px] tracking-[0.2em] uppercase opacity-40 mt-0.5">
                                   {{ nodePreviewSubtitle(change) }}
                                 </span>
                               </div>
                             </div>
                          </div>
                          <div v-else class="flex min-w-0 items-baseline gap-2">
                            <span class="shrink-0 font-bold" :class="`diff-event-${change.tone}`">{{ eventTitle(change.title) }}</span>
                            <span class="opacity-25">::</span>
                            <span class="diff-node-type shrink-0">{{ reviewNodeType(change.nodeType) }}</span>
                            <span v-if="change.nodeName" class="diff-node-name min-w-0 truncate">{{ change.nodeName }}</span>
                            <span
                              v-if="change.kind !== 'unchanged'"
                              class="ml-auto shrink-0 font-mono text-[9px] font-black uppercase tracking-[0.2em]"
                              :class="`diff-marker-${change.kind}`"
                            >
                              {{ changeStatus(change.kind) }}
                            </span>
                          </div>
                          <template v-if="change.details.filter(d => !(change.title.startsWith('ADD_NODE') && d.label === 'type')).length">
                            <div class="mt-1.5 space-y-0.5">
                              <div
                                v-for="detail in change.details.filter(d => !(change.title.startsWith('ADD_NODE') && d.label === 'type'))"
                                :key="detail.key"
                              class="grid grid-cols-[58px_minmax(0,1fr)] break-words"
                              :class="{ 'diff-detail-removed': detail.kind === 'removed' }"
                            >
                              <span
                                class="text-[9px] font-black uppercase tracking-[0.12em]"
                                :class="`diff-marker-${detail.kind}`"
                              >
                                {{ detailStatus(detail) }}
                              </span>
                              <span :style="{ paddingLeft: `${detail.depth * 14}px` }">
                                <span class="diff-tree-glyph">{{ detail.depth ? '`- ' : '|- ' }}</span>
                                <span class="diff-detail-key">{{ detailLabel(detail.label) }}</span>
                                <span class="diff-tree-glyph">: </span>
                                <span class="diff-detail-value">{{ detail.value }}</span>
                              </span>
                            </div>
                            </div>
                          </template>
                        </div>
                      </div>

                      <button
                        v-if="version.changes.length > 2"
                        type="button"
                        class="version-expand-button flex w-full items-center justify-center gap-2 px-6 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] opacity-55 transition-opacity hover:opacity-100"
                        :aria-expanded="isVersionExpanded(version.id)"
                        @click="toggleVersion(version.id)"
                      >
                        <Icon
                          :name="isVersionExpanded(version.id) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                          class="h-3.5 w-3.5"
                        />
                        {{ expandLabel(version) }}
                      </button>
                    </div>

                    <div v-else class="px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.24em] opacity-30">
                      {{ reviewText('noTreeChanges') }}
                    </div>
                  </article>
                </div>

                <div v-else class="flex h-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.3em] opacity-30">
                  {{ reviewText('noSavedVersions') }}
                </div>
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="version-review-fade">
      <div
        v-if="pendingDeleteVersion"
        class="fixed inset-0 z-[10000000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click="cancelDeleteVersion"
      >
        <div class="w-full max-w-lg" @click.stop>
          <ExPanel variant="light">
            <template #telemetry>
              <span class="sr-only">{{ reviewText('versionDeleteControls') }}</span>
            </template>
            <div class="flex flex-col space-y-6">
              <div class="flex items-start space-x-6">
                <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-red-500/40 text-red-500">
                  <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="flex flex-col space-y-2">
                  <span class="font-mono text-[14px] font-black uppercase tracking-widest text-nier-text-light dark:text-nier-text-dark">
                    {{ reviewText('criticalAlert') }}
                  </span>
                  <p class="font-mono text-[11px] uppercase leading-relaxed tracking-widest text-nier-text-light/60 dark:text-nier-text-dark/60">
                    {{ reviewText('deleteWarningIntro', { version: getVersionTitle(pendingDeleteVersion) }) }}
                    <br><br>
                    {{ reviewText('deleteWarningBody') }}
                    <br><br>
                    <span class="font-black text-red-500">{{ reviewText('irreversible') }}</span>
                  </p>
                </div>
              </div>

              <div class="flex justify-end space-x-4 border-t border-nier-border-light pt-4 dark:border-nier-border-dark">
                <ExButton @click="cancelDeleteVersion" variant="ghost" size="md">
                  {{ reviewText('cancel') }}
                </ExButton>
                <ExButton
                  @click="confirmDeleteVersion"
                  variant="solid"
                  size="md"
                  class="!border-red-500 !bg-red-500 !text-white transition-colors hover:!bg-red-600"
                >
                  {{ reviewText('executeDelete') }}
                </ExButton>
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '~/shared/i18n/useI18n'
import ExPanel from '@/shared/ui/ExPanel.vue'
import ExButton from '@/shared/ui/ExButton.vue'
import ExSkillNode from './ExSkillNode.vue'
import { useMatrixState, type MatrixStrategyVersion } from '../../model/matrix/useMatrixState'
import type { MatrixChangeEvent, MatrixChangeType } from '../../model/matrix/useMatrixChangeTree'

const props = defineProps<{
  isOpen: boolean
  versions: MatrixStrategyVersion[]
}>()

defineEmits<{
  close: []
}>()

const { locale } = useI18n()
const state = useMatrixState()
const isDark = computed(() => true)
const expandedVersions = ref(new Set<string>())
const pendingDeleteVersionId = ref<string | null>(null)
const pendingDeleteVersion = computed(() => props.versions.find(version => version.id === pendingDeleteVersionId.value) || null)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    expandedVersions.value = new Set()
  } else {
    pendingDeleteVersionId.value = null
  }
})

type ReviewChange = {
  key: string
  kind: 'added' | 'removed' | 'modified' | 'unchanged'
  marker: '+' | '-' | '~' | ''
  tone: 'add' | 'delete' | 'connect' | 'current'
  title: string
  nodeType: string
  nodeName: string
  details: ReviewDetail[]
  nodeObject?: any
}

type ReviewKind = ReviewChange['kind']

type ReviewDetail = {
  key: string
  kind: ReviewKind
  marker: '+' | '-' | '~' | ''
  label: string
  value: string
  depth: number
}

type FlatSubchange = {
  id: string
  label: string
  value: string
  depth: number
  order: number
}

function isVersionExpanded(versionId: string) {
  return expandedVersions.value.has(versionId)
}

function toggleVersion(versionId: string) {
  const next = new Set(expandedVersions.value)
  if (next.has(versionId)) next.delete(versionId)
  else next.add(versionId)
  expandedVersions.value = next
}

function isSelectedVersion(versionId: string) {
  return state.selectedStrategyVersionId.value === versionId
}

function isSelectButtonActive(versionId: string) {
  return props.versions.length === 1 || isSelectedVersion(versionId)
}

async function selectVersion(versionId: string) {
  await state.selectStrategyVersion(versionId)
}

async function deleteVersion(versionId: string) {
  pendingDeleteVersionId.value = versionId
}

function cancelDeleteVersion() {
  pendingDeleteVersionId.value = null
}

async function confirmDeleteVersion() {
  const versionId = pendingDeleteVersionId.value
  if (!versionId) return
  pendingDeleteVersionId.value = null
  await state.removeStrategyVersion(versionId)
}

const reviewTextMap: Record<string, { en: string; ru: string }> = {
  closeReview: { en: 'Close version review', ru: 'Закрыть обзор версий' },
  closeReviewShort: { en: 'Close Review', ru: 'Закрыть Обзор' },
  noTreeChanges: { en: 'No tree changes from previous version', ru: 'Нет изменений дерева с предыдущей версии' },
  noSavedVersions: { en: 'No saved versions', ru: 'Нет сохраненных версий' },
  selectVersion: { en: 'Select version', ru: 'Выбрать версию' },
  currentVersion: { en: 'Current', ru: 'Текущая' },
  deleteVersion: { en: 'Delete version', ru: 'Удалить версию' },
  deleteWarningIntro: { en: 'Initiating this protocol will permanently delete version: {version}.', ru: 'Запуск этого протокола полностью удалит версию: {version}.' },
  deleteWarningBody: { en: 'The version snapshot and its review history backup will be purged from the current matrix archive.', ru: 'Снимок версии и его backup истории обзора будут очищены из текущего архива матрицы.' },
  irreversible: { en: 'This action is irreversible.', ru: 'Это действие необратимо.' },
  cancel: { en: 'CANCEL', ru: 'ОТМЕНА' },
  executeDelete: { en: 'EXECUTE DELETE', ru: 'УДАЛИТЬ ВЕРСИЮ' },
  collapseVersion: { en: 'Collapse version', ru: 'Свернуть версию' },
  showMoreEvents: { en: 'Show {count} more events', ru: 'Показать еще {count} событий' },
  updatedNode: { en: '[~] UPDATED NODE', ru: '[~] ОБНОВЛЕН УЗЕЛ' },
  reifiedNode: { en: '[+] REIFIED NODE', ru: '[+] СОЗДАН УЗЕЛ' },
  systemObjectUpdated: { en: 'System Object Updated', ru: 'Системный объект обновлен' },
  systemObjectInitialized: { en: 'System Object Initialized', ru: 'Системный объект инициализирован' },
  created: { en: 'CREATED:', ru: 'СОЗДАН:' },
  updated: { en: 'UPDATED:', ru: 'ОБНОВЛЕН:' },
  versionDeleteControls: { en: 'Version delete confirmation controls', ru: 'Управление подтверждением удаления версии' },
  criticalAlert: { en: 'Critical System Alert', ru: 'Критическое системное предупреждение' }
}

const eventTitleMap: Record<string, { en: string; ru: string }> = {
  ADD_NODE: { en: 'ADD NODE', ru: 'ДОБАВЛЕН УЗЕЛ' },
  UPDATE_NODE: { en: 'UPDATE NODE', ru: 'ОБНОВЛЕН УЗЕЛ' },
  DELETE_NODE: { en: 'DELETE NODE', ru: 'УДАЛЕН УЗЕЛ' },
  CONNECT_NODE: { en: 'CONNECT NODE', ru: 'СВЯЗАН УЗЕЛ' },
  CONNECT_NODES: { en: 'CONNECT NODES', ru: 'СВЯЗАНЫ УЗЛЫ' },
  CLEAR_NODE: { en: 'CLEAR NODE', ru: 'ОЧИЩЕН УЗЕЛ' },
  CLEAR_TREE: { en: 'CLEAR TREE', ru: 'ОЧИЩЕНО ДЕРЕВО' }
}

const detailLabelMap: Record<string, { en: string; ru: string }> = {
  type: { en: 'type', ru: 'тип' },
  'risk per trade': { en: 'risk per trade', ru: 'риск на сделку' },
  'risk per session': { en: 'risk per session', ru: 'риск на сессию' },
  'risk reward ratio': { en: 'risk reward ratio', ru: 'соотношение риск/прибыль' },
  'trading style': { en: 'trading style', ru: 'стиль торговли' },
  table: { en: 'table', ru: 'таблица' },
  screenshot: { en: 'screenshot', ru: 'скриншот' },
  drawing_panel: { en: 'drawing panel', ru: 'панель рисования' },
  file_attachment: { en: 'file attachment', ru: 'файл вложение' },
  change: { en: 'change', ru: 'изменение' }
}

function reviewText(key: string, params: Record<string, string | number> = {}) {
  const copy = reviewTextMap[key]?.[locale.value === 'ru' ? 'ru' : 'en'] || key
  return Object.entries(params).reduce((result, [name, value]) => {
    return result.replace(`{${name}}`, String(value))
  }, copy)
}

function eventTitle(title: string) {
  return eventTitleMap[title]?.[locale.value === 'ru' ? 'ru' : 'en'] || title
}

function detailLabel(label: string) {
  return detailLabelMap[label]?.[locale.value === 'ru' ? 'ru' : 'en'] || label
}

const reviewNodeTypeMap: Record<string, { en: string; ru: string }> = {
  strategy: { en: 'strategy', ru: 'стратегия' },
  scenario: { en: 'scenario', ru: 'сценарий' },
  condition: { en: 'condition', ru: 'условие' },
  indicator: { en: 'indicator', ru: 'индикатор' },
  pattern: { en: 'pattern', ru: 'паттерн' },
  smc: { en: 'smc', ru: 'smc' },
  risk: { en: 'risk', ru: 'риск' },
  instrument: { en: 'instrument', ru: 'инструмент' },
  emotion: { en: 'emotion', ru: 'эмоция' },
  'scaling-entry': { en: 'scaling entry', ru: 'масштабирование входа' }
}

function reviewNodeType(value: string) {
  const separator = value.indexOf(':')
  const rawType = separator === -1 ? value : value.slice(0, separator).trim()
  const name = separator === -1 ? '' : value.slice(separator + 1).trim()
  const type = reviewNodeTypeMap[rawType]?.[locale.value === 'ru' ? 'ru' : 'en'] || rawType
  return name ? `${type}: ${name}` : type
}

function nodePreviewTitle(change: ReviewChange) {
  return change.title === 'UPDATE_NODE' ? reviewText('updatedNode') : reviewText('reifiedNode')
}

function nodePreviewSubtitle(change: ReviewChange) {
  return change.title === 'UPDATE_NODE' ? reviewText('systemObjectUpdated') : reviewText('systemObjectInitialized')
}

function expandLabel(version: { id: string; changes: ReviewChange[] }) {
  if (isVersionExpanded(version.id)) return reviewText('collapseVersion')
  return reviewText('showMoreEvents', { count: version.changes.length - 2 })
}

function getVersionTitle(version: any) {
  const strategyNode = (version.snapshot?.nodes || []).find((n: any) => n.type === 'strategy')
  const identity = strategyNode?.params?.identity || strategyNode?.params?.customName || strategyNode?.params?.identityName
  if (identity) {
    const versionMatch = version.label.match(/(V\d+)$/i)
    const suffix = versionMatch ? ` ${versionMatch[1]}` : ''
    return `${identity}${suffix}`
  }
  return version.label
}

function visibleVersionChanges(version: { id: string; changes: ReviewChange[] }) {
  if (version.changes.length <= 2 || isVersionExpanded(version.id)) return version.changes

  return version.changes.slice(0, 2)
}

function showsNodePreview(change: ReviewChange) {
  return !!change.nodeObject && (
    change.title.startsWith('ADD_NODE') ||
    (change.title === 'UPDATE_NODE' && change.nodeObject.type === 'risk')
  )
}

function changeStatus(kind: ReviewKind) {
  if (kind === 'added') return locale.value === 'ru' ? 'НОВЫЙ' : 'NEW'
  if (kind === 'removed') return locale.value === 'ru' ? 'УДАЛЕН' : 'REMOVED'
  if (kind === 'modified') return locale.value === 'ru' ? 'ИЗМЕНЕН' : 'CHANGED'
  return ''
}

function detailStatus(detail: ReviewDetail) {
  if (detail.kind === 'added') return locale.value === 'ru' ? '+ НОВЫЙ' : '+ NEW'
  if (detail.kind === 'removed') return locale.value === 'ru' ? '- СТАРЫЙ' : '- OLD'
  if (detail.kind === 'modified') return locale.value === 'ru' ? '~ НОВЫЙ' : '~ NEW'
  return ''
}

const eventKinds: Record<Exclude<MatrixChangeType, 'version'>, Exclude<ReviewKind, 'unchanged'>> = {
  add: 'added',
  delete: 'removed',
  connect: 'modified',
  clear: 'removed',
  update: 'modified'
}

const markers: Record<ReviewKind, ReviewChange['marker']> = {
  added: '+',
  removed: '-',
  modified: '~',
  unchanged: ''
}

const eventTones: Record<Exclude<MatrixChangeType, 'version'>, ReviewChange['tone']> = {
  add: 'add',
  delete: 'delete',
  connect: 'connect',
  clear: 'delete',
  update: 'current'
}

const reviewNodeEventTypes = new Set([
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

function riskReviewFields(node: any) {
  const params = node?.params || {}
  const tradeValue = params.riskLossTrade ?? 1
  const tradeUnit = params.riskLossTradeUnit || '%'
  const sessionValue = params.riskLossDay ?? 5
  const sessionUnit = params.riskLossDayUnit || '$'

  return [
    { label: 'risk per trade', value: tradeUnit === '$' ? `$${tradeValue}` : `${tradeValue}%` },
    { label: 'risk per session', value: sessionUnit === '$' ? `$${sessionValue}` : `${sessionValue}%` },
    { label: 'risk reward ratio', value: `1:${params.riskRR ?? 3}` },
    { label: 'trading style', value: String(params.tradingStyle || 'DAY TRADING').replace(/_/g, ' ') }
  ].map(field => ({
    id: `risk-field:${field.label}`,
    label: field.label,
    value: field.value,
    targetId: node.id,
    subchanges: []
  }))
}

function treeEvents(version?: MatrixStrategyVersion) {
  return (version?.snapshot.events || [])
    .filter((event: MatrixChangeEvent) => event.type !== 'version') as MatrixChangeEvent[]
}

function eventComparable(event: MatrixChangeEvent) {
  return {
    type: event.type,
    title: event.title,
    node: event.node,
    targetId: event.targetId,
    targetKind: event.targetKind,
    subchanges: event.subchanges || []
  }
}

function splitNode(node: string) {
  const separator = node.indexOf(':')
  if (separator === -1) return { nodeType: node, nodeName: '' }
  return {
    nodeType: node.slice(0, separator + 1),
    nodeName: node.slice(separator + 1).trim()
  }
}

function formatTreeValue(label: string, value: unknown) {
  if (label === 'table') return locale.value === 'ru' ? 'изменение таблицы' : 'table change'
  if (label === 'screenshot') return locale.value === 'ru' ? 'изменение скриншота' : 'screenshot change'
  if (label === 'drawing_panel') return locale.value === 'ru' ? 'изменение панели рисования' : 'drawing panel change'
  if (label === 'file_attachment') return locale.value === 'ru' ? 'изменение вложенного файла' : 'file attachment change'
  const flat = String(value ?? '').replace(/[\r\n]+/g, ' ')
  return flat.length > 140 ? `${flat.slice(0, 140)}...` : flat
}

function nodeTypeValue(node: string) {
  const separator = node.indexOf(':')
  return separator === -1 ? 'node' : node.slice(0, separator).trim()
}

function isReviewNodeEvent(event: MatrixChangeEvent, nodesById: Map<string, any>) {
  if (event.targetKind && event.targetKind !== 'node') return true
  if (!event.targetId) return true
  const targetNode = event.targetId ? nodesById.get(event.targetId) : null
  const type = targetNode?.type || nodeTypeValue(event.node)
  return reviewNodeEventTypes.has(type)
}

function flattenSubchanges(subchanges: any[], depth = 0, rows: FlatSubchange[] = []) {
  subchanges.forEach(subchange => {
    rows.push({
      id: subchange.id,
      label: String(subchange.label || 'change'),
      value: formatTreeValue(subchange.label, subchange.value),
      depth,
      order: rows.length
    })
    if (String(subchange.label).toUpperCase() === 'ADD_NODE') {
      rows.push({
        id: `${subchange.id}:node-type`,
        label: 'type',
        value: nodeTypeValue(String(subchange.value || 'node')),
        depth: depth + 1,
        order: rows.length
      })
    }
    flattenSubchanges(subchange.subchanges || [], depth + 1, rows)
  })
  return rows
}

function eventRows(event: MatrixChangeEvent) {
  const rows = flattenSubchanges(event.subchanges || [])
  if (event.title !== 'ADD_NODE') return rows
  return [
    {
      id: `${event.id}:node-type`,
      label: 'type',
      value: nodeTypeValue(event.node),
      depth: 0,
      order: -1
    },
    ...rows
  ]
}

function detailFromRow(row: FlatSubchange, kind: ReviewKind, value = row.value): ReviewDetail {
  return {
    key: `${row.id}:${kind}:${row.order}`,
    kind,
    marker: markers[kind],
    label: row.label,
    value,
    depth: row.depth
  }
}

function allEventDetails(event: MatrixChangeEvent, kind: ReviewKind) {
  return eventRows(event).map(row => detailFromRow(row, kind))
}

function mergedEventDetails(previous: MatrixChangeEvent, current: MatrixChangeEvent) {
  const previousRows = eventRows(previous)
  const currentRows = eventRows(current)
  const previousById = new Map(previousRows.map(row => [row.id, row]))
  const currentById = new Map(currentRows.map(row => [row.id, row]))
  const details: ReviewDetail[] = []

  currentRows.forEach(row => {
    const oldRow = previousById.get(row.id)
    if (!oldRow) {
      details.push(detailFromRow(row, 'added'))
      return
    }
    if (oldRow.label !== row.label || oldRow.value !== row.value) {
      details.push(detailFromRow(oldRow, 'removed'))
      details.push(detailFromRow(row, 'modified'))
      return
    }
    details.push(detailFromRow(row, 'unchanged'))
  })

  previousRows.forEach(row => {
    if (!currentById.has(row.id)) details.push(detailFromRow(row, 'removed'))
  })

  return details
}

function reviewChange(event: MatrixChangeEvent, kind: ReviewKind, key: string, details: ReviewDetail[], nodesById: Map<string, any>): ReviewChange {
  return {
    key,
    kind,
    marker: markers[kind],
    tone: eventTones[event.type as Exclude<MatrixChangeType, 'version'>] || 'current',
    title: event.title,
    ...splitNode(event.node),
    details,
    nodeObject: event.targetId ? nodesById.get(event.targetId) : undefined
  }
}

function isRiskEvent(event: MatrixChangeEvent, nodesById: Map<string, any>) {
  const targetNode = event.targetId ? nodesById.get(event.targetId) : null
  return targetNode?.type === 'risk' || /^risk(?:-management)?:/i.test(event.node)
}

function riskVersionEvent(node: any, type: 'add' | 'delete' | 'update', title: string): MatrixChangeEvent {
  return {
    id: 'risk-management',
    type,
    title,
    node: `risk: ${node.params?.customName || node.label || 'Risk'}`,
    createdAt: 0,
    targetId: node.id,
    targetKind: 'node',
    subchanges: riskReviewFields(node)
  }
}

function buildRiskVersionChange(
  version: MatrixStrategyVersion,
  currentRiskNode: any,
  previousRiskNode: any,
  nodesById: Map<string, any>
) {
  if (!currentRiskNode && !previousRiskNode) return null

  if (!previousRiskNode) {
    const current = riskVersionEvent(currentRiskNode, 'add', 'ADD_NODE')
    return reviewChange(current, 'added', `${version.id}:risk:add`, allEventDetails(current, 'added'), nodesById)
  }

  if (!currentRiskNode) {
    const previous = riskVersionEvent(previousRiskNode, 'delete', 'DELETE_NODE')
    return reviewChange(previous, 'removed', `${version.id}:risk:remove`, allEventDetails(previous, 'removed'), nodesById)
  }

  const previous = riskVersionEvent(previousRiskNode, 'update', 'UPDATE_NODE')
  const current = riskVersionEvent(currentRiskNode, 'update', 'UPDATE_NODE')
  const changed = JSON.stringify(previous.subchanges.map(field => field.value)) !== JSON.stringify(current.subchanges.map(field => field.value))

  return reviewChange(
    current,
    changed ? 'modified' : 'unchanged',
    `${version.id}:risk:${changed ? 'modify' : 'keep'}`,
    changed ? mergedEventDetails(previous, current) : allEventDetails(current, 'unchanged'),
    nodesById
  )
}

function buildVersionChanges(version: MatrixStrategyVersion, previousVersion?: MatrixStrategyVersion) {
  const currentNodesById = new Map<string, any>((version.snapshot.nodes || []).map(n => [n.id, n]))
  const previousNodesById = new Map<string, any>((previousVersion?.snapshot.nodes || []).map(n => [n.id, n]))
  const mergedNodesById = new Map<string, any>([...previousNodesById, ...currentNodesById])
  const currentEvents = treeEvents(version).filter(event => (
    !isRiskEvent(event, currentNodesById) &&
    isReviewNodeEvent(event, currentNodesById)
  ))
  const previousEvents = treeEvents(previousVersion).filter(event => (
    !isRiskEvent(event, previousNodesById) &&
    isReviewNodeEvent(event, previousNodesById)
  ))
  const currentById = new Map(currentEvents.map(event => [event.id, event]))
  const previousById = new Map(previousEvents.map(event => [event.id, event]))
  const changes: ReviewChange[] = []

  previousEvents.forEach(event => {
    const current = currentById.get(event.id)
    if (!current) {
      changes.push(reviewChange(
        event,
        'removed',
        `${version.id}:remove:${event.id}`,
        allEventDetails(event, 'removed'),
        mergedNodesById
      ))
      return
    }

    const changed = JSON.stringify(eventComparable(event)) !== JSON.stringify(eventComparable(current))
    changes.push(reviewChange(
      current,
      changed ? 'modified' : 'unchanged',
      `${version.id}:${changed ? 'modify' : 'keep'}:${current.id}`,
      changed
        ? mergedEventDetails(event, current)
        : allEventDetails(current, 'unchanged'),
      mergedNodesById
    ))
  })

  currentEvents.forEach(event => {
    if (previousById.has(event.id)) return
    const kind = eventKinds[event.type as Exclude<MatrixChangeType, 'version'>] || 'modified'
    changes.push(reviewChange(event, kind, `${version.id}:add:${event.id}`, allEventDetails(event, kind), mergedNodesById))
  })

  const currentRiskNode = [...currentNodesById.values()].find(node => node.type === 'risk')
  const previousRiskNode = [...previousNodesById.values()].find(node => node.type === 'risk')
  const riskChange = buildRiskVersionChange(version, currentRiskNode, previousRiskNode, mergedNodesById)
  if (riskChange) changes.push(riskChange)

  return changes
}

const reviewVersions = computed(() => {
  return props.versions.map((version, index) => {
    const changes = buildVersionChanges(version, props.versions[index - 1])
    return {
      ...version,
      changes,
      added: changes.filter(change => change.kind === 'added').length,
      removed: changes.filter(change => change.kind === 'removed').length,
      modified: changes.filter(change => change.kind === 'modified').length
    }
  }).reverse()
})

function formatTimestamp(timestamp: number) {
  const currentLocale = locale.value === 'ru' ? 'ru-RU' : 'en-US'
  return new Intl.DateTimeFormat(currentLocale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}
</script>

<style scoped>
.version-review-scroll {
  scrollbar-color: rgb(120 120 116 / 0.42) transparent;
  scrollbar-width: thin;
}

.version-review-theme {
  background-color: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.version-diff {
  border-radius: 4px;
}

.version-review-panel :deep(.ex-panel-backdrop) {
  background-color: rgb(10 10 10 / 0.9) !important;
  backdrop-filter: blur(8px) saturate(115%) !important;
  -webkit-backdrop-filter: blur(8px) saturate(115%) !important;
}

.version-review-theme.is-dark .version-review-panel :deep(.ex-panel-backdrop) {
  background-color: rgb(10 10 10 / 0.9) !important;
}

.version-review-theme.is-dark .version-review-panel {
  background-color: rgb(10 10 10 / 0.9) !important;
  border-color: rgb(255 255 255 / 0.2) !important;
}

.diff-marker-added {
  color: rgb(72 170 98);
}

.diff-marker-removed {
  color: rgb(246 76 98);
}

.diff-marker-modified {
  color: rgb(215 175 95);
}

.diff-version-title {
  color: rgb(126 24 36);
}

.version-selected-badge {
  border: 1px solid rgb(34 34 32 / 0.18);
  color: rgb(34 34 32 / 0.58);
  padding: 3px 6px;
}

.version-action-button {
  display: inline-flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(34 34 32 / 0.18);
  background: rgb(255 255 255 / 0.36);
  color: rgb(34 34 32 / 0.52);
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease, opacity 140ms ease;
}

.version-action-button.is-select {
  border-color: rgb(0 0 0 / 0.28);
  background: rgb(0 0 0 / 0.38);
  color: rgb(255 255 255 / 0.92);
}

.version-action-button.is-select:hover {
  border-color: rgb(0 0 0 / 0.54);
  background: rgb(0 0 0 / 0.52);
  color: #ffffff;
}

.version-action-button:hover,
.version-action-button.is-selected {
  border-color: rgb(34 34 32 / 0.44);
  background: rgb(34 34 32 / 0.08);
  color: rgb(34 34 32 / 0.95);
}

.version-action-button.is-select.is-selected,
.version-action-button.is-select.is-selected:hover {
  border-color: rgb(255 255 255 / 0.92);
  background: #ffffff;
  color: #000000;
}

.version-action-button.is-danger {
  color: rgb(190 45 62 / 0.68);
}

.version-action-button.is-danger:hover {
  border-color: rgb(246 76 98 / 0.62);
  background: rgb(246 76 98 / 0.08);
  color: rgb(246 76 98);
}

.diff-event-add {
  color: rgb(156 119 255);
}

.diff-event-delete,
.diff-event-connect {
  color: rgb(246 76 98);
}

.diff-event-current,
.diff-detail-key {
  color: rgb(215 175 95);
}

.diff-node-type,
.diff-node-name,
.diff-detail-value {
  color: rgb(34 34 32 / 0.94);
}

.diff-tree-glyph {
  color: rgb(34 34 32 / 0.52);
}

.diff-detail-removed {
  opacity: 0.62;
  text-decoration-line: line-through;
  text-decoration-color: rgb(246 76 98 / 0.9);
  text-decoration-thickness: 2px;
}

.diff-row-added {
  box-shadow: inset 3px 0 rgb(72 170 98 / 0.9);
}

.diff-row-modified {
  box-shadow: inset 3px 0 rgb(215 175 95 / 0.9);
}

.diff-row-removed {
  box-shadow: inset 3px 0 rgb(246 76 98 / 0.9);
  opacity: 0.62;
  text-decoration-line: line-through;
  text-decoration-color: rgb(246 76 98 / 0.9);
  text-decoration-thickness: 2px;
}

.version-expand-button {
  color: rgb(215 175 95);
}

.version-review-theme.is-dark .diff-version-title {
  color: rgb(170 42 55);
}

.version-review-theme.is-dark .version-selected-badge {
  border-color: rgb(249 246 240 / 0.18);
  color: rgb(249 246 240 / 0.6);
}

.version-review-theme.is-dark .version-action-button {
  border-color: rgb(249 246 240 / 0.18);
  background: rgb(0 0 0 / 0.34);
  color: rgb(249 246 240 / 0.58);
}

.version-review-theme.is-dark .version-action-button.is-select {
  border-color: rgb(249 246 240 / 0.18);
  background: rgb(0 0 0 / 0.46);
  color: rgb(249 246 240 / 0.92);
}

.version-review-theme.is-dark .version-action-button.is-select:hover {
  border-color: rgb(249 246 240 / 0.42);
  background: rgb(0 0 0 / 0.64);
  color: #ffffff;
}

.version-review-theme.is-dark .version-action-button:hover,
.version-review-theme.is-dark .version-action-button.is-selected {
  border-color: rgb(249 246 240 / 0.46);
  background: rgb(249 246 240 / 0.08);
  color: rgb(249 246 240 / 0.96);
}

.version-review-theme.is-dark .version-action-button.is-select.is-selected,
.version-review-theme.is-dark .version-action-button.is-select.is-selected:hover {
  border-color: rgb(255 255 255 / 0.94);
  background: #ffffff;
  color: #000000;
}

.version-review-theme.is-dark .version-action-button.is-danger {
  color: rgb(248 113 113 / 0.72);
}

.version-review-theme.is-dark .version-action-button.is-danger:hover {
  border-color: rgb(248 113 113 / 0.62);
  background: rgb(248 113 113 / 0.1);
  color: rgb(248 113 113);
}

.version-review-theme.is-dark .diff-node-type,
.version-review-theme.is-dark .diff-node-name,
.version-review-theme.is-dark .diff-detail-value {
  color: rgb(249 246 240 / 0.94);
}

.version-review-theme.is-dark .diff-tree-glyph {
  color: rgb(249 246 240 / 0.56);
}

.version-review-fade-enter-active,
.version-review-fade-leave-active {
  transition: opacity 180ms ease;
}

.version-review-fade-enter-from,
.version-review-fade-leave-to {
  opacity: 0;
}
</style>
