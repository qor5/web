import {
  type App,
  type DefineComponent,
  createApp,
  defineComponent,
  onMounted,
  shallowRef,
  provide,
  reactive
} from 'vue'
import Scope from '@/scope'
import { GoPlaidPortal } from '@/portal'
import { initContext } from '@/initContext'
import { componentByTemplate } from '@/utils'
import { Builder, plaid } from '@/builder'
import { fieldNameDirective } from '@/fieldname'

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
    provide('plaid', (): Builder => {
      return plaid().updateRootTemplate(updateRootTemplate).vars(vars).form(plaidForm)
    })
    provide('plaidForm', plaidForm)
    provide('vars', vars)

    onMounted(() => {
      updateRootTemplate(props.initialTemplate)

      window.onpopstate = (evt: any) => {
        if (evt && evt.state != null) {
          // $plaid().onpopstate(evt)
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
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
