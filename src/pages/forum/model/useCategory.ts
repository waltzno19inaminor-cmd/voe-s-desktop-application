import { ref, computed } from 'vue'

export const collapsed = ref({
  project: false,
  theory: false,
  practice: false,
})

export function toggle(key: string) {
  collapsed.value[key as keyof typeof collapsed.value] = !collapsed.value[key as keyof typeof collapsed.value]
}

export const definedCategory = computed(() => (category: string)  =>
 {
    if(category === 'project') return {title: 
      'Project: Key to the Market', 
      description: 'A collective attempt to identify durable principles of successful trading across markets, timeframes and regimes.',
      idea: `This section is not about signals or predictions.
                    Each thread contributes either a theoretical assumption
                    or a practical test.
                    Over time, contradictions are resolved or exposed.`}
 })