import type { Directive } from 'vue'

export const assignOnCreate: Directive = {
  created: (el, binding) => {
    const [form, obj] = binding.value
    Object.assign(form, obj)
  }
}
