<template>
  <slot :locals="locals" :form="form" :plaid="plaid" :vars="vars"></slot>
</template>

<script setup lang="ts">
import { inject, onMounted, reactive, watch } from 'vue'
import debounce from 'lodash/debounce'

const props = defineProps<{
  init?: object | any[]
  formInit?: object | any[]
  useDebounce?: number
  observers?: { name: string; script: string }[]
}>()

const emit = defineEmits<{
  (e: 'change-debounced', obj: object): void
}>()

let initObj = props.init
if (Array.isArray(initObj)) {
  initObj = Object.assign({}, ...initObj)
}
const locals = reactive({ ...initObj })

let initForm = props.formInit
if (Array.isArray(initForm)) {
  initForm = Object.assign({}, ...initForm)
}
const form = reactive({ ...initForm })

const vars = inject<{ __notification?: { id: string; name: string; payload: any } }>('vars')
const plaid = inject('plaid')

onMounted(() => {
  setTimeout(() => {
    if (props.useDebounce) {
      const debounceWait = props.useDebounce
      const _watch = debounce((obj: any) => {
        emit('change-debounced', obj)
      }, debounceWait)
      watch(locals, (value, oldValue) => {
        _watch({ locals: value, form: form, oldLocals: oldValue, oldForm: form })
      })
      watch(form, (value, oldValue) => {
        _watch({ locals: locals, form: value, oldLocals: locals, oldForm: oldValue })
      })
    }
  }, 0)
  if (props.observers && Array.isArray(props.observers)) {
    watch(
      () => vars?.__notification,
      (newNotification) => {
        if (!newNotification) {
          return
        }
        props.observers?.forEach((observer) => {
          if (newNotification?.name === observer.name) {
            let payload
            try {
              payload =
                typeof newNotification.payload === 'string'
                  ? JSON.parse(newNotification.payload)
                  : newNotification.payload
            } catch (e) {
              payload = newNotification.payload
            }
            try {
              const scriptFunc = new Function(
                'name',
                'payload',
                'vars',
                'locals',
                'form',
                'plaid',
                observer.script
              )
              scriptFunc(observer.name, payload, vars, locals, form, plaid)
            } catch (error) {
              console.error('Error executing observer script:', error)
            }
          }
        })
      }
    )
  }
})
</script>
