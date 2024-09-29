import { type Directive, watch, watchEffect, computed, ref, reactive } from 'vue'

const handleAutoUnmounting = (
  el: HTMLElement,
  binding: any,
  vnode: any,
  callback: (params: any) => void
) => {
  const stopFunctions: Function[] = []

  const createWrappedStop = (stop: Function) => {
    const wrappedStop = () => {
      stop()
      const index = stopFunctions.indexOf(wrappedStop)
      if (index > -1) {
        stopFunctions.splice(index, 1)
      }
    }
    stopFunctions.unshift(wrappedStop)
    return wrappedStop
  }

  const wrappedWatch = (...args: Parameters<typeof watch>) => {
    return createWrappedStop(watch(...args))
  }

  const wrappedWatchEffect = (...args: Parameters<typeof watchEffect>) => {
    return createWrappedStop(watchEffect(...args))
  }

  callback({
    el,
    binding,
    vnode,
    window,
    watch: wrappedWatch,
    watchEffect: wrappedWatchEffect,
    computed,
    ref,
    reactive
  })
  ;(el as any).__stopFunctions = stopFunctions
}

const withAutoUnmounting = (directive: Partial<Directive>): Directive => ({
  ...directive,
  unmounted(el) {
    const stopFunctions = (el as any).__stopFunctions as Function[]
    if (stopFunctions && stopFunctions.length > 0) {
      const stopFunctionsCopy = [...stopFunctions]
      stopFunctionsCopy.forEach((stop) => stop())
    }
  }
})

export const runOnCreated: Directive = withAutoUnmounting({
  created(el, binding, vnode) {
    handleAutoUnmounting(el, binding, vnode, binding.value)
  }
})

export const runBeforeMount: Directive = withAutoUnmounting({
  beforeMount(el, binding, vnode) {
    handleAutoUnmounting(el, binding, vnode, binding.value)
  }
})

export const runOnMounted: Directive = withAutoUnmounting({
  mounted(el, binding, vnode) {
    handleAutoUnmounting(el, binding, vnode, binding.value)
  }
})

export const runBeforeUpdate: Directive = withAutoUnmounting({
  beforeUpdate(el, binding, vnode, prevVnode) {
    handleAutoUnmounting(el, binding, vnode, (params) => binding.value({ ...params, prevVnode }))
  }
})

export const runOnUpdated: Directive = withAutoUnmounting({
  updated(el, binding, vnode, prevVnode) {
    handleAutoUnmounting(el, binding, vnode, (params) => binding.value({ ...params, prevVnode }))
  }
})

export const runBeforeUnmount: Directive = withAutoUnmounting({
  beforeUnmount(el, binding, vnode) {
    handleAutoUnmounting(el, binding, vnode, binding.value)
  }
})

export const runOnUnmounted: Directive = {
  unmounted(el, binding, vnode) {
    binding.value({ el, binding, vnode, window, ref, reactive })
  }
}
