import { defineComponent, getCurrentInstance, inject, reactive } from 'vue'
import { Builder, plaid } from '@/builder'

export default defineComponent({
  template: `<slot :locals="locals" :plaidForm="plaidForm" :$plaid="plaid"></slot>`,
  props: {
    init: Object,
    plaidForm: FormData
  },
  setup(props) {
    const locals = reactive<Record<string, any>>({})
    var i = props.init ?? {}
    Object.keys(i).forEach((k) => {
      locals[k] = i[k]
    })
    const vars = inject('vars')
    return { ...createGlobals(), locals }
  }
})

export function createGlobals() {
  const vars = reactive({})
  const plaidForm = new FormData()
  plaidForm.append('a', '1123123')
  return {
    vars,
    plaidForm,
    plaid: (): Builder => {
      return plaid().vueContext(this).vars(vars).form(plaidForm)
    }
  }
}
