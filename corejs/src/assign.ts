import type { Directive } from 'vue'

import * as lodash from 'lodash'

export const assignOnCreate: Directive = {
  created: (el, binding) => {
    const [form, obj] = binding.value
    const newObj = {}

    for (const [key, value] of Object.entries(obj)) {
      lodash.set(newObj, key, value)
    }
    Object.assign(form, newObj)
  }
}
