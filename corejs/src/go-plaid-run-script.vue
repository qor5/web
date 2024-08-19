<script setup lang="ts">
import { onMounted as vueOnMounted, watch, watchEffect } from 'vue'

const props = defineProps({
  onMounted: {
    type: Function,
    required: true
  }
})

vueOnMounted(() => {
  props.onMounted({ window, watch, watchEffect })
})
</script>

<template>
  <div v-if="false">
    <!-- This won't render anything and no warning -->
  </div>
</template>
