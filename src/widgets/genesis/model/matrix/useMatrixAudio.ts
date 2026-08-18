import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { useMatrixState } from './useMatrixState'

type LegacyNavigatorWithMedia = Navigator & {
  getUserMedia?: (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, error: (error: Error) => void) => void
  webkitGetUserMedia?: (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, error: (error: Error) => void) => void
  mozGetUserMedia?: (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, error: (error: Error) => void) => void
}

export function useMatrixAudio(state: ReturnType<typeof useMatrixState>) {
  const matrixAudioRecordingState = ref<'idle' | 'recording' | 'paused'>('idle')
  const matrixAudioError = ref('')
  const matrixAudioRecorder = ref<MediaRecorder | null>(null)
  const matrixAudioStream = ref<MediaStream | null>(null)
  const isMatrixNativeAudioSession = ref(false)
  let matrixAudioChunks: BlobPart[] = []

  const matrixAudioErrorLabel = computed(() => {
    if (matrixAudioError.value === 'Secure_Context_Required') return 'Open_Through_Localhost_Or_HTTPS'
    if (matrixAudioError.value === 'Recorder_Not_Available') return 'Audio_Recorder_Not_Available'
    if (matrixAudioError.value === 'Microphone_Not_Available') return 'MacOS_Microphone_Permission_Required'
    return matrixAudioError.value
  })

  function canRequestMatrixMicrophone() {
    if (typeof navigator === 'undefined') return false
    const legacyNavigator = navigator as LegacyNavigatorWithMedia
    return !!navigator.mediaDevices?.getUserMedia ||
      !!legacyNavigator.getUserMedia ||
      !!legacyNavigator.webkitGetUserMedia ||
      !!legacyNavigator.mozGetUserMedia
  }

  function isTauriRuntime() {
    return typeof window !== 'undefined' && (
      '__TAURI__' in (window as any) ||
      '__TAURI_INTERNALS__' in (window as any) ||
      navigator.userAgent.includes('Tauri')
    )
  }

  function shouldUseNativeMatrixAudioRecorder() {
    return isTauriRuntime() && !canRequestMatrixMicrophone()
  }

  function requestMatrixAudioStream() {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    const legacyNavigator = navigator as LegacyNavigatorWithMedia
    const legacyGetUserMedia = legacyNavigator.getUserMedia ||
      legacyNavigator.webkitGetUserMedia ||
      legacyNavigator.mozGetUserMedia

    if (!legacyGetUserMedia) {
      return Promise.reject(new Error('MICROPHONE_API_UNAVAILABLE'))
    }

    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject)
    })
  }

  function getMatrixMicrophoneUnavailableReason() {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return 'Secure_Context_Required'
    }
    if (typeof MediaRecorder === 'undefined') {
      return 'Recorder_Not_Available'
    }
    return 'Microphone_Not_Available'
  }

  function getSupportedMatrixAudioMimeType() {
    const options = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4'
    ]
    return options.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || ''
  }

  function createAudioNodeFromRecording(params: { audioName: string; audioType: string; audioDataUrl: string }) {
    const nodeConfig = {
      label: 'AUDIO_NOTE',
      type: 'audio-note',
      color: 'currentColor',
      description: 'Recorded audio note for scenario archive.',
      params: {
        shortCode: 'AUD',
        menuLabel: 'AUDIO',
        protocol: 'AUDIO_NOTE',
        description: 'Recorded audio note for scenario archive.',
        ...params
      }
    }
    const selectedNode = state.lastSelectedId.value
      ? state.getNode(state.lastSelectedId.value)
      : null

    if (selectedNode?.type === 'placeholder') {
      state.setPendingNode(nodeConfig)
    } else {
      state.addNode(nodeConfig)
    }
  }

  async function startMatrixAudioRecording() {
    matrixAudioError.value = ''
    if (shouldUseNativeMatrixAudioRecorder()) {
      await startNativeMatrixAudioRecording()
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      matrixAudioError.value = 'Recorder_Not_Available'
      return
    }
    if (!canRequestMatrixMicrophone()) {
      matrixAudioError.value = getMatrixMicrophoneUnavailableReason()
      return
    }

    try {
      cleanupMatrixAudioRecording()
      matrixAudioChunks = []
      const stream = await requestMatrixAudioStream()
      const mimeType = getSupportedMatrixAudioMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      matrixAudioStream.value = stream
      matrixAudioRecorder.value = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) matrixAudioChunks.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(matrixAudioChunks, { type })
        const extension = type.includes('mp4') ? 'mp4' : 'webm'
        const reader = new FileReader()
        reader.onload = (event) => {
          createAudioNodeFromRecording({
            audioName: `audio-note-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
            audioType: type,
            audioDataUrl: event.target?.result as string
          })
          cleanupMatrixAudioRecording()
        }
        reader.readAsDataURL(blob)
      }

      recorder.start()
      matrixAudioRecordingState.value = 'recording'
    } catch {
      matrixAudioError.value = 'Microphone_Access_Denied'
      cleanupMatrixAudioRecording()
    }
  }

  function pauseMatrixAudioRecording() {
    if (isMatrixNativeAudioSession.value) {
      pauseNativeMatrixAudioRecording()
      return
    }
    if (matrixAudioRecorder.value?.state !== 'recording') return
    matrixAudioRecorder.value.pause()
    matrixAudioRecordingState.value = 'paused'
  }

  function resumeMatrixAudioRecording() {
    if (isMatrixNativeAudioSession.value) {
      resumeNativeMatrixAudioRecording()
      return
    }
    if (matrixAudioRecorder.value?.state !== 'paused') return
    matrixAudioRecorder.value.resume()
    matrixAudioRecordingState.value = 'recording'
  }

  function finishMatrixAudioRecording() {
    if (isMatrixNativeAudioSession.value) {
      stopNativeMatrixAudioRecording()
      return
    }
    if (!matrixAudioRecorder.value || matrixAudioRecorder.value.state === 'inactive') return
    matrixAudioRecorder.value.stop()
    matrixAudioRecordingState.value = 'idle'
  }

  function cleanupMatrixAudioRecording() {
    if (isMatrixNativeAudioSession.value) {
      invoke('native_audio_stop').catch(() => {})
      isMatrixNativeAudioSession.value = false
    }
    if (matrixAudioRecorder.value && matrixAudioRecorder.value.state !== 'inactive') {
      matrixAudioRecorder.value.onstop = null
      try {
        matrixAudioRecorder.value.stop()
      } catch {
        // Already closing
      }
    }
    matrixAudioStream.value?.getTracks().forEach(track => track.stop())
    matrixAudioStream.value = null
    matrixAudioRecorder.value = null
    matrixAudioRecordingState.value = 'idle'
  }

  async function startNativeMatrixAudioRecording() {
    try {
      await invoke('native_audio_start')
      isMatrixNativeAudioSession.value = true
      matrixAudioRecordingState.value = 'recording'
      matrixAudioError.value = ''
    } catch (error) {
      matrixAudioError.value = String(error || 'Native_Audio_Start_Failed')
      isMatrixNativeAudioSession.value = false
      matrixAudioRecordingState.value = 'idle'
    }
  }

  async function pauseNativeMatrixAudioRecording() {
    try {
      await invoke('native_audio_pause')
      matrixAudioRecordingState.value = 'paused'
    } catch (error) {
      matrixAudioError.value = String(error || 'Native_Audio_Pause_Failed')
    }
  }

  async function resumeNativeMatrixAudioRecording() {
    try {
      await invoke('native_audio_resume')
      matrixAudioRecordingState.value = 'recording'
    } catch (error) {
      matrixAudioError.value = String(error || 'Native_Audio_Resume_Failed')
    }
  }

  async function stopNativeMatrixAudioRecording() {
    try {
      const result = await invoke<{
        data_url: string
        mime_type: string
        file_name: string
      }>('native_audio_stop')
      createAudioNodeFromRecording({
        audioName: result.file_name,
        audioType: result.mime_type,
        audioDataUrl: result.data_url
      })
    } catch (error) {
      matrixAudioError.value = String(error || 'Native_Audio_Stop_Failed')
    } finally {
      isMatrixNativeAudioSession.value = false
      matrixAudioRecordingState.value = 'idle'
    }
  }

  return {
    matrixAudioRecordingState,
    matrixAudioError,
    matrixAudioErrorLabel,
    startMatrixAudioRecording,
    pauseMatrixAudioRecording,
    resumeMatrixAudioRecording,
    finishMatrixAudioRecording,
    cleanupMatrixAudioRecording
  }
}
