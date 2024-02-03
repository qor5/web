import { defineComponent, ref, onMounted, onUpdated, onBeforeUnmount, shallowRef } from 'vue'
import type { DefineComponent } from 'vue'
import { componentByTemplate } from '@/utils'
import type { EventResponse } from '@/types'

declare var window: any
window.__goplaid = {}
window.__goplaid.portals = {}

export const GoPlaidPortal = defineComponent({
  inject: ['vars'],
  name: 'GoPlaidPortal',
  props: {
    loader: Object,
    portalForm: Object,
    visible: Boolean,
    afterLoaded: Function,
    portalName: String,
    autoReloadInterval: [String, Number]
  },
  template: `
			<div class="go-plaid-portal" v-if="visible">
        <component :is="current" v-if="current">
          <slot :plaidForm="plaidForm"></slot>
        </component>
			</div>
		`,

  setup(props, { slots }) {
    const current = shallowRef<DefineComponent | null>(null)
    const autoReloadIntervalID = ref<number>(0)

    // other reactive properties and methods
    const reload = () => {
      // const rootChangeCurrent = (this.$root as any).changeCurrent;
      // const core = new Core(form, rootChangeCurrent, this.changeCurrent);

      if (slots.default) {
        current.value = componentByTemplate(
          '<slot :plaidForm="plaidForm"></slot>',
          props.portalForm
        )
        return
      }

      const ef = props.loader
      if (!ef) {
        return
      }
      const self = this
      ef.vars((this as any).vars)
        .go()
        .then((r: EventResponse) => {
          current.value = componentByTemplate(r.body, props.portalForm)
        })
    }

    const updatePortalTemplate = (template: string) => {
      current.value = componentByTemplate(template, props.portalForm)
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
      plaidForm: props.portalForm
    }
  }
})
