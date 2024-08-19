<template>
  <div v-if="false">
    <!-- This won't render anything and no warning -->
  </div>
</template>

<script setup lang="ts">
import { inject, useAttrs, onMounted, onUnmounted } from 'vue'
defineOptions({
  inheritAttrs: false
})
const vars: any = inject('vars')
const emitter = vars.__emitter
const attrs = useAttrs()

const callbacks: Record<string, Function> = {}

onMounted(() => {
  Object.keys(attrs).forEach((key) => {
    if (key.startsWith('on')) {
      const callback = attrs[key] as Function
      const name = key.slice(2)
      callbacks[name] = callback
      emitter.on(name, callback)
    }
  })
})

onUnmounted(() => {
  Object.keys(callbacks).forEach((name) => {
    emitter.off(name, callbacks[name])
  })
})
</script>
