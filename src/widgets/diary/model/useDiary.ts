import { ref } from 'vue';
import type { DiaryEntry, DiaryImage } from '@/entities/diary/model/diary.types';
import {  collection, doc, getDocs,  updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'



export const isSubmitting = ref<boolean>(false);
export const status = ref<'idle' | 'success' | 'error'>('idle')


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

export const newEntry = ref<DiaryEntry>({
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
});

export function resetEntry() {
    newEntry.value = {
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
    };
}


export async function addDiaryEntry(entry: DiaryEntry, authorId: string, diaryId: string) {
    if (isSubmitting.value) return;
    if(!entry) return;
    if(diaryId !== authorId) return;

    isSubmitting.value = true;
    status.value = 'idle'

    try{
        const userRef = doc(db, 'users', authorId);

        await updateDoc(userRef, {
            diary: arrayUnion(entry)
        });

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
        const userRef = doc(db, 'users', authorId);

        await updateDoc(userRef, {
            diary: arrayRemove(entry)
        });

        status.value = 'success'
      
    } catch (e) {
        status.value = 'error'
    } finally {
        isSubmitting.value = false
        status.value = 'idle'
    }
}
