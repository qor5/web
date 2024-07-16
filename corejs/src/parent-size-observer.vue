<template>
  <slot :width="rect.width" :height="rect.height"></slot>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

const rect = ref({
  width: 0,
  height: 0
})

function updateRect(parentElement: HTMLElement) {
  const bounding = parentElement.getBoundingClientRect()
  rect.value.width = bounding.width
  rect.value.height = bounding.height
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const instance = getCurrentInstance()
  const parentElement = instance?.proxy?.$el.parentElement as HTMLElement
  if (parentElement) {
    updateRect(parentElement)
    resizeObserver = new ResizeObserver(() => {
      updateRect(parentElement)
    })
    resizeObserver.observe(parentElement)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>
