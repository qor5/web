<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { inject } from 'vue'

const props = defineProps({
  event: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: false
  }
})

const emit = defineEmits<{
  (e: 'on', payload: any): void
}>()

const vars: any = inject('vars')
vars.__emitter.on(props.event, function (payload: any) {
  try {
    emit('on', { event: props.event, payload })
  } catch (error) {
    console.error('Error executing on script:', error)
  }
})
</script>
