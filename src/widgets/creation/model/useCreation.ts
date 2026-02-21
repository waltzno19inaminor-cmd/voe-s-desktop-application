import { ref } from "vue";
import type { ContentBlock } from "~/entities/thread/model/thread.types";
import {  collection, doc, setDoc, serverTimestamp, query, where, getDocs, increment, updateDoc, getDoc, deleteDoc   } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { DiaryEntry } from "~/entities/diary/model/diary.types";

export const category = ref<string | null>('project');
export const subcategory = ref<string | null>('theory');

export const threadTitle = ref<string | null>(null);
export const threadDescription = ref<string | null>(null);
export const blocks = ref<ContentBlock[]>([]);

export const imagePreview = ref<string | null>(null);
export const selectedFile = ref<File | null>(null);
export const status = ref<string | null>('idle');
export const threadId = ref<string | null>(null);

export const isSubmitting = ref<boolean>(false);

export const selectedTrades = ref<DiaryEntry[]>([]);



export function chooseCategory(value: string){
    category.value = value;
}

export function chooseSubcategory(value: string){
    subcategory.value = value;
}

export function addBlock(block: ContentBlock){
    if(block.type === 'heading' && block.level === 2){
        if(blocks.value.find(x => x.type === 'heading' && x.level === 2)){
            return;
        }
    }
    blocks.value.push(block);
}

export function removeBlock(index: number){
    blocks.value.splice(index, 1);
    if(selectedFile.value){
        selectedFile.value = null;
        imagePreview.value = null;
    }
}


export function moveBlock(index: number, offset: number){
    const block = blocks.value[index];
    if(!block) return;
    blocks.value.splice(index, 1);
    blocks.value.splice(index + offset, 0, block);
}

export function addListItem(block: ContentBlock){
    if(block.type !== 'list') return;
    block.items.push('');
}

export function removeListItem(block: ContentBlock, index: number){
    if(block.type !== 'list') return;
    block.items.splice(index, 1);
}

export function onImageSelect(event: Event, block: ContentBlock) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)


  if (block.type === 'image') {
    block.src = URL.createObjectURL(file)
}
}

export async function createThread( authorId: string) {
  if (isSubmitting.value) return
  if (blocks.value.length === 0) return

  isSubmitting.value = true

  const threadRef = doc(collection(db, 'threads'))
  const userRef = doc(db, 'users', authorId);

  try {
    await setDoc(threadRef, {
      id: threadRef.id,
      title: threadTitle.value,
      description: threadDescription.value,
      category: category.value,
      subcategory: subcategory.value,
      thesis: {
        blocks: blocks.value
      },
      
      authorId,
      status: 'active',
      createdAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      includedTrades: selectedTrades.value
    })

    await updateDoc(userRef, {
      threads: increment(1)
    })
    status.value = 'success'
    threadId.value = threadRef.id

  } catch (error) {
    status.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}


export async function updateThread(
  authorId: string,
  threadId: string
) {
  if (isSubmitting.value) return
  if (!threadId) return
  if (blocks.value.length === 0) return

  isSubmitting.value = true

  const threadRef = doc(db, 'threads', threadId)

  try {
    const threadSnap = await getDoc(threadRef)

    if (!threadSnap.exists()) {
      throw new Error('Thread does not exist')
    }

    const threadData = threadSnap.data()

    if (threadData.authorId !== authorId) {
      throw new Error('Permission denied: not the author')
    }

    await updateDoc(threadRef, {
      title: threadTitle.value,
      description: threadDescription.value,
      category: category.value,
      subcategory: subcategory.value,
      thesis: {
        blocks: blocks.value
      },
      lastActivityAt: serverTimestamp(),
      includedTrades: selectedTrades.value
    })
    status.value = 'success'
  } catch (error) {
    console.error(error)
    status.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}

export async function deleteThread(
  authorId: string,
  threadId: string
) {
  if (isSubmitting.value) return
  if (!threadId) return

  isSubmitting.value = true

  const threadRef = doc(db, 'threads', threadId)
  const userRef = doc(db, 'users', authorId);

  try {
    const threadSnap = await getDoc(threadRef)

    if (!threadSnap.exists()) {
      throw new Error('Thread does not exist')
    }

    const threadData = threadSnap.data()

    if (threadData.authorId !== authorId) {
      throw new Error('Permission denied: not the author')
    }

    await deleteDoc(threadRef)

    await updateDoc(userRef, {
      threads: increment(-1)
    })

    status.value = 'deleted'
  } catch (error) {
    console.error(error)
    status.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}