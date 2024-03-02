import { defineComponent, inject, reactive } from 'vue'

export default defineComponent({
  template: `<slot :locals="locals" :form="form" :plaid="plaid" :vars="vars"></slot>`,
  props: {
    init: [Object, Array],
    formInit: [Object, Array]
  },
  setup(props) {
    let initObj = props.init
    if (Array.isArray(initObj)) {
      initObj = Object.assign({}, ...initObj)
    }
    const locals = reactive({ ...initObj })

    let initForm = props.formInit
    if (Array.isArray(initForm)) {
      initForm = Object.assign({}, ...initForm)
    }
    const form = reactive({ ...initForm })

    const vars = inject('vars')
    const plaid = inject('plaid')
    return { plaid, vars, locals, form }
  }
})
