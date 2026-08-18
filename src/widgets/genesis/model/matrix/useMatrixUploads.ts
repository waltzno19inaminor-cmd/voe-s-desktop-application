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
        const prevUrl = node.params.imageUrl
        node.params.imageUrl = event.target?.result as string
        node.params.width = 300
        node.params.height = 200

        state.changeTree.recordNodeScreenshotChanged(node, {
          undo: () => {
            node.params.imageUrl = prevUrl
            state.forceUpdate()
          },
          redo: () => {
            node.params.imageUrl = event.target?.result as string
            state.forceUpdate()
          }
        })
      }
      uploadingNodeId.value = null
    }
    reader.readAsDataURL(file)
  }

  function handleGenericFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !uploadingFileNodeId.value) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported.')
      if (fileInput.value) fileInput.value.value = ''
      uploadingFileNodeId.value = null
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const node = state.getNode(uploadingFileNodeId.value!)
      if (node) {
        if (!node.params) node.params = {}
        const prevName = node.params.fileName
        const prevSize = node.params.fileSize
        const prevType = node.params.fileType
        const prevUrl = node.params.fileDataUrl

        node.params.fileName = file.name
        node.params.fileSize = file.size
        node.params.fileType = 'application/pdf'
        node.params.fileDataUrl = event.target?.result as string

        state.changeTree.recordNodeFileAttachmentChanged(node, {
          undo: () => {
            node.params.fileName = prevName
            node.params.fileSize = prevSize
            node.params.fileType = prevType
            node.params.fileDataUrl = prevUrl
            state.forceUpdate()
          },
          redo: () => {
            node.params.fileName = file.name
            node.params.fileSize = file.size
            node.params.fileType = 'application/pdf'
            node.params.fileDataUrl = event.target?.result as string
            state.forceUpdate()
          }
        })
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
