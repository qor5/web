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
import Scope from '@/scope'
import { GoPlaidPortal } from '@/portal'
import { initContext } from '@/initContext'
import { componentByTemplate } from '@/utils'
import { Builder, plaid } from '@/builder'
import { fieldNameDirective } from '@/fieldname'
import { debounceDirective } from '@/debounce'
import { keepScroll } from '@/keepScroll'

export const Root = defineComponent({
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props, { emit }) {
    const current = shallowRef<DefineComponent | null>(null)
    const updateRootTemplate = (template: string) => {
      current.value = componentByTemplate(template, plaidForm)
    }

    provide('updateRootTemplate', updateRootTemplate)
    const plaidForm = new FormData()
    const vars = reactive({})
    const _plaid = (): Builder => {
      return plaid().updateRootTemplate(updateRootTemplate).vars(vars).form(plaidForm)
    }
    provide('plaid', _plaid)
    provide('plaidForm', plaidForm)
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

      window.onpopstate = (evt: any) => {
        if (evt && evt.state != null) {
          _plaid().onpopstate(evt)
        }
      }
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
    app.component('GoPlaidScope', Scope)
    app.component('GoPlaidPortal', GoPlaidPortal)
    app.directive('init-context', initContext())
    app.directive('field-name', fieldNameDirective())
    app.directive('field-name', fieldNameDirective())
    app.directive('debounce', debounceDirective)
    app.directive('keep-scroll', keepScroll)
    // app.component('GlobalEvents', GlobalEvents);
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
