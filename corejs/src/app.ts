import {
  type App,
  type DefineComponent,
  createApp,
  ref,
  defineComponent,
  onMounted,
  provide,
  markRaw,
  inject,
  getCurrentInstance
} from 'vue'
import { Builder, plaid } from '@/builder'

const Root = defineComponent({
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props, { emit }) {
    const current = ref<DefineComponent>(null)
    const instance = getCurrentInstance()
    const vars = ref({ a: 1 })
    const $plaid = (): Builder => {
      return plaid().vueContext(instance).vars(vars)
    }

    const changeRoot = (template: string) => {
      current.value = markRaw(
        defineComponent({
          setup() {
            // const $plaid = inject<() => Builder>("$plaid")
            //   console.log("inside changeRoot setup")
            return {
              $plaid
            }
          },
          template
        })
      )
    }
    const t = props.initialTemplate

    onMounted(() => {
      changeRoot(props.initialTemplate)

      window.onpopstate = (evt: any) => {
        if (evt && evt.state != null) {
          $plaid().onpopstate(evt)
        }
      }
    })
    provide('changeRoot', changeRoot)
    provide('vars', vars)
    provide('$plaid', $plaid)

    return {
      current,
      $plaid
    }
  },
  template: `
      <div id="app" v-cloak>
        <component :is="current"></component>
      </div>
    `
})

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  return app
}
