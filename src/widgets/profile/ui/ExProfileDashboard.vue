<template>
  <div class="h-full min-h-screen flex transition-all duration-1000 ethereal-void overflow-hidden"
       :class="[isDark ? 'is-dark dark theme-dark' : 'theme-light']">
    
    <!-- Left Sidebar -->
    <ExProfileSidebar 
      :activeTab="activeTab"
      @update:activeTab="activeTab = $event"
      @sign-out="handleSignOut"
      @navigate-back="navigateBack"
      class="z-20 shrink-0"
    />

    <!-- Main Content Area -->
    <main class="flex-grow relative overflow-y-auto z-10">
      
      <!-- Background Ambient FX -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-theme-text opacity-[0.03] blur-[150px] rounded-full"></div>
        <div class="absolute -bottom-1/4 left-1/4 w-[600px] h-[600px] bg-theme-text opacity-[0.02] blur-[120px] rounded-full"></div>
      </div>
      
      <!-- Content Wrapper -->
      <div class="h-full flex items-center justify-center p-12 lg:p-24 relative z-10">
        <div class="w-full h-full max-w-4xl mx-auto">
          
          <ExProfileTabProfile 
            v-if="activeTab === 'PROFILE'"
            :displayName="displayName"
            :description="description"
            :isSubmitting="isSubmitting"
            :errorMessage="errorMessage"
            :successMessage="successMessage"
            @update:displayName="displayName = $event"
            @update:description="description = $event"
            @save="saveProfile"
          />

          <ExProfileTabAppearance 
            v-else-if="activeTab === 'APPEARANCE'"
          />

        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '~/features/store/useTheme'
import { useProfile } from '../model/useProfile'

import ExProfileSidebar from './ExProfileSidebar.vue'
import ExProfileTabProfile from './ExProfileTabProfile.vue'
import ExProfileTabAppearance from './ExProfileTabAppearance.vue'

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.settings.isDark)

const {
  activeTab,
  displayName,
  description,
  isSubmitting,
  errorMessage,
  successMessage,
  saveProfile,
  handleSignOut,
  navigateBack
} = useProfile()

</script>

<style scoped>
.ethereal-void {
  font-family: 'Cormorant Garamond', serif;
}
</style>
