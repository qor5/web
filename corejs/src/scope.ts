import { defineComponent, inject, reactive } from 'vue'

export default defineComponent({
  template: `<slot :locals="locals" :plaidForm="plaidForm" :plaid="plaid" :vars="vars"></slot>`,
  props: {
    init: [Object, Array],
    initString: String
  },
  setup(props) {
    const inits = props.initString ? JSON.parse(props.initString) : {}
    let initObj = props.init
    if (Array.isArray(initObj)) {
      initObj = Object.assign({}, ...initObj)
    }
    const locals = reactive({ ...initObj, ...inits })
    const vars = inject('vars')
    const plaid = inject('plaid')
    const plaidForm = new FormData()
    return { plaid, plaidForm, locals, vars }
  }
})
