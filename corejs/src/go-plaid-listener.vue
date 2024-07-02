<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { inject, useAttrs } from 'vue'
defineOptions({
  inheritAttrs: false
})
const vars: any = inject('vars')
const emitter = vars.__emitter
const attrs = useAttrs()

Object.keys(attrs).forEach((key) => {
  if (key.startsWith('on')) {
    emitter.on(key.slice(2), attrs[key])
  }
})
</script>
