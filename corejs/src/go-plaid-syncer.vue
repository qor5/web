<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { watch, inject } from 'vue'
import { isEqual } from 'lodash'

const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  uniqueId: {
    type: String,
    required: true
  }
})

const event = '__go-plaid-syncer-' + props.uniqueId + '__'

const vars: any = inject('vars')

let ignoreOnce = false
vars.__emitter.on(event, function (payload: any) {
  if (isEqual(props.model, payload)) {
    return
  }
  ignoreOnce = true
  Object.assign(props.model, payload)
})

watch(
  () => props.model,
  (newVal) => {
    if (ignoreOnce) {
      ignoreOnce = false
      return
    }
    vars.__emitter.emit(event, newVal)
  },
  { deep: true }
)
</script>
