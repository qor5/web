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
import GoPlaidRunScript from '@/go-plaid-run-script.vue'
import GoPlaidObserver from '@/go-plaid-observer.vue'
import { componentByTemplate } from '@/utils'
import { Builder, plaid } from '@/builder'
import { keepScroll } from '@/keepScroll'
import { assignOnMounted, runOnMounted } from '@/assign'
import clonedeep from 'lodash/clonedeep'
import jsonpatch from 'fast-json-patch'
import * as qs from 'qs'

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

    const vars = reactive({
      __notification: {},
      __sendNotification: function (name: string, payload: any) {
        vars.__notification = {
          id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: name,
          payload: payload
        }
      },
      __clonedeep: clonedeep,
      __applyJsonPatch: jsonpatch.applyPatch,
      __qsStringify: qs.stringify,
      __qsParse: qs.parse,
    })
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
    app.component('GoPlaidRunScript', GoPlaidRunScript)
    app.component('GoPlaidObserver', GoPlaidObserver)
    app.directive('keep-scroll', keepScroll)
    app.directive('assign', assignOnMounted)
    app.directive('run', runOnMounted)
    app.component('GlobalEvents', GlobalEvents)
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
