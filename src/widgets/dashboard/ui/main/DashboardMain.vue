<template>
  <section class="max-w-[1400px] mx-auto px-8 relative z-10 w-full mb-12 flex-1">
    <div class="text-[#050505] dark:text-[#dcdcdc] rounded-2xl py-8 md:py-12">
      
      <!-- TOP ROW: 1/2 Try Feature, 1/2 Trending -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 mb-8">
        <SubscribeWidget v-if="activeUser?.type !== 'premium'" class="!mb-0" />
        <TrendingFollowedThread v-if="trendingThread" :thread="trendingThread" class="!mb-0" />
      </div>

      <!-- MAIN CONTENT AREA -->
      <div class="mb-12">
        <ActivityTable />
      </div>

      <!-- BOTTOM ROW: TradingView News -->
      <div class="mt-24 border-t border-black/5 dark:border-white/5 pt-12">
        <TradingViewNews />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '~/entities/user/auth.store';
import { useForumStore } from '~/features/store/useForum';
import SubscribeWidget from '../widgets/SubscribeWidget.vue';
import TrendingFollowedThread from '../network/TrendingFollowedThread.vue';
import TradingViewNews from '../widgets/TradingViewNews.vue';
import ActivityTable from '../activity/ActivityTable.vue';

const auth = useAuthStore();
const forum = useForumStore();

const activeUserId = computed(() => auth.user?.uid);

const activeUser = computed(() => {
    if (!activeUserId.value) return null;
    return forum.users.get(activeUserId.value);
});



const followedThreads = computed(() => {
    const followed = activeUser.value?.followed;
    if (!followed || followed.length === 0) return [];
    return Array.from(forum.threads.values()).filter(t => followed.includes(t.authorId));
});

const trendingThread = computed(() => {
    if (followedThreads.value.length === 0) return null;
    
    // 1. Extract unique categories that followed users are participating in
    const activeCategories = new Set(followedThreads.value.map(t => t.category));
    
    // 2. Filter all platform threads that match these categories, 
    //    excluding the current user's own threads to avoid self-recommendation
    const candidateThreads = Array.from(forum.threads.values()).filter(t => 
        activeCategories.has(t.category) && t.authorId !== activeUserId.value
    );
    
    if (candidateThreads.length === 0) return null;

    // 3. Sort primarily by date, secondarily by replies
    const sorted = candidateThreads.sort((a, b) => {
        const dateA = a.lastActivityAt && typeof a.lastActivityAt === 'object' && 'seconds' in a.lastActivityAt ? (a.lastActivityAt as any).seconds : 0;
        const dateB = b.lastActivityAt && typeof b.lastActivityAt === 'object' && 'seconds' in b.lastActivityAt ? (b.lastActivityAt as any).seconds : 0;
        
        if (dateB !== dateA) return dateB - dateA;
        return (b.repliesCount || 0) - (a.repliesCount || 0);
    });
    
    return sorted[0];
});

const initializeDashboard = async () => {
    if (!activeUserId.value) return;
    
    // Fetch auth user's full data
    const user = await forum.fetchUser(activeUserId.value);
    
    // Fetch threads for knowledge network
    await forum.fetchThreadList(); // To ensure graph context if needed, but we usually want specific threads
    
    // Fetch user's links for network
    await forum.fetchAllThreadLinks(); 
    
    // Fetch followed user's threads
    if (user?.followed && user.followed.length > 0) {
        // Also fetch user info for followed users to show names in feed
        for(const uId of user.followed.slice(0, 10)) {
            await forum.fetchUser(uId);
        }
        await forum.fetchFollowedThreads(user.followed);
    }
};

onMounted(() => {
    if (activeUserId.value) {
        initializeDashboard();
    }
});

watch(activeUserId, (newVal) => {
    if (newVal) {
        initializeDashboard();
    }
});
</script>
