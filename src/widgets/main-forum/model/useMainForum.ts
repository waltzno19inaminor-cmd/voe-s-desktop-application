
import { computed } from "vue";
import type { Thread } from "~/entities/thread/model/thread.types";



function toDate(value: any): Date{

    if(value?.toDate){
        return value.toDate()
    }

    if(value?.seconds){
        return new Date(value.seconds * 1000) 
    }

    return new Date(value);
}

export function useMainForum(threads: Thread[]) {
  const recentThreads = computed(() => {
    return [...threads]
      .sort(
        (a, b) =>
          toDate(b.createdAt).getTime() -
          toDate(a.createdAt).getTime()
      )
      .slice(0, 6)
  })

  return { recentThreads }
}

