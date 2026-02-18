import { ref } from 'vue';
import {  collection, doc, setDoc, serverTimestamp, deleteDoc, query, where, getDocs, increment, updateDoc  } from 'firebase/firestore'
import { db } from '~/shared/firebase.client'
import type { Reply } from '~/entities/reply/model/reply.types'
import type { ReplyType } from '~/entities/reply/model/reply.types';
import type { ThreadContent, QuoteBlock } from "~/entities/thread/model/thread.types";


export const isReplying = ref<boolean>(false);
export const replyText = ref<string | null>(null);
export const isSubmitting = ref<boolean>(false);
export const replyType = ref<string | null>(null);
export const isReplyingTo = ref<string | null>(null);
export const isQuoting = ref<boolean>(false);
export const selectQuotation = ref<QuoteBlock | null>(null);

export const replyTo = (replyId: string) => {
    isReplyingTo.value = replyId;
    isReplying.value = true;
}


export const submitReply = async (threadId: string, authorId: string, parentReply: string | null, quote: {threadId: string, blockIndex: number, text: string, type: string} | null) => {
    if(replyText.value === null || replyText.value.trim() === '') return;
    if (isSubmitting.value) return;

    isSubmitting.value = true;

    const replyRef = doc(collection(db, 'replies'));
    const textBlocks =  [
        {text: replyText.value, type: 'paragraph'}
    ]
    let baseReply: Reply | null = null;
    const threadRef = doc(db, 'threads', threadId);
   

    try {
        baseReply = {
            id: replyRef.id,
            threadId,
            authorId,
            createdAt: serverTimestamp(),
            content: { blocks: textBlocks } as ThreadContent,
            meaningful: false,
            type: replyType.value as ReplyType,
            status: 'published'
        }

       if (parentReply) {
            baseReply.parentId = parentReply // adding parentId if it exists
        }
        if(quote){
            baseReply.content.blocks.push({text: quote.text, type: 'quote', source: quote   }); // adding quote block as an object with additional source key
        }
      
        await setDoc(replyRef, baseReply); // saving reply to db



        await updateDoc(threadRef, {
          repliesCount: increment(1),
          lastReplyAt: serverTimestamp()
        })

      
        isReplying.value = false;
        isReplyingTo.value = null;
        selectQuotation.value = null;
    } catch (err: any){
        throw new Error(err.message)
    } finally {
         isSubmitting.value = false
        
    }

    baseReply.createdAt = new Date();


    return baseReply;
}


export const removeReply = async (replyId: string | null, threadId: string) => {
  if (!replyId) return
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    await deleteReplyRecursively(replyId, threadId)
  } catch (err: any) {
    throw new Error(err.message)
  } finally {
    isSubmitting.value = false
  }
}

const deleteReplyRecursively = async (replyId: string, threadId: string) => {

  const q = query(
    collection(db, 'replies'),
    where('parentId', '==', replyId)
  )

  const snapshot = await getDocs(q)

 
  for (const docSnap of snapshot.docs) {
    await deleteReplyRecursively(docSnap.id, threadId)
  }

  await deleteDoc(doc(db, 'replies', replyId))

  await updateDoc(doc(db, 'threads', threadId), {
    repliesCount: increment(-1)
  })
}