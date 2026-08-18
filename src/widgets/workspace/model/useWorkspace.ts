import { defineStore } from 'pinia'

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    hasInitialized: false,
    isAssembled: false,
    showBloom: true,
    isTesseractEnabled: false,
    isNodeMapActive: false,
  }),
  actions: {
    completeInitialization() {
      this.hasInitialized = true
      
      setTimeout(() => {
        this.showBloom = false
        setTimeout(() => {
          this.isAssembled = true
        }, 400)
      }, 500)
    },
    reset() {
      this.hasInitialized = false
      this.isAssembled = false
      this.showBloom = true
      this.isNodeMapActive = false
    }
  }
})
