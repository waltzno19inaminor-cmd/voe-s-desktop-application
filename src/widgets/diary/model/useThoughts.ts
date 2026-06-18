import { ref } from 'vue';
import { saveToDisk, loadFromDisk } from '@/shared/diskStorage';
import { useForumStore } from '@/features/store/useForum';

export interface ThoughtEntry {
    id: string;
    date: number; // Timestamp of creation
    title: string;
    contentHtml: string;
    lastModified: number; // Timestamp of last edit
}

export const thoughts = ref<ThoughtEntry[]>([]);
export const isThoughtsSubmitting = ref<boolean>(false);
export const activeThoughtId = ref<string | null>(null);
export const isDrawingModalActive = ref<boolean>(false);

function generateId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function loadThoughtsFromDisk(uid: string) {
    if (!uid) return false;
    
    const thoughtsData = await loadFromDisk<ThoughtEntry[]>(`diary_thoughts_${uid}`);
    if (thoughtsData) {
        thoughts.value = thoughtsData;
        return true;
    } else {
        thoughts.value = [];
        return false;
    }
}

export async function saveThoughtsToDisk(uid: string) {
    if (!uid) return;
    await saveToDisk(`diary_thoughts_${uid}`, thoughts.value);
}

export async function addThought(uid: string, initialTitle: string = 'Untitled Note', initialContent: string = '') {
    if (!uid) return null;
    isThoughtsSubmitting.value = true;
    try {
        const newThought: ThoughtEntry = {
            id: generateId(),
            date: Date.now(),
            title: initialTitle,
            contentHtml: initialContent,
            lastModified: Date.now(),
        };

        thoughts.value.push(newThought);
        // Sort descending by date
        thoughts.value.sort((a, b) => b.date - a.date);

        await saveThoughtsToDisk(uid);
        activeThoughtId.value = newThought.id;
        return newThought;
    } catch (e) {
        console.error('Failed to add thought:', e);
        return null;
    } finally {
        isThoughtsSubmitting.value = false;
    }
}

export async function updateThought(uid: string, id: string, payload: Partial<ThoughtEntry>) {
    if (!uid || !id) return;
    try {
        const idx = thoughts.value.findIndex(t => t.id === id);
        if (idx !== -1) {
            const thought = thoughts.value[idx];
            if (thought) {
                Object.assign(thought, payload, { lastModified: Date.now() });
                await saveThoughtsToDisk(uid);
            }
        }
    } catch (e) {
        console.error('Failed to update thought:', e);
    }
}

export async function deleteThought(uid: string, id: string) {
    if (!uid || !id) return;
    isThoughtsSubmitting.value = true;
    try {
        const idx = thoughts.value.findIndex(t => t.id === id);
        if (idx !== -1) {
            thoughts.value.splice(idx, 1);
            if (activeThoughtId.value === id) {
                activeThoughtId.value = null;
            }
            await saveThoughtsToDisk(uid);
        }
    } catch (e) {
        console.error('Failed to delete thought:', e);
    } finally {
        isThoughtsSubmitting.value = false;
    }
}
