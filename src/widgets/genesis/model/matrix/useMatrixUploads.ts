import { ref } from 'vue'
import type { useMatrixState } from './useMatrixState'

export function useMatrixUploads(state: ReturnType<typeof useMatrixState>) {
  const imageInput = ref<HTMLInputElement | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)
  const uploadingNodeId = ref<string | null>(null)
  const uploadingFileNodeId = ref<string | null>(null)

  function triggerImageUpload(nodeId: string) {
    uploadingNodeId.value = nodeId
    imageInput.value?.click()
  }

  function triggerGenericFileUpload(nodeId: string) {
    uploadingFileNodeId.value = nodeId
    fileInput.value?.click()
  }

  function handleImageUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !uploadingNodeId.value) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const node = state.getNode(uploadingNodeId.value!)
      if (node) {
        if (!node.params) node.params = {}
        node.params.imageUrl = event.target?.result as string
        node.params.width = 300
        node.params.height = 200
      }
      uploadingNodeId.value = null
    }
    reader.readAsDataURL(file)
  }

  function handleGenericFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !uploadingFileNodeId.value) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const node = state.getNode(uploadingFileNodeId.value!)
      if (node) {
        if (!node.params) node.params = {}
        node.params.fileName = file.name
        node.params.fileSize = file.size
        node.params.fileType = file.type || 'application/octet-stream'
        node.params.fileDataUrl = event.target?.result as string
      }
      uploadingFileNodeId.value = null
      if (fileInput.value) fileInput.value.value = ''
    }
    reader.readAsDataURL(file)
  }

  return {
    imageInput,
    fileInput,
    uploadingNodeId,
    uploadingFileNodeId,
    triggerImageUpload,
    triggerGenericFileUpload,
    handleImageUpload,
    handleGenericFileUpload
  }
}
