import { ref, computed } from 'vue';
import type { DiaryEntry, DiaryImage } from '@/entities/diary/model/diary.types';
import {  collection, doc, getDocs,  updateDoc, arrayUnion, arrayRemove, increment, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import { saveToDisk, loadFromDisk } from '@/shared/diskStorage';
import { useForumStore } from '@/features/store/useForum';
import { getMatrixStrategyOptions } from '@/widgets/genesis/model/matrix/useMatrixStrategies';



export const isSubmitting = ref<boolean>(false);
export const status = ref<'idle' | 'success' | 'error'>('idle');

export interface StrategyOption {
  id: string;
  name: string;
  boardName: string;
  boardId: string;
  targetRR: number;
  initialDeposit?: number;
}

export const strategyOptions = ref<StrategyOption[]>([]);
export const selectedStrategyId = ref<string | null>(null);

// Global Filtering State
export const filterAssetName = ref<string>('');
export const filterSide = ref<'Long' | 'Short' | 'All'>('All');
export const filterConditions = ref<string[]>([]);
export const filterScenarioEntryId = ref<string>('');
export const filterScenarioExitId = ref<string>('');

// Advanced filters
export const filterResult = ref<'All' | 'Win' | 'Loss' | 'Breakeven'>('All');
export const filterAssetType = ref<'All' | 'Forex' | 'Stocks' | 'Crypto' | 'Metals'>('All');
export const filterPnlMin = ref<number | null>(null);
export const filterPnlMax = ref<number | null>(null);
export const filterRrMin = ref<number | null>(null);
export const filterRrMax = ref<number | null>(null);
export const filterDateFrom = ref<string>('');
export const filterDateTo = ref<string>('');
export const filterConditionLogic = ref<'AND' | 'OR'>('AND');

export const entries = ref<DiaryEntry[]>([
    {
        date: new Date(),
        asset: 'EUR/USD',
        side: 'Short',
        entry: 1.0842,
        exit: 1.0796,
        size: 2.0,
        sizeInCurrency: 2000,
        currency: 'USD',
        result: 0.46,
        notes: 'Failed breakout at weekly resistance. Early exit due to macro risk.',
        images: [],
    },
]);


export const isAddModalOpen = ref(false);
export const isBladeOpen = ref(false);
export const isConditionLibraryOpen = ref(false);
export const isAdvancedMode = ref(true);
export const simpleWizardStep = ref(1);
export const isPositionManagerOpen = ref(false);
export const isEmotionSyncComplete = ref(false);
export const isAdditionMode = computed(() => isAddModalOpen.value);

export async function toggleHUDMode() {
    isAdvancedMode.value = !isAdvancedMode.value;
    await saveToDisk('diary_hud_mode', isAdvancedMode.value);
}

function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const newEntry = ref<DiaryEntry>({
    id: generateId(),
    date: new Date(),
    asset: '',
    side: 'Long',
    entry: 0,
    exit: 0,
    size: 0,
    sizeInCurrency: 0,
    currency: 'USD',
    result: 0,
    notes: '',
    images: [],
    linkedThreads: [],
    forumCategory: { section: '', category: '' },
    riskReward: 0,
    assetType: 'Forex',
    assetIcon: '',
    profitInCurrency: 0,
    stopLoss: undefined,
    takeProfit: undefined,
    strategyId: undefined,
    boardConditions: [],
    boardScenarioEntryId: '',
    boardScenarioExitId: '',
    emotions: [],
    tacticalPhases: {
      entry: [],
      during: [],
      exit: []
    }
});

export function resetEntry() {
    newEntry.value = {
        id: generateId(),
        date: new Date(),
        asset: '',
        side: 'Long',
        entry: 0,
        exit: 0,
        size: 0,
        sizeInCurrency: 0,
        currency: 'USD',
        result: 0,
        notes: '',
        images: [],
        linkedThreads: [],
        forumCategory: { section: '', category: '' },
        riskReward: 0,
        assetType: 'Forex',
        assetIcon: '',
        profitInCurrency: 0,
        stopLoss: undefined,
        takeProfit: undefined,
        strategyId: undefined,
        boardConditions: [],
        boardScenarioEntryId: '',
        boardScenarioExitId: '',
        emotions: [],
        tacticalPhases: {
          entry: [],
          during: [],
          exit: []
        }
    };
    simpleWizardStep.value = 1;
    isPositionManagerOpen.value = false;
    isEmotionSyncComplete.value = false;
}
    
export async function loadDiaryFromDisk(uid: string) {
    const forum = useForumStore();
    
    // Load diary entries
    let diaryData = await loadFromDisk<DiaryEntry[]>(`diary_${uid}`);
    
    // Load user meta (e.g. initialDeposit)
    const userMeta = await loadFromDisk<{ initialDeposit: number }>(`user_meta_${uid}`);
    
    // Load HUD mode preference
    const savedMode = await loadFromDisk<boolean>('diary_hud_mode');
    if (savedMode !== null) isAdvancedMode.value = savedMode;
    
    if (diaryData) {
        // Patch missing IDs
        let needsSave = false;
        diaryData = diaryData.map(entry => {
            if (!entry.id) {
                needsSave = true;
                return { ...entry, id: generateId() };
            }
            return entry;
        });
        
        if (needsSave) {
            await saveToDisk(`diary_${uid}`, diaryData);
        }
    }

    if (diaryData || userMeta) {
        // Update both dedicated Map and user profile for balance
        if (diaryData) forum.diaries.set(uid, diaryData);

        const existingUser = forum.users.get(uid) || {};
        forum.users.set(uid, {
            ...existingUser,
            ...(diaryData ? { diary: diaryData } : {}),
            ...(userMeta ? { initialDeposit: userMeta.initialDeposit } : {})
        });
        
        if (diaryData && entries.value) {
            entries.value = diaryData;
        }
        
        return true;
    }
    return false;
}

export async function loadStrategies() {
  try {
    const matrixData = await loadFromDisk<any>('genesis_matrix_v2');
    const matrixOptions = getMatrixStrategyOptions(matrixData).map((strategy) => ({
      id: strategy.id,
      name: strategy.name,
      boardName: strategy.boardName || 'Genesis Matrix',
      boardId: strategy.boardId || 'genesis-matrix-main',
      targetRR: strategy.targetRR || 0,
      initialDeposit: strategy.initialDeposit
    }));

    if (matrixOptions.length > 0) {
      strategyOptions.value = matrixOptions;
      return;
    }

    const meta = await loadFromDisk<any[]>('trading_boards_meta_v3');
    if (!meta) return;

    const options: StrategyOption[] = [];
    
    for (const boardMeta of meta) {
      const content = await loadFromDisk<any>(`trading_board_content_${boardMeta.id}`);
      if (!content || !content.notes) continue;
      
      const strategyNodes = content.notes.filter((n: any) => n.type === 'strategy');
      const connectionList = content.connections || [];
      
      for (const strat of strategyNodes) {
        // Find connected risk node
        const connectedIds = connectionList
          .filter((c: any) => c.fromId === strat.id || c.toId === strat.id)
          .map((c: any) => c.fromId === strat.id ? c.toId : c.fromId);
          
        const riskNode = content.notes.find((n: any) => n.type === 'risk_management' && connectedIds.includes(n.id));
        const targetRR = riskNode?.riskData?.targetRR || 0;
        const initialDeposit = riskNode?.riskData?.initialDeposit;
        
        // Note: Trade connections are no longer used for stats/filtering; strategies only rely on the 'strategyId' property of DiaryEntries.
        options.push({
          id: strat.id,
          name: strat.strategyData?.name || 'Untitled Strategy',
          boardName: boardMeta.name,
          boardId: boardMeta.id,
          targetRR,
          initialDeposit
        });
      }
    }
    strategyOptions.value = options;
  } catch (err) {
    console.error('Failed to load strategies:', err);
  }
}



export async function syncDiaryToDisk(uid: string) {
    const forum = useForumStore();
    const diary = forum.diaries.get(uid);
    if (diary) {
        await saveToDisk(`diary_${uid}`, diary);
    }
}


export async function addDiaryEntry(entry: DiaryEntry, authorId: string, diaryId: string) {
    if (isSubmitting.value) return;
    if(!entry) return;
    if(diaryId !== authorId) return;

    isSubmitting.value = true;
    status.value = 'idle'

    try{
        const forum = useForumStore();
        
        // Update local store immediately
        forum.addDiaryEntry(authorId, entry);
        
        // Save to disk
        await syncDiaryToDisk(authorId);

        // Firestore Sharing Logic:
        // If the trade is linked to a category or thread, share stats for public metrics
        const hasCategory = entry.forumCategory?.section && entry.forumCategory?.category;
        const hasThreads = entry.linkedThreads && entry.linkedThreads.length > 0;

        if (hasCategory || hasThreads) {
            await addDoc(collection(db, 'sharedTrades'), {
                result: entry.result || 0,
                side: entry.side,
                riskReward: entry.riskReward || 0,
                authorId: authorId,
                forumCategory: entry.forumCategory || null,
                linkedThreads: entry.linkedThreads || [],
                createdAt: serverTimestamp()
            });

            // Update thread counters if threads are linked
            if (hasThreads) {
                const isPositive = (entry.result || 0) > 0;
                for (const threadId of entry.linkedThreads!) {
                    const threadRef = doc(db, 'threads', threadId);
                    await updateDoc(threadRef, {
                        linkedTradesCount: increment(1),
                        ...(isPositive ? { positiveTradesCount: increment(1) } : {})
                    });
                }
            }
        }

        status.value = 'success'
    } catch (e) {
        status.value = 'error'
    } finally {
        isSubmitting.value = false
        status.value = 'idle'
    }
}   
    
export async function removeDiaryEntry(entry: DiaryEntry, authorId: string, diaryId: string) {
    if (isSubmitting.value) return;
    if(!entry) return;
    if(diaryId !== authorId) return;

    isSubmitting.value = true;
    status.value = 'idle'

    try{
        const forum = useForumStore();
        
        // We need the entry ID to remove it locally from the forum store.
        // The store currently has removeDiaryEntry(authorId, entryId).
        // Let's find the ID if not provided.
        const user = forum.users.get(authorId);
        const entriesList = user?.diary || [];
        const entryIdx = entriesList.findIndex((e: DiaryEntry) => e === entry);
        
        if (entryIdx !== -1) {
            forum.removeDiaryEntry(authorId, entryIdx);
            await syncDiaryToDisk(authorId);
        }

        if (entry.linkedThreads && entry.linkedThreads.length > 0) {
            const isPositive = (entry.result || 0) > 0;
            for (const threadId of entry.linkedThreads) {
                const threadRef = doc(db, 'threads', threadId);
                await updateDoc(threadRef, {
                    linkedTradesCount: increment(-1),
                    ...(isPositive ? { positiveTradesCount: increment(-1) } : {})
                });
            }
        }

        status.value = 'success'
      
    } catch (e) {
        status.value = 'error'
    } finally {
        isSubmitting.value = false
        status.value = 'idle'
    }
}

export async function clearDiaryTrades(authorId: string, diaryId: string, strategyId?: string) {
    if (isSubmitting.value) return;
    if (diaryId !== authorId) return;

    isSubmitting.value = true;
    try {
        const forum = useForumStore();
        
        // Use the new store action
        forum.clearDiary(authorId, strategyId);
        
        // Sync the purged state to disk
        await syncDiaryToDisk(authorId);
        
        status.value = 'success'
    } catch (e) {
        console.error('[DiaryService] Clear failed:', e);
        status.value = 'error'
    } finally {
        isSubmitting.value = false;
        status.value = 'idle';
    }
}
export async function updateDiaryNote(entry: DiaryEntry, newNote: string, authorId: string, diaryId: string) {
    if (isSubmitting.value) return;
    if(!entry) return;
    if(diaryId !== authorId) return;

    isSubmitting.value = true;
    try {
        const forum = useForumStore();
        
        // Find index of the entry
        const user = forum.users.get(authorId);
        const entriesList = user?.diary || [];
        const entryIdx = entriesList.findIndex((e: DiaryEntry) => e === entry);
        
        if (entryIdx !== -1) {
            forum.updateDiaryEntryNote(authorId, entryIdx, newNote);
            await syncDiaryToDisk(authorId);
        }
        
    } catch (e) {
        console.error('Failed to update diary note:', e);
    } finally {
        isSubmitting.value = false;
    }
}
export async function updateDiaryVisuals(entry: DiaryEntry, newNotes: string, newImages: any[], authorId: string, diaryId: string) {
    if (isSubmitting.value) return;
    if(!entry) return;
    if(diaryId !== authorId) return;

    isSubmitting.value = true;
    try {
        const forum = useForumStore();
        
        // Find index of the entry
        const user = forum.users.get(authorId);
        const entriesList = user?.diary || [];
        const entryIdx = entriesList.findIndex((e: DiaryEntry) => e === entry);
        
        if (entryIdx !== -1) {
            forum.updateDiaryEntryVisuals(authorId, entryIdx, newNotes, newImages);
            await syncDiaryToDisk(authorId);
        }
        
    } catch (e) {
        console.error('Failed to update diary visuals:', e);
    } finally {
        isSubmitting.value = false;
    }
}
