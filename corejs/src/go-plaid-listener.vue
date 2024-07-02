<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { inject, useAttrs, onMounted, onUnmounted } from 'vue'
defineOptions({
  inheritAttrs: false
})
const vars: any = inject('vars')
const emitter = vars.__emitter
const attrs = useAttrs()

const handlers: Record<string, Function> = {}

onMounted(() => {
  Object.keys(attrs).forEach((key) => {
    if (key.startsWith('on')) {
      const eventName = key.slice(2)
      const handler = attrs[key] as Function
      handlers[eventName] = handler
      emitter.on(eventName, handler)
    }
  })
})

onUnmounted(() => {
  Object.keys(handlers).forEach((eventName) => {
    emitter.off(eventName, handlers[eventName])
  })
})
</script>
