<script setup lang="ts">
import {action, ActionBuilder} from "@/action";

const props = defineProps<{
  factory: (input: ActionBuilder) => void;
}>()

const a = action(props.factory)
</script>

<template>
  <slot :action="a" ></slot>
</template>

