import { defineStore } from 'pinia'
import type { Thread } from '~/entities/thread/model/thread.types'
import type { Reply } from '~/entities/reply/model/reply.types'
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types'
import { fetchAllThreads, fetchAllReplies, fetchAllThreadLinks } from '~/features/store/database'

export const useDatabaseStore = defineStore('database', {
    state: () => ({
        threads: [] as Thread[],
        replies: [] as Reply[],
        threadLinks: [] as ThreadLink[],
        loading: false,
        error: null as Error | null
    }),
    actions: {
        async fetchThreads() {
            this.loading = true
            this.threads = await fetchAllThreads()
            this.loading = false
        },
        async fetchReplies() {
            this.loading = true
            this.replies = await fetchAllReplies()
            this.loading = false
        },
        async fetchThreadLinks() {
            this.loading = true
            this.threadLinks = await fetchAllThreadLinks()
            this.loading = false
        },
        async fetchAll() {
            this.loading = true
            const [threads, replies, threadLinks] = await Promise.all([
                fetchAllThreads(),
                fetchAllReplies(),
                fetchAllThreadLinks(),
            ])
            this.threads = threads
            this.replies = replies
            this.threadLinks = threadLinks
            this.loading = false
        }
    }
})