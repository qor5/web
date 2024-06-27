<script setup lang="ts">
import { onMounted, watch, inject } from 'vue'

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

onMounted(() => {
  watch(
    () => vars?.__notification,
    (newNotification) => {
      if (!newNotification) {
        return
      }

      if (newNotification?.name !== props.notificationName) {
        return
      }

      let payload
      try {
        payload =
          typeof newNotification.payload === 'string'
            ? JSON.parse(newNotification.payload)
            : newNotification.payload
      } catch (e) {
        payload = newNotification.payload
      }

      try {
        props.handler({ notificationName: props.notificationName, payload })
      } catch (error) {
        console.error('Error executing observer script:', error)
      }
    }
  )
})
</script>

<template>
  <slot></slot>
</template>
