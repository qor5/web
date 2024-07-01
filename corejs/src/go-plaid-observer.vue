<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { watch, inject } from 'vue'

const props = defineProps({
  notificationName: {
    type: String,
    required: true
  },
  handler: {
    type: Function,
    required: true
  }
})

const vars = inject<{ __notification?: { id: string; name: string; payload: any } }>('vars')
watch(
  () => vars?.__notification,
  (notifi) => {
    if (!notifi) {
      return
    }

    if (notifi?.name !== props.notificationName) {
      return
    }

    let payload
    try {
      payload = typeof notifi.payload === 'string' ? JSON.parse(notifi.payload) : notifi.payload
    } catch (e) {
      payload = notifi.payload
    }

    try {
      props.handler({ notificationName: props.notificationName, payload })
    } catch (error) {
      console.error('Error executing observer script:', error)
    }
  }
)
</script>
