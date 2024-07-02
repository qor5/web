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
import GoPlaidListener from '@/go-plaid-listener.vue'
import GoPlaidSyncer from '@/go-plaid-syncer.vue'
import { componentByTemplate, encodeObjectToQuery } from '@/utils'
import { Builder, plaid } from '@/builder'
import { keepScroll } from '@/keepScroll'
import { assignOnMounted, runOnMounted } from '@/assign'
import jsonpatch from 'fast-json-patch'
import { TinyEmitter } from 'tiny-emitter'

export const Root = defineComponent({
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props) {
    const current = shallowRef<DefineComponent | null>(null)
    const form = reactive({})
    provide('form', form)
    const updateRootTemplate = (template: string) => {
      current.value = componentByTemplate(template, form)
    }

    provide('updateRootTemplate', updateRootTemplate)

    const vars = reactive({
      __emitter: new TinyEmitter(),
      __applyJsonPatch: jsonpatch.applyPatch,
      __encodeObjectToQuery: encodeObjectToQuery
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

      window.addEventListener('fetchStart', () => {
        isFetching.value = true
      })
      window.addEventListener('fetchEnd', () => {
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
    app.component('GoPlaidListener', GoPlaidListener)
    app.component('GoPlaidSyncer', GoPlaidSyncer)
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
