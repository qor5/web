import {
  type App,
  type DefineComponent,
  createApp,
  defineComponent,
  onMounted,
  inject,
  shallowRef
} from 'vue'
import Scope, { createGlobals } from '@/scope'
import { GoPlaidPortal } from '@/portal'
import { initContext } from '@/initContext'
import { componentByTemplate } from '@/utils'
import { plaid } from '@/builder'
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
    const plaidForm = inject('plaidForm')

    const changeTemplate = (template: string) => {
      current.value = componentByTemplate(template, plaidForm)
    }

    onMounted(() => {
      changeTemplate(props.initialTemplate)

      window.onpopstate = (evt: any) => {
        if (evt && evt.state != null) {
          // $plaid().onpopstate(evt)
        }
      }
    })

    return {
      current,
      changeTemplate
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
    const { plaidForm, plaid, vars } = createGlobals()
    app.provide('plaid', plaid)
    app.provide('plaidForm', plaidForm)
    app.provide('vars', vars)
    app.directive('field-name', fieldNameDirective(plaidForm))
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(plaidPlugin)
  return app
}
