<template>
  <div
    v-if="visible && themeStore.settings.isImageBg && themeStore.settings.bgImage"
    class="theme-image-background pointer-events-none"
    :class="fixed ? 'fixed inset-0' : 'absolute inset-0'"
    :style="backgroundStyle"
    aria-hidden="true"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '~/features/store/useTheme'

const props = withDefaults(defineProps<{
  visible?: boolean
  fixed?: boolean
}>(), {
  visible: true,
  fixed: false
})

const themeStore = useThemeStore()

const backgroundStyle = computed(() => {
  const blur = Math.max(0, Number(themeStore.settings.bgImageBlur) || 0)
  const darkness = Math.min(90, Math.max(0, Number(themeStore.settings.bgImageDarkness) || 0))
  const zoom = Math.max(100, Number(themeStore.settings.bgImageZoom) || 100)
  return {
    backgroundImage: `linear-gradient(rgb(0 0 0 / ${darkness / 100}), rgb(0 0 0 / ${darkness / 100})), url("${themeStore.settings.bgImage}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed',
    filter: blur ? `blur(${blur}px)` : 'none',
    transform: `scale(${Math.max(zoom / 100, 1 + blur / 500)})`
  }
})
</script>

<style scoped>
.theme-image-background {
  z-index: 0;
  transition: filter 180ms ease, transform 180ms ease;
}
</style>
