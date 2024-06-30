<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { watch, inject } from 'vue'
import { isEqual } from 'lodash'

const props = defineProps({
  uniqueId: {
    type: String,
    required: true
  },
  model: {
    type: Object,
    required: true
  }
})

const vars = inject<{
  __sendNotification: Function
  __notification?: { id: string; name: string; payload: any }
}>('vars')

const notifName = '__go-plaid-syncer-' + props.uniqueId + '__'

let ignoreOnce = false
watch(
  () => vars?.__notification,
  (notif) => {
    if (!notif || notif?.name !== notifName) {
      return
    }
    if (isEqual(props.model, notif.payload)) {
      return
    }
    ignoreOnce = true
    Object.assign(props.model, notif.payload)
  }
)

watch(
  () => props.model,
  (newVal) => {
    if (ignoreOnce) {
      ignoreOnce = false
      return
    }
    vars?.__sendNotification(notifName, newVal)
  },
  { deep: true, immediate: true }
)
</script>
