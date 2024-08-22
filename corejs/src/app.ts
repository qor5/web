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
import GoPlaidListener from '@/go-plaid-listener.vue'
import ParentSizeObserver from '@/parent-size-observer.vue'
import { componentByTemplate } from '@/utils'
import { Builder, plaid } from '@/builder'
import { keepScroll } from '@/keepScroll'
import { assignOnMounted } from '@/assign'
import { initFetchInterceptor } from './fetchInterceptor'
import {
  runOnCreated,
  runBeforeMount,
  runOnMounted,
  runBeforeUpdate,
  runOnUpdated,
  runBeforeUnmount,
  runOnUnmounted
} from '@/lifecycle'
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
      __emitter: new TinyEmitter()
    })
    const _plaid = (): Builder => {
      return plaid().updateRootTemplate(updateRootTemplate).vars(vars)
    }
    provide('plaid', _plaid)
    provide('vars', vars)
    const isFetching = ref(false)
    const isReloadingPage = ref(true)
    provide('isFetching', isFetching)
    provide('isReloadingPage', isReloadingPage)

    initFetchInterceptor({
      onRequest(id, resource, config) {
        // console.log('onReq', id, resource, config)
        if (typeof resource === 'string' && ['__execute_event__=__reload__'].includes(resource)) {
          isReloadingPage.value = true
        }
      },

      onResponse(id, response, resource, config) {
        // console.log('onRes', id, response, r esource, config)
        if (typeof resource === 'string' && ['__execute_event__=__reload__'].includes(resource)) {
          isReloadingPage.value = false
        }
      }
    })

    onMounted(() => {
      updateRootTemplate(props.initialTemplate)
      isReloadingPage.value = false
      window.addEventListener('fetchStart', () => {
        isFetching.value = true
      })
      window.addEventListener('fetchEnd', () => {
        isFetching.value = false
      })
      window.addEventListener('popstate', (evt) => {
        _plaid().onpopstate(evt)
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
    app.component('GoPlaidListener', GoPlaidListener)
    app.component('ParentSizeObserver', ParentSizeObserver)
    app.directive('keep-scroll', keepScroll)
    app.directive('assign', assignOnMounted)
    app.directive('on-created', runOnCreated)
    app.directive('before-mount', runBeforeMount)
    app.directive('on-mounted', runOnMounted)
    app.directive('before-update', runBeforeUpdate)
    app.directive('on-updated', runOnUpdated)
    app.directive('before-unmount', runBeforeUnmount)
    app.directive('on-unmounted', runOnUnmounted)
    app.component('GlobalEvents', GlobalEvents)
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
