import { type Directive } from 'vue'

export const assignOnMounted: Directive = {
  mounted: (_, binding) => {
    const [form, obj] = binding.value
    Object.assign(form, obj)
  }
}
