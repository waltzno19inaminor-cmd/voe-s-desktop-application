import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useForumRoute() {
  const route = useRoute()

  const category = computed(() => {
    const c = route.query.search
    return Array.isArray(c) ? c[0] : c
  })

  return {
    category
  }
}
