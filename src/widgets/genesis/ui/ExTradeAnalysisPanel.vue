<script setup lang="ts">
import { computed, ref, shallowRef, onMounted } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import { useThemeStore } from '~/features/store/useTheme'
import { loadFromDisk } from '~/shared/diskStorage'
import ExPanel from "~/shared/ui/ExPanel.vue"
import ExHeading from "~/shared/ui/ExHeading.vue"
import ExText from "~/shared/ui/ExText.vue"
import ExButton from "~/shared/ui/ExButton.vue"
import DrawingModal from '@/widgets/diary/ui/Thoughts/DrawingModal.vue'
import ExImageArchiveSlot from './ExImageArchiveSlot.vue'
import ExImageEditor from './ExImageEditor.vue'
import ExEfficiencyLattice from "~/shared/ui/ExEfficiencyLattice.vue"
import { useDomI18n } from '~/shared/i18n/useDomI18n'
import { useI18n } from '~/shared/i18n/useI18n'
import { resolveRiskManagementForStrategy } from '~/widgets/genesis/model/riskManagement'

interface Condition {
  id: string;
  name: string;
  frequency: number;
  prevFrequency?: number;
  profitability: number;
  prevProfitability?: number;
}

interface Scenario {
  id: string;
  name: string;
  type: 'entry' | 'exit';
  frequency: number;
  prevFrequency?: number;
  profitability: number;
  prevProfitability?: number;
  conditions: Condition[];
}

interface Trade {
  id: string;
  entryTime: string;
  exitTime: string;
  date?: string;
  dateExit?: string;
  strategyId?: string;
  pnl: number;
  scenarios: Scenario[];
  emotions: string[];
  percentileRank?: number;
  rr?: number;
  side?: 'Long' | 'Short';
  notes?: string;
  notesList?: { id: string; content: string; date: string; title?: string }[];
  images?: { url?: string; context?: string; name?: string; tags?: string[]; createdAt?: string; timestamp?: string; date?: string }[];
}

interface TradeAnalysisProps {
  trade?: Trade;
  globalStability?: number; // 0 to 100
  initialPage?: number;
  initialExpandedNoteId?: string;
}

const props = withDefaults(defineProps<TradeAnalysisProps>(), {
  trade: () => ({
    id: 'TRD-08X-42',
    entryTime: '2024-05-01T10:00:00Z',
    exitTime: '2024-05-03T18:30:00Z',
    strategyId: 'GENESIS-PROT',
    pnl: 1250,
    scenarios: [],
    emotions: ['Confidence', 'Slight Anxiety', 'Patience'],
    rr: 2.8
  }),
  globalStability: 64
})

const emit = defineEmits(['close', 'requestEmotionEdit']);

const styleLimits: Record<number, { label: string, max?: number, min?: number, desc: string }> = {
  0: { label: 'Day Trading Style', max: 1, desc: '(24h)' },
  1: { label: 'Swing Trading', min: 1, desc: '(from 1 day to unlimited)' },
  2: { label: 'Investing', min: 90, desc: '(from 3 month - to unlimited)' }
};

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.settings.isDark);
const analysisPanelRoot = ref<HTMLElement | null>(null);
useDomI18n(analysisPanelRoot, 'genesis.dom', { includeBody: true });
const { locale } = useI18n();

const tradeStore = useStrategyTradesStore();
const matrixNodes = shallowRef<any[]>([]);
const matrixConnections = shallowRef<any[]>([]);

const showEmotionSelector = ref(false);
const selectedEmotions = ref<string[]>([]);
const hoveredEmotion = ref<string | null>(null);
const selectedDeepDiveProtocol = ref<{ id: string, name: string } | null>(null);
const EXCLUDED_PROTOCOLS = ['TAKE_PROFIT', 'STOP_LOSS', 'FULL_LIQUIDATION', 'BREAK_EVEN', 'PARTIAL_EXIT', 'TP', 'SL'];

const isDefaultProtocol = (name: string) => {
  return EXCLUDED_PROTOCOLS.includes(name.toUpperCase());
};

const EMOTION_LIBRARY = [
  { label: 'FOMO', type: 'negative', description: 'Entering a trade late due to fear of missing a move, ignoring technical criteria.' },
  { label: 'Revenge', type: 'negative', description: 'Over-leveraging or over-trading to recover losses from a previous failed session.' },
  { label: 'Greed', type: 'negative', description: 'Holding positions past technical targets or over-leveraging for excessive profit.' },
  { label: 'Fear', type: 'negative', description: 'Hesitation to execute valid entries or exiting winning trades early due to loss aversion.' },
  { label: 'Tilt', type: 'negative', description: 'Total loss of emotional control leading to repeated violations of the core trading plan.' },
  { label: 'Anxiety', type: 'negative', description: 'Hyper-fixation on short-term price fluctuations causing cognitive stress.' },
  { label: 'Calmness', type: 'positive', description: 'Maintaining a stable physiological state regardless of market volatility.' },
  { label: 'Discipline', type: 'positive', description: 'Strict adherence to execution protocols and predefined risk management rules.' },
  { label: 'Focus', type: 'positive', description: 'High situational awareness and concentration on technical data streams.' },
  { label: 'Patience', type: 'positive', description: 'Waiting for high-probability setups without forcing low-quality entries.' },
  { label: 'Confidence', type: 'positive', description: 'Trust in the statistical edge of the strategy during execution.' },
  { label: 'Hope', type: 'neutral', description: 'Relying on luck or irrational bias to save a losing position instead of following stops.' },
  { label: 'Boredom', type: 'neutral', description: 'Lack of stimulus leading to low-quality trades to feel "active" in the market.' },
  { label: 'Fatigue', type: 'neutral', description: 'Reduced cognitive performance due to long session duration or biological exhaustion.' }
];

const emotionsByCategory = computed(() => {
  const groups: Record<string, any[]> = { NEGATIVE: [], NEUTRAL: [], POSITIVE: [] };
  EMOTION_LIBRARY.forEach(emotion => {
    const cat = emotion.type.toUpperCase();
    if (groups[cat]) groups[cat].push(emotion);
  });
  return groups;
});

const EMOTION_OPPOSITES: Record<string, string> = {
  'FOMO': 'Patience', 'Patience': 'FOMO',
  'Fear': 'Confidence', 'Confidence': 'Fear',
  'Tilt': 'Calmness', 'Calmness': 'Tilt',
  'Greed': 'Discipline', 'Discipline': 'Greed',
  'Boredom': 'Focus', 'Focus': 'Boredom',
  'Anxiety': 'Calmness'
};

const toggleEmotion = (label: string) => {
  const index = selectedEmotions.value.indexOf(label);
  if (index > -1) {
    selectedEmotions.value.splice(index, 1);
  } else {
    const opposite = EMOTION_OPPOSITES[label];
    if (opposite && selectedEmotions.value.includes(opposite)) return;
    selectedEmotions.value.push(label);
  }
};

const isEmotionDisabled = (label: string) => {
  const opposite = EMOTION_OPPOSITES[label];
  return opposite && selectedEmotions.value.includes(opposite);
};

const saveEmotions = async () => {
  if (props.trade?.strategyId && props.trade?.id) {
    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
      emotions: [...selectedEmotions.value]
    });
    // Update local props to reflect immediately without full reload if necessary
    if (props.trade) props.trade.emotions = [...selectedEmotions.value];
    showEmotionSelector.value = false;
  }
};

const noteText = ref("");
const noteTextArea = ref<HTMLTextAreaElement | null>(null);
const isCreatingNote = ref(false);
const isPreviewMode = ref(false);
const editingContentNoteId = ref<string | null>(null);

const startEditContent = (note: any) => {
  editingContentNoteId.value = note.id;
  noteText.value = note.content || "";
  isCreatingNote.value = true;
  isPreviewMode.value = false;
};

const cancelNoteEdit = () => {
  isCreatingNote.value = false;
  editingContentNoteId.value = null;
  noteText.value = "";
};

const expandedNoteIds = ref<string[]>(props.initialExpandedNoteId ? [props.initialExpandedNoteId] : []);
watch(() => props.initialExpandedNoteId, (newId) => {
  if (newId && !expandedNoteIds.value.includes(newId)) {
    expandedNoteIds.value.push(newId);
  }
}, { immediate: true });

const toggleNote = (id: string) => {
  const index = expandedNoteIds.value.indexOf(id);
  if (index === -1) {
    expandedNoteIds.value.push(id);
  } else {
    expandedNoteIds.value.splice(index, 1);
  }
};

const editingNoteId = ref<string | null>(null);
const editNoteTitle = ref("");

const startEditNote = (note: any, event: Event) => {
  event.stopPropagation();
  editingNoteId.value = note.id;
  editNoteTitle.value = note.title || "ARCHIVED_RECORD";
};

const saveNoteTitle = async (noteId: string) => {
  if (editingNoteId.value === noteId) {
    if (props.trade && props.trade.strategyId && props.trade.id) {
      const currentNotes = enrichedTrade.value?.notesList || [];
      const updatedNotes = currentNotes.map(n => 
        n.id === noteId ? { ...n, title: editNoteTitle.value } : n
      );
      await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
        notesList: updatedNotes
      });
    }
    editingNoteId.value = null;
  }
};

const activeContextMenu = ref<{ x: number, y: number, idx: number } | null>(null);

const isEditorOpen = ref(false);
const editorMode = ref<'preview' | 'edit'>('preview');
const editorImageSrc = ref('');
const currentAnnotations = ref<any>(null);
const currentEditIdx = ref<number | null>(null);

const handleSlotContextMenu = (idx: number, event: MouseEvent) => {
  activeContextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    idx
  };
};

const closeContextMenu = () => {
  activeContextMenu.value = null;
};

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
});


const insertFormatting = (prefix: string, suffix: string = "") => {
  if (!noteTextArea.value) return;
  const el = noteTextArea.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  const before = text.substring(0, start);
  const selection = text.substring(start, end);
  const after = text.substring(end);

  noteText.value = before + prefix + (selection || "") + suffix + after;
  
  // Restore focus and selection
  setTimeout(() => {
    el.focus();
    const newCursorPos = start + prefix.length + (selection ? selection.length + suffix.length : 0);
    el.setSelectionRange(newCursorPos, newCursorPos);
  }, 0);
};

const formatNote = (content: string) => {
  if (!content) return "";
  
  // Replace visual references with actual images
  let processedContent = content.replace(/\[VISUAL_REF:(\d+)\]/gim, (match, idxStr) => {
    const idx = parseInt(idxStr);
    const img = enrichedTrade.value?.images?.[idx];
    if (img && img.url) {
      const name = img.name || `Visual_Node_${idx}`;
      return `<div class="my-4 border nier-border-primary bg-black/5 dark:bg-white/5 p-2 relative group"><img src="${img.url}" alt="${name}" class="max-w-full h-auto object-contain max-h-[400px] w-full" /><div class="absolute bottom-4 left-4 nier-bg-panel px-2 py-1 text-[8px] font-mono opacity-80 uppercase tracking-widest border nier-border-primary shadow-lg">${name}</div></div>`;
    }
    return match;
  });

  // Simple markdown-ish to HTML conversion
  return processedContent
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-black uppercase tracking-widest mt-4 mb-2 nier-text-primary">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-black uppercase tracking-[0.2em] mt-6 mb-3 nier-text-primary border-b nier-border-primary pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black uppercase tracking-[0.4em] mt-8 mb-4 nier-text-primary border-b-2 border-black/20 dark:border-white/20 pb-2">$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-black/20 dark:border-white/20 pl-6 my-4 italic opacity-80">$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li class="ml-6 list-disc opacity-80">$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/\~\~(.*?)\~\~/gim, '<u>$1</u>')
    .replace(/\[color\=(.*?)\](.*?)\[\/color\]/gim, '<span style="color: $1">$2</span>')
    .replace(/\n/gim, '<br />');
};

const syncNotes = () => {
  // We keep this for backward compatibility if needed, 
  // but now we mainly use notesList
};

const addNote = async () => {
  if (!noteText.value.trim()) return;
  
  if (props.trade?.strategyId && props.trade?.id) {
    const currentNotes = enrichedTrade.value?.notesList || [];
    let newNotes = [];
    
    if (editingContentNoteId.value) {
       newNotes = currentNotes.map(n => 
          n.id === editingContentNoteId.value ? { ...n, content: noteText.value } : n
       );
    } else {
       const newNote = {
         id: `note_${Date.now()}`,
         content: noteText.value,
         date: new Date().toISOString(),
         title: `SESSION_LOG_${currentNotes.length + 1}`
       };
       newNotes = [...currentNotes, newNote];
    }
    
    noteText.value = "";
    isCreatingNote.value = false;
    editingContentNoteId.value = null;

    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
      notesList: newNotes
    });
  }
};

const formatDateTactical = (dateStr?: string | Date | null) => {
  const fallbackDate = props.trade?.date || props.trade?.dateExit || props.trade?.entryTime || props.trade?.exitTime;
  const d = new Date(dateStr || fallbackDate || Date.now());
  if (Number.isNaN(d.getTime())) return 'DATE_UNASSIGNED';

  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} // ${time}`;
};

const formatImageSlotDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return 'DATE_UNASSIGNED';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'DATE_UNASSIGNED';

  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} // ${time}`;
};

const showImageFullscreen = (idx: number) => {
  console.log("[Visuals] Show Fullscreen triggered for idx:", idx);
  const img = enrichedTrade.value?.images?.[idx];
  if (img?.url) {
    currentEditIdx.value = idx;
    editorImageSrc.value = img.url;
    try {
       currentAnnotations.value = img.context ? JSON.parse(img.context) : null;
    } catch {
       currentAnnotations.value = null;
    }
    editorMode.value = 'preview';
    isEditorOpen.value = true;
    console.log("[Visuals] Preview modal activated.");
  } else {
    console.warn("[Visuals] No image URL found for slot", idx);
  }
};

const editImage = (idx: number) => {
  console.log("[Visuals] Edit Visuals triggered for idx:", idx);
  const img = enrichedTrade.value?.images?.[idx];
  if (img?.url) {
    currentEditIdx.value = idx;
    editorImageSrc.value = img.url;
    try {
       currentAnnotations.value = img.context ? JSON.parse(img.context) : null;
       console.log("[Visuals] Loaded annotations:", currentAnnotations.value);
    } catch {
       currentAnnotations.value = null;
    }
    editorMode.value = 'edit';
    isEditorOpen.value = true;
    console.log("[Visuals] Drawing modal activated.");
  } else {
    console.warn("[Visuals] No image URL found for slot", idx);
  }
};

const onDrawingSave = async (annotations: any) => {
  const idx = currentEditIdx.value;
  if (idx !== null && props.trade?.strategyId && props.trade?.id) {
    const currentImages = [...(enrichedTrade.value?.images || [])];
    if (currentImages[idx]) {
      currentImages[idx].context = JSON.stringify(annotations);
      await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
        images: currentImages
      });
    }
  }
  isEditorOpen.value = false;
};

const deleteNote = async (noteId: string) => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentNotes = enrichedTrade.value?.notesList || [];
    const newNotes = currentNotes.filter(n => n.id !== noteId);
    
    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
      notesList: newNotes
    });
  }
};

const addImageSlot = async () => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentImages = enrichedTrade.value?.images || [];
    const newImages = [...currentImages, { url: "", context: "", createdAt: new Date().toISOString() }];
    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
      images: newImages
    });
  }
};

const triggerUpload = (idx: number) => {
  const el = document.getElementById(`visual-upload-${idx}`);
  if (el) el.click();
};

const handleImageUpload = async (event: any, index: number) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const url = e.target?.result as string;
    if (url && props.trade?.strategyId && props.trade?.id) {
      const currentImages = [...(enrichedTrade.value?.images || [])];
      if (currentImages[index]) {
        currentImages[index].url = url;
        currentImages[index].createdAt = currentImages[index].createdAt || new Date().toISOString();
        await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
          images: currentImages
        });
      }
    }
  };
  reader.readAsDataURL(file);
};

const updateImageContext = async (index: number, context: string | undefined) => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentImages = [...(enrichedTrade.value?.images || [])];
    if (currentImages[index]) {
      currentImages[index].context = context || "";
      await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
        images: currentImages
      });
    }
  }
};

const removeImage = async (idx: number) => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentImages = [...(enrichedTrade.value?.images || [])];
    currentImages.splice(idx, 1);
    await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
      images: currentImages
    });
  }
};

const updateImageName = async (idx: number, newName: string) => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentImages = [...(enrichedTrade.value?.images || [])];
    if (currentImages[idx]) {
      currentImages[idx].name = newName;
      await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
        images: currentImages
      });
    }
  }
};

const updateImageTags = async (idx: number, newTags: string[]) => {
  if (props.trade?.strategyId && props.trade?.id) {
    const currentImages = [...(enrichedTrade.value?.images || [])];
    if (currentImages[idx]) {
      currentImages[idx].tags = newTags;
      await tradeStore.updateTrade(props.trade.strategyId, props.trade.id, {
        images: currentImages
      });
    }
  }
};

// Sync local selection when opening
watch(showEmotionSelector, (newVal) => {
  if (newVal && props.trade) {
    selectedEmotions.value = [...props.trade.emotions];
  }
});

// Watch for trade changes to sync notes
watch(() => props.trade?.id, () => {
  syncNotes();
}, { immediate: true });

const loadMatrixData = async () => {
  try {
    const data = await loadFromDisk('genesis_matrix_v2') as any;
    if (data) {
      const allNodes: any[] = [];
      const allConns: any[] = [];
      
      const flatten = (nodesList: any[], connsList: any[]) => {
        nodesList.forEach(n => {
          allNodes.push(n);
          if (n.subGraph) {
            flatten(n.subGraph.nodes || [], n.subGraph.connections || []);
          }
        });
        connsList.forEach(c => allConns.push(c));
      };
      
      flatten(data.nodes || [], data.connections || []);
      
      matrixNodes.value = allNodes;
      matrixConnections.value = allConns;
    }
  } catch (err) {
    console.error('Failed to load matrix data in panel:', err);
  }
};

const allTrades = computed(() => {
  if (!props.trade?.strategyId) return [];
  return tradeStore.getTradesForStrategy(props.trade.strategyId);
});

const getNormalizedPnl = (tr: any) => {
  // Fallback chain: currency (if non-zero) -> result (%) -> pnl -> 0
  let p = tr.profitInCurrency;
  if (p === undefined || p === null || p === 0) {
    p = tr.result ?? tr.pnl ?? 0;
  }
  
  const val = typeof p === 'string' ? parseFloat(p) : p;
  
  // If we're using 'result' (percentage) and it's a small number, normalize to currency
  if ((tr.profitInCurrency === undefined || tr.profitInCurrency === null || tr.profitInCurrency === 0) && 
      Math.abs(val) < 100 && initialBalance.value > 1000) {
    return (val / 100) * initialBalance.value;
  }
  return val;
};

const percentileRank = computed(() => {
  const currentPnl = props.trade?.pnl || 0;
  const pnls = allTrades.value.map(getNormalizedPnl).sort((a, b) => a - b);
  if (pnls.length === 0) return 0;
  const lower = pnls.filter(p => p < currentPnl).length;
  return Math.round((lower / pnls.length) * 100);
});

const resolvedRiskManagement = computed(() => {
  return resolveRiskManagementForStrategy(matrixNodes.value, matrixConnections.value, props.trade?.strategyId);
});

const resolvedStyleNode = computed(() => {
  const risk = resolvedRiskManagement.value;
  if (!risk.tradingStyle && risk.tradingStyleExtraType === null) return null;
  return {
    label: risk.tradingStyle || 'STYLE_UNDEFINED',
    params: {
      extraType: risk.tradingStyleExtraType
    }
  };
});

const resolvedTradingStyle = computed(() => {
  const extraType = resolvedExtraType.value;
  const isRu = locale.value === 'ru';
  if (typeof extraType === 'number') {
    const limit = styleLimits[extraType];
    if (limit) {
      if (isRu) {
        if (extraType === 0) return 'Внутридневная торговля';
        if (extraType === 1) return 'Свинг-трейдинг';
        if (extraType === 2) return 'Инвестирование';
      }
      return limit.label;
    }
  }
  const label = resolvedStyleNode.value?.label?.replace(/_/g, ' ') || 'STYLE_UNDEFINED';
  if (isRu && label === 'STYLE_UNDEFINED') {
    return 'Неопределенный стиль';
  }
  return label;
});

const resolvedExtraType = computed(() => {
  return resolvedStyleNode.value?.params?.extraType;
});

const calcPF = (tradeList: any[]) => {
  let gProf = 0, gLoss = 0;
  tradeList.forEach(tr => {
    const val = getNormalizedPnl(tr);
    if (val > 0) gProf += val;
    else if (val < 0) gLoss += Math.abs(val);
  });
  if (tradeList.length === 0) return 0;
  return gLoss === 0 ? (gProf > 0 ? 99.9 : 0) : gProf / gLoss;
};

const calcStats = (trades: any[], id: string) => {
  if (trades.length === 0) return { freq: 0, pf: 1.0 };

  const presentIn = trades.filter(tr => {
    const te = tr as any;
    return te.boardScenarioEntry?.id === id ||
           te.boardScenarioExit?.id === id ||
           te.boardScenarioEntryId === id ||
           te.boardScenarioExitId === id ||
           te.boardConditions?.some((c: any) => (typeof c === 'string' ? c === id : c.id === id)) ||
           te.boardScenarioEntry?.info?.conditions?.some((c: any) => c.id === id) ||
           te.boardScenarioExit?.info?.conditions?.some((c: any) => c.id === id) ||
           // Also check props.trade style structures (scenarios array)
           te.scenarios?.some((s: any) => s.id === id || s.conditions?.some((c: any) => c.id === id)) ||
           te.emotions?.includes(id) ||
           te.emotionsEntry?.includes(id) ||
           te.emotionsDuring?.includes(id) ||
           te.emotionsExit?.includes(id);
  });

  const freq = presentIn.length / trades.length;
  const pf = calcPF(presentIn);
  return { freq, pf };
};

const liveTradesList = computed(() => {
  const list = [...allTrades.value];
  const idx = list.findIndex(t => t.id === props.trade?.id);
  if (idx !== -1) {
    // Merge props.trade into the store version to ensure reactivity to panel edits
    list[idx] = { ...list[idx], ...props.trade } as any;
  } else if (props.trade?.id) {
    list.push(props.trade as any);
  }
  return list.sort((a, b) => {
    const timeA = new Date(a.dateExit || a.date).getTime();
    const timeB = new Date(b.dateExit || b.date).getTime();
    return timeA - timeB;
  });
});

const getProtocolStats = (id: string) => {
  const list = liveTradesList.value;
  if (list.length === 0) return { freq: 0, pf: 1.0 };
  // Current Global State (including all trades)
  return calcStats(list, id);
};

const getProtocolStatsBefore = (id: string) => {
  const list = liveTradesList.value;
  if (list.length <= 1) return { freq: 0, pf: 1.0 };
  
  // Previous Global State (all trades except the very last one in the timeline)
  // This calculates if the absolute most recent activity moved the needle up or down globally
  const filtered = list.slice(0, list.length - 1);
  return calcStats(filtered, id);
};

const enrichedTrade = computed(() => {
  if (!props.trade) return null;

  const allTrades = tradeStore.tradesByStrategy[props.trade.strategyId || ''] || [];
  const realTrade = allTrades.find(t => t.id === props.trade!.id);

  return {
    ...props.trade,
    asset: realTrade?.asset || (props.trade as any).asset || 'N/A',
    notes: realTrade?.notes || props.trade.notes || '',
    notesList: realTrade?.notesList || props.trade.notesList || [],
    images: realTrade?.images || props.trade.images || [],
    tradingStyle: resolvedTradingStyle.value,
    percentileRank: percentileRank.value,
    scenarios: props.trade.scenarios.map(s => {
      const sStats = getProtocolStats(s.id);
      const sPrev  = getProtocolStatsBefore(s.id);
      return {
        ...s,
        frequency: sStats.freq,
        prevFrequency: sPrev?.freq ?? undefined,
        profitability: sStats.pf,
        prevProfitability: sPrev?.pf ?? undefined,
        conditions: (s.conditions || []).map(c => {
          const cStats = getProtocolStats(c.id);
          const cPrev  = getProtocolStatsBefore(c.id);
          return {
            ...c,
            frequency: cStats.freq,
            prevFrequency: cPrev?.freq ?? undefined,
            profitability: cStats.pf,
            prevProfitability: cPrev?.pf ?? undefined
          };
        })
      };
    })
  };
});

const currentPage = ref(props.initialPage || 3);
watch(() => props.initialPage, (newPage) => {
  if (newPage) {
    currentPage.value = newPage;
  }
}, { immediate: true });
const totalPages = 2;

const duration = computed(() => {
  if (!props.trade) return 0;
  const start = new Date(props.trade.date || Date.now()).getTime();
  const end = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime();
  return (end - start) / (1000 * 60 * 60); // hours
});

const scenarioDurationStats = computed(() => {
  const trade = props.trade as any;
  if (!trade?.strategyId) return { minDays: 0, maxDays: 0, count: 0 };

  const scenarioId = trade.boardScenarioEntry?.id;
  if (!scenarioId) return { minDays: 0, maxDays: 0, count: 0 };

  const relatedTrades = tradeStore.getTradesForStrategy(trade.strategyId).filter((t: any) => {
    if (t?.id === trade.id) return false;
    return t?.boardScenarioEntry?.id === scenarioId;
  });

  const durations = relatedTrades.map((t: any) => {
    const start = new Date(t.date || Date.now()).getTime();
    const end = new Date(t.dateExit || t.date || Date.now()).getTime();
    return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  }).filter((days: number) => days > 0);

  if (durations.length === 0) {
    const currentDays = Math.max(0, duration.value / 24);
    return { minDays: currentDays, maxDays: currentDays, count: 0 };
  }

  return {
    minDays: Math.min(...durations),
    maxDays: Math.max(...durations),
    count: durations.length
  };
});

const scenarioDurationLabel = computed(() => {
  const stats = scenarioDurationStats.value;
  const isRu = locale.value === 'ru';
  if (stats.count === 0) {
    return isRu ? 'Нет истории сценария' : 'No scenario history';
  }
  return isRu
    ? `Диапазон сценария (${stats.minDays.toFixed(2)}д - ${stats.maxDays.toFixed(2)}д)`
    : `Scenario range (${stats.minDays.toFixed(2)}d - ${stats.maxDays.toFixed(2)}d)`;
});

const durationText = computed(() => {
  if (!props.trade) return '0s';
  const start = new Date(props.trade.date || Date.now()).getTime();
  const end = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime();
  let diff = end - start;
  if (diff < 0) diff = 0;
  
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const parts = [];
  const isRu = locale.value === 'ru';
  
  if (days > 0) parts.push(isRu ? `${days}д` : `${days}d`);
  if (hours > 0 || days > 0) parts.push(isRu ? `${hours}ч` : `${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(isRu ? `${minutes}м` : `${minutes}m`);
  parts.push(isRu ? `${seconds}с` : `${seconds}s`);
  
  return parts.join(' ');
});

const durationParts = computed(() => {
  if (!props.trade) return [{ num: '0', unit: 's' }];
  const start = new Date(props.trade.date || Date.now()).getTime();
  const end = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime();
  let diff = end - start;
  if (diff < 0) diff = 0;
  
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  const isRu = locale.value === 'ru';
  const parts = [];
  if (days > 0) parts.push({ num: String(days), unit: isRu ? 'д' : 'd' });
  if (hours > 0 || days > 0) parts.push({ num: String(hours), unit: isRu ? 'ч' : 'h' });
  if (minutes > 0 || hours > 0 || days > 0) parts.push({ num: String(minutes), unit: isRu ? 'м' : 'm' });
  parts.push({ num: String(seconds), unit: isRu ? 'с' : 's' });
  
  return parts;
});

const tradeDurationMinutes = computed(() => {
  if (!props.trade) return 0;
  const start = new Date(props.trade.date || Date.now()).getTime();
  const end = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime();
  return (end - start) / (1000 * 60);
});


const isStyleCompliant = computed(() => {
  const days = duration.value / 24;
  const stats = scenarioDurationStats.value;
  if (stats.count === 0) return true;
  return days >= stats.minDays && days <= stats.maxDays;
});

const styleAlertMessage = computed(() => {
  const days = duration.value / 24;
  const stats = scenarioDurationStats.value;
  if (stats.count === 0) return '';

  const isRu = locale.value === 'ru';

  if (days < stats.minDays) {
    return isRu
      ? `Предупреждение: Длительность исполнения (${durationText.value}) ниже исторического минимума сценария (${stats.minDays.toFixed(2)} дн.).`
      : `Alert: Execution duration (${durationText.value}) is below the historical scenario minimum (${stats.minDays.toFixed(2)}d).`;
  }
  if (days > stats.maxDays) {
    return isRu
      ? `Предупреждение: Длительность исполнения (${durationText.value}) превышает исторический максимум сценария (${stats.maxDays.toFixed(2)} дн.).`
      : `Alert: Execution duration (${durationText.value}) exceeds the historical scenario maximum (${stats.maxDays.toFixed(2)}d).`;
  }
  return '';
});

const targetEfficiency = computed(() => percentileRank.value);
const animatedEfficiency = ref(0);
const isInitializing = ref(true);

onMounted(async () => {
  isInitializing.value = true;
  await loadMatrixData();
  isInitializing.value = false;
  
  const duration = 1500; // 1.5s
  const start = performance.now();
  
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    // Cubic out easing
    const eased = 1 - Math.pow(1 - progress, 3);
    animatedEfficiency.value = Math.floor(eased * targetEfficiency.value);
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  
  requestAnimationFrame(step);
});

const tacticalEfficiency = computed(() => animatedEfficiency.value);

// EMOTIONAL STATE CALCULATION
const emotionScores: Record<string, number> = {
  'Confidence': 10, 'confidence': 10,
  'Calm': 10, 'calm': 10,
  'Patience': 8, 'patience': 8,
  'Neutral': 0, 'neutral': 0,
  'Slight Anxiety': -5, 'anxiety': -5,
  'Boredom': -10, 'boredom': -10,
  'Frustration': -15, 'frustration': -15,
  'Fear': -15, 'fear': -15,
  'Greed': -20, 'greed': -20,
  'FOMO': -20, 'fomo': -20,
  'Anger': -25, 'anger': -25
};

const getEmotionName = (e: any): string => {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e.name) return String(e.name);
  if (typeof e === 'object' && e.id) return String(e.id);
  return String(e);
};

const emotionMetrics = computed(() => {
  const all = allTrades.value;
  const currentExitRaw = props.trade?.exitTime ?? (props.trade as any)?.dateExit ?? (props.trade as any)?.date;
  const currentExitTime = currentExitRaw ? new Date(currentExitRaw).getTime() : Infinity;
  
  const result: Record<string, { score: number, frequency: number, prevFrequency: number, pf: number, prevPf: number }> = {};
  
  // Gather all unique emotions from the entire trade history + current trade
  const uniqueEmotions = new Set<string>();
  if (props.trade?.emotions) {
      props.trade.emotions.forEach(e => uniqueEmotions.add(getEmotionName(e)));
  }
  all.forEach(t => {
      const te = t as any;
      const allEmotions = [
          ...(te.emotions || []),
          ...(te.emotionsEntry || []),
          ...(te.emotionsDuring || []),
          ...(te.emotionsExit || [])
      ];
      allEmotions.forEach(e => uniqueEmotions.add(getEmotionName(e)));
  });

  // Initialize
  for (const emotion of uniqueEmotions) {
     result[emotion] = { 
        score: emotionScores[emotion] ?? 0, 
        frequency: 0, 
        prevFrequency: 0,
        pf: 0,
        prevPf: 0
     };
  }
  
  if (all.length === 0) return result;
  
  const allCount = all.length;
  const prevTrades = all.filter(t => {
      const tExit = (t as any).dateExit ?? (t as any).date;
      const exitTime = tExit ? new Date(tExit).getTime() : 0;
      return exitTime < currentExitTime;
  });
  const prevCount = prevTrades.length;
  
  for (const emotion of uniqueEmotions) {
      const entry = result[emotion];
      if (!entry) continue;

      const currentTrades = all.filter(t => {
          const te = t as any;
          const check = (list: any[]) => (list || []).some(e => getEmotionName(e) === emotion);
          return check(te.emotions) || check(te.emotionsEntry) || check(te.emotionsDuring) || check(te.emotionsExit);
      });
      entry.frequency = currentTrades.length / allCount;
      entry.pf = calcPF(currentTrades);
      
      if (prevCount === 0) {
          entry.prevFrequency = 0;
          entry.prevPf = 0;
      } else {
          const prevEmotionTrades = prevTrades.filter(t => {
              const te = t as any;
              const check = (list: any[]) => (list || []).some(e => getEmotionName(e) === emotion);
              return check(te.emotions);
          });
          entry.prevFrequency = prevEmotionTrades.length / prevCount;
          entry.prevPf = calcPF(prevEmotionTrades);
      }
  }
  
  return result;
});

import ExTooltip from "~/shared/ui/ExTooltip.vue"

const getPFColor = (pf: number) => {
  if (pf >= 2.2) return 'nier-text-primary border-black/40 dark:border-white/40 bg-black/[0.08] dark:bg-white/[0.08] shadow-[inset_0_0_10px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]';
  if (pf >= 1.8) return 'text-black/80 dark:text-white/80 border-black/20 dark:border-white/20 bg-black/[0.04] dark:bg-white/[0.04]';
  if (pf >= 1.5) return 'text-rose-600/70 border-rose-600/20 bg-rose-600/[0.03] dark:text-rose-300 dark:border-rose-300/20';
  if (pf >= 1.0) return 'text-rose-600 border-rose-600/30 bg-rose-600/[0.06] dark:text-rose-500';
  return 'text-rose-700 border-rose-700/40 bg-rose-700/[0.12] dark:text-rose-700 dark:border-rose-700/50';
}

const emotionalStateScore = computed(() => {
  const tradeEmotionsScore = (props.trade?.emotions || []).reduce((acc: number, curr: any) => acc + (emotionMetrics.value[getEmotionName(curr)]?.score || 0), 0);
  // Formula: Tactical_Efficiency + picked emotions + LAST EMOTIONAL STATE
  // Normalizing to 0-100 scale for simplicity
  const rawScore = tacticalEfficiency.value + tradeEmotionsScore + props.globalStability;
  return Math.max(0, Math.min(100, rawScore / 2.5)); // Adjusting divisor to keep it in 100 range
})

const emotionalStatus = computed(() => {
  const s = emotionalStateScore.value;
  if (s > 80) return { label: 'OPTIMAL', color: 'bg-emerald-400' };
  if (s > 60) return { label: 'STABLE', color: 'bg-green-300' };
  if (s > 40) return { label: 'NEUTRAL', color: 'bg-yellow-200' };
  if (s > 20) return { label: 'UNSTABLE', color: 'bg-orange-400' };
  return { label: 'CRITICAL', color: 'bg-red-500' };
})



const initialBalance = computed(() => {
  if (!props.trade) return 1000;
  return tradeStore.getInitialDeposit(props.trade.strategyId || 'MAIN_DIARY');
});

const balanceBeforeTrade = computed(() => {
  if (!props.trade) return 1000;

  const strategyId = props.trade.strategyId || 'MAIN_DIARY';
  const currentEntryTs = new Date(props.trade.date || props.trade.entryTime || props.trade.dateExit || Date.now()).getTime();
  const currentTradeId = props.trade.id;
  const startBalance = tradeStore.getInitialDeposit(strategyId);

  const toCashPnl = (trade: any) => {
    const val = Number(trade?.profitInCurrency ?? trade?.pnl ?? 0);
    return Number.isFinite(val) ? val : 0;
  };

  const priorTrades = tradeStore
    .getTradesForStrategy(strategyId)
    .filter((trade: any) => {
      if (currentTradeId && trade?.id === currentTradeId) return false;
      const tradeExitTs = new Date(trade?.dateExit || trade?.date || 0).getTime();
      return tradeExitTs > 0 && tradeExitTs < currentEntryTs;
    })
    .sort((a: any, b: any) => {
      const aTs = new Date(a?.dateExit || a?.date || 0).getTime();
      const bTs = new Date(b?.dateExit || b?.date || 0).getTime();
      return aTs - bTs;
    });

  return priorTrades.reduce((balance: number, trade: any) => balance + toCashPnl(trade), startBalance);
});

import ExEquityCurve2D from './ExEquityCurve2D.vue'

// REPORT GENERATION LOGIC

const reportTrades = computed(() => {
  if (!props.trade) return [];
  const strategyId = props.trade.strategyId || 'MAIN_DIARY';
  const historyTrades = tradeStore.getTradesForStrategy(strategyId);
  
  const currentTradeTime = new Date(props.trade.dateExit || props.trade.date || Date.now()).getTime();
  
  // Combine and ensure current trade is marked as projection for the curve to show it as "impact"
  const exists = historyTrades.some(t => t.id === props.trade.id);
  const combined = (exists ? [...historyTrades] : [...historyTrades, props.trade]).map(t => ({
    ...t,
    // We mark the current trade we are analyzing as the projection target
    isProjection: t.id === props.trade.id
  }));
  
  const sorted = combined.sort((a, b) => {
    const dA = new Date(a.dateExit || a.date || 0).getTime();
    const dB = new Date(b.dateExit || b.date || 0).getTime();
    return dA - dB;
  });
  
  // Filter: only show history up to this specific trade's exit
  return sorted.filter(t => {
    const tTime = new Date(t.dateExit || t.date || 0).getTime();
    return tTime <= currentTradeTime;
  });
});

const getSlDistPct = (t: any) => {
  if (!t) return 0;
  const entry = parseFloat(t.entry);
  const sl = parseFloat(t.stopLoss);
  if (!isNaN(entry) && !isNaN(sl) && entry > 0 && sl > 0) {
    return (Math.abs(entry - sl) / entry) * 100;
  }
  return 0;
};

const getTpDistPct = (t: any) => {
  if (!t) return 0;
  const entry = parseFloat(t.entry);
  let tp = parseFloat(t.takeProfit);
  if (isNaN(tp) || tp <= 0) {
    const exit = parseFloat(t.exit);
    const pnl = t.profitInCurrency ?? t.pnl ?? 0;
    if (!isNaN(exit) && exit > 0 && pnl > 0) {
      tp = exit;
    }
  }
  if (!isNaN(entry) && !isNaN(tp) && entry > 0 && tp > 0) {
    return (Math.abs(tp - entry) / entry) * 100;
  }
  return 0;
};

const currentSlDistPct = computed(() => {
  return getSlDistPct(props.trade);
});

const currentTpDistPct = computed(() => {
  return getTpDistPct(props.trade);
});

const strategyStats = computed(() => {
  if (!props.trade?.strategyId) return { avgPnl: 0, avgDuration: 0, avgRR: 0, avgVelocity: 0, avgAdherence: 0, avgSlDistPct: 0, avgTpDistPct: 0 };
  const trades = tradeStore.getTradesForStrategy(props.trade.strategyId);
  if (trades.length === 0) return { avgPnl: 0, avgDuration: 0, avgRR: 0, avgVelocity: 0, avgAdherence: 0, avgSlDistPct: 0, avgTpDistPct: 0 };
  
  const totalPnl = trades.reduce((acc, t) => acc + (t.profitInCurrency || t.result || 0), 0);
  const totalRR = trades.reduce((acc, t) => acc + (t.riskReward || 0), 0);
  const totalConditions = trades.reduce((acc, t) => acc + (t.boardConditions?.length || 0), 0);
  
  const totalDurationMs = trades.reduce((acc, t) => {
    const start = new Date(t.date).getTime();
    const end = new Date(t.dateExit || t.date).getTime();
    const diff = end - start;
    return acc + (diff > 0 ? diff : 0);
  }, 0);

  const totalDurationHours = totalDurationMs / (1000 * 60 * 60);

  const validSlTrades = trades.filter(t => getSlDistPct(t) > 0);
  const totalSlDist = validSlTrades.reduce((acc, t) => acc + getSlDistPct(t), 0);
  const avgSlDistPct = validSlTrades.length > 0 ? totalSlDist / validSlTrades.length : 0;

  const validTpTrades = trades.filter(t => getTpDistPct(t) > 0);
  const totalTpDist = validTpTrades.reduce((acc, t) => acc + getTpDistPct(t), 0);
  const avgTpDistPct = validTpTrades.length > 0 ? totalTpDist / validTpTrades.length : 0;

  return {
    avgPnl: totalPnl / trades.length,
    avgDuration: (totalDurationMs / trades.length) / (1000 * 60), // minutes
    avgRR: totalRR / trades.length,
    avgVelocity: totalDurationHours > 0 ? totalPnl / totalDurationHours : 0,
    avgAdherence: totalConditions / trades.length,
    avgSlDistPct,
    avgTpDistPct
  };
});

const tradeDetailStats = computed(() => {
  if (!props.trade) return { velocity: 0, yieldPct: 0, adherence: 0 };
  
  const durationHours = tradeDurationMinutes.value / 60;
  const velocity = durationHours > 0 ? props.trade.pnl / durationHours : props.trade.pnl;
  const yieldPct = (props.trade.pnl / balanceBeforeTrade.value) * 100;
  
  // Total conditions across all scenarios
  const adherence = props.trade.scenarios?.reduce((acc, s) => acc + (s.conditions?.length || 0), 0) || 0;
  
  return {
    velocity,
    yieldPct,
    adherence
  };
});

const resolvedRiskTradeNode = computed(() => {
  const risk = resolvedRiskManagement.value;
  if (risk.riskPerTradeValue === null) return null;
  return {
    params: {
      value: risk.riskPerTradeValue,
      unit: risk.riskPerTradeUnit
    }
  };
});

const resolvedRRNode = computed(() => {
  const risk = resolvedRiskManagement.value;
  if (risk.riskRewardRatio === null) return null;
  return {
    params: {
      value: risk.riskRewardRatio
    }
  };
});

const actualRR = computed(() => {
  return props.trade?.rr ?? (props.trade as any)?.riskReward ?? 0;
});

const targetRR = computed(() => {
  if (resolvedRRNode.value?.params?.value !== undefined) {
    const val = parseFloat(String(resolvedRRNode.value.params.value));
    if (!isNaN(val)) return val;
  }
  return strategyStats.value.avgRR || 0;
});

const actualRiskDollars = computed(() => {
  const t = props.trade as any;
  if (!t) return 0;

  const explicitRisk = Number(t.risk);
  if (Number.isFinite(explicitRisk) && explicitRisk > 0) {
    return explicitRisk;
  }

  const entry = parseFloat(t.entry);
  const sl = parseFloat(t.stopLoss);
  let size = parseFloat(t.size);

  if (!isNaN(entry) && !isNaN(sl) && entry > 0) {
    if (isNaN(size) || size <= 0) {
      const sizeCurr = parseFloat(t.sizeInCurrency);
      if (!isNaN(sizeCurr) && sizeCurr > 0) {
        size = sizeCurr / entry;
      }
    }
    if (!isNaN(size) && size > 0) {
      return Math.abs(entry - sl) * size;
    }
  }

  const pnl = t.profitInCurrency ?? t.pnl ?? 0;
  const rr = t.rr ?? t.riskReward ?? 0;

  if (pnl < 0) {
    return Math.abs(pnl);
  } else if (pnl > 0 && rr > 0) {
    return pnl / rr;
  }

  return 0;
});

const actualRiskPct = computed(() => {
  if (balanceBeforeTrade.value <= 0) return 0;
  return (actualRiskDollars.value / balanceBeforeTrade.value) * 100;
});

const maxRiskTrade = computed(() => {
  if (!resolvedRiskTradeNode.value?.params) return null;
  const p = resolvedRiskTradeNode.value.params;
  const val = parseFloat(String(p.value));
  if (isNaN(val)) return null;
  return {
    value: val,
    unit: p.unit || '$'
  };
});

const protocolRecommendations = computed(() => {
  if (!enrichedTrade.value) return { recommended: [], avoid: [] };
  
  const allProtocols: { name: string; pf: number; freq: number; type: string }[] = [];
  
  enrichedTrade.value.scenarios.forEach(s => {
    if (!isDefaultProtocol(s.name)) {
      allProtocols.push({ name: s.name, pf: s.profitability, freq: s.frequency, type: 'SCENARIO' });
    }
    s.conditions.forEach(c => {
      if (!isDefaultProtocol(c.name)) {
        allProtocols.push({ name: c.name, pf: c.profitability, freq: c.frequency, type: 'CONDITION' });
      }
    });
  });
  
  // Unique by name, take highest PF
  const uniqueProtocols = Array.from(new Set(allProtocols.map(p => p.name)))
    .map(name => allProtocols.find(p => p.name === name)!)
    .sort((a, b) => b.pf - a.pf);
    
  return {
    recommended: uniqueProtocols.filter(p => p.pf >= 1.5).slice(0, 3),
    avoid: uniqueProtocols.filter(p => p.pf < 1.0).slice(0, 3)
  };
});

const tacticalAdvice = computed(() => {
  if (!props.trade) return { title: 'PENDING_ANALYSIS', message: 'Awaiting protocol data...', variant: 'neutral', ...protocolRecommendations.value };
  
  const isProfitable = props.trade.pnl > 0;
  const isHighAdherence = (tradeDetailStats.value.adherence || 0) >= (strategyStats.value.avgAdherence || 1);
  const isStable = emotionalStateScore.value >= 40;
  
  let result = { 
    title: 'TACTICAL_REVIEW', 
    message: 'Session data integrated. Perform a manual review of archival logs to identify optimization vectors.', 
    variant: 'neutral',
    ...protocolRecommendations.value
  };
  
  if (isProfitable && isHighAdherence && isStable) {
    result = {
      title: 'OPTIMAL_EXECUTION',
      message: 'Protocol followed with high neural stability. Strategy core is stable. No adjustments required.',
      variant: 'success',
      ...protocolRecommendations.value
    };
  } else if (!isProfitable && isHighAdherence) {
    result = {
      title: 'STATISTICAL_VARIANCE',
      message: 'Strategic adherence confirmed. Negative outcome is a result of market variance, not execution error. Maintain current parameters.',
      variant: 'neutral',
      ...protocolRecommendations.value
    };
  } else if (isProfitable && !isHighAdherence) {
    result = {
      title: 'PROTOCOL_DIVERGENCE',
      message: 'Profit achieved through non-standard execution. High risk of unsustainable results. Recalibrate adherence to strategy core.',
      variant: 'warning',
      ...protocolRecommendations.value
    };
  } else if (!isStable) {
    result = {
      title: 'NEURAL_INSTABILITY',
      message: 'High emotional delta detected during session. Cognitive bias likely influenced execution protocols. Immediate recalibration recommended.',
      variant: 'danger',
      ...protocolRecommendations.value
    };
  }
  
  return result;
});

// -------------------------------------------------------------
// ADVANCED METRIC TAB FILTERING & TELEMETRY CALCULATIONS
// -------------------------------------------------------------
const activeMetricTab = ref('all'); // 'all', 'adherence', 'behavioural', 'execution'

// Tab A: Matrix Adherence Metrics
const matrixAdherenceMetrics = computed(() => {
  const tr = props.trade as any;
  if (!tr) return { reqRatio: 0, reqText: '0/0', addCount: 0, addAlpha: 0, strictness: 0, condPnl: 0, complexity: 1.0 };

  const conditions = tr.boardScenarioEntry?.info?.conditions || [];
  const reqConditions = conditions.filter((c: any) => c?.info?.priority === 'REQUIRED');
  const addConditions = conditions.filter((c: any) => c?.info?.priority === 'ADDITIONAL');
  const scenarioId = tr.boardScenarioEntry?.id;
  const getRuleCount = (trade: any) => {
    const scenarioRules = trade?.boardScenarioEntry?.info?.conditions;
    if (Array.isArray(scenarioRules)) return scenarioRules.length;
    if (Array.isArray(trade?.boardConditions)) return trade.boardConditions.length;
    return 0;
  };

  const reqRatio = reqConditions.length > 0 ? 100 : (conditions.length > 0 ? 0 : 100);
  const reqText = `${reqConditions.length} Fulfilled`;

  const avgPnl = strategyStats.value.avgPnl || 0;
  const pnlDiff = tr.pnl - avgPnl;
  const addAlpha = addConditions.length > 0 ? (pnlDiff / (Math.abs(avgPnl) || 100)) * 100 : 0;

  const strictness = Math.min(10, (reqConditions.length * 2.5) + (addConditions.length * 1.5) || 8.5);
  const condPnl = conditions.length > 0 ? tr.pnl / conditions.length : tr.pnl;
  const historicalRuleCounts = tradeStore.getTradesForStrategy(tr?.strategyId || '')
    .filter((trade: any) => !scenarioId || trade?.boardScenarioEntry?.id === scenarioId)
    .map(getRuleCount)
    .filter((count: number) => count > 0);
  const sortedRuleCounts = [...historicalRuleCounts].sort((a, b) => a - b);
  const medianRules = sortedRuleCounts.length > 0
    ? (sortedRuleCounts.length % 2 === 1
      ? sortedRuleCounts[(sortedRuleCounts.length - 1) / 2]
      : (sortedRuleCounts[(sortedRuleCounts.length / 2) - 1] + sortedRuleCounts[sortedRuleCounts.length / 2]) / 2)
    : 0;
  const currentRuleCount = getRuleCount(tr);
  const complexity = medianRules > 0 ? (currentRuleCount / medianRules) : 1.0;

  return {
    reqRatio,
    reqText,
    addCount: addConditions.length,
    addAlpha,
    strictness,
    condPnl,
    complexity
  };
});

// Tab B: Behavioural Metrics
const behaviouralMetrics = computed(() => {
  const tr = props.trade as any;
  if (!tr) return { stability: 100, bias: 'None', pnlDrag: 0, frictionCount: 0, frictionDensity: 0, hesitation: 'Nominal (<0.2s)' };

  const emotions = tr.emotions || [];
  const negativeSet = new Set([
    'FOMO', 'fomo', 'Revenge', 'revenge', 'Greed', 'greed', 'Fear', 'fear', 
    'Tilt', 'tilt', 'Anxiety', 'anxiety', 'Boredom', 'boredom', 'Fatigue', 'fatigue', 
    'Anger', 'anger', 'Impatience', 'impatience', 'Frustration', 'frustration'
  ]);
  
  const negativeEmotions = emotions.map(getEmotionName).filter((e: string) => negativeSet.has(e));
  const frictionCount = negativeEmotions.length;
  const frictionDensity = emotions.length > 0 ? (frictionCount / emotions.length) * 100 : 0;
  
  const stability = Math.max(10, 100 - (frictionCount * 15));

  const hasEmo = (name: string) => negativeEmotions.some((e: string) => e.toLowerCase() === name.toLowerCase());

  let bias = 'None (Clear Execution)';
  if (hasEmo('fomo')) bias = 'FOMO (Premature Entry Risk)';
  else if (hasEmo('revenge')) bias = 'Revenge (Over-Leverage Risk)';
  else if (hasEmo('greed')) bias = 'Greed (Target Overshoot Risk)';
  else if (hasEmo('fear')) bias = 'Fear (Premature Exit Risk)';
  else if (hasEmo('tilt')) bias = 'Tilt (Protocol Violation)';
  else if (hasEmo('fatigue')) bias = 'Fatigue (Cognitive Lethargy)';
  else if (hasEmo('boredom')) bias = 'Boredom (Low-Quality Setup)';
  else if (hasEmo('frustration')) bias = 'Frustration (Emotional Friction)';
  else if (negativeEmotions.length > 0) bias = `${negativeEmotions[0].toUpperCase()} (Cognitive Friction)`;

  const avgPnl = strategyStats.value.avgPnl || 0;
  const estCleanPnl = avgPnl * 1.15;
  const pnlDrag = frictionCount > 0 ? tr.pnl - estCleanPnl : 0;

  return {
    stability,
    bias,
    pnlDrag,
    frictionCount,
    frictionDensity
  };
});

// Tab D: Strategy vs. Execution Metrics
const strategyExecutionMetrics = computed(() => {
  const tr = props.trade as any;
  if (!tr) return {
    slDrag: 0, slDragText: 'No SL Data',
    riskBudgetRatio: 100, riskBudgetText: 'Within Budget', actualRisk: 0, maxRisk: 250,
    tpCapture: 100, tpCaptureText: 'Target Achieved',
    edgeQuotient: 1.0, edgeQuotientText: 'Nominal Edge',
    unrealizedLeft: 0, unrealizedLeftText: 'Full Target Captured',
    horizonSync: 100, horizonSyncText: 'Optimal Sync',
    velocityDelta: 1.0, velocityDeltaText: 'Nominal Velocity',
    alphaDecay: 0, alphaDecayText: 'Zero Degradation',
    executionGrade: 100, executionGradeText: 'Flawless Execution'
  };

  const entry = parseFloat(tr.entry) || 0;
  const exit = parseFloat(tr.exit) || 0;
  const sl = parseFloat(tr.stopLoss) || 0;
  let tp = parseFloat(tr.takeProfit) || 0;
  const pnl = tr.profitInCurrency ?? tr.pnl ?? 0;
  const isLong = String(tr.side || '').toUpperCase() === 'LONG';

  let slDrag = 0;
  let slDragText = 'No SL Breached';
  if (entry > 0 && sl > 0 && exit > 0) {
    const isLong = String(tr.side || '').toUpperCase() === 'LONG';
    if (pnl < 0) {
      const diff = isLong ? (exit - sl) : (sl - exit);
      slDrag = diff * (parseFloat(tr.size) || 1);
      slDragText = slDrag < 0 ? 'Slippage Drag (Worse than planned)' : 'Early Cut (Avoided full SL)';
    }
  }

  const actualRisk = actualRiskDollars.value;
  const isRu = locale.value === 'ru';
  // Resolve risk budget from genesis matrix risk_per_trade node
  let riskBudgetDollars: number | null = null;
  if (maxRiskTrade.value) {
    if (maxRiskTrade.value.unit === '%') {
      riskBudgetDollars = (maxRiskTrade.value.value / 100) * balanceBeforeTrade.value;
    } else {
      riskBudgetDollars = maxRiskTrade.value.value;
    }
  }
  const maxRisk = riskBudgetDollars ?? 250;
  const riskBudgetRatio = maxRisk > 0 ? Math.min(200, (actualRisk / maxRisk) * 100) : 0;
  const riskBudgetBudgetStr = riskBudgetDollars !== null
    ? (maxRiskTrade.value!.unit === '%'
      ? (isRu
        ? `${maxRiskTrade.value!.value}% от баланса до сделки = $${maxRisk.toFixed(2)}`
        : `${maxRiskTrade.value!.value}% of pre-trade balance = $${maxRisk.toFixed(2)}`)
      : `$${maxRisk.toFixed(2)}`)
    : 'No budget set';
  const riskBudgetText = riskBudgetDollars === null
    ? (isRu ? 'Бюджет матрицы не задан' : 'No matrix budget set')
    : (actualRisk <= maxRisk
      ? (isRu ? `В пределах лимита · Бюджет: ${riskBudgetBudgetStr}` : `Compliant · Budget: ${riskBudgetBudgetStr}`)
      : (isRu ? `Превышен · Бюджет: ${riskBudgetBudgetStr}` : `Exceeded · Budget: ${riskBudgetBudgetStr}`));

  if (tp <= 0 && pnl > 0 && exit > 0) tp = exit;
  let tpCapture = 100;
  let tpCaptureText = 'Full Target Achieved';
  if (entry > 0 && tp > 0 && exit > 0) {
    const plannedDist = Math.abs(tp - entry);
    const actualDist = isLong
      ? Math.max(0, exit - entry)
      : Math.max(0, entry - exit);
    if (plannedDist > 0) {
      tpCapture = Math.min(100, (actualDist / plannedDist) * 100);
      tpCaptureText = tpCapture < 100 ? 'Premature Exit' : 'Full Target Achieved';
    }
  }

  const realizedRR = actualRR.value || 1;
  const expectedRR = targetRR.value || strategyStats.value.avgRR || 1;
  const edgeQuotient = expectedRR > 0 ? (realizedRR / expectedRR) : 1.0;
  const edgeQuotientText = edgeQuotient >= 1 ? 'Alpha Generation' : 'Edge Dilution';

  let unrealizedLeft = 0;
  let unrealizedLeftText = 'Full Target Captured';
  if (entry > 0 && tp > 0 && exit > 0) {
    const plannedPnL = Math.abs(tp - entry) * (parseFloat(tr.size) || (Math.abs(pnl) / Math.abs(exit - entry)));
    if (plannedPnL > pnl) {
      unrealizedLeft = plannedPnL - pnl;
      unrealizedLeftText = 'Target Unreached';
    }
  }

  const days = duration.value / 24;
  const scenarioMinDays = scenarioDurationStats.value.minDays;
  const scenarioMaxDays = scenarioDurationStats.value.maxDays;
  let horizonSync = 50;
  let horizonSyncText = isRu ? 'Позиция в коридоре' : 'Position in Range';
  if (scenarioDurationStats.value.count > 0) {
    const span = Math.max(scenarioMaxDays - scenarioMinDays, 0.0001);
    const normalizedPosition = ((days - scenarioMinDays) / span) * 100;
    horizonSync = Math.min(100, Math.max(0, normalizedPosition));

    if (days < scenarioMinDays) {
      horizonSyncText = isRu
        ? `Ниже диапазона сценария (${scenarioMinDays.toFixed(2)}д - ${scenarioMaxDays.toFixed(2)}д)`
        : `Below scenario range (${scenarioMinDays.toFixed(2)}d - ${scenarioMaxDays.toFixed(2)}d)`;
    } else if (days > scenarioMaxDays) {
      horizonSyncText = isRu
        ? `Выше диапазона сценария (${scenarioMinDays.toFixed(2)}д - ${scenarioMaxDays.toFixed(2)}д)`
        : `Above scenario range (${scenarioMinDays.toFixed(2)}d - ${scenarioMaxDays.toFixed(2)}d)`;
    } else {
      horizonSyncText = isRu ? 'Позиция в коридоре' : 'Position in Range';
    }
  }

  const currentVelocity = tradeDetailStats.value.velocity || 0;
  const avgVelocity = strategyStats.value.avgVelocity || 1;
  const velocityDelta = avgVelocity > 0 ? (currentVelocity / avgVelocity) : 1.0;
  const velocityDeltaText = velocityDelta >= 1 ? 'High Momentum' : 'Grinding Tie-up';

  const emotions = tr.emotions || [];
  const negativeSet = new Set([
    'FOMO', 'fomo', 'Revenge', 'revenge', 'Greed', 'greed', 'Fear', 'fear', 
    'Tilt', 'tilt', 'Anxiety', 'anxiety', 'Boredom', 'boredom', 'Fatigue', 'fatigue', 
    'Anger', 'anger', 'Impatience', 'impatience', 'Frustration', 'frustration'
  ]);
  const hasNegative = emotions.map(getEmotionName).some((e: string) => negativeSet.has(e));
  const conditions = tr.boardScenarioEntry?.info?.conditions || [];
  const reqConditions = conditions.filter((c: any) => c?.info?.priority === 'REQUIRED');
  const executedConditions = tr.boardConditions || [];
  const missingRequiredRules = reqConditions.filter((req: any) =>
    !executedConditions.some((exec: any) => (typeof exec === 'string' ? exec === req.id : exec?.id === req.id))
  ).length;
  const alphaDecay = hasNegative ? missingRequiredRules : 0;
  const alphaDecayText = alphaDecay > 0 ? `Bypassed ${alphaDecay} Required Rules` : 'Zero Degradation';

  const adherenceScore = matrixAdherenceMetrics.value.reqRatio;
  const tpScore = tpCapture;
  const riskScore = actualRisk <= maxRisk ? 100 : Math.max(0, 100 - ((actualRisk - maxRisk) / maxRisk) * 100);
  const stabilityScore = behaviouralMetrics.value.stability;
  const executionGrade = Math.round((adherenceScore * 0.3) + (tpScore * 0.3) + (riskScore * 0.2) + (stabilityScore * 0.2));
  let executionGradeText = 'Flawless Execution';
  if (executionGrade < 60) executionGradeText = 'Compromised Execution';
  else if (executionGrade < 80) executionGradeText = 'Sub-Optimal Execution';

  return {
    slDrag, slDragText,
    riskBudgetRatio, riskBudgetText, actualRisk, maxRisk,
    tpCapture, tpCaptureText,
    edgeQuotient, edgeQuotientText,
    unrealizedLeft, unrealizedLeftText,
    horizonSync, horizonSyncText,
    velocityDelta, velocityDeltaText,
    alphaDecay, alphaDecayText,
    executionGrade, executionGradeText
  };
});

</script>

<template>
  <div ref="analysisPanelRoot" class="relative h-full w-full">
    <!-- CLOSE HANDLE (RIGHT EDGE) -->
    <button @click="emit('close')"
            class="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-40 bg-theme-bg dark:bg-[#070707] border-t border-r border-b border-black/20 dark:border-white/20 flex items-center justify-center group/close-tab cursor-pointer hover:bg-theme-surface dark:hover:bg-[#111] transition-colors z-[100]">
       <div class="w-[1px] h-16 bg-black/10 dark:bg-white/10 group-hover/close-tab:bg-black/40 dark:group-hover/close-tab:bg-white/40 transition-all duration-300"></div>
       <span class="absolute text-[7px] font-mono tracking-[0.4em] uppercase text-black/10 dark:text-white/10 group-hover/close-tab:text-black/40 dark:group-hover/close-tab:text-white/40 rotate-90 whitespace-nowrap">Close_Analysis</span>
    </button>

    <ExPanel class="h-full w-full" title="" telemetry="" variant="light" noPadding>
    <div v-if="isInitializing" class="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-[#ffffff]/90 dark:bg-[#070707]/80 backdrop-blur-md z-50 nier-text-primary">
      <div class="w-12 h-12 border-t-2 border-r-2 border-black dark:border-white rounded-full animate-spin"></div>
      <div class="flex flex-col items-center space-y-1">
        <span class="text-xs font-mono font-black uppercase tracking-[0.4em] opacity-80">Loading_Matrix_Data</span>
        <span class="text-[9px] font-mono opacity-40 tracking-widest uppercase">Initializing neural telemetry protocols...</span>
      </div>
    </div>
    <div v-else-if="enrichedTrade" class="relative flex overflow-hidden h-full nier-text-primary">
      
      <!-- MINIMALIST NAVIGATION SIDEBAR (INTERNAL) -->
      <div class="w-12 h-full flex flex-col items-center py-6 border-r border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] z-20 shrink-0">
        <div class="flex flex-col space-y-6">
          <button v-for="(tab, idx) in [
            { id: 3, label: 'REPORT', icon: 'M9 17H15M9 13H15M9 9H10M13 3H14.6C15.7201 3 16.2802 3 16.708 3.21799C17.0843 3.40973 17.3903 3.71569 17.582 4.09202C17.8 4.51984 17.8 5.07989 17.8 6.2V17.8C17.8 18.9201 17.8 19.4802 17.582 19.908C17.3903 20.2843 17.0843 20.5903 16.708 20.782C16.2802 21 15.7201 21 14.6 21H9.4C8.2798 21 7.71984 21 7.29202 20.782C6.91569 20.5903 6.60973 20.2843 6.41799 19.908C6.2 19.4802 6.2 18.9201 6.2 17.8V6.2C6.2 5.07989 6.2 4.51984 6.41799 4.09202C6.60973 3.71569 6.91569 3.40973 7.29202 3.21799C7.71984 3 8.27989 3 9.4 3H10.2M12 3V5' },
            { id: 4, label: 'VISUALS', icon: 'M15 8H15.01M7 16H17M7 11L10.29 7.71C10.68 7.32 11.31 7.32 11.7 7.71L14.59 10.6M14.59 10.6L16.29 8.9C16.68 8.51 17.31 8.51 17.7 8.9L21 12.2M4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20Z' },
            { id: 5, label: 'NOTES', icon: 'M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z' }
          ]" :key="tab.id"
          @click="currentPage = tab.id"
          class="relative w-8 h-8 flex items-center justify-center transition-all duration-300 group/nav-item"
          :class="[currentPage === tab.id ? 'opacity-100 scale-110' : 'opacity-20 hover:opacity-50 hover:scale-105']">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" 
                 class="w-5 h-5 transition-all duration-500"
                 :class="currentPage === tab.id ? 'nier-text-primary' : 'nier-text-primary'">
              <path :d="tab.icon" />
            </svg>
            <!-- Active Indicator Dot -->
            <div v-if="currentPage === tab.id" class="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-1 nier-bg-inverted rounded-full"></div>
            
            <!-- Tooltip (Minimal) -->
            <div class="absolute left-full ml-4 px-2 py-1 nier-bg-inverted nier-text-primary text-[7px] font-mono tracking-widest uppercase opacity-0 group-hover/nav-item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
               {{ tab.label }}
            </div>
          </button>
        </div>
      </div>

      <div class="relative flex-grow overflow-hidden h-full">
      <!-- ADAPTIVE BACKGROUND DECORATIONS -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-20 dark:opacity-40">
        <!-- Tesseract / 3D Wireframe -->
        <div class="absolute -top-20 -right-20 w-96 h-96 border nier-border-primary rounded-full">
           <div class="absolute inset-10 border border-black/5 dark:border-white/5 rotate-45"></div>
           <div class="absolute inset-20 border border-black/5 dark:border-white/5 -rotate-12"></div>
        </div>

        <!-- Floating Squares / Tesseracts -->
        <div class="absolute top-1/4 left-10 w-12 h-12 border border-black/20 dark:border-white/20 rotate-12"></div>
        <div class="absolute bottom-1/4 right-10 w-24 h-24 border nier-border-primary -rotate-45"></div>

        <!-- Geometric Pulse Circles -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-black/[0.03] dark:border-white/[0.03] rounded-full"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-black/[0.02] dark:border-white/[0.02] rounded-full"></div>
        
        <!-- Tactical Grid Accents -->
        <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,transparent_0%,currentColor_1px,transparent_1px)] bg-[length:40px_40px]"></div>

      </div>

      <!-- MAIN CONTENT WRAPPER (Relative to ensure it stays above decor) -->
      <div class="relative z-10 h-full">
      <!-- 0. STRATEGY LOCKOUT (WARNING) -->
      <div v-if="(enrichedTrade.tradingStyle === 'Main Diary' || enrichedTrade.strategyId === 'MAIN_DIARY') && currentPage === 3" class="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-black/[0.01] dark:bg-white/[0.01]">
          <div class="relative w-32 h-32 flex items-center justify-center shrink-0">
             <div class="absolute inset-0 border nier-border-primary rotate-45 animate-[pulse_4s_ease-in-out_infinite]"></div>
             <div class="absolute inset-4 border border-black/20 dark:border-white/20 -rotate-45"></div>
             <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-6xl font-serif italic text-black/10 dark:text-white/10">!</span>
             </div>
             <!-- Scanning effect -->
             <div class="absolute top-0 left-0 w-full h-[1px] bg-black/10 dark:bg-white/10 animate-[scan_3s_linear_infinite]"></div>
          </div>
          
          <div class="flex flex-col items-center space-y-3 max-w-sm">
             <div class="flex flex-col items-center space-y-1">
                <span class="text-[10px] font-mono uppercase tracking-[0.6em] font-black text-red-500/40">Diagnostic_Lockout</span>
                <ExHeading level="h3" variant="module" class="!text-2xl nier-text-primary text-center animate-glow-red">PROTOCOL_UNDEFINED</ExHeading>
             </div>
             <ExText variant="small" class="opacity-40 uppercase tracking-[0.2em] leading-relaxed text-center">
                High-fidelity analysis requires a specific strategy protocol. Tactical mapping is currently disabled for generic [Main Diary] entries.
             </ExText>
          </div>
          
          <div class="pt-6 flex flex-col items-center space-y-4">
             <div class="w-16 h-px bg-black/10 dark:bg-white/10"></div>
             <span class="text-[8px] font-mono uppercase tracking-[0.4em] opacity-20">Initialization_Pending...</span>
          </div>
      </div>

      <Transition v-else name="page-slide" mode="out-in">
        <!-- MAIN ANALYSIS (HIDDEN DURING REPORT) -->
      <div :key="'analysis'" class="flex flex-col h-full overflow-hidden">
          <!-- 2. DYNAMIC CONTENT GRID (SWAPPABLE) -->
          <div class="p-3 md:p-4 flex-grow relative overflow-y-auto custom-scrollbar overflow-x-hidden">
            <Transition name="page-slide" mode="out-in">
              <!-- REPORT VIEW (MODE 3) -->
              <div v-if="currentPage === 3" :key="'report'" class="min-h-full flex flex-col p-4 space-y-6">
                <!-- Temporal Verification -->
                <div class="flex flex-col space-y-6 w-full p-4 md:p-6">
                   <div class="flex flex-col space-y-3">
                      <div class="flex justify-between items-center text-[9px] font-mono opacity-30 uppercase tracking-[0.2em] nier-text-primary">
                         <span>Execution_Duration</span>
                         <span>Risk_Element_Type</span>
                      </div>
                      <div class="flex justify-between items-baseline">
                         <span class="text-3xl font-serif italic nier-text-primary leading-none">
                            <span v-for="(part, idx) in durationParts" :key="idx" class="inline-flex items-baseline mr-1.5">
                               <span>{{ part.num }}</span><span class="text-sm font-mono not-italic opacity-40 ml-0.5">{{ part.unit }}</span>
                            </span>
                         </span>
                          <div class="flex items-center gap-2">
                             <div class="w-1 h-1 nier-bg-inverted rotate-45"></div>
                             <span class="text-[10px] font-mono font-black uppercase tracking-widest nier-text-primary">
                               {{ resolvedTradingStyle }} 
                               <span v-if="scenarioDurationStats.count > 0" class="opacity-40 ml-1">scenario range</span>
                             </span>
                          </div>
                       </div>
                    </div>
                    <div class="space-y-2">
                       <div class="flex justify-between items-center text-[8px] font-mono uppercase tracking-widest opacity-30 nier-text-primary">
                          <span>Start_Point</span>
                          <span>{{ scenarioDurationLabel }}</span>
                       </div>
                       <div class="h-1 w-full bg-black/5 dark:bg-white/5 relative group">
                          <div class="h-full transition-all duration-1000 ease-[var(--nier-ease)]"
                               :class="isStyleCompliant ? 'nier-bg-inverted' : 'bg-rose-500'"
                               :style="{ width: `${scenarioDurationStats.count > 0 ? Math.min((duration / 24 / Math.max(scenarioDurationStats.maxDays, 0.0001)) * 100, 100) : 100}%` }">
                          </div>
                          <div v-if="!isStyleCompliant" class="absolute inset-y-0 right-0 w-px bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                       </div>
                    </div>
                    <div v-if="!isStyleCompliant" class="p-4 bg-rose-500/5 border border-rose-500/20 relative overflow-hidden">
                       <div class="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                       <p class="text-[8px] font-mono uppercase tracking-[0.2em] text-rose-500 leading-relaxed">
                          {{ styleAlertMessage }}
                       </p>
                    </div>
                   <div v-else class="flex items-center space-x-2 opacity-30 nier-text-primary">
                      <div class="w-8 h-px border-black/40 dark:border-white/40"></div>
                      <span class="text-[8px] font-mono uppercase tracking-widest italic">Duration remains within nominal strategy parameters.</span>
                   </div>
                </div>

                <!-- TOP SECTION: EQUITY_TRAJECTORY (Expanded) -->
                <div class="flex-grow relative min-h-[300px]">
                   <ExEquityCurve2D :trades="reportTrades" :initialBalance="initialBalance" />
                </div>

                <!-- BOTTOM SECTION: PERFORMANCE_BENCHMARK (Detailed Grid) -->
                <!-- METRICS FILTER TABS -->
                <div class="flex items-center space-x-2 border-b nier-border-primary pb-3 mb-4 overflow-x-auto custom-scrollbar">
                  <button v-for="tab in [
                    { id: 'all', label: 'All', count: 27 },
                    { id: 'adherence', label: 'Matrix Adherence', count: 5 },
                    { id: 'behavioural', label: 'Behavioural', count: 5 },
                    { id: 'execution', label: 'Execution & Risk', count: 8 },
                    { id: 'strategy_execution', label: 'Strategy vs. Execution', count: 9 }
                  ]" :key="tab.id"
                  @click="activeMetricTab = tab.id"
                  class="relative flex items-center space-x-2 px-4 py-2 border transition-all duration-300 cursor-pointer shrink-0"
                  :class="activeMetricTab === tab.id ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 nier-text-primary font-bold shadow-sm' : 'nier-border-primary text-black/50 dark:text-white/50 hover:border-black/30 dark:hover:border-white/30'">
                    <div v-if="activeMetricTab === tab.id" class="w-1.5 h-1.5 nier-bg-inverted rotate-45 animate-pulse"></div>
                    <span class="text-[10px] font-mono tracking-wider uppercase">{{ tab.label }}</span>
                    <span class="text-[8px] font-mono px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded-full opacity-60">{{ tab.count }}</span>
                  </button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
                     <!-- TAB A: MATRIX ADHERENCE METRICS -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'adherence'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Required_Adherence</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="matrixAdherenceMetrics.reqRatio === 100 ? 'text-emerald-400' : 'text-amber-400'">
                                    {{ (matrixAdherenceMetrics.reqRatio || 0).toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    {{ matrixAdherenceMetrics.reqText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Evaluates the percentage of required matrix conditions fulfilled during execution.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (Fulfilled / Required) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">100%</span><span class="text-emerald-500 font-bold">Perfect</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 100%</span><span class="text-amber-500 font-bold">Sub-Optimal</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="matrixAdherenceMetrics.reqRatio === 100 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ matrixAdherenceMetrics.reqRatio === 100 ? 'Perfect' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'adherence'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Additional_Alpha</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="matrixAdherenceMetrics.addAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ matrixAdherenceMetrics.addAlpha >= 0 ? '+' : '' }}{{ matrixAdherenceMetrics.addAlpha.toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    {{ matrixAdherenceMetrics.addCount }} Confirmations
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Calculates the PnL alpha generated by adding extra confirmation layers compared to the strategy baseline.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 ((PnL - Average PnL) / Average PnL) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 0%</span><span class="text-emerald-500 font-bold">Positive Alpha</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 0%</span><span class="text-rose-500 font-bold">Negative Drag</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="matrixAdherenceMetrics.addAlpha >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ matrixAdherenceMetrics.addAlpha >= 0 ? 'Positive' : 'Negative' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'adherence'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Protocol_Strictness</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary">
                                    {{ matrixAdherenceMetrics.strictness.toFixed(2) }} / 10
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    Weighted Rating
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>A weighted algorithmic score combining required and additional criteria to measure execution strictness.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (Required Rules * 2.5) + (Additional Rules * 1.5)
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= 8.0</span><span class="text-emerald-500 font-bold">Good</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 8.0</span><span class="text-amber-500 font-bold">Sub-Optimal</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="matrixAdherenceMetrics.strictness >= 8.0 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ matrixAdherenceMetrics.strictness >= 8.0 ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'adherence'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Conditional_PnL_Ratio</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="matrixAdherenceMetrics.condPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ matrixAdherenceMetrics.condPnl >= 0 ? '+' : '' }}${{ matrixAdherenceMetrics.condPnl.toFixed(2) }}
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    Per Active Condition
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
	                           <div>Measures the ratio of profit captured per active condition in the setup.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
	                                 PnL / Active Conditions
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt; $0</span><span class="text-emerald-500 font-bold">Positive Yield</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; $0</span><span class="text-rose-500 font-bold">Negative Drag</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="matrixAdherenceMetrics.condPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ matrixAdherenceMetrics.condPnl >= 0 ? 'Positive' : 'Negative' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'adherence'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Setup_Complexity</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                <span class="text-xl font-mono font-black nier-text-primary">
                                    {{ matrixAdherenceMetrics.complexity.toFixed(2) }}x
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs Scenario Median
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Evaluates the total number of rules triggered versus the historical median rule count of the same entry scenario.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Active Rules / Scenario Median
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&lt;= 1.5x</span><span class="text-emerald-500 font-bold">Good</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 1.5x</span><span class="text-amber-500 font-bold">Over-Complicated</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="matrixAdherenceMetrics.complexity <= 1.5 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ matrixAdherenceMetrics.complexity <= 1.5 ? 'Good' : 'Over-Complicated' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- TAB B: BEHAVIOURAL METRICS -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'behavioural'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Cognitive_Stability</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="behaviouralMetrics.stability >= 70 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ (behaviouralMetrics.stability || 0).toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    Neural Telemetry
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Evaluates active emotional markers, deducting stability points for psychological friction tags.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 100 - (Friction Tags * 15)
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= 70%</span><span class="text-emerald-500 font-bold">Stable</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 70%</span><span class="text-rose-500 font-bold">Unstable</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="behaviouralMetrics.stability >= 70 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ behaviouralMetrics.stability >= 70 ? 'Stable' : 'Unstable' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'behavioural'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Dominant_Bias</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-sm font-mono font-black nier-text-primary truncate">
                                    {{ behaviouralMetrics.bias.split(' ')[0] }}
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ behaviouralMetrics.bias.split(' ').slice(1).join(' ') || 'Nominal' }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Identifies the primary psychological friction marker present and maps it to its known execution risk profile.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Highest Priority Friction Tag
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">None</span><span class="text-emerald-500 font-bold">Clear Execution</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">Active Bias</span><span class="text-amber-500 font-bold">Cognitive Risk</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="behaviouralMetrics.bias.startsWith('None') ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ behaviouralMetrics.bias.startsWith('None') ? 'Clear' : 'Cognitive Risk' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'behavioural'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Emotional_PnL_Drag</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="behaviouralMetrics.pnlDrag >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ behaviouralMetrics.pnlDrag >= 0 ? '+' : '' }}${{ behaviouralMetrics.pnlDrag.toFixed(2) }}
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs Clean Execution
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Calculates potential profit lost or left on the table due to psychological friction markers.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Actual PnL - (Average PnL * 1.15)
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= $0</span><span class="text-emerald-500 font-bold">Zero Drag</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; $0</span><span class="text-rose-500 font-bold">Profit Drag</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="behaviouralMetrics.pnlDrag >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ behaviouralMetrics.pnlDrag >= 0 ? 'Good' : 'Negative Drag' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'behavioural'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Friction_Density</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black" :class="behaviouralMetrics.frictionDensity === 0 ? 'text-emerald-400' : 'text-amber-400'">
                                    {{ behaviouralMetrics.frictionDensity.toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    {{ behaviouralMetrics.frictionCount }} Friction Markers
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Total count of active negative emotional tags divided by total active tags.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (Friction Tags / Total Tags) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">0%</span><span class="text-emerald-500 font-bold">Pristine</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 0%</span><span class="text-amber-500 font-bold">Friction Present</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="behaviouralMetrics.frictionDensity === 0 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ behaviouralMetrics.frictionDensity === 0 ? 'Perfect' : 'Friction Present' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>



                     <!-- TAB C: EXECUTION & RISK METRICS (Existing) -->
                     <!-- PROFIT COMPARISON -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Net_Result_Variance</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <div class="flex items-baseline space-x-2">
                                    <span class="text-xl font-mono font-black" :class="props.trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                       {{ props.trade.pnl >= 0 ? '+' : '' }}{{ props.trade.pnl.toFixed(2) }}$
                                    </span>
                                 </div>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs avg <span class="font-black nier-text-primary">${{ strategyStats.avgPnl.toFixed(2) }}</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Calculates the difference between the current trade's profit/loss and the historical average for this strategy.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Trade PnL - Strategy Avg PnL
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= Avg</span><span class="text-emerald-500 font-bold">Above Average</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; Avg</span><span class="text-amber-500 font-bold">Below Average</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="props.trade.pnl >= strategyStats.avgPnl ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ props.trade.pnl >= strategyStats.avgPnl ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- YIELD EFFICIENCY -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Yield_Efficiency</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary uppercase">{{ tradeDetailStats.yieldPct.toFixed(2) }}%</span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    Balance Before Trade
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Measures the net impact of this trade relative to the account balance immediately before entry.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (PnL / Balance Before Trade) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 0%</span><span class="text-emerald-500 font-bold">Positive Impact</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 0%</span><span class="text-rose-500 font-bold">Drawdown</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="tradeDetailStats.yieldPct >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ tradeDetailStats.yieldPct >= 0 ? 'Positive' : 'Negative' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- PROFIT VELOCITY -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Profit_Velocity</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary uppercase">${{ tradeDetailStats.velocity.toFixed(2) }}/h</span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs baseline <span class="font-black nier-text-primary">${{ strategyStats.avgVelocity.toFixed(2) }}/h</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Capital efficiency metric showing USD earned per hour of market exposure.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 PnL / (Duration Minutes / 60)
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= Avg Velocity</span><span class="text-emerald-500 font-bold">High Efficiency</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; Avg Velocity</span><span class="text-amber-500 font-bold">Low Efficiency</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="tradeDetailStats.velocity >= strategyStats.avgVelocity ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ tradeDetailStats.velocity >= strategyStats.avgVelocity ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- ACTUAL VS TARGET RR -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Actual_vs_Target_RR</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <div class="flex items-baseline space-x-2">
                                   <span class="text-xl font-mono font-black" :class="actualRR >= targetRR ? 'text-emerald-400' : 'text-amber-400'">
                                      1:{{ actualRR.toFixed(2) }}
                                   </span>
                                 </div>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    {{ resolvedRRNode ? 'vs target' : 'vs avg' }} <span class="font-black nier-text-primary">1:{{ resolvedRRNode ? targetRR.toFixed(2) : strategyStats.avgRR.toFixed(2) }}</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>{{ resolvedRRNode ? 'Compares the realized Risk/Reward ratio against the matrix target protocol.' : 'The realized ratio of risk taken to potential reward captured during this session.' }}</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Realized Reward / Realized Risk
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= Target RR</span><span class="text-emerald-500 font-bold">Target Met</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; Target RR</span><span class="text-amber-500 font-bold">Sub-Optimal</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="actualRR >= targetRR ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ actualRR >= targetRR ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- ACTUAL VS MAX RISK -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Actual_vs_Max_Risk</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <div class="flex items-baseline space-x-2">
                                   <span v-if="maxRiskTrade?.unit === '%'" class="text-xl font-mono font-black" :class="actualRiskPct <= maxRiskTrade.value ? 'text-emerald-400' : 'text-rose-400'">
                                      {{ actualRiskPct.toFixed(2) }}%
                                   </span>
                                   <span v-else class="text-xl font-mono font-black" :class="!maxRiskTrade || actualRiskDollars <= maxRiskTrade.value ? 'text-emerald-400' : 'text-rose-400'">
                                      ${{ actualRiskDollars.toFixed(2) }}
                                   </span>
                                 </div>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs max <span class="font-black nier-text-primary">{{ maxRiskTrade ? (maxRiskTrade.unit === '%' ? maxRiskTrade.value + '%' : '$' + maxRiskTrade.value) : 'N/A' }}</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>{{ maxRiskTrade ? 'Compares the actual monetary or percentage risk of the trade against the matrix maximum risk threshold.' : 'The realized monetary risk calculated from entry, stop loss, and position size.' }}</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 |Entry Price - Stop Loss| * Position Size
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&lt;= Max Risk</span><span class="text-emerald-500 font-bold">Compliant</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; Max Risk</span><span class="text-rose-500 font-bold">Breach Warning</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="(!maxRiskTrade || (maxRiskTrade.unit === '%' ? actualRiskPct <= maxRiskTrade.value : actualRiskDollars <= maxRiskTrade.value)) ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ (!maxRiskTrade || (maxRiskTrade.unit === '%' ? actualRiskPct <= maxRiskTrade.value : actualRiskDollars <= maxRiskTrade.value)) ? 'Good' : 'Bad' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- DURATION COMPARISON -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Temporal_Exposure</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary uppercase flex items-baseline flex-wrap">
                                    <span v-for="(part, idx) in durationParts" :key="idx" class="inline-flex items-baseline mr-1">
                                       <span>{{ part.num }}</span><span class="text-[11px] font-normal opacity-40 ml-0.5">{{ part.unit }}</span>
                                    </span>
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs avg <span class="font-black nier-text-primary">{{ Math.floor(strategyStats.avgDuration / 60) }}h {{ Math.floor(strategyStats.avgDuration % 60) }}m</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Total duration of the trade from entry to exit protocol completion.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Exit Timestamp - Entry Timestamp
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&lt;= Avg Duration</span><span class="text-emerald-500 font-bold">Efficient</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; Avg Duration</span><span class="text-amber-500 font-bold">Extended Hold</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="tradeDurationMinutes <= strategyStats.avgDuration ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ tradeDurationMinutes <= strategyStats.avgDuration ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- ASSET PROTOCOL -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Asset_Protocol</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary truncate uppercase">{{ props.trade.side }} {{ enrichedTrade?.asset || 'N/A' }}</span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    Active Tactical Layer
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>The specific market vehicle and direction (Long/Short) utilized for this tactical operation.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Trade Side + Trade Asset
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">Valid Asset</span><span class="text-emerald-500 font-bold">Verified</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[14px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-emerald-500">
                                 Perfect
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- STOP LOSS DISTANCE -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Stop_Loss_Distance</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary">{{ currentSlDistPct.toFixed(2) }}%</span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs avg <span class="font-black nier-text-primary">{{ strategyStats.avgSlDistPct.toFixed(2) }}%</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>The percentage distance between the entry price and the planned stop loss threshold.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (|Entry Price - Stop Loss| / Entry Price) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&lt;= Avg SL Dist</span><span class="text-emerald-500 font-bold">Tight Stop</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; Avg SL Dist</span><span class="text-amber-500 font-bold">Wide Stop</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="currentSlDistPct <= strategyStats.avgSlDistPct ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ currentSlDistPct <= strategyStats.avgSlDistPct ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- TAKE PROFIT DISTANCE -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Take_Profit_Distance</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1">
                                 <span class="text-xl font-mono font-black nier-text-primary">{{ currentTpDistPct.toFixed(2) }}%</span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                                    vs avg <span class="font-black nier-text-primary">{{ strategyStats.avgTpDistPct.toFixed(2) }}%</span>
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>The percentage distance between the entry price and the planned take profit target.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (|Take Profit - Entry Price| / Entry Price) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= Avg TP Dist</span><span class="text-emerald-500 font-bold">High Target</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; Avg TP Dist</span><span class="text-amber-500 font-bold">Low Target</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="currentTpDistPct >= strategyStats.avgTpDistPct ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ currentTpDistPct >= strategyStats.avgTpDistPct ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <!-- TAB D: STRATEGY VS. EXECUTION METRICS -->
                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">SL_Execution_Drag</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.slDrag >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ strategyExecutionMetrics.slDrag >= 0 ? '+' : '' }}${{ strategyExecutionMetrics.slDrag.toFixed(2) }}
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.slDragText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Compares planned stop loss against actual exit price to measure execution slippage or premature cutting.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Actual Exit - Planned Stop Loss
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= $0</span><span class="text-emerald-500 font-bold">Zero Drag</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; $0</span><span class="text-rose-500 font-bold">Slippage / Premature Cut</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.slDrag >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ strategyExecutionMetrics.slDrag >= 0 ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Risk_Budget_Adherence</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.actualRisk <= strategyExecutionMetrics.maxRisk ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ strategyExecutionMetrics.riskBudgetRatio.toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.riskBudgetText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Compares the actual trade risk (|Entry Price - Stop Loss| × Position Size) against the Risk_Per_Trade budget defined in the Genesis Matrix.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (|Entry Price - Stop Loss| × Position Size) / Risk Budget × 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&lt;= 100%</span><span class="text-emerald-500 font-bold">Compliant</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 100%</span><span class="text-rose-500 font-bold">Budget Exceeded</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.actualRisk <= strategyExecutionMetrics.maxRisk ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ strategyExecutionMetrics.actualRisk <= strategyExecutionMetrics.maxRisk ? 'Good' : 'Breach' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">TP_Capture_Ratio</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.tpCapture === 100 ? 'text-emerald-400' : 'text-amber-400'">
                                    {{ strategyExecutionMetrics.tpCapture.toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.tpCaptureText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Measures how much of the planned reward toward take profit was realized before exit, using trade direction.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (Reward Toward TP / Target Reward) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">100%</span><span class="text-emerald-500 font-bold">Full Capture</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 100%</span><span class="text-amber-500 font-bold">Partial Capture</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.tpCapture === 100 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ strategyExecutionMetrics.tpCapture === 100 ? 'Perfect' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Edge_Capture_Quotient</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.edgeQuotient >= 1 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ strategyExecutionMetrics.edgeQuotient.toFixed(2) }}x
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.edgeQuotientText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Compares realized Risk/Reward ratio against the strategy's expected baseline R/R.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Realized RR / Baseline RR
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= 1.0x</span><span class="text-emerald-500 font-bold">Edge Maintained</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 1.0x</span><span class="text-rose-500 font-bold">Edge Diluted</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.edgeQuotient >= 1 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ strategyExecutionMetrics.edgeQuotient >= 1 ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Unrealized_Alpha_Left</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.unrealizedLeft === 0 ? 'text-emerald-400' : 'text-amber-400'">
                                    ${{ strategyExecutionMetrics.unrealizedLeft.toFixed(2) }}
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.unrealizedLeftText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Calculates additional profit that would have been captured if held to the planned Take Profit level.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Planned TP Profit - Realized Profit
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">$0</span><span class="text-emerald-500 font-bold">Zero Left</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; $0</span><span class="text-amber-500 font-bold">Left on Table</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.unrealizedLeft === 0 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ strategyExecutionMetrics.unrealizedLeft === 0 ? 'Perfect' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Horizon_Sync_Rating</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.horizonSync === 100 ? 'text-emerald-400' : 'text-rose-400'">
                                    {{ (strategyExecutionMetrics.horizonSync || 0).toFixed(2) }}%
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.horizonSyncText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Shows the trade duration position inside the historical scenario range, from minimum to maximum.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 (Trade Duration - Scenario Min) / (Scenario Max - Scenario Min) * 100
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">0%</span><span class="text-emerald-500 font-bold">Scenario Min</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">50%</span><span class="text-slate-500 font-bold">Scenario Mid</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">100%</span><span class="text-emerald-500 font-bold">Scenario Max</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 nier-text-primary">
                                 {{ strategyExecutionMetrics.horizonSyncText }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Velocity_Variance_Index</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.velocityDelta >= 1 ? 'text-emerald-400' : 'text-amber-400'">
                                    {{ strategyExecutionMetrics.velocityDelta.toFixed(2) }}x
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.velocityDeltaText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Compares realized profit velocity against the strategy's historical baseline velocity in dollars per hour.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Realized Velocity / Baseline Velocity
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= 1.0x</span><span class="text-emerald-500 font-bold">Optimal Pacing</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 1.0x</span><span class="text-amber-500 font-bold">Lagging Velocity</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.velocityDelta >= 1 ? 'text-emerald-500' : 'text-amber-500'">
                                 {{ strategyExecutionMetrics.velocityDelta >= 1 ? 'Good' : 'Sub-Optimal' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Conditional_Alpha_Decay</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.alphaDecay === 0 ? 'text-emerald-400' : 'text-rose-400'">
                                    -{{ strategyExecutionMetrics.alphaDecay }} Rules
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.alphaDecayText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>Correlates negative emotional markers with required rules missing from the executed condition set.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 Missing Required Rules * Emotion Penalty
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">0 Rules</span><span class="text-emerald-500 font-bold">Zero Decay</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&gt; 0 Rules</span><span class="text-rose-500 font-bold">Alpha Decay</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.alphaDecay === 0 ? 'text-emerald-500' : 'text-rose-500'">
                                 {{ strategyExecutionMetrics.alphaDecay === 0 ? 'Perfect' : 'Decay Warning' }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>

                     <ExTooltip :is-dark="isDark" v-if="['all', 'strategy_execution'].includes(activeMetricTab)" variant="basic">
                        <template #trigger>
                           <div class="flex flex-col space-y-1 group cursor-pointer">
                              <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest font-black group-hover:opacity-60 transition-opacity">Execution_Confidence_Index</span>
                              <div class="flex flex-col justify-center space-y-0.5 py-1 overflow-hidden">
                                 <span class="text-xl font-mono font-black" :class="strategyExecutionMetrics.executionGrade >= 80 ? 'text-emerald-400' : (strategyExecutionMetrics.executionGrade >= 60 ? 'text-amber-400' : 'text-rose-400')">
                                    {{ (strategyExecutionMetrics.executionGrade || 0).toFixed(2) }} / 100
                                 </span>
                                 <span class="text-[8px] font-mono uppercase tracking-[0.15em] text-black/60 dark:text-white/60 truncate">
                                    {{ strategyExecutionMetrics.executionGradeText }}
                                 </span>
                              </div>
                           </div>
                        </template>
                        <div class="w-full text-[10px] font-mono uppercase tracking-wider leading-relaxed flex flex-col space-y-1">
                           <div>A unified composite score combining adherence, target capture efficiency, risk compliance, and cognitive stability.</div>
                           <div class="pt-2 border-t nier-border-primary">
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Formula</span>
                              <code class="block p-1 bg-black/5 dark:bg-white/5 rounded text-[9px] font-mono font-bold nier-text-primary tracking-tighter">
                                 0.3*Adherence + 0.3*TP Capture + 0.2*Risk Score + 0.2*Stability
                              </code>
                           </div>
                           <div>
                              <span class="text-[9px] opacity-40 block uppercase tracking-widest font-black mb-1">Benchmark</span>
                              <div class="text-[9px] space-y-0.5 bg-black/[0.02] dark:bg-white/[0.02] p-1 rounded border border-black/5 dark:border-white/5 font-medium">
                                 <div class="flex justify-between"><span class="opacity-70">&gt;= 80</span><span class="text-emerald-500 font-bold">High Confidence</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">60-79</span><span class="text-amber-500 font-bold">Moderate</span></div>
                                 <div class="flex justify-between"><span class="opacity-70">&lt; 60</span><span class="text-rose-500 font-bold">Low Confidence</span></div>
                              </div>
                           </div>
                           <div class="pt-2 border-t nier-border-primary flex items-center justify-between">
                              <span class="text-[9px] opacity-40 uppercase tracking-widest font-black">Evaluation</span>
                              <span class="text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5"
                                    :class="strategyExecutionMetrics.executionGrade >= 80 ? 'text-emerald-500' : (strategyExecutionMetrics.executionGrade >= 60 ? 'text-amber-500' : 'text-rose-500')">
                                 {{ strategyExecutionMetrics.executionGrade >= 80 ? 'Good' : (strategyExecutionMetrics.executionGrade >= 60 ? 'Stable' : 'Sub-Optimal') }}
                              </span>
                           </div>
                        </div>
                     </ExTooltip>
                  </div>


               </div>

               <!-- VISUALS VIEW (MODE 4) -->
               <div v-else-if="currentPage === 4" :key="'visuals'" class="min-h-full flex flex-col p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  <div class="flex items-center justify-between border-b nier-border-primary pb-4">
                     <div class="flex flex-col">
                       <span class="text-[10px] font-mono font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Archival_Visual_Stream</span>
                       <h2 class="text-xl font-mono tracking-widest uppercase font-black nier-text-primary mt-1">SITUATIONAL_EVIDENCE</h2>
                     </div>
                     <ExButton variant="solid" @click="addImageSlot">
                        <div class="flex items-center space-x-3">
                           <span class="text-[10px] font-mono font-black uppercase tracking-widest">ADD_VISUAL_SLOT</span>
                           <div class="w-2 h-2 border border-current rotate-45"></div>
                        </div>
                     </ExButton>
                  </div>

                  <div v-if="!enrichedTrade?.images || enrichedTrade.images.length === 0" class="flex-grow flex flex-col items-center justify-center opacity-20 space-y-4">
                     <div class="w-24 h-24 border border-black dark:border-white border-dashed rotate-45 flex items-center justify-center">
                       <span class="text-4xl font-light -rotate-45">+</span>
                     </div>
                     <span class="text-[10px] font-mono uppercase tracking-[0.8em]">NO_VISUAL_DATA_FOUND</span>
                  </div>

                  <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                     <div v-for="(img, idx) in enrichedTrade.images" :key="img.url || idx" class="relative">
                        <ExImageArchiveSlot 
                           :id="idx"
                           :imageUrl="img.url"
                           :timestamp="formatImageSlotDate(img.createdAt || img.timestamp || img.date)"
                           :name="img.name"
                           :tags="img.tags"
                           @upload="triggerUpload(idx)"
                           @fullscreen="showImageFullscreen(idx)"
                           @edit="editImage(idx)"
                           @remove="removeImage(idx)"
                           @update:name="(newName) => updateImageName(idx, newName)"
                           @update:tags="(newTags) => updateImageTags(idx, newTags)"
                        />
                        <input 
                           type="file" 
                           :id="`visual-upload-${idx}`" 
                           class="hidden" 
                           accept="image/*" 
                           @change="handleImageUpload($event, idx)" 
                        />
                     </div>
                  </div>
               </div>

               <!-- NOTES VIEW (MODE 5) -->
               <div v-else-if="currentPage === 5" :key="'notes'" class="min-h-full flex flex-col p-8 space-y-8 overflow-y-auto custom-scrollbar pb-20">
                  <div class="flex items-center justify-between border-b nier-border-primary pb-4">
                     <div class="flex flex-col">
                       <span class="text-[10px] font-mono font-black uppercase tracking-[0.4em] opacity-40 nier-text-primary">Neural_Note_Archive</span>
                       <h2 class="text-xl font-mono tracking-widest uppercase font-black nier-text-primary mt-1">SESSION_POST_MORTEM</h2>
                     </div>
                     <div class="flex items-center space-x-6">
                        <ExButton variant="solid" @click="isCreatingNote = true" v-if="!isCreatingNote">
                           <span class="text-[10px] font-mono font-black uppercase tracking-widest">ADD_NEW_RECORD</span>
                        </ExButton>
                     </div>
                  </div>

                  <!-- NEW NOTE TEXTAREA -->
                  <div v-if="isCreatingNote" class="flex flex-col space-y-4 bg-black/[0.03] dark:bg-white/[0.03] p-8 border nier-border-primary relative">
                       <div class="absolute top-4 right-4 flex space-x-4">
                          <button @click="cancelNoteEdit" class="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100">Cancel</button>
                       </div>
                    
                       
                       <!-- FORMATTING TOOLBAR -->
                       <div class="flex items-center flex-wrap gap-2 pb-4 border-b border-black/5 dark:border-white/5 mb-4">
                          <div class="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-sm mr-4">
                             <button @click="isPreviewMode = false" 
                                     :class="['px-3 py-1 text-[9px] font-mono transition-all', !isPreviewMode ? 'nier-bg-inverted nier-text-primary' : 'opacity-40']">
                                EDITOR
                             </button>
                             <button @click="isPreviewMode = true" 
                                     :class="['px-3 py-1 text-[9px] font-mono transition-all', isPreviewMode ? 'nier-bg-inverted nier-text-primary' : 'opacity-40']">
                                PREVIEW
                             </button>
                          </div>

                          <div v-if="!isPreviewMode" class="flex items-center flex-wrap gap-2">
                            <button @click="insertFormatting('# ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H1</button>
                            <button @click="insertFormatting('## ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H2</button>
                            <button @click="insertFormatting('### ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">H3</button>
                            <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                            <button @click="insertFormatting('**', '**')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono font-bold transition-all">B</button>
                            <button @click="insertFormatting('*', '*')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono italic transition-all">I</button>
                            <button @click="insertFormatting('~~', '~~')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono underline transition-all">U</button>
                            <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                            <button @click="insertFormatting('- ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">LIST</button>
                            <button @click="insertFormatting('> ', '')" class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all">QUOTE</button>
                            <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                            <button @click="insertFormatting('[color=#10b981]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-emerald-500 rounded-full"></div></button>
                            <button @click="insertFormatting('[color=#ef4444]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-rose-500 rounded-full"></div></button>
                            <button @click="insertFormatting('[color=#3b82f6]', '[/color]')" class="px-2 py-1 hover:scale-110 transition-all"><div class="w-3 h-3 bg-blue-500 rounded-full"></div></button>
                            <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
                            
                            <!-- Visual Attach Dropdown -->
                            <div class="relative group/visuals inline-block">
                              <button class="px-2 py-1 bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-[9px] font-mono transition-all flex items-center gap-1">
                                ATTACH_VISUAL
                                <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                              </button>
                              <div class="absolute top-full left-0 hidden group-hover/visuals:flex flex-col nier-bg-panel border nier-border-primary shadow-xl z-50 min-w-[150px]">
                                <div v-if="!enrichedTrade?.images?.length" class="px-3 py-2 text-[8px] font-mono opacity-50 uppercase whitespace-nowrap">NO_VISUALS_ARCHIVED</div>
                                <button v-else v-for="(img, idx) in enrichedTrade.images" :key="img.url" @click.prevent="insertFormatting(`[VISUAL_REF:${idx}]`, '')" class="px-3 py-2 text-[9px] font-mono text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors truncate max-w-[200px]">
                                  {{ img.name || `Visual_Node_${idx}` }}
                                </button>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div class="relative min-h-[200px]">
                          <textarea 
                             v-if="!isPreviewMode"
                             ref="noteTextArea"
                             v-model="noteText" 
                             placeholder="REIFY SESSION THOUGHTS HERE..."
                             class="w-full h-full bg-transparent border-0 font-mono text-[13px] leading-relaxed tracking-wider outline-none resize-none placeholder:opacity-20 min-h-[200px]"
                             autofocus
                          ></textarea>
                          <div v-else 
                               class="w-full h-full font-mono text-[13px] leading-relaxed tracking-wider overflow-y-auto custom-scrollbar min-h-[200px]"
                               v-html="formatNote(noteText || 'NO_CONTENT_TO_PREVIEW')">
                          </div>
                       </div>
                       <div class="flex justify-end">
                          <button @click="addNote" class="group/save relative h-10 px-10 bg-black text-white dark:bg-white dark:text-black font-black border border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all duration-500">
                            <span class="relative z-10 text-[9px] uppercase tracking-[0.4em]">Persist_Record</span>
                          </button>
                       </div>
                    </div>
                  
                  <!-- EXISTING NOTES LIST -->
                  <div class="flex flex-col space-y-6">
                     <div v-for="note in [...(enrichedTrade?.notesList || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())" :key="note.id" 
                          class="flex flex-col p-6 border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] relative group/note cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                          @click="toggleNote(note.id)"
                          @dblclick="startEditContent(note)">
                        <div class="flex items-center justify-between mb-2 pb-2" :class="expandedNoteIds.includes(note.id) ? 'border-b border-black/5 dark:border-white/5' : ''">
                           <div class="flex items-center space-x-4">
                              <div class="w-1.5 h-1.5 nier-bg-inverted transition-transform duration-300" :class="expandedNoteIds.includes(note.id) ? 'rotate-[135deg]' : 'rotate-45'"></div>
                              <div v-if="editingNoteId === note.id" @click.stop class="flex items-center gap-2">
                                <input 
                                  v-model="editNoteTitle" 
                                  @keydown.enter.prevent="saveNoteTitle(note.id)" 
                                  @blur="saveNoteTitle(note.id)"
                                  class="bg-transparent border-b border-black/30 dark:border-white/30 outline-none text-[9px] font-mono font-black uppercase tracking-[0.2em] nier-text-primary"
                                  autofocus
                                />
                                <span class="text-[7px] font-mono opacity-40 uppercase tracking-widest">(ENTER_TO_SAVE)</span>
                              </div>
                              <span v-else @click.stop="startEditNote(note, $event)" class="text-[9px] font-mono font-black uppercase tracking-[0.2em] hover:opacity-50 transition-opacity cursor-text" title="Click to rename">{{ note.title || 'ARCHIVED_RECORD' }}</span>
                           </div>
                           <div class="flex items-center space-x-4">
                              <span class="text-[10px] font-mono font-bold opacity-60 tracking-wider nier-text-primary">{{ formatDateTactical(note.date) }}</span>
                              <button type="button" @click.stop="deleteNote(note.id)" class="opacity-0 group-hover/note:opacity-40 hover:!opacity-100 transition-opacity text-rose-500">
                                 <span class="text-[9px] font-mono font-black uppercase tracking-widest">[Delete]</span>
                              </button>
                           </div>
                        </div>
                        <div v-if="expandedNoteIds.includes(note.id)" class="text-[12px] font-mono leading-relaxed opacity-70 whitespace-pre-wrap mt-2 animate-fade-in" v-html="formatNote(note.content)"></div>
                     </div>
                  </div>


               </div>
            </Transition>
          </div>
        </div>
      </Transition>
           <!-- Archival Framing -->
           <div class="absolute top-4 left-4 w-6 h-6 border-t border-l border-black/40 dark:border-white/40 pointer-events-none"></div>
           <div class="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-black/40 dark:border-white/40 pointer-events-none"></div>
       </div>
      </div>
    </div>


  </ExPanel>

  <!-- DEEP DIVE EFFICIENCY MODAL -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="selectedDeepDiveProtocol" 
           class="fixed inset-0 z-[100000] flex items-center justify-center p-8 md:p-24 bg-black/60 backdrop-blur-md">
         <div class="w-full max-w-5xl h-[600px] shadow-2xl relative">
            <ExEfficiencyLattice 
               :trades="allTrades"
               :protocolId="selectedDeepDiveProtocol.id"
               :protocolName="selectedDeepDiveProtocol.name"
               @close="selectedDeepDiveProtocol = null"
            />
            <!-- Background close area -->
            <div class="absolute -inset-10 -z-10" @click="selectedDeepDiveProtocol = null"></div>
         </div>
      </div>
    </Transition>
  </Teleport>

  </div>

  <!-- EMOTION MATRIX OVERLAY -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showEmotionSelector" 
            class="fixed inset-0 z-[100000] flex items-center justify-center p-20 bg-black/40 dark:bg-black/80 backdrop-blur-md">
        <div class="relative w-full max-w-5xl nier-bg-panel border border-black/40 dark:border-white/40 shadow-[0_0_100px_rgba(0,0,0,0.2)] dark:shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
          
          <div class="flex items-center justify-between px-10 py-6 border-b nier-border-primary">
            <div class="flex items-center gap-4">
              <div class="w-2 h-2 nier-bg-inverted rotate-45"></div>
              <span class="text-xs uppercase tracking-[0.8em] font-black nier-text-primary">Emotion_Matrix_Protocol</span>
            </div>
          </div>

          <div class="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-3 gap-12">
              <div v-for="(emotions, category) in emotionsByCategory" :key="category" class="flex flex-col space-y-8">
                <div class="flex items-center gap-4">
                  <div class="h-[1px] flex-1 bg-black/10 dark:bg-white/10"></div>
                  <span class="text-[9px] font-mono tracking-[0.5em] text-black/40 dark:text-white/40 uppercase">{{ category }}</span>
                </div>
                
                <div class="flex flex-col space-y-3">
                  <button v-for="emotion in emotions" :key="emotion.label"
                          @click="toggleEmotion(emotion.label)"
                          :disabled="!!isEmotionDisabled(emotion.label)"
                          class="flex flex-col p-6 border transition-all text-left group"
                          :class="[
                            selectedEmotions.includes(emotion.label) 
                              ? 'bg-black border-black dark:bg-white dark:border-white' 
                              : 'bg-transparent nier-border-primary hover:border-black/30 dark:hover:border-white/30',
                            isEmotionDisabled(emotion.label) ? 'opacity-20 cursor-not-allowed grayscale' : ''
                          ]">
                    <span class="text-[13px] font-mono font-black tracking-widest uppercase transition-colors"
                          :class="selectedEmotions.includes(emotion.label) ? 'nier-text-primary' : 'text-black/80 dark:text-white/80 group-hover:text-black dark:group-hover:text-white'">
                      {{ emotion.label }}
                    </span>
                    <span class="text-[10px] font-mono uppercase mt-2 leading-relaxed"
                          :class="selectedEmotions.includes(emotion.label) ? 'text-white/80 dark:text-black/80' : 'text-black/80 dark:text-white/80'">
                      {{ emotion.description }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="px-10 py-8 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-12 bg-black/[0.02] dark:bg-white/[0.02]">
            <div class="flex gap-1 opacity-40">
              <div v-for="i in 3" :key="i" class="w-1 h-1 nier-bg-inverted rotate-45"></div>
            </div>
            <button @click="saveEmotions" 
                    class="group/save relative h-12 px-16 bg-black text-white dark:bg-white dark:text-black font-black border border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all duration-500 ease-in-out">
              <span class="relative z-10 text-[10px] uppercase tracking-[0.8em]">Update_Protocol</span>
            </button>
            <div class="flex gap-1 opacity-40">
              <div v-for="i in 3" :key="i" class="w-1 h-1 nier-bg-inverted rotate-45"></div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- CUSTOM CONTEXT MENU -->
  <Teleport to="body">
    <div v-if="activeContextMenu" 
         :style="{ top: activeContextMenu.y + 'px', left: activeContextMenu.x + 'px' }"
         class="fixed z-[200000] nier-bg-panel border nier-border-primary shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in duration-200">
      
      <button @click="showImageFullscreen(activeContextMenu.idx); closeContextMenu()" 
              class="w-full flex items-center space-x-3 px-4 py-3 hover:bg-emerald-500 hover:text-white transition-all group/ctx text-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-emerald-500 group-hover/ctx:text-white transition-colors">
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span class="text-[10px] font-mono font-black uppercase tracking-widest text-black/80 dark:text-white/80 group-hover/ctx:text-white">Show_Fullscreen</span>
      </button>

      <button @click="editImage(activeContextMenu.idx); closeContextMenu()" 
              class="w-full flex items-center space-x-3 px-4 py-3 hover:bg-indigo-500 hover:text-white transition-all group/ctx text-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-indigo-500 group-hover/ctx:text-white transition-colors">
          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span class="text-[10px] font-mono font-black uppercase tracking-widest text-black/80 dark:text-white/80 group-hover/ctx:text-white">Edit_Visuals</span>
      </button>

      <div class="h-px bg-black/5 dark:bg-white/5 my-1"></div>

      <button @click="removeImage(activeContextMenu.idx); closeContextMenu()" 
              class="w-full flex items-center space-x-3 px-4 py-3 hover:bg-rose-500 hover:text-white transition-all group/ctx text-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-rose-500 group-hover/ctx:text-white transition-colors">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="text-[10px] font-mono font-black uppercase tracking-widest text-black/80 dark:text-white/80 group-hover/ctx:text-white">Remove_Slot</span>
      </button>
    </div>
  </Teleport>

  <!-- FULLSCREEN EDITOR OVERLAY -->
  <Teleport to="body">
    <ExImageEditor 
      :key="isEditorOpen ? (editorMode === 'preview' ? 'preview' : 'edit') + '-' + currentEditIdx : 'closed'"
      v-if="isEditorOpen"
      :isOpen="isEditorOpen"
      :imageUrl="editorImageSrc"
      :initialData="currentAnnotations"
      :previewMode="editorMode === 'preview'"
      @close="isEditorOpen = false"
      @save="onDrawingSave"
    />
  </Teleport>
</template>

<style scoped>
@keyframes glow-red {
  0%, 100% {
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    opacity: 0.8;
  }
  50% {
    text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 35px rgba(239, 68, 68, 0.4);
    opacity: 1;
    color: #ef4444;
  }
}

.animate-glow-red {
  animation: glow-red 3s ease-in-out infinite;
}

.font-serif {
  font-family: 'Cormorant Garamond', serif;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes scan {
  0% { transform: translateY(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(128px); opacity: 0; }
}

:global(.custom-scrollbar::-webkit-scrollbar) {
  display: block !important;
  width: 8px !important;
  height: 8px !important;
}

:global(.custom-scrollbar::-webkit-scrollbar-track) {
  background: transparent !important;
}

:global(.custom-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgba(0, 0, 0, 0.1) !important;
  border-radius: 0 !important;
}

:global(.dark .custom-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

:global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(0, 0, 0, 0.4) !important;
}

:global(.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(255, 255, 255, 0.9) !important;
}

:global(.custom-scrollbar) {
  scrollbar-width: auto !important;
  scrollbar-color: rgba(0, 0, 0, 0.5) transparent !important;
}

:global(.dark .custom-scrollbar) {
  scrollbar-color: rgba(255, 255, 255, 0.9) transparent !important;
}

.page-slide-enter-active,
.page-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.page-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
  filter: blur(4px);
}

.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
  filter: blur(4px);
}

/* BACKGROUND DECORATION ANIMATIONS */
@keyframes slow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reverse-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}

@keyframes float-delayed {
  0%, 100% { transform: translateY(0) rotate(-45deg); }
  50% { transform: translateY(20px) rotate(-40deg); }
}

@keyframes pulse-slow {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
}

@keyframes orbit {
  0% { transform: rotate(0deg) translateX(50px) rotate(0deg); opacity: 0; }
  25% { opacity: 1; }
  75% { opacity: 1; }
  100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); opacity: 0; }
}

.animate-slow-rotate {
  animation: slow-rotate 60s linear infinite;
}

.animate-reverse-rotate {
  animation: reverse-rotate 40s linear infinite;
}

.animate-float {
  animation: float 8s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 10s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 15s ease-in-out infinite;
}

.animate-orbit {
  animation: orbit 20s linear infinite;
}
</style>
