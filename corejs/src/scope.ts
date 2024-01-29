import { defineComponent, reactive } from 'vue'

export default defineComponent({
  template: `
		<div>
			<slot :locals="locals" :plaidForm="plaidForm"></slot>
		</div>
	`,
  props: {
    init: Object
  },
  setup(props) {
    const locals: any = reactive({})
    const plaidForm = new FormData()

    var i = props.init ?? {}
    Object.keys(i).forEach((k) => {
      locals[k] = i[k]
    })

    return { locals, plaidForm }
  }
})
