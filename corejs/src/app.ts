import {
  type App,
  type DefineComponent,
  createApp,
  ref,
  defineComponent,
  onMounted,
  provide,
  markRaw
} from 'vue'
import Scope from '@/scope'
import { GoPlaidPortal } from '@/portal'
import { initContext } from '@/initContext'

export const Root = defineComponent({
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props, { emit }) {
    const current = ref<DefineComponent>(null)

    const changeTemplate = (template: string) => {
      current.value = markRaw(
        defineComponent({
          template: `<go-plaid-scope v-slot:default="{$plaid, vars}">${template}</go-plaid-scope>`
        })
      )
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

export const goplaidPlugin = {
  install(app: App) {
    app.component('GoPlaidScope', Scope)
    app.component('GoPlaidPortal', GoPlaidPortal)
    app.directive('init-context', initContext)
  }
}

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  app.use(goplaidPlugin)
  return app
}
