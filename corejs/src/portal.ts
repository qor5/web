import {
  defineComponent,
  ref,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  shallowRef,
  inject
} from 'vue'
import type { DefineComponent } from 'vue'
import { componentByTemplate } from '@/utils'
import type { EventResponse } from '@/types'

declare var window: any
window.__goplaid = {}
window.__goplaid.portals = {}

export const GoPlaidPortal = defineComponent({
  name: 'GoPlaidPortal',
  props: {
    loader: Object,
    locals: Object,
    form: Object,
    visible: Boolean,
    afterLoaded: Function,
    portalName: String,
    autoReloadInterval: [String, Number]
  },
  template: `
    <div class="go-plaid-portal" v-if="visible">
      <component :is="current" v-if="current">
        <slot :form="form" :locals="locals"></slot>
      </component>
    </div>`,

  setup(props, { slots }) {
    const current = shallowRef<DefineComponent | null>(null)
    const autoReloadIntervalID = ref<number>(0)

    const updatePortalTemplate = (template: string) => {
      current.value = componentByTemplate(template, props.form, props.locals)
    }

    // other reactive properties and methods
    const reload = () => {
      if (slots.default) {
        current.value = componentByTemplate(
          '<slot :form="form" :locals="locals"></slot>',
          props.locals
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
          updatePortalTemplate(r.body)
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

    return {
      current,
      vars: inject('vars'),
      form: props.form
    }
  }
})
