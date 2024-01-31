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
import Scope from '@/scope'

const Root = defineComponent({
  components: {
    Scope
  },
  props: {
    initialTemplate: {
      type: String,
      required: true
    }
  },

  setup(props, { emit }) {
    const current = ref<DefineComponent>(null)

    const changeRoot = (template: string) => {
      current.value = markRaw(
        defineComponent({
          components: {
            Scope
          },
          template: `<Scope v-slot:default="{$plaid, vars}">${template}</Scope>`
        })
      )
    }
    const t = props.initialTemplate

    onMounted(() => {
      changeRoot(props.initialTemplate)

      window.onpopstate = (evt: any) => {
        if (evt && evt.state != null) {
          // $plaid().onpopstate(evt)
        }
      }
    })
    provide('changeRoot', changeRoot)

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

export function createWebApp(template: string): App<Element> {
  const app = createApp(Root, { initialTemplate: template })
  return app
}
