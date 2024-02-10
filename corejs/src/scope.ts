import { defineComponent, inject, reactive } from 'vue'
import { plaid } from '@/builder'

export default defineComponent({
  template: `<slot :locals="locals" :plaidForm="plaidForm" :plaid="plaid" :vars="vars"></slot>`,
  props: {
    init: Object,
    initString: String
  },
  setup(props) {
    const inits = props.initString ? JSON.parse(props.initString) : {}
    const locals = reactive({ ...props.init, ...inits })
    const vars = inject('vars')
    const plaid = inject('plaid')
    const plaidForm = new FormData()
    return { plaid, plaidForm, locals, vars }
  }
})
