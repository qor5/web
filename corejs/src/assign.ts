import type { Directive } from 'vue'
import set from 'lodash/set'

export const assignOnCreate: Directive = {
  created: (el, binding) => {
    const [form, obj] = binding.value
    const newObj = {}

    for (const [key, value] of Object.entries(obj)) {
      set(newObj, key, value)
    }
    Object.assign(form, newObj)
  }
}
