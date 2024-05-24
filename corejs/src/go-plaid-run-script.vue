<script setup lang="ts">
import { onMounted } from 'vue'

const props = defineProps({
  script: {
    type: Function,
    required: true
  }
})

onMounted(() => {
  props.script()
})
</script>

<template></template>
