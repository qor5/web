import { defineComponent, inject, reactive } from 'vue'
import { plaid } from '@/builder'

export default defineComponent({
  template: `<slot :locals="locals" :plaidForm="plaidForm" :plaid="plaid" :vars="vars"></slot>`,
  props: {
    init: Object
  },
  setup(props) {
    const locals = reactive({ ...props.init })
    const vars = inject('vars')
    const plaid = inject('plaid')
    const plaidForm = new FormData()
    return { plaid, plaidForm, locals, vars }
  }
})
