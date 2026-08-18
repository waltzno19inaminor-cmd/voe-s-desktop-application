<template>
  <ExWorkspaceView />
</template>

<script setup>
import ExWorkspaceView from '~/widgets/workspace/ui/workspace/ExWorkspaceView.vue'

definePageMeta({ 
  layout: false,
  key: route => 'workspace'
})
</script>
