import { defineComponent, getCurrentInstance, reactive } from 'vue'
import { Builder, plaid } from '@/builder'

export default defineComponent({
  template: `<slot :locals="locals" :plaidForm="plaidForm" :$plaid="plaid"></slot>`,
  props: {
    init: Object
  },
  setup(props) {
    const vars = reactive({})
    const locals = reactive<Record<string, any>>({})
    const plaidForm = new FormData()
    const $plaid = (): Builder => {
      const instance = getCurrentInstance()
      return plaid().vueContext(instance).vars(vars)
    }
    var i = props.init ?? {}
    Object.keys(i).forEach((k) => {
      locals[k] = i[k]
    })

    return { locals, plaidForm, plaid: $plaid }
  }
})
