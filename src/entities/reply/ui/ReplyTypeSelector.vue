<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
    <button
      v-for="type in types"
      :key="type.value"
      type="button"
      @click="emit('update:modelValue', type.value)"
      :class="[
        'group text-left px-4 py-3 border transition-all duration-200 rounded-sm',
        modelValue === type.value
          ? 'border-black/40 dark:border-white/40 bg-black/[0.03] dark:bg-white/[0.04]'
          : 'nier-border-primary hover:border-black/25 dark:hover:border-white/25'
      ]"
    >
      <span
        :class="[
          'block text-[10px] uppercase tracking-widest font-serif mb-1 transition-colors duration-200',
          modelValue === type.value
            ? 'text-[#050505] dark:text-white'
            : 'text-[#777] group-hover:text-[#444] dark:group-hover:text-[#bbb]'
        ]"
      >
        {{ type.label }}
      </span>
      <span class="block text-[11px] leading-snug text-[#999] dark:text-[#777]">
        {{ type.hint }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>()

const types = [
  {
    value: 'critique',
    label: 'Critique',
    hint: 'Challenge the reasoning or evidence'
  },
  {
    value: 'extension',
    label: 'Extension',
    hint: 'Build on or add to the idea'
  },
  {
    value: 'counterexample',
    label: 'Counter',
    hint: 'Present a conflicting case'
  },
  {
    value: 'question',
    label: 'Question',
    hint: 'Ask for clarification or deeper insight'
  }
]
</script>
