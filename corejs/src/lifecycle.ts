import { type Directive, watch, watchEffect, ref, reactive } from 'vue'

export const runOnCreated: Directive = {
  created(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runBeforeMount: Directive = {
  beforeMount(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runOnMounted: Directive = {
  mounted(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runBeforeUpdate: Directive = {
  beforeUpdate(el, binding, vnode, prevVnode) {
    binding.value({ el, binding, vnode, prevVnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runOnUpdated: Directive = {
  updated(el, binding, vnode, prevVnode) {
    binding.value({ el, binding, vnode, prevVnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runBeforeUnmount: Directive = {
  beforeUnmount(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, watch, watchEffect, ref, reactive })
  }
}

export const runOnUnmounted: Directive = {
  unmounted(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, watch, watchEffect, ref, reactive })
  }
}
