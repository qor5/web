<template>
  <div class="go-plaid-portal" v-if="visible" ref="portal">
    <component :is="current" v-if="current">
      <slot :form="form" :locals="locals" :dash="dash"></slot>
    </component>
  </div>
</template>

<script setup lang="ts">
import {
  type DefineComponent,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
  useSlots
} from 'vue'
import { componentByTemplate } from '@/utils'
import type { EventResponse } from '@/types'

declare let window: any
window.__goplaid = window.__goplaid ?? {}
window.__goplaid.portals = window.__goplaid.portals ?? {}

const portal = ref()

const props = defineProps({
  loader: Object,
  locals: Object,
  form: Object,
  dash: Object,
  visible: Boolean,
  afterLoaded: Function,
  portalName: String,
  autoReloadInterval: [String, Number]
})

const current = shallowRef<DefineComponent | null>(null)
const autoReloadIntervalID = ref<number>(0)

const updatePortalTemplate = (template: string) => {
  current.value = componentByTemplate(template, props.form, props.locals, props.dash, portal)
}
const slots = useSlots()

// other reactive properties and methods
const reload = () => {
  if (slots.default) {
    current.value = componentByTemplate(
      '<slot :form="form" :locals="locals" :dash="dash"></slot>',
      props.form,
      props.locals,
      props.dash,
      portal
    )
    return
  }
  const ef = props.loader
  if (!ef) {
    return
  }
  ef.loadPortalBody(true)
    .form(props.form)
    .go()
    .then((r: EventResponse) => {
      if (r) {
        updatePortalTemplate(r.body)
      }
    })
}

onMounted(() => {
  const pn = props.portalName
  if (pn) {
    window.__goplaid.portals[pn] = { updatePortalTemplate, reload }
  }
  reload()
})

onUpdated(() => {
  if (props.autoReloadInterval && autoReloadIntervalID.value == 0) {
    const interval = parseInt(props.autoReloadInterval + '')
    if (interval == 0) {
      return
    }

    autoReloadIntervalID.value = setInterval(() => {
      reload()
    }, interval) as unknown as number
  }

  if (
    autoReloadIntervalID.value &&
    autoReloadIntervalID.value > 0 &&
    props.autoReloadInterval == 0
  ) {
    clearInterval(autoReloadIntervalID.value)
    autoReloadIntervalID.value = 0
  }
})

onBeforeUnmount(() => {
  if (autoReloadIntervalID.value && autoReloadIntervalID.value > 0) {
    clearInterval(autoReloadIntervalID.value)
  }
})
</script>
