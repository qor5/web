import debounce from 'lodash/debounce'
import type { ObjectDirective } from 'vue'

// Attach directive to element and wait for input to stop. Default timeout 800ms or 0.8s.
export const debounceDirective: ObjectDirective<HTMLElement> = {
  mounted(el, binding) {
    const evt = binding.arg || 'input'
    const elAny = el as any

    elAny.debounceFunc = debounce(
      function (e: Event) {
        // Emit an event from the directive. This requires handling in the parent component.
        const customEvent = createNewEvent(evt + ':debounced')
        el.dispatchEvent(customEvent)
      },
      parseInt(binding.value) || 800
    )

    if (binding.value !== binding.oldValue) {
      el.addEventListener(evt, elAny.debounceFunc)
    }
  },
  beforeUnmount(el, binding) {
    const evt = binding.arg || 'input'
    el.removeEventListener(evt, binding.oldValue)
  }
}

// IE Support
function createNewEvent(eventName: string) {
  let e: Event
  if (typeof Event === 'function') {
    e = new Event(eventName, { bubbles: true, cancelable: true })
  } else {
    e = document.createEvent('Event')
    e.initEvent(eventName, true, true)
  }
  return e
}
