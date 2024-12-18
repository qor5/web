<template>
  <slot :locals="locals" :form="form" :plaid="plaid" :vars="vars" :dash="dash"></slot>
</template>

<script setup lang="ts">
import { inject, onMounted, reactive, toRaw, watch } from 'vue'
import debounce from 'lodash/debounce'

const props = defineProps<{
  init?: object | any[]
  formInit?: object | any[]
  dashInit?: object | any[]
  useDebounce?: number
}>()

const emit = defineEmits<{
  (e: 'change-debounced', obj: object): void
}>()

let initObj = props.init
if (Array.isArray(initObj)) {
  initObj = Object.assign({}, ...initObj)
}
const locals = reactive({ ...initObj })

let dashInitObj = props.dashInit
if (Array.isArray(dashInitObj)) {
  dashInitObj = Object.assign({}, ...dashInitObj)
}
const dash = reactive({ ...dashInitObj })

let initForm = props.formInit
if (Array.isArray(initForm)) {
  initForm = Object.assign({}, ...initForm)
}
const form = reactive({ ...initForm })

const vars = inject('vars')
const plaid = inject('plaid')

onMounted(() => {
  setTimeout(() => {
    if (props.useDebounce) {
      const debounceWait = props.useDebounce
      let oldForm = {}
      let oldLocals = {}
      const setOldReactive = () => {
        oldForm = JSON.parse(JSON.stringify(toRaw(form)))
        oldLocals = JSON.parse(JSON.stringify(toRaw(locals)))
      }
      const _watch = debounce(() => {
        emit('change-debounced', {
          locals: locals,
          form: form,
          oldLocals: oldLocals,
          oldForm: oldForm
        })
        setOldReactive()
      }, debounceWait)
      setOldReactive()
      watch(locals, () => {
        _watch()
      })
      watch(form, () => {
        _watch()
      })
    }
  }, 0)
})
</script>
