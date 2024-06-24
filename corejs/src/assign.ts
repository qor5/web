import type { Directive } from 'vue'

export const assignOnMounted: Directive = {
  mounted: (el, binding) => {
    const [form, obj] = binding.value
    Object.assign(form, obj)
  }
}

export const runOnMounted: Directive = {
  mounted: (el, binding, vnode) => {
    binding.value(el, binding, vnode)
  }
}
