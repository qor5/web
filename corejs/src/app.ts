import {
  type App,
  type DefineComponent,
  createApp,
  defineComponent,
  onMounted,
  shallowRef,
  provide,
  reactive,
  ref
} from 'vue'
import { GlobalEvents } from 'vue-global-events'
import GoPlaidScope from '@/go-plaid-scope.vue'
import GoPlaidPortal from '@/go-plaid-portal.vue'
import { componentByTemplate } from '@/utils'
import { Builder, plaid } from '@/builder'
import { keepScroll } from '@/keepScroll'
import { assignOnMounted } from '@/assign'

export const Root = defineComponent({
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props, { emit }) {
    const current = shallowRef<DefineComponent | null>(null)
    const form = reactive({})
    provide('form', form)
    const updateRootTemplate = (template: string) => {
      current.value = componentByTemplate(template, form)
    }

    provide('updateRootTemplate', updateRootTemplate)
    const vars = reactive({})
    const _plaid = (): Builder => {
      return plaid().updateRootTemplate(updateRootTemplate).vars(vars)
    }
    provide('plaid', _plaid)
    provide('vars', vars)
    const isFetching = ref(false)
    provide('isFetching', isFetching)

    onMounted(() => {
      updateRootTemplate(props.initialTemplate)

      window.addEventListener('fetchStart', (e: Event) => {
        isFetching.value = true
      })
      window.addEventListener('fetchEnd', (e: Event) => {
        isFetching.value = false
      })
      window.addEventListener('popstate', (evt) => {
        if (evt && evt.state != null) {
          _plaid().onpopstate(evt)
        }
      })
    })

    return {
      current
    }
  },
  template: `
      <div id="app" v-cloak>
        <component :is="current"></component>
      </div>
    `
})

export const plaidPlugin = {
  install(app: App) {
    app.component('GoPlaidScope', GoPlaidScope)
    app.component('GoPlaidPortal', GoPlaidPortal)
    app.directive('keep-scroll', keepScroll)
    app.directive('assign', assignOnMounted)
    app.component('GlobalEvents', GlobalEvents)
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
